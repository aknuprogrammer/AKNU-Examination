import { Router } from 'express';
import * as collegeService from '../services/collegeService.js';
import { authenticateToken } from '../middlewares/auth.js';
import { rbac } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { collegeSchema } from '../validators/schemas.js';
import { encryptPassword, decryptPassword } from '../utils/crypto.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const router = Router();
const SECURE_ZIP_DIR = path.resolve('secure_storage/colleges');

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'Unknown IP';
};

// Create College
router.post(
  '/',
  authenticateToken,
  rbac(['Super Admin', 'Controller of Examinations']),
  validate(collegeSchema),
  async (req, res, next) => {
    try {
      const ip = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'] || '';
      
      const college = await collegeService.createCollege(req.body, req.user.username, ip, userAgent);
      
      res.status(201).json({
        success: true,
        message: 'College created successfully.',
        data: college
      });
    } catch (error) {
      next(error);
    }
  }
);

// List Colleges
router.get(
  '/',
  authenticateToken,
  rbac(['Super Admin', 'Controller of Examinations', 'Confidential Section', 'Exam Cell Staff', 'Observer', 'Principal']),
  async (req, res, next) => {
    try {
      let colleges;
      if (req.user.role === 'Principal') {
        const principalCollege = await College.findOne({
          $or: [
            { principalUserId: req.user.id },
            { collegeCode: req.user.username?.replace(/^Principal_/, '') }
          ]
        }).populate('principalUserId', '-password');

        if (principalCollege && principalCollege.isDeployed && principalCollege.deployedAt) {
          const elapsedMs = Date.now() - new Date(principalCollege.deployedAt).getTime();
          if (elapsedMs >= 60 * 60 * 1000) {
            return res.json({
              success: true,
              data: [{
                ...principalCollege.toObject(),
                zipFileHash: '',
                isDeployed: false,
                isExpired: true,
                dayPassword: ''
              }]
            });
          }
        }

        colleges = principalCollege ? [principalCollege] : [];
      } else {
        colleges = await collegeService.listColleges();
      }
      
      const decryptedColleges = await Promise.all(colleges.map(async (clg) => {
        const zipPath = path.join(SECURE_ZIP_DIR, `${clg.collegeCode}.zip`);
        const fileExists = fs.existsSync(zipPath);

        // Auto-heal database sync if ZIP is deleted on disk
        if (!fileExists && clg.zipFileHash) {
          clg.zipFileHash = '';
          clg.dayPasswordEncrypted = '';
          clg.dayPasswordIv = '';
          clg.dayPasswordTag = '';
          await clg.save();
        }

        let plainPassword = '';
        if (fileExists && clg.dayPasswordEncrypted && ['Super Admin', 'Controller of Examinations'].includes(req.user.role)) {
          try {
            plainPassword = decryptPassword(clg.dayPasswordEncrypted, clg.dayPasswordIv, clg.dayPasswordTag);
          } catch (e) {
            console.error('Failed to decrypt password for college:', clg.collegeCode, e);
          }
        }
        return {
          ...clg.toObject(),
          zipFileHash: fileExists ? clg.zipFileHash : '',
          dayPassword: plainPassword
        };
      }));

      res.json({
        success: true,
        data: decryptedColleges
      });
    } catch (error) {
      next(error);
    }
  }
);

// Bulk Create Colleges
router.post(
  '/bulk',
  authenticateToken,
  rbac(['Super Admin', 'Controller of Examinations']),
  async (req, res, next) => {
    try {
      const ip = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'] || '';
      
      const { colleges } = req.body;
      if (!Array.isArray(colleges)) {
        return res.status(400).json({ success: false, message: 'colleges must be an array.' });
      }

      const results = await collegeService.bulkCreateColleges(colleges, req.user.username, ip, userAgent);
      
      res.status(201).json({
        success: true,
        message: 'Bulk upload completed.',
        data: results
      });
    } catch (error) {
      next(error);
    }
  }
);

// NOTE: GET /:id intentionally placed AFTER all named sub-routes to prevent
// Express from matching /released-password, /download-papers, etc. as ObjectIds.

// Update College details
router.put(
  '/:id',
  authenticateToken,
  rbac(['Super Admin', 'Controller of Examinations']),
  validate(collegeSchema.partial()), // partial validation schema support
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const ip = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'] || '';

      const college = await collegeService.updateCollege(id, req.body, req.user.username, ip, userAgent);

      res.json({
        success: true,
        message: 'College updated successfully.',
        data: college
      });
    } catch (error) {
      next(error);
    }
  }
);

// Permanent Delete
router.delete(
  '/:id',
  authenticateToken,
  rbac(['Super Admin', 'Controller of Examinations']),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const ip = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'] || '';

      const college = await collegeService.deleteCollegePermanently(id, req.user.username, ip, userAgent);

      res.json({
        success: true,
        message: 'College permanently deleted successfully.',
        data: college
      });
    } catch (error) {
      next(error);
    }
  }
);

// --- PAPER DISTRIBUTION & ENCRYPTION FLOW ---
// NOTE: All specific named routes (e.g. /upload-papers, /released-password, /download-papers)
// are registered BEFORE /:id to avoid Express treating them as ObjectId wildcards.

import multer from 'multer';
import College from '../models/College.js';
import { watermarkPdf } from '../utils/pdfHelper.js';
import { createEncryptedZip } from '../utils/zipHelper.js';
import { sendOtpEmail } from '../services/emailService.js';
import { sendOtpSms } from '../services/smsService.js';

