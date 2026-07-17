import College from '../models/College.js';
import User from '../models/User.js';
import { parseUserAgent } from '../utils/userAgent.js';
import { sendWelcomeEmail } from './emailService.js';

export async function createCollege(data, actorUsername, ip, userAgent) {
  const { collegeCode, collegeName, district, principalName, principalMobile, principalEmail } = data;

  const existingCollege = await College.findOne({ collegeCode });
  if (existingCollege) throw new Error(`College with code ${collegeCode} already exists.`);

  // 1. Create the Principal User record
  const username = `principal_${collegeCode}`;
  const defaultTempPassword = `AKNU_${collegeCode}@123`; // Hardened default temp password
  const principalUser = new User({
    username,
    password: defaultTempPassword,
    role: 'Principal',
    email: principalEmail,
    mobile: principalMobile,
    forcePasswordChange: true
  });
  await principalUser.save();

  // 2. Create the College record linked to the Principal User
  const college = new College({
    collegeCode,
    collegeName,
    district,
    principalName,
    principalMobile,
    principalEmail,
    principalUserId: principalUser._id,
    portalStatus: 'active'
  });
  await college.save();

  // 3. Send welcome email to principal (non-blocking)
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
  sendWelcomeEmail({
    toEmail: principalEmail,
    principalName,
    username,
    password: defaultTempPassword,
    loginUrl
  }).catch(err => console.error('Failed to send welcome email async:', err));

  return college;
}

export async function updateCollege(collegeId, data, actorUsername, ip, userAgent) {
  const college = await College.findById(collegeId);
  if (!college) throw new Error('College not found');

  const { collegeName, district, principalName, principalMobile, principalEmail, portalStatus } = data;

  college.collegeName = collegeName || college.collegeName;
  college.district = district || college.district;
  college.principalName = principalName || college.principalName;
  college.principalMobile = principalMobile || college.principalMobile;
  college.principalEmail = principalEmail || college.principalEmail;
  college.portalStatus = portalStatus || college.portalStatus;

  await college.save();

  // Keep user sync
  if (college.principalUserId) {
    const user = await User.findById(college.principalUserId);
    if (user) {
      user.email = college.principalEmail;
      user.mobile = college.principalMobile;
      user.isActive = (college.portalStatus === 'active');
      await user.save();
    }
  }

  return college;
}

export async function deleteCollegePermanently(collegeId, actorUsername, ip, userAgent) {
  const college = await College.findById(collegeId);
  if (!college) throw new Error('College not found');

  // Delete associated principal user if it exists
  if (college.principalUserId) {
    await User.findByIdAndDelete(college.principalUserId);
  }

  // Delete the college document itself
  await College.findByIdAndDelete(collegeId);

  return college;
}

export async function listColleges() {
  return College.find({}).populate('principalUserId', '-password');
}

export async function getCollegeById(collegeId) {
  return College.findById(collegeId).populate('principalUserId', '-password');
}

export async function bulkCreateColleges(collegesArray, actorUsername, ip, userAgent) {
  const results = {
    successCount: 0,
    errors: []
  };

  for (const item of collegesArray) {
    try {
      const { collegeCode, collegeName, district, principalName, principalMobile, principalEmail } = item;

      if (!collegeCode || !collegeName || !principalName || !principalMobile || !principalEmail) {
        throw new Error('All fields except District (Code, Name, Principal Name, Principal Mobile, Principal Email) are required.');
      }

      // Check duplicates in DB
      const existingCollege = await College.findOne({ collegeCode });
      if (existingCollege) {
        throw new Error(`College code ${collegeCode} already exists.`);
      }

      // Create Principal user
      const username = `Principal_${collegeCode}`;
      const defaultTempPassword = `AKNU_${collegeCode}@2026`;

      const principalUser = new User({
        username,
        password: defaultTempPassword,
        role: 'Principal',
        email: principalEmail,
        mobile: principalMobile,
        forcePasswordChange: true
      });
      await principalUser.save();

      // Create College
      const college = new College({
        collegeCode,
        collegeName,
        district,
        principalName,
        principalMobile,
        principalEmail,
        principalUserId: principalUser._id,
        portalStatus: 'active'
      });
      await college.save();

      // Send welcome email to principal (non-blocking)
      const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
      sendWelcomeEmail({
        toEmail: principalEmail,
        principalName,
        username,
        password: defaultTempPassword,
        loginUrl
      }).catch(err => console.error('Failed to send welcome email async in bulk:', err));

      results.successCount += 1;
    } catch (err) {
      results.errors.push({
        collegeCode: item.collegeCode || 'N/A',
        message: err.message
      });
    }
  }

  return results;
}