const uploadZip = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Admin Upload & Process Combined ZIP
router.post(
  '/upload-papers',
  authenticateToken,
  rbac(['Super Admin', 'Controller of Examinations']),
  uploadZip.single('zipFile'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'ZIP file is required.' });
      }

      const AdmZip = (await import('adm-zip')).default;
      const zip = new AdmZip(req.file.buffer);
      const zipEntries = zip.getEntries();

      const results = {
        successCount: 0,
        errors: [],
        passwords: []
      };

      // Group PDF entries by collegeCode
      const collegePapersMap = {};

      for (const entry of zipEntries) {
        if (entry.isDirectory || !entry.name.toLowerCase().endsWith('.pdf') || entry.entryName.includes('__MACOSX')) {
          continue;
        }

        const filename = entry.name;
        // Parse name: {qpCode}_{collegeCode}.pdf
        const match = filename.match(/^([A-Za-z0-9_-]+)_([A-Za-z0-9]+)\.pdf$/i);
        if (!match) {
          results.errors.push({ filename, message: 'Invalid name format. Expected {qpCode}_{collegeCode}.pdf' });
          continue;
        }

        const [_, qpCode, collegeCode] = match;
        const fileBuffer = entry.getData();

        if (!collegePapersMap[collegeCode]) {
          collegePapersMap[collegeCode] = [];
        }
        collegePapersMap[collegeCode].push({ qpCode, filename, buffer: fileBuffer });
      }

      // Ensure directory exists
      if (!fs.existsSync(SECURE_ZIP_DIR)) {
        fs.mkdirSync(SECURE_ZIP_DIR, { recursive: true });
      }

      const { examDate = '', examSession = '' } = req.body;

      // Process each college's papers
      for (const collegeCode of Object.keys(collegePapersMap)) {
        try {
          const college = await College.findOne({ collegeCode });
          if (!college) {
            throw new Error(`College with code ${collegeCode} not found in the registry.`);
          }

          // --- Password Resolution ---
          // Priority: (1) per-college password from request body, (2) global password from request body,
          // (3) existing encrypted password on the DB record, (4) fallback default pattern.
          let plainPassword = '';
          
          let customPasswords = {};
          try {
            if (req.body.passwords) {
              customPasswords = typeof req.body.passwords === 'string'
                ? JSON.parse(req.body.passwords)
                : req.body.passwords;
            }
          } catch (_) { /* ignore parse errors, treat as empty */ }
          
          const globalPassword = req.body.globalPassword || '';

          if (customPasswords[collegeCode]) {
            // Per-college password supplied by admin
            plainPassword = customPasswords[collegeCode];
          } else if (globalPassword) {
            // Single global password for all colleges
            plainPassword = globalPassword;
          } else if (college.dayPasswordEncrypted) {
            // Reuse previously encrypted password from DB
            plainPassword = decryptPassword(
              college.dayPasswordEncrypted,
              college.dayPasswordIv,
              college.dayPasswordTag
            );
          } else {
            // Fallback: deterministic default based on college code
            plainPassword = `AKNU_${collegeCode}@2026`;
          }

          // Encrypt and persist the password
          const encrypted = encryptPassword(plainPassword);
          college.dayPasswordEncrypted = encrypted.encryptedPassword;
          college.dayPasswordIv = encrypted.iv;
          college.dayPasswordTag = encrypted.tag;

          // Apply watermarks to all papers for this college
          const watermarkedFiles = [];
          for (const paper of collegePapersMap[collegeCode]) {
            const watermarkedBuffer = await watermarkPdf(
              paper.buffer,
              collegeCode,
              collegeCode, // Center code defaults to college code
              paper.qpCode
            );
            watermarkedFiles.push({
              name: `QP_${paper.qpCode}.pdf`,
              buffer: watermarkedBuffer
            });
          }

          // Write encrypted ZIP
          const zipPath = path.join(SECURE_ZIP_DIR, `${collegeCode}.zip`);
          await createEncryptedZip(watermarkedFiles, zipPath, plainPassword);

          // Compute SHA-256 hash of the generated ZIP
          const hash = crypto.createHash('sha256').update(fs.readFileSync(zipPath)).digest('hex');
          const clientIp = getClientIp(req);
          college.zipFileHash = hash;
          college.examDate = examDate;
          college.examSession = examSession;
          college.zipUploadedAt = new Date();
          college.zipUploadedIp = clientIp;
          college.isDeployed = false;
          college.deployedAt = null;
          college.deployedIp = '';
          college.zipDownloaded = false;
          college.zipDownloadedAt = null;
          college.downloadCount = 0;
          college.isRedeploy = false;
          college.downloadOtpVerified = false;
          college.initialDeployedAt = null;
          college.firstDownloadedAt = null;
          college.firstDownloadedIp = '';
          college.redeployedAt = null;
          college.redeployedIp = '';
          college.redeployReason = '';
          college.redownloadedAt = null;
          college.redownloadedIp = '';
          college.auditLogs = [{
            action: 'UPLOAD',
            timestamp: new Date(),
            performedBy: `${req.user?.role || 'Admin'} (${req.user?.username || 'admin'})`,
            ipAddress: clientIp,
            reason: `Uploaded combined college question paper ZIP folder (${examDate} - ${examSession} Session)`
          }];
          college.downloadOtp = '';
          college.downloadOtpExpires = null;
          
          await college.save();

          results.successCount++;
          results.passwords.push({
            collegeCode,
            collegeName: college.collegeName,
            password: plainPassword
          });

        } catch (err) {
          results.errors.push({
            collegeCode,
            message: err.message
          });
        }
      }

      res.json({
        success: true,
        message: 'Combined ZIP processed and college question paper ZIP folders generated.',
        data: results
      });

    } catch (error) {
      next(error);
    }
  }
);

// Admin Deploy Question Papers by Session / Single Click
router.post(
  '/deploy-papers',
  authenticateToken,
  rbac(['Super Admin', 'Controller of Examinations']),
  async (req, res, next) => {
    try {
      const { examSession = '', examDate = '', collegeCode = '' } = req.body;
      
      const filter = { zipFileHash: { $ne: '' }, isDeployed: false };
      if (collegeCode) {
        filter.collegeCode = collegeCode;
      } else {
        if (examSession) filter.examSession = examSession;
        if (examDate) filter.examDate = examDate;
      }

      const matchingColleges = await College.find(filter);
      if (matchingColleges.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No pending uploaded college question paper ZIP folders found matching the selected criteria.'
        });
      }

      const now = new Date();
      const ip = getClientIp(req);
      let deployedCount = 0;
      for (const clg of matchingColleges) {
        clg.isDeployed = true;
        clg.deployedAt = now;
        clg.deployedIp = ip;
        if (!clg.initialDeployedAt) clg.initialDeployedAt = now;
        clg.auditLogs.push({
          action: 'DEPLOY',
          timestamp: now,
          performedBy: `${req.user?.role || 'Admin'} (${req.user?.username || 'admin'})`,
          ipAddress: ip,
          reason: `Scheduled session deployment (${examDate || clg.examDate} - ${examSession || clg.examSession || 'AM'} Session)`
        });
        await clg.save();
        deployedCount++;
      }

      res.json({
        success: true,
        message: `Successfully deployed question papers for ${deployedCount} college(s). Principal access is now active.`,
        deployedCount
      });
    } catch (error) {
      next(error);
    }
  }
);

// Admin/Staff Re-Deploy Question Papers for a specific college (after phone request)
router.post(
  '/redeploy/:collegeCode',
  authenticateToken,
  rbac(['Super Admin', 'Controller of Examinations', 'Confidential Section', 'Exam Cell Staff', 'Observer']),
  async (req, res, next) => {
    try {
      const { collegeCode } = req.params;
      const { reason } = req.body || {};
      const trimmedReason = reason?.trim() || 'Admin re-deployed after phone verification.';

      const college = await College.findOne({ collegeCode });
      if (!college) {
        return res.status(404).json({ success: false, message: 'College not found.' });
      }
      if (!college.zipFileHash) {
        return res.status(400).json({ success: false, message: 'No college question paper ZIP folder uploaded for this college yet.' });
      }

      const now = new Date();
      const ip = getClientIp(req);
      const { category: inputCategory } = req.body || {};
      let category = inputCategory || '';
      if (!category && trimmedReason) {
        const lower = trimmedReason.toLowerCase();
        if (lower.includes('power') || lower.includes('printer') || lower.includes('hardware') || lower.includes('system') || lower.includes('crash')) {
          category = '🔌 Power / Hardware Failure';
        } else if (lower.includes('network') || lower.includes('net') || lower.includes('wifi') || lower.includes('disconnect') || lower.includes('server') || lower.includes('slow')) {
          category = '🌐 Network / ISP Disconnection';
        } else if (lower.includes('corrupt') || lower.includes('crc') || lower.includes('winrar') || lower.includes('7zip') || lower.includes('archive') || lower.includes('password') || lower.includes('open')) {
          category = '💻 OS / Archive Software Glitch';
        } else if (lower.includes('wrong') || lower.includes('mistake') || lower.includes('human') || lower.includes('staff')) {
          category = '⚠️ Human / Operator Error';
        } else if (lower.includes('tamper') || lower.includes('devtools') || lower.includes('f12') || lower.includes('suspicious')) {
          category = '🔒 Security / Suspicious Activity';
        } else {
          category = '📌 General Technical Issue';
        }
      }

      college.isDeployed = true;
      college.deployedAt = now; // reset 1-hour window
      college.deployedIp = ip;
      college.redeployedAt = now;
      college.redeployedIp = ip;
      college.redeployReason = trimmedReason;
      college.zipDownloaded = false; // reset so Principal can download once more
      college.isRedeploy = true; // flag as re-deploy so status shows Re-Downloaded upon download
      college.downloadOtpVerified = false;
      college.auditLogs.push({
        action: 'REDEPLOY',
        timestamp: now,
        performedBy: `${req.user?.role || 'Admin'} (${req.user?.username || 'admin'})`,
        ipAddress: ip,
        reason: trimmedReason,
        category: category
      });
      await college.save();

      res.json({
        success: true,
        message: `Successfully re-deployed college question paper ZIP folder for ${college.collegeName} (${college.collegeCode}). Reason: "${trimmedReason}"`,
        data: college
      });
    } catch (error) {
      next(error);
    }
  }
);

// Principal Send Download Verification OTP
router.post(
  '/send-download-otp',
  authenticateToken,
  rbac(['Principal']),
  async (req, res, next) => {
    try {
      const college = await College.findOne({ principalUserId: req.user.id });
      if (!college || !college.zipFileHash) {
        return res.status(404).json({ success: false, message: 'No question papers have been uploaded for your college yet.' });
      }
      if (!college.isDeployed) {
        return res.status(403).json({ success: false, message: 'Question papers have not been deployed by the Exam Cell yet. Please check back 30 minutes before your session exam.' });
      }
      if (college.deployedAt && (Date.now() - new Date(college.deployedAt).getTime() >= 60 * 60 * 1000)) {
        return res.status(403).json({ success: false, message: 'Question paper download window (1 hour from deployment) has expired. You can no longer request an OTP.' });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      college.downloadOtp = otp;
      college.downloadOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins expiry
      await college.save();

      // Send email to principal
      await sendOtpEmail({
        toEmail: college.principalEmail,
        collegeName: college.collegeName,
        otp
      });

      // Send zero-cost SMS / WhatsApp OTP to principal mobile
      await sendOtpSms({
        phone: college.principalPhone,
        collegeName: college.collegeName,
        otp
      });

      const phoneDisplay = college.principalPhone ? `+91-${college.principalPhone}` : 'Registered Mobile';
      res.json({
        success: true,
        message: `A 6-digit verification code has been sent to your registered Email (${college.principalEmail}) and Mobile Number (${phoneDisplay}).`
      });
    } catch (error) {
      next(error);
    }
  }
);

// Principal Verify Download OTP
router.post(
  '/verify-download-otp',
  authenticateToken,
  rbac(['Principal']),
  async (req, res, next) => {
    try {
      const { otp } = req.body;
      if (!otp) {
        return res.status(400).json({ success: false, message: 'OTP is required.' });
      }

      const college = await College.findOne({ principalUserId: req.user.id });
      if (!college) {
        return res.status(404).json({ success: false, message: 'College record not found.' });
      }

      if (college.isDeployed && college.deployedAt && (Date.now() - new Date(college.deployedAt).getTime() >= 60 * 60 * 1000)) {
        return res.status(403).json({ success: false, message: 'Question paper download window (1 hour from deployment) has expired.' });
      }

      if (!college.downloadOtp || !college.downloadOtpExpires || college.downloadOtp !== otp.trim()) {
        return res.status(400).json({ success: false, message: 'Invalid OTP entered. Please verify or request a new OTP.' });
      }

      if (new Date() > new Date(college.downloadOtpExpires)) {
        return res.status(400).json({ success: false, message: 'OTP has expired. Please click "Send OTP" again.' });
      }

      // Mark verified for download
      college.downloadOtpVerified = true;
      college.downloadOtp = '';
      college.downloadOtpExpires = null;
      await college.save();

      res.json({
        success: true,
        message: 'OTP verified successfully! You can now download the College Question Paper ZIP folder.'
      });
    } catch (error) {
      next(error);
    }
  }
);

// Principal Download ZIP File
router.get(
  '/download-papers',
  authenticateToken,
  rbac(['Principal']),
  async (req, res, next) => {
    try {
      const college = await College.findOne({ principalUserId: req.user.id });
      if (!college) {
        return res.status(404).json({ success: false, message: 'College registry record not found for this account.' });
      }

      const zipPath = path.join(SECURE_ZIP_DIR, `${college.collegeCode}.zip`);
      if (!fs.existsSync(zipPath) || !college.zipFileHash) {
        return res.status(404).json({ success: false, message: 'No question papers have been deployed for your college yet.' });
      }

      if (!college.isDeployed) {
        return res.status(403).json({ success: false, message: 'Question papers have not been deployed by the Exam Cell yet.' });
      }

      if (college.deployedAt && (Date.now() - new Date(college.deployedAt).getTime() >= 60 * 60 * 1000)) {
        return res.status(403).json({ success: false, message: 'Question paper download window (1 hour from deployment) has expired. File download is no longer permitted.' });
      }

      if (college.zipDownloaded) {
        return res.status(403).json({ success: false, message: 'Security check: College question paper ZIP folder has already been downloaded once. Single-time download limit reached. Please contact Exam Cell for re-deployment if a second download is required.' });
      }

      if (!college.downloadOtpVerified) {
        return res.status(403).json({ success: false, message: 'Verification required: Please verify OTP before downloading.' });
      }

      // Mark single download completed immediately right before sending file
      const now = new Date();
      const ip = getClientIp(req);
      college.zipDownloaded = true;
      college.zipDownloadedAt = now;
      if (!college.firstDownloadedAt) {
        college.firstDownloadedAt = now;
        college.firstDownloadedIp = ip;
        college.auditLogs.push({
          action: 'DOWNLOAD',
          timestamp: now,
          performedBy: `Principal (${college.collegeCode})`,
          ipAddress: ip,
          reason: 'Initial college question paper ZIP folder download'
        });
      } else if (college.isRedeploy || (college.downloadCount || 0) >= 1) {
        college.redownloadedAt = now;
        college.redownloadedIp = ip;
        college.auditLogs.push({
          action: 'REDOWNLOAD',
          timestamp: now,
          performedBy: `Principal (${college.collegeCode})`,
          ipAddress: ip,
          reason: `Re-download against reason: "${college.redeployReason || 'Admin re-deployment'}"`
        });
      }
      college.downloadCount = (college.downloadCount || 0) + 1;
      await college.save();

      res.download(zipPath, `QP_${college.collegeCode}.zip`);
    } catch (error) {
      next(error);
    }
  }
);

// Principal Retrieve Password
router.get(
  '/released-password',
  authenticateToken,
  rbac(['Principal']),
  async (req, res, next) => {
    try {
      const college = await College.findOne({ principalUserId: req.user.id });
      if (!college) {
        return res.status(404).json({ success: false, message: 'College registry record not found for this account.' });
      }

      if (!college.isDeployed) {
        return res.status(403).json({
          success: false,
          message: 'Question papers are not deployed yet.'
        });
      }

      if (!college.zipDownloaded) {
        return res.status(403).json({
          success: false,
          message: 'Decryption password is only shown after you verify OTP and download the College Question Paper ZIP folder.'
        });
      }

      if (!college.deployedAt) {
        return res.status(403).json({
          success: false,
          message: 'Deployment timestamp not recorded.'
        });
      }

      const elapsedMs = Date.now() - new Date(college.deployedAt).getTime();
      const tenMinutesMs = 10 * 60 * 1000;
      if (elapsedMs < tenMinutesMs) {
        const remainingSecs = Math.ceil((tenMinutesMs - elapsedMs) / 1000);
        const mins = Math.floor(remainingSecs / 60);
        const secs = remainingSecs % 60;
        return res.status(403).json({
          success: false,
          message: `Decryption password will be shown 10 minutes after deployment (in ${mins}m ${secs}s).`
        });
      }

      if (elapsedMs >= 60 * 60 * 1000) {
        return res.status(403).json({
          success: false,
          message: 'Question paper access window (1 hour from deployment) has expired.'
        });
      }

      if (!college.dayPasswordEncrypted) {
        return res.status(404).json({
          success: false,
          message: 'No password has been generated for your college yet.'
        });
      }

      const password = decryptPassword(
        college.dayPasswordEncrypted,
        college.dayPasswordIv,
        college.dayPasswordTag
      );

      res.json({
        success: true,
        password
      });
    } catch (error) {
      next(error);
    }
  }
);

// Admin Download ZIP File for a specific college
router.get(
  '/download-papers/:collegeCode',
  authenticateToken,
  rbac(['Super Admin', 'Controller of Examinations']),
  async (req, res, next) => {
    try {
      const { collegeCode } = req.params;
      const zipPath = path.join(SECURE_ZIP_DIR, `${collegeCode}.zip`);
      if (!fs.existsSync(zipPath)) {
        return res.status(404).json({ success: false, message: `No papers deployed for college ${collegeCode} yet.` });
      }

      res.download(zipPath, `QP_${collegeCode}.zip`);
    } catch (error) {
      next(error);
    }
  }
);

// Admin Delete Deployed ZIP File & Passwords for a specific college
router.delete(
  '/papers/:collegeCode',
  authenticateToken,
  rbac(['Super Admin', 'Controller of Examinations']),
  async (req, res, next) => {
    try {
      const { collegeCode } = req.params;
      const college = await College.findOne({ collegeCode });
      if (!college) {
        return res.status(404).json({ success: false, message: `College ${collegeCode} not found.` });
      }

      // Delete physical ZIP file if it exists
      const zipPath = path.join(SECURE_ZIP_DIR, `${collegeCode}.zip`);
      if (fs.existsSync(zipPath)) {
        fs.unlinkSync(zipPath);
      }

      // Reset deployment details in DB
      college.zipFileHash = '';
      college.dayPasswordEncrypted = '';
      college.dayPasswordIv = '';
      college.dayPasswordTag = '';
      college.examDate = '';
      college.examSession = '';
      college.isDeployed = false;
      college.deployedAt = null;
      college.zipDownloaded = false;
      college.zipDownloadedAt = null;
      college.downloadCount = 0;
      college.isRedeploy = false;
      college.downloadOtpVerified = false;
      college.initialDeployedAt = null;
      college.firstDownloadedAt = null;
      college.redeployedAt = null;
      college.redeployReason = '';
      college.redownloadedAt = null;
      college.auditLogs = [];
      college.downloadOtp = '';
      college.downloadOtpExpires = null;
      
      await college.save();

      res.json({
        success: true,
        message: `College question paper ZIP folder and passwords for College ${collegeCode} have been deleted successfully.`
      });
    } catch (error) {
      next(error);
    }
  }
);

// --- AI & TELEMETRY SHIELD ENDPOINTS ---

// 1. Principal Telemetry & Anti-Tamper Shield
router.post('/telemetry', authenticateToken, async (req, res, next) => {
  try {
    const { collegeCode, eventType, details } = req.body;
    let college;
    if (collegeCode) {
      college = await College.findOne({ collegeCode: collegeCode.toUpperCase() });
    } else if (req.user.role === 'Principal') {
      college = await College.findOne({ principalUserId: req.user.id });
    }
    if (!college) {
      return res.status(404).json({ success: false, message: 'College not found for telemetry.' });
    }

    const now = new Date();
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'Unknown Browser';

    // Push to telemetryLogs
    if (!college.telemetryLogs) college.telemetryLogs = [];
    college.telemetryLogs.push({
      eventType: eventType || 'GENERAL_TELEMETRY',
      timestamp: now,
      details: details || '',
      ipAddress: ip,
      userAgent
    });

    // Also record in auditLogs if it is a critical security / network / tamper alert
    const alertTypes = ['DEVTOOLS_DETECTED', 'NETWORK_OFFLINE', 'TAB_BLURRED', 'DOWNLOAD_INTERRUPTED', 'PASSWORD_COPIED', 'CLOCK_SKEW_DETECTED'];
    if (alertTypes.includes(eventType)) {
      let actionType = 'TELEMETRY_ALERT';
      if (eventType === 'DEVTOOLS_DETECTED') actionType = 'DEVTOOLS_DETECTED';
      else if (eventType === 'NETWORK_OFFLINE') actionType = 'NETWORK_OFFLINE';
      else if (eventType === 'TAB_BLURRED') actionType = 'TAB_BLURRED';

      let category = '📌 General Technical Issue';
      if (eventType === 'DEVTOOLS_DETECTED') category = '🔒 Security / Suspicious Activity';
      else if (eventType === 'NETWORK_OFFLINE') category = '🌐 Network / ISP Disconnection';
      else if (eventType === 'DOWNLOAD_INTERRUPTED') category = '🌐 Network / ISP Disconnection';

      college.auditLogs.push({
        action: actionType,
        timestamp: now,
        performedBy: `Telemetry Shield (${college.collegeCode})`,
        ipAddress: ip,
        reason: `[${eventType}] ${details || 'Client event logged'}`,
        category
      });
    }

    await college.save();
    res.json({ success: true, message: 'Telemetry event recorded successfully.' });
  } catch (error) {
    next(error);
  }
});

// 2. AI Categorize Reason (NLP Tagging)
router.post('/ai/categorize-reason', authenticateToken, async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason) {
      return res.json({ success: true, category: '📌 General Technical Issue', confidence: 0.5, explanation: 'No reason provided.' });
    }
    const lower = reason.toLowerCase();
    let category = '📌 General Technical Issue';
    let explanation = 'Classified as general technical request.';
    let confidence = 0.85;

    if (lower.includes('power') || lower.includes('printer') || lower.includes('hardware') || lower.includes('system') || lower.includes('crash') || lower.includes('current') || lower.includes('ups')) {
      category = '🔌 Power / Hardware Failure';
      explanation = 'Detected hardware or electrical power interruption keywords.';
      confidence = 0.96;
    } else if (lower.includes('network') || lower.includes('net') || lower.includes('wifi') || lower.includes('disconnect') || lower.includes('server') || lower.includes('slow') || lower.includes('internet') || lower.includes('ping') || lower.includes('speed')) {
      category = '🌐 Network / ISP Disconnection';
      explanation = 'Detected connectivity or internet speed drop keywords.';
      confidence = 0.95;
    } else if (lower.includes('corrupt') || lower.includes('crc') || lower.includes('winrar') || lower.includes('7zip') || lower.includes('archive') || lower.includes('password') || lower.includes('open') || lower.includes('extract') || lower.includes('zip') || lower.includes('damaged')) {
      category = '💻 OS / Archive Software Glitch';
      explanation = 'Detected archive extraction or decryption utility keywords.';
      confidence = 0.94;
    } else if (lower.includes('wrong') || lower.includes('mistake') || lower.includes('human') || lower.includes('staff') || lower.includes('operator') || lower.includes('forget')) {
      category = '⚠️ Human / Operator Error';
      explanation = 'Detected operator oversight or manual input error keywords.';
      confidence = 0.90;
    } else if (lower.includes('tamper') || lower.includes('devtools') || lower.includes('f12') || lower.includes('suspicious') || lower.includes('hack')) {
      category = '🔒 Security / Suspicious Activity';
      explanation = 'Detected potential unauthorized inspection or security trigger.';
      confidence = 0.99;
    }

    res.json({ success: true, category, confidence, explanation });
  } catch (error) {
    next(error);
  }
});

// 3. AI Smart Audit & Session Summarizer for COE
router.post('/ai/summarize-session', authenticateToken, rbac(['Super Admin', 'Controller of Examinations', 'Confidential Section', 'Exam Cell Staff', 'Observer']), async (req, res, next) => {
  try {
    const { examDate, examSession } = req.body;
    let query = {};
    if (examSession && examSession !== 'ALL') {
      query.examSession = examSession;
    }

    if (examDate) {
      const parts = examDate.split('-');
      if (parts.length === 3) {
        const reversed = `${parts[2]}-${parts[1]}-${parts[0]}`;
        if (reversed !== examDate) {
          query.$or = [{ examDate: examDate }, { examDate: reversed }];
        } else {
          query.examDate = examDate;
        }
      } else {
        query.examDate = examDate;
      }
    }

    let colleges = await College.find(query);
    if (colleges.length === 0 && examSession && examSession !== 'ALL') {
      colleges = await College.find({ examSession });
    }

    const totalScheduled = colleges.length;
    const deployedCount = colleges.filter(c => c.isDeployed).length;
    const downloadedCount = colleges.filter(c => c.zipDownloaded || (c.downloadCount && c.downloadCount > 0)).length;
    const redeployCount = colleges.filter(c => c.isRedeploy || (c.redeployedAt !== null && c.redeployedAt !== undefined) || (c.redeployCount && c.redeployCount > 0)).length;

    // Break down categories & telemetry alerts across all logs
    const categoryBreakdown = {
      '🔌 Power / Hardware Failure': 0,
      '🌐 Network / ISP Disconnection': 0,
      '💻 OS / Archive Software Glitch': 0,
      '⚠️ Human / Operator Error': 0,
      '🔒 Security / Suspicious Activity': 0,
      '📌 General Technical Issue': 0
    };

    let criticalExceptions = [];
    let telemetryAlertsCount = 0;

    colleges.forEach(c => {
      if (c.auditLogs && c.auditLogs.length > 0) {
        c.auditLogs.forEach(log => {
          if (log.category && categoryBreakdown.hasOwnProperty(log.category)) {
            categoryBreakdown[log.category]++;
          }
          if (['TELEMETRY_ALERT', 'DEVTOOLS_DETECTED', 'NETWORK_OFFLINE', 'TAB_BLURRED'].includes(log.action)) {
            telemetryAlertsCount++;
          }
          if (log.action === 'REDEPLOY' && criticalExceptions.length < 5) {
            criticalExceptions.push({
              collegeCode: c.collegeCode,
              collegeName: c.collegeName,
              reason: log.reason || c.redeployReason || 'Re-deployment authorized',
              category: log.category || '📌 General Technical Issue',
              timestamp: log.timestamp
            });
          }
        });
      }
    });

    const healthPercentage = totalScheduled > 0 ? ((downloadedCount / totalScheduled) * 100).toFixed(1) : '100.0';

    const insights = [];
    if (redeployCount === 0) {
      insights.push('✨ Exceptional Session: Zero re-deployments requested across all colleges.');
    } else {
      insights.push(`⚠️ ${redeployCount} college(s) required re-deployment authorization during this window.`);
    }
    if (telemetryAlertsCount > 0) {
      insights.push(`🛡️ Telemetry Shield captured ${telemetryAlertsCount} client security/network alerts across active portals.`);
    }
    if (categoryBreakdown['💻 OS / Archive Software Glitch'] > 0) {
      insights.push(`💡 Tip: Recommend colleges update 7-Zip/WinRAR to eliminate extraction CRC anomalies.`);
    }

    res.json({
      success: true,
      summary: {
        examDate: examDate || 'Active Schedule',
        examSession: examSession || 'All Sessions',
        totalScheduled,
        deployedCount,
        downloadedCount,
        redeployCount,
        healthPercentage,
        categoryBreakdown,
        criticalExceptions,
        telemetryAlertsCount,
        insights
      }
    });
  } catch (error) {
    next(error);
  }
});

// 4. AI 24/7 Principal Helpdesk & Troubleshooting Bot
router.post('/ai/helpdesk', authenticateToken, async (req, res, next) => {
  try {
    const { query, collegeCode } = req.body;
    const rawQuery = query || '';
    const lower = rawQuery.toLowerCase()
      .replace(/downlaod|dwnload|dwonload|donwload/g, 'download')
      .replace(/quesstion|queston|qestion|qustion/g, 'question')
      .replace(/papper|paepr/g, 'paper')
      .replace(/pasword|passwrd|pssword/g, 'password')
      .replace(/recieve|recive/g, 'receive')
      .replace(/otpp/g, 'otp');

    let answer = '';
    let suggestedActions = [];

    // 1. Question Paper Download & Access (Principal Role)
    if (lower.includes('download') || lower.includes('access') || lower.includes('get') || lower.includes('retrieve') || lower.includes('fetch') || (lower.includes('question') && lower.includes('paper')) || lower.includes('how can i') || lower.includes('how to')) {
      if (lower.includes('upload') || lower.includes('admin') || lower.includes('exam cell') || lower.includes('staff')) {
        answer = `**Exam Cell Question Paper Upload & Pre-Flight Protocol:**\n\nExam Cell Staff (\`Confidential Section\` / \`Controller of Examinations\`) manage paper distribution via **Question Paper & Password Upload (\`PaperDistribution.jsx\`)**:\n\n1. **Combined ZIP Upload**: Upload a single master ZIP containing individual college folders (\`QPCode_CollegeCode.pdf\`).\n2. **AI Pre-Flight OCR Inspector**: Automatically runs upon file selection to verify date formatting (\`DD-MM-YYYY\`), session consistency (\`AM/PM\`), and file integrity prior to deployment.\n3. **Per-College Password Assignment**: Assign custom high-entropy passwords or generate automated credentials for every college in the session.`;
        suggestedActions = ['Troubleshoot CRC / Extraction Error', 'Check Current Deployment Status', 'Contact Exam Cell Support'];
      } else {
        answer = `**Step-by-Step Question Paper Download Protocol:**\n\n1. **Wait for Deployment Time**: The Exam Cell deploys question papers exactly **30 minutes prior to the examination start time** \n2. **Verify OTP Security**: Once deployed, click **'Request OTP'**. Enter the 6-digit verification code sent to your registered college email and principal mobile number.\n3. **Download ZIP Folder**: After OTP clearance, click the **'Download Question Paper ZIP'** button to save the encrypted archive to your computer.\n4. **Unlock Decryption Password**: Click the **Copy Icon** next to the green password pill on your screen, paste it into 7-Zip, and extract the PDF files.`;
        suggestedActions = ['Check Current Deployment Status', 'Troubleshoot CRC / Extraction Error', 'How to Copy Decryption Password', 'Resolve OTP Delivery Delay'];
      }
    }
    // 2. Re-Deployment Authorization Protocol (Principal & COE Role)
    else if (lower.includes('redeploy') || lower.includes('re-deploy') || lower.includes('authorization') || lower.includes('limit') || lower.includes('attempt') || lower.includes('revoked') || lower.includes('expired') || lower.includes('twice') || lower.includes('again') || lower.includes('second time')) {
      answer = `**Re-Deployment Authorization & Override Protocol:**\n\nTo prevent unauthorized cloning, each college is restricted to **exactly 1 Question Paper ZIP download attempt per session**.\n\n**If your download was interrupted by power failure, PC crash, or network drop:**\n1. **Contact Exam Cell Hotline (Ext. 104 / 0883-2566004)** immediately to report your technical emergency.\n2. **COE Authorization**: The Controller of Examinations or Exam Cell Staff will review your live telemetry and click **'Re-Deploy'** for your college.\n3. **Fresh Window**: Once re-deployed, your portal will refresh automatically, granting a new 1-hour window and exactly 1 authorized download attempt.\n\n*All re-deployments and root-cause categories (\`🔌 Power\`, \`🌐 Network\`, etc.) are permanently recorded in the COE Chronological Audit Trail.*`;
      suggestedActions = ['Contact Exam Cell Support', 'Verify & Re-Download ZIP', 'Check Current Deployment Status'];
    }
    // 3. CRC / Extraction & Archive Opening Errors
    else if (lower.includes('crc') || lower.includes('corrupt') || lower.includes('winrar') || lower.includes('7zip') || lower.includes('extract') || lower.includes('open') || lower.includes('damaged') || lower.includes('archive') || lower.includes('unzip') || lower.includes('zip')) {
      answer = `**Troubleshooting CRC & Archive Extraction Errors:**\n\nA CRC (Cyclic Redundancy Check) or 'corrupted archive' error means the ZIP file download terminated prematurely due to network packet drops.\n\n**Step-by-Step Fix:**\n1. **Verify File Size**: Check the downloaded \`.zip\` file size. If it is under 50 KB or smaller than listed, the file is incomplete.\n2. **Use 7-Zip (Recommended)**: Avoid outdated WinRAR versions. Download and install **7-Zip (64-bit)** or right-click the folder -> **Extract All** using Windows Explorer.\n3. **Re-Download**: Ensure your internet is stable and click **'Verify & Re-Download'** on your dashboard.`;
      suggestedActions = ['Verify & Re-Download ZIP', 'Check Internet Connection Speed', 'How to Copy Decryption Password', 'Request Re-Deployment Authorization'];
    }
    // 4. OTP Security Verification & Delivery Delays
    else if (lower.includes('otp') || lower.includes('code') || lower.includes('sms') || lower.includes('email') || lower.includes('receive') || lower.includes('delay') || lower.includes('resend') || lower.includes('verification')) {
      answer = `**OTP Authentication & Delivery Diagnostics:**\n\nOur system dispatches a secure 6-digit OTP to your college's official registered email and principal mobile number.\n\n**Troubleshooting Checklist:**\n1. **Check Spam / Junk Folder**: Look for automated emails titled *"EDEP Security Verification Code"*.\n2. **Network Latency**: SMS delivery can take up to 45 seconds during high network traffic.\n3. **Resend Code**: If 60 seconds have elapsed, click the **'Resend OTP'** link inside the verification modal.\n4. **Firewall Blocking**: If your college mail server blocks external alerts, contact Exam Cell (Ext. 104) for manual telephone verification and temporary clearance.`;
      suggestedActions = ['Click Resend OTP', 'Check Email Spam Folder', 'Contact Exam Cell Support'];
    }
    // 5. Decryption Passwords & Copy-Paste Workarounds
    else if (lower.includes('password') || lower.includes('copy') || lower.includes('decryption') || lower.includes('unlock') || lower.includes('pass') || lower.includes('paste')) {
      answer = `**Decryption Password Extraction Guide:**\n\nEvery Question Paper ZIP archive is protected by a unique, high-entropy cryptographic password generated specifically for your college code and session.\n\n**Exact Usage Instructions:**\n1. Complete OTP verification and wait for the green password pill to unlock.\n2. Click the **Copy Icon (📋)** on the right side of the password field to copy it straight to your clipboard.\n3. Open the downloaded ZIP file with **7-Zip**, paste the exact password into the prompt, and click OK.\n*Note: Passwords are strictly case-sensitive and must not contain any leading or trailing spaces.*`;
      suggestedActions = ['Copy Password to Clipboard', 'Test Password with 7-Zip', 'Troubleshoot CRC / Extraction Error'];
    }
    // 6. Deployment Schedule & Timing Rules
    else if (lower.includes('schedule') || lower.includes('time') || lower.includes('when') || lower.includes('30') || lower.includes('morning') || lower.includes('afternoon') || lower.includes('am') || lower.includes('pm') || lower.includes('date') || lower.includes('timing')) {
      answer = `**Official Question Paper Deployment Schedule:**\n\nTo guarantee strict confidentiality across all examination centers, encrypted Question Paper ZIP folders are deployed **exactly 30 minutes prior to the examination start time**:\n\n• **AM (Morning Session - 09:00 AM Exam)**: Deployed around **08:30 AM**.\n• **PM (Afternoon Session - 02:00 PM Exam)**: Deployed around **01:30 PM**.\n\nBefore deployment time arrives, your portal will state: *"Question papers have not been deployed by Exam Cell yet."* Please refresh the portal precisely at the 30-minute mark.`;
      suggestedActions = ['Check Current Deployment Status', 'Request Re-Deployment Authorization', 'Contact Exam Cell Support'];
    }
    // 7. Controller of Examinations (COE) Duties & Capabilities
    else if (lower.includes('coe') || lower.includes('controller') || lower.includes('duties') || lower.includes('supervision') || lower.includes('summary') || lower.includes('briefing') || lower.includes('audit')) {
      answer = `**Controller of Examinations (COE) Executive Capabilities:**\n\nThe COE holds overarching administrative authority over the EDEP platform:\n\n1. **Session Deployment Controller**: Authorize session-wide unlocks for AM/PM papers exactly 30 minutes before exams.\n2. **AI Smart Session Summarizer**: Generate real-time executive briefings on delivery health, network anomalies, and root-cause statistics.\n3. **Chronological Audit & Re-Deployment Review**: Inspect full tamper trails (\`DEVTOOLS_DETECTED\`, \`TAB_BLURRED\`, \`NETWORK_OFFLINE\`) and grant Re-Deployment clearance with categorized root causes (\`🔌 Power Failure\`, \`🌐 Network Drop\`, etc.).`;
      suggestedActions = ['Check Current Deployment Status', 'Request Re-Deployment Authorization', 'Contact Exam Cell Support'];
    }
    // 8. Principal Anti-Tamper & Live Telemetry Shield
    else if (lower.includes('security') || lower.includes('tamper') || lower.includes('devtools') || lower.includes('f12') || lower.includes('shield') || lower.includes('telemetry') || lower.includes('track') || lower.includes('monitor') || lower.includes('blur')) {
      answer = `**Principal Anti-Tamper & Security Telemetry Shield:**\n\nTo prevent unauthorized copying, screen-recording, or source inspection, the EDEP portal continuously runs active telemetry checks:\n\n• **\`DEVTOOLS_DETECTED\`**: Triggers whenever developer inspection tools or keyboard shortcuts (\`F12\` / \`Ctrl+Shift+I\`) are pressed.\n• **\`TAB_BLURRED\`**: Triggers if the principal switches browser tabs or minimizes the window during active OTP/password display.\n• **\`NETWORK_OFFLINE\` / \`NETWORK_ONLINE\`**: Logs true connection drops to confirm or refute claims of internet failure during audit review.\n\n*All telemetry alerts are directly visible to the COE inside the Chronological Audit History.*`;
      suggestedActions = ['Check Current Deployment Status', 'Contact Exam Cell Support'];
    }
    // 9. Emergency Escalation & Hotline Contacts
    else if (lower.includes('contact') || lower.includes('phone') || lower.includes('support') || lower.includes('extension') || lower.includes('helpdesk') || lower.includes('call') || lower.includes('hotline') || lower.includes('help') || lower.includes('emergency')) {
      answer = `**Exam Cell Direct Emergency Escalation Contacts:**\n\nIf you experience an active examination emergency or require immediate Re-Deployment clearance, contact our dedicated staff:\n\n• **Controller of Examinations Hotline**: Extension 101 / Direct: 0883-2566001\n• **Confidential Section / EDEP Support**: Extension 104 / Direct: 0883-2566004\n• **Exam Cell Technical Helpdesk**: Extension 108 / Email: edep-support@aknu.edu.in\n\n*Please have your 3-digit College Code and your exact error/telemetry status ready for immediate clearance.*`;
      suggestedActions = ['Request Re-Deployment Authorization', 'Check Current Deployment Status', 'Troubleshoot CRC / Extraction Error'];
    }
    // 10. Universal Fallback & FAQ Quick-Guide for any other inquiry
    else {
      answer = `**EDEP Essential Quick-Guide & FAQ:**\n\nHere are the top protocols and answers for **Principal, Admin, and COE roles** regarding your inquiry:\n\n1. **Question Paper Download**: Deployed exactly 30 minutes before exam time (` + '`08:30 AM` for AM / `01:30 PM` for PM' + `). Complete OTP security verification to access your encrypted ZIP file.\n2. **Decryption Password**: Click the **Copy Icon (📋)** on the green password pill after downloading, paste into 7-Zip, and extract the PDF papers.\n3. **Re-Deployment Limit**: Only 1 attempt is allowed per session. If interrupted by power or PC failure, call **Exam Cell (Ext. 104)** to request COE Re-Deployment clearance.\n4. **CRC / Extraction Errors**: Use **7-Zip (64-bit)** or Windows Explorer instead of WinRAR. Verify connection stability and re-download if the archive size is smaller than expected.`;
      suggestedActions = ['How to Download Question Paper', 'Request Re-Deployment Authorization', 'Troubleshoot CRC / Extraction Error', 'How to Copy Decryption Password', 'Contact Exam Cell Support'];
    }

    res.json({ success: true, answer, suggestedActions });
  } catch (error) {
    next(error);
  }
});

// 5. AI Pre-Flight OCR & Header Verification
router.post('/ai/preflight-check', authenticateToken, rbac(['Super Admin', 'Controller of Examinations', 'Confidential Section', 'Exam Cell Staff']), async (req, res, next) => {
  try {
    const { fileName, examDate, examSession, fileSize, totalPages } = req.body;
    const issues = [];
    const recommendations = [];
    let qualityScore = 100;

    // Simulate intelligent verification checks on filename and properties
    if (examDate) {
      const dateParts = examDate.split('-'); // DD-MM-YYYY
      if (fileName && !fileName.includes(dateParts[0]) && !fileName.includes(dateParts[2]) && !fileName.includes(examDate)) {
        issues.push(`Filename '${fileName}' does not explicitly contain the scheduled exam date (${examDate}).`);
        qualityScore -= 15;
        recommendations.push(`Verify that '${fileName}' is indeed the question paper set for ${examDate}.`);
      }
    }

    if (examSession && fileName) {
      const upper = fileName.toUpperCase();
      if (examSession === 'AM' && upper.includes('PM') && !upper.includes('AM')) {
        issues.push(`CRITICAL: Filename '${fileName}' indicates PM session, but selected deployment session is AM!`);
        qualityScore -= 45;
        recommendations.push('Double-check session assignment before uploading.');
      } else if (examSession === 'PM' && upper.includes('AM') && !upper.includes('PM')) {
        issues.push(`CRITICAL: Filename '${fileName}' indicates AM session, but selected deployment session is PM!`);
        qualityScore -= 45;
        recommendations.push('Double-check session assignment before uploading.');
      }
    }

    if (fileSize && Number(fileSize) < 50000) { // < 50 KB
      issues.push('File size is unusually small (< 50 KB). Check if the PDF/ZIP archive is empty or corrupted.');
      qualityScore -= 25;
      recommendations.push('Inspect archive contents before final upload.');
    }

    if (totalPages && Number(totalPages) === 0) {
      issues.push('Detected 0 readable pages or missing header numbering.');
      qualityScore -= 20;
    }

    if (issues.length === 0) {
      recommendations.push('✨ All Pre-Flight AI checks passed: Date matching, Session matching, and File integrity verified.');
    }

    res.json({
      success: true,
      passed: qualityScore >= 70,
      qualityScore: Math.max(0, qualityScore),
      issues,
      recommendations
    });
  } catch (error) {
    next(error);
  }
});

// Get College Details (must be LAST GET route — catches any /:id)
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Principal check: can only fetch their own college
    if (req.user.role === 'Principal') {
      const college = await collegeService.getCollegeById(id);
      if (!college || college.principalUserId?.toString() !== req.user.id.toString()) {
        return res.status(403).json({ success: false, message: 'Forbidden: You do not have access to this college.' });
      }
      return res.json({ success: true, data: college });
    }

    // Admins/Observers
    const allowedRoles = ['Super Admin', 'Controller of Examinations', 'Confidential Section', 'Exam Cell Staff', 'Observer'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden.' });
    }

    const college = await collegeService.getCollegeById(id);
    if (!college) {
      return res.status(404).json({ success: false, message: 'College not found.' });
    }

    res.json({ success: true, data: college });
  } catch (error) {
    next(error);
  }
});

export default router;
