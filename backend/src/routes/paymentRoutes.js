import express from 'express';
import multer from 'multer';
import * as xlsx from 'xlsx';
import StudentMaster from '../models/StudentMaster.js';
import FeeCategory from '../models/FeeCategory.js';
import PaymentTransaction from '../models/PaymentTransaction.js';
import { createRazorpayOrder, verifyRazorpaySignature } from '../services/razorpayService.js';
import { sendStudentFeeOtpEmail } from '../services/emailService.js';
import { authenticateToken } from '../middlewares/auth.js';
import { rbac } from '../middlewares/rbac.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Helper to generate unique receipt number
function generateReceiptNo() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.floor(1000 + Math.random() * 9000);
  return `AKNU-${dateStr}-${randomStr}`;
}

/**
 * Public Endpoint: Student Lookup by Hall Ticket Number
 */
router.get('/student-lookup/:hallTicketNo', async (req, res, next) => {
  try {
    const { hallTicketNo } = req.params;
    const ht = hallTicketNo.trim().toUpperCase();

    // First check StudentMaster
    const StudentMaster = (await import('../models/StudentMaster.js')).default;
    const masterStud = await StudentMaster.findOne({ hallTicketNo: new RegExp(`^${ht}$`, 'i') });

    if (masterStud) {
      return res.json({
        success: true,
        found: true,
        data: {
          studentName: masterStud.studentName,
          collegeCode: masterStud.collegeCode,
          collegeName: masterStud.collegeName,
          level: masterStud.level,
          degree: masterStud.degree || '',
          course: masterStud.course,
          semester: masterStud.semester,
          mobile: masterStud.mobile,
          email: masterStud.email
        }
      });
    }

    // Fallback: Check past successful PaymentTransactions
    const lastTxn = await PaymentTransaction.findOne({ hallTicketNo: new RegExp(`^${ht}$`, 'i'), paymentStatus: 'SUCCESS' }).sort({ createdAt: -1 });

    if (lastTxn) {
      return res.json({
        success: true,
        found: true,
        data: {
          studentName: lastTxn.studentName,
          collegeCode: lastTxn.collegeCode,
          collegeName: lastTxn.collegeName,
          level: lastTxn.level || 'UG',
          degree: lastTxn.degree || '',
          course: lastTxn.course,
          semester: lastTxn.semester,
          mobile: lastTxn.mobile,
          email: lastTxn.email
        }
      });
    }

    res.json({ success: true, found: false });
  } catch (error) {
    next(error);
  }
});

// Public Endpoint: Dynamic Fee Lookup & Calculation
router.post('/categories/lookup', async (req, res, next) => {
  try {
    const {
      hallTicketNo = '',
      categoryType = 'EXAM_FEE',
      level = 'UG',
      degree = '',
      course = '',
      semester = '',
      certType = '',
      examType = 'REGULAR',
      backlogPaperCount = 1,
      passedYear,
      lateFeeSlab = 'NONE',
      quantity = 1
    } = req.body;

    // Determine which DB categoryType to look up
    let dbCategoryType = categoryType;
    if (categoryType === 'EXAM_FEE' || categoryType === 'REGULAR_EXAM_FEE' || categoryType === 'BACKLOG_EXAM_FEE') {
      dbCategoryType = examType === 'BACKLOG' ? 'BACKLOG_EXAM_FEE' : 'REGULAR_EXAM_FEE';
    }
    if (categoryType === 'REVALUATION_FEE') {
      dbCategoryType = 'REVALUATION_FEE';
    }

    // Search matching FeeCategory (most specific to most general)
    let category = null;
    if (categoryType === 'CERTIFICATE_FEE' && certType) {
      category = await FeeCategory.findOne({ categoryType: 'CERTIFICATE_FEE', certType, isActive: true });
      if (!category) {
        category = await FeeCategory.findOne({ categoryType: 'CERTIFICATE_FEE', isActive: true });
      }
    } else {
      if (degree) {
        category = await FeeCategory.findOne({ categoryType: dbCategoryType, level, degree, isActive: true });
      }
      if (!category) {
        category = await FeeCategory.findOne({ categoryType: dbCategoryType, level, isActive: true });
      }
      if (!category) {
        category = await FeeCategory.findOne({ categoryType: dbCategoryType, isActive: true });
      }
      if (!category) {
        if (degree) {
          category = await FeeCategory.findOne({ categoryType: 'EXAM_FEE', level, degree, isActive: true });
        }
        if (!category) {
          category = await FeeCategory.findOne({ categoryType: 'EXAM_FEE', level, isActive: true });
        }
        if (!category) {
          category = await FeeCategory.findOne({ categoryType: 'EXAM_FEE', isActive: true });
        }
      }
    }

    // 1. Mandatory Master Data Configuration Check
    const hasMasterConfig = !!category;
    let baseAmount = category ? category.amount : 0;
    let backlogAmount = 0;
    let belatedFineAmount = 0;
    let lateFeeAmount = 0;
    const currentYear = new Date().getFullYear();

    // 2. Duplicate Payment Check
    let alreadyPaid = false;
    let alreadyPaidNote = '';
    let existingReceiptData = null;

    if (hallTicketNo && hallTicketNo.trim().length >= 3) {
      const ht = hallTicketNo.trim().toUpperCase();
      const dupQuery = {
        hallTicketNo: ht,
        paymentStatus: 'SUCCESS'
      };

      if (categoryType === 'CERTIFICATE_FEE') {
        if (certType) dupQuery.certType = certType;
        else dupQuery.feeCategoryCode = 'CERTIFICATE_FEE';
      } else if (categoryType === 'REVALUATION_FEE') {
        if (semester) dupQuery.semester = semester;
      } else {
        // EXAM_FEE
        if (semester) dupQuery.semester = semester;
        if (examType) dupQuery.examType = examType;
      }

      const dupTxn = await PaymentTransaction.findOne(dupQuery).sort({ createdAt: -1 });
      if (dupTxn) {
        alreadyPaid = true;
        alreadyPaidNote = `Payment already completed for ${dupTxn.studentName || ht} (${dupTxn.feeCategoryName || categoryType}). Receipt No: ${dupTxn.receiptNo}`;
        existingReceiptData = {
          receiptNo: dupTxn.receiptNo,
          paymentId: dupTxn.razorpayPaymentId || `PAY-${dupTxn._id}`,
          amountPaid: dupTxn.amountPaid,
          verifiedAt: dupTxn.updatedAt || dupTxn.createdAt,
          feeCategoryName: dupTxn.feeCategoryName
        };
      }
    }

    if (hasMasterConfig) {
      // 1. Backlog Fee Calculation
      if (examType === 'BACKLOG' && categoryType !== 'CERTIFICATE_FEE') {
        const papers = Math.max(1, Number(backlogPaperCount) || 1);
        const perPaper = (category.backlogPerPaperAmount !== undefined && category.backlogPerPaperAmount !== null) ? category.backlogPerPaperAmount : 350;
        const maxCap = (category.backlogMaxCapAmount !== undefined && category.backlogMaxCapAmount !== null) ? category.backlogMaxCapAmount : category.amount;

        if (papers <= 3) {
          backlogAmount = papers * perPaper;
        } else {
          backlogAmount = maxCap;
        }
        baseAmount = backlogAmount;
      }

      // 2. Belated Year Fine Calculation for Certificates
      if (categoryType === 'CERTIFICATE_FEE' && passedYear) {
        const pYear = Number(passedYear);
        if (!isNaN(pYear) && pYear < currentYear) {
          const elapsedYears = currentYear - pYear;
          const isOD = (certType && certType.toLowerCase().includes('original degree')) || (category.certType && category.certType.toLowerCase().includes('original degree'));

          if (isOD) {
            const odBase = category.amount || 1000;
            const odFineRate = (category.perBelatedYearFineAmount !== undefined && category.perBelatedYearFineAmount !== null) ? category.perBelatedYearFineAmount : 300;

            if (elapsedYears <= 4) {
              baseAmount = odBase;
              belatedFineAmount = 0;
            } else if (elapsedYears <= 10) {
              baseAmount = odBase;
              const extraYears = elapsedYears - 4;
              belatedFineAmount = extraYears * odFineRate;
            } else {
              baseAmount = category.backlogMaxCapAmount || 7500;
              belatedFineAmount = 0;
            }
          } else {
            const penaltyYears = Math.max(0, elapsedYears - 1);
            const fineRate = (category.perBelatedYearFineAmount !== undefined && category.perBelatedYearFineAmount !== null) ? category.perBelatedYearFineAmount : 100;
            belatedFineAmount = penaltyYears * fineRate;
          }
        }
      }

      // 3. Exam Late Fee Calculation (Auto-checked via Cutoff Dates)
      let lateFeeNote = '';
      const now = new Date();
      const isExamFee = ['EXAM_FEE', 'REGULAR_EXAM_FEE', 'BACKLOG_EXAM_FEE', 'REVALUATION_FEE'].includes(categoryType) || (dbCategoryType && dbCategoryType.includes('EXAM')) || (dbCategoryType && dbCategoryType.includes('REVALUATION'));

      if (isExamFee) {
        if (category.lastDateWithoutLateFee) {
          const lastWithout = new Date(category.lastDateWithoutLateFee);
          lastWithout.setHours(23, 59, 59, 999);

          const lastWith = category.lastDateWithLateFee ? new Date(category.lastDateWithLateFee) : null;
          if (lastWith) lastWith.setHours(23, 59, 59, 999);

          if (now > lastWithout) {
            if (lastWith && now <= lastWith) {
              lateFeeAmount = (category.lateFeeSlab1 !== undefined && category.lateFeeSlab1 !== null) ? category.lateFeeSlab1 : 200;
              lateFeeNote = `Late Fee Applied (+₹${lateFeeAmount}) - Past regular deadline`;
            } else {
              lateFeeAmount = (category.lateFeeSlab2 !== undefined && category.lateFeeSlab2 !== null) ? category.lateFeeSlab2 : 500;
              lateFeeNote = `Super Late Fee Applied (+₹${lateFeeAmount}) - Past extended deadline`;
            }
          } else {
            lateFeeNote = 'On Time - No Late Fee';
          }
        } else {
          lateFeeNote = 'On Time - No Late Fee';
        }
      }

      const qty = Math.max(1, Number(quantity) || 1);
      const subtotal = (baseAmount + belatedFineAmount + lateFeeAmount) * qty;

      return res.json({
        success: true,
        hasMasterConfig: true,
        alreadyPaid,
        alreadyPaidNote,
        existingReceiptData,
        categoryId: category._id,
        categoryCode: category.code,
        categoryName: category.name,
        dates: {
          notificationDate: category.notificationDate || null,
          lastDateWithoutLateFee: category.lastDateWithoutLateFee || null,
          lastDateWithLateFee: category.lastDateWithLateFee || null
        },
        lateFeeNote,
        breakdown: {
          baseAmount,
          backlogAmount,
          belatedFineAmount,
          lateFeeAmount,
          quantity: qty,
          totalAmount: subtotal
        }
      });
    }

    // If Master Data FeeCategory does not exist
    return res.json({
      success: true,
      hasMasterConfig: false,
      alreadyPaid,
      alreadyPaidNote,
      existingReceiptData,
      message: 'Fee structure for the selected category is not configured in Master Data by University Admin.',
      breakdown: null
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 1. GET /api/payments/categories
 * Public endpoint to fetch active fee categories
 */
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await FeeCategory.find({ isActive: true }).sort({ categoryType: 1, level: 1, name: 1 });
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
});

/**
 * 2. POST /api/payments/verify-student
 * Public student lookup + send OTP
 */
router.post('/verify-student', async (req, res, next) => {
  try {
    const { hallTicketNo } = req.body;
    if (!hallTicketNo) {
      return res.status(400).json({ success: false, message: 'Hall Ticket Number is required.' });
    }

    const student = await StudentMaster.findOne({ hallTicketNo: hallTicketNo.trim().toUpperCase() });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Hall Ticket Number not found in University Master List. Please check or contact your college.'
      });
    }

    // Generate 6-digit OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    student.otp = {
      code: generatedOtp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 mins
      isVerified: false
    };
    await student.save();

    // Send OTP via Email
    const emailToUse = student.email || `${student.hallTicketNo.toLowerCase()}@aknu.edu.in`;
    await sendStudentFeeOtpEmail({
      toEmail: emailToUse,
      studentName: student.studentName,
      hallTicketNo: student.hallTicketNo,
      otp: generatedOtp
    });

    // Mask email address (e.g., r****h@aknu.edu.in)
    const [emailUser, emailDomain] = emailToUse.split('@');
    const maskedEmail = emailUser.length > 2
      ? `${emailUser[0]}****${emailUser[emailUser.length - 1]}@${emailDomain}`
      : `${emailUser}@${emailDomain}`;

    const maskedMobile = student.mobile.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2');

    res.json({
      success: true,
      message: `OTP sent successfully to registered email address (${maskedEmail}).`,
      data: {
        hallTicketNo: student.hallTicketNo,
        studentName: student.studentName,
        course: student.course,
        level: student.level,
        semester: student.semester,
        collegeCode: student.collegeCode,
        collegeName: student.collegeName,
        maskedEmail,
        maskedMobile,
        // In development mode, return OTP for easy testing
        devOtp: process.env.NODE_ENV === 'development' ? generatedOtp : undefined
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 3. POST /api/payments/confirm-otp
 * Public OTP Verification
 */
router.post('/confirm-otp', async (req, res, next) => {
  try {
    const { hallTicketNo, otp } = req.body;
    if (!hallTicketNo || !otp) {
      return res.status(400).json({ success: false, message: 'Hall Ticket Number and OTP are required.' });
    }

    const student = await StudentMaster.findOne({ hallTicketNo: hallTicketNo.trim().toUpperCase() });
    if (!student || !student.otp || !student.otp.code) {
      return res.status(400).json({ success: false, message: 'OTP not requested or student invalid.' });
    }

    if (student.otp.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new OTP.' });
    }

    if (student.otp.code !== otp.trim()) {
      return res.status(400).json({ success: false, message: 'Invalid OTP entered. Please try again.' });
    }

    student.otp.isVerified = true;
    await student.save();

    res.json({
      success: true,
      message: 'Student verified successfully!',
      data: {
        hallTicketNo: student.hallTicketNo,
        studentName: student.studentName,
        course: student.course,
        level: student.level,
        semester: student.semester,
        collegeCode: student.collegeCode,
        collegeName: student.collegeName
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 4. POST /api/payments/create-student-order
 * Self-Service Public endpoint: Create Razorpay Order with full student + dynamic fee data.
 * No OTP required. Student profile is auto-saved after successful payment.
 */
router.post('/create-student-order', async (req, res, next) => {
  try {
    const {
      hallTicketNo,
      studentName,
      collegeCode,
      collegeName,
      mobile,
      email,
      level,
      degree,
      course,
      semester,
      certType,
      passedYear,
      examType,
      backlogPaperCount,
      categoryType,
      categoryId,       // Optional: matched FeeCategory._id from lookup
      categoryCode,     // Optional: matched category code
      categoryName,     // Display name
      amountPaid,
      feeBreakdown      // Snapshot: { baseAmount, backlogAmount, belatedFineAmount, lateFeeAmount, quantity, totalAmount }
    } = req.body;

    if (!hallTicketNo || !studentName || !collegeCode || !mobile || !amountPaid) {
      return res.status(400).json({
        success: false,
        message: 'Hall Ticket No, Student Name, College Code, Mobile, and Amount are required.'
      });
    }

    const totalAmount = Number(amountPaid);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount.' });
    }

    // 1. Mandatory Master Data Configuration Check
    let dbCategoryType = categoryType;
    if (categoryType === 'EXAM_FEE' || categoryType === 'REGULAR_EXAM_FEE' || categoryType === 'BACKLOG_EXAM_FEE') {
      dbCategoryType = examType === 'BACKLOG' ? 'BACKLOG_EXAM_FEE' : 'REGULAR_EXAM_FEE';
    }
    if (categoryType === 'REVALUATION_FEE') dbCategoryType = 'REVALUATION_FEE';

    let catDoc = null;
    if (categoryId) {
      catDoc = await FeeCategory.findById(categoryId);
    }
    if (!catDoc) {
      if (categoryType === 'CERTIFICATE_FEE' && certType) {
        catDoc = await FeeCategory.findOne({ categoryType: 'CERTIFICATE_FEE', certType, isActive: true });
        if (!catDoc) catDoc = await FeeCategory.findOne({ categoryType: 'CERTIFICATE_FEE', isActive: true });
      } else {
        if (degree) catDoc = await FeeCategory.findOne({ categoryType: dbCategoryType, level, degree, isActive: true });
        if (!catDoc) catDoc = await FeeCategory.findOne({ categoryType: dbCategoryType, level, isActive: true });
        if (!catDoc) catDoc = await FeeCategory.findOne({ categoryType: dbCategoryType, isActive: true });
      }
    }

    if (!catDoc) {
      return res.status(400).json({
        success: false,
        message: 'Payment failed: No active fee structure has been configured in Master Data for this category.'
      });
    }

    // 2. Duplicate Payment Check
    const ht = hallTicketNo.trim().toUpperCase();
    const dupQuery = { hallTicketNo: ht, paymentStatus: 'SUCCESS' };
    if (categoryType === 'CERTIFICATE_FEE') {
      if (certType) dupQuery.certType = certType;
      else dupQuery.feeCategoryCode = 'CERTIFICATE_FEE';
    } else if (categoryType === 'REVALUATION_FEE') {
      if (semester) dupQuery.semester = semester;
    } else {
      if (semester) dupQuery.semester = semester;
      if (examType) dupQuery.examType = examType;
    }

    const existingTxn = await PaymentTransaction.findOne(dupQuery);
    if (existingTxn) {
      return res.status(400).json({
        success: false,
        alreadyPaid: true,
        message: `Payment has already been completed for student ${ht} for this ${existingTxn.feeCategoryName || categoryType}. Receipt No: ${existingTxn.receiptNo}`
      });
    }

    const receiptNo = generateReceiptNo();
    const razorpayOrder = await createRazorpayOrder(totalAmount, receiptNo, {
      hallTicketNo: hallTicketNo.trim().toUpperCase(),
      categoryCode: categoryCode || categoryType || 'DYNAMIC',
      payerType: 'STUDENT'
    });

    const txnData = {
      receiptNo,
      payerType: 'STUDENT',
      hallTicketNo: hallTicketNo.trim().toUpperCase(),
      studentName: studentName.trim(),
      collegeCode: collegeCode.trim().toUpperCase(),
      collegeName: (collegeName || '').trim(),
      mobile: (mobile || '').trim(),
      email: (email || `${hallTicketNo.toLowerCase().trim()}@aknu.edu.in`).trim(),
      level: level || 'UG',
      degree: degree || '',
      course: course || '',
      semester: semester || '',
      certType: certType || '',
      passedYear: passedYear || '',
      examType: examType || 'REGULAR',
      backlogPaperCount: Number(backlogPaperCount) || 1,
      feeCategoryCode: categoryCode || categoryType || 'DYNAMIC',
      feeCategoryName: categoryName || `${degree || ''} ${categoryType || 'Fee'}`.trim(),
      amountPaid: totalAmount,
      feeBreakdown: feeBreakdown || {},
      razorpayOrderId: razorpayOrder.id,
      paymentStatus: 'PENDING',
      verificationStatus: 'PENDING_VERIFICATION'
    };

    // Optionally link matched FeeCategory document
    if (categoryId) {
      txnData.feeCategory = categoryId;
    }

    const transaction = new PaymentTransaction(txnData);
    await transaction.save();

    res.json({
      success: true,
      data: {
        receiptNo,
        transactionId: transaction._id,
        razorpayOrderId: razorpayOrder.id,
        amountPaid: totalAmount,
        amountInPaise: Math.round(totalAmount * 100),
        razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock12345678',
        studentName: studentName.trim(),
        email: txnData.email,
        mobile: txnData.mobile,
        feeCategoryName: txnData.feeCategoryName
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 5. POST /api/payments/verify-signature
 * Public callback after Razorpay Checkout modal completes
 */
router.post('/verify-signature', async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId) {
      return res.status(400).json({ success: false, message: 'Order ID and Payment ID are required.' });
    }

    const isValid = verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature || 'mock_sig_123');
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature. Verification failed.' });
    }

    const transaction = await PaymentTransaction.findOne({ razorpayOrderId });
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Payment transaction record not found.' });
    }

    transaction.razorpayPaymentId = razorpayPaymentId;
    transaction.razorpaySignature = razorpaySignature || 'mock_sig_123';
    transaction.paymentStatus = 'SUCCESS';
    transaction.verificationStatus = 'PENDING_VERIFICATION';
    await transaction.save();

    // Auto-save / upsert student profile into StudentMaster for future auto-fill
    try {
      const StudentMaster = (await import('../models/StudentMaster.js')).default;
      await StudentMaster.findOneAndUpdate(
        { hallTicketNo: transaction.hallTicketNo },
        {
          hallTicketNo: transaction.hallTicketNo,
          studentName: transaction.studentName,
          collegeCode: transaction.collegeCode,
          collegeName: transaction.collegeName,
          level: transaction.level || 'UG',
          degree: transaction.degree || '',
          course: transaction.course,
          semester: transaction.semester,
          mobile: transaction.mobile,
          email: transaction.email
        },
        { upsert: true, new: true }
      );
    } catch (e) {
      console.error('Failed to auto-save StudentMaster profile:', e);
    }

    res.json({
      success: true,
      message: 'Payment completed successfully!',
      data: {
        receiptNo: transaction.receiptNo,
        transactionId: transaction._id,
        amountPaid: transaction.amountPaid,
        paymentStatus: transaction.paymentStatus,
        verificationStatus: transaction.verificationStatus
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 6. POST /api/payments/college-bulk-upload
 * Authenticated (Principal / Admin) College Bulk Payment via Excel
 */
router.post('/college-bulk-upload', authenticateToken, rbac(['Super Admin', 'Admin', 'Principal', 'Controller of Examinations']), upload.single('excelFile'), async (req, res, next) => {
  try {
    const { feeCategoryId } = req.body;
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Excel file is required.' });
    }
    if (!feeCategoryId) {
      return res.status(400).json({ success: false, message: 'Fee Category is required.' });
    }

    const category = await FeeCategory.findById(feeCategoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Fee Category not found.' });
    }

    // Parse Excel Buffer
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!sheetData || sheetData.length === 0) {
      return res.status(400).json({ success: false, message: 'Excel file is empty or formatted incorrectly.' });
    }

    const bulkItems = [];
    let validCount = 0;

    for (const row of sheetData) {
      const htNo = (row['HallTicketNo'] || row['Hall Ticket No'] || row['rollNo'] || row['HTNO'] || '').toString().trim().toUpperCase();
      if (!htNo) continue;

      const student = await StudentMaster.findOne({ hallTicketNo: htNo });
      bulkItems.push({
        hallTicketNo: htNo,
        studentName: student ? student.studentName : (row['StudentName'] || row['Name'] || 'Student'),
        amount: category.amount
      });
      validCount++;
    }

    if (validCount === 0) {
      return res.status(400).json({ success: false, message: 'No valid student Hall Ticket Numbers found in Excel sheet.' });
    }

    const totalAmount = validCount * category.amount;
    const receiptNo = generateReceiptNo();

    const razorpayOrder = await createRazorpayOrder(totalAmount, receiptNo, {
      collegeCode: req.user.username || 'COLLEGE_BULK',
      categoryCode: category.code,
      payerType: 'COLLEGE_BULK',
      studentCount: validCount
    });

    const transaction = new PaymentTransaction({
      receiptNo,
      payerType: 'COLLEGE_BULK',
      feeCategory: category._id,
      feeCategoryCode: category.code,
      feeCategoryName: category.name,
      collegeCode: req.user.username || 'COLLEGE_BULK',
      amountPaid: totalAmount,
      razorpayOrderId: razorpayOrder.id,
      paymentStatus: 'PENDING',
      verificationStatus: 'PENDING_VERIFICATION',
      bulkItems
    });

    await transaction.save();

    res.json({
      success: true,
      message: `Excel processed successfully for ${validCount} students. Total Amount: ₹${totalAmount}`,
      data: {
        receiptNo,
        validCount,
        totalAmount,
        razorpayOrderId: razorpayOrder.id,
        amountInPaise: Math.round(totalAmount * 100),
        keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock12345678',
        categoryName: category.name
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 7. GET /api/payments/receipt/:receiptNo
 * Public receipt lookup
 */
router.get('/receipt/:receiptNo', async (req, res, next) => {
  try {
    const { receiptNo } = req.params;
    const transaction = await PaymentTransaction.findOne({ receiptNo }).populate('feeCategory');
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Receipt not found.' });
    }

    res.json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
});

/**
 * 8. GET /api/payments/finance/queue
 * Finance Team Queue (PENDING_VERIFICATION)
 */
router.get('/finance/queue', authenticateToken, rbac(['Super Admin', 'Admin', 'Finance Verifier', 'Controller of Examinations']), async (req, res, next) => {
  try {
    const transactions = await PaymentTransaction.find({ paymentStatus: 'SUCCESS' })
      .sort({ createdAt: -1 })
      .populate('feeCategory');
    res.json({ success: true, data: transactions });
  } catch (error) {
    next(error);
  }
});

/**
 * 9. POST /api/payments/finance/verify/:id
 * Finance Team Action
 */
router.post('/finance/verify/:id', authenticateToken, rbac(['Super Admin', 'Admin', 'Finance Verifier', 'Controller of Examinations']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, comments } = req.body; // status: 'VERIFIED_BY_FINANCE' or 'REJECTED'

    if (!['VERIFIED_BY_FINANCE', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid verification status.' });
    }

    const transaction = await PaymentTransaction.findById(id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction record not found.' });
    }

    transaction.verificationStatus = status;
    transaction.financeVerifier = req.user._id;
    transaction.financeVerifiedAt = new Date();
    transaction.financeComments = comments || '';
    if (status === 'REJECTED') {
      transaction.rejectionReason = comments || 'Rejected by Finance Verification Team.';
    }

    await transaction.save();

    res.json({ success: true, message: `Transaction updated to ${status}.`, data: transaction });
  } catch (error) {
    next(error);
  }
});

/**
 * 10. GET /api/payments/ar/queue
 * Assistant Registrar Queue (VERIFIED_BY_FINANCE)
 */
router.get('/ar/queue', authenticateToken, rbac(['Super Admin', 'Admin', 'Assistant Registrar', 'Controller of Examinations']), async (req, res, next) => {
  try {
    const transactions = await PaymentTransaction.find({ paymentStatus: 'SUCCESS', verificationStatus: 'VERIFIED_BY_FINANCE' })
      .sort({ createdAt: -1 })
      .populate('feeCategory');
    res.json({ success: true, data: transactions });
  } catch (error) {
    next(error);
  }
});

/**
 * 11. POST /api/payments/ar/approve/:id
 * Assistant Registrar Action
 */
router.post('/ar/approve/:id', authenticateToken, rbac(['Super Admin', 'Admin', 'Assistant Registrar', 'Controller of Examinations']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, comments } = req.body; // status: 'APPROVED_BY_AR' or 'REJECTED'

    if (!['APPROVED_BY_AR', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid approval status.' });
    }

    const transaction = await PaymentTransaction.findById(id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction record not found.' });
    }

    transaction.verificationStatus = status;
    transaction.arApprover = req.user._id;
    transaction.arApprovedAt = new Date();
    transaction.arComments = comments || '';
    if (status === 'REJECTED') {
      transaction.rejectionReason = comments || 'Rejected by Assistant Registrar.';
    }

    await transaction.save();

    res.json({ success: true, message: `Transaction ${status}.`, data: transaction });
  } catch (error) {
    next(error);
  }
});

/**
 * 12. Seed Default Fee Categories & Mock Students (Admin helper)
 */
router.post('/admin/seed-defaults', authenticateToken, rbac(['Super Admin', 'Admin', 'Controller of Examinations']), async (req, res, next) => {
  try {
    // 1. Seed Fee Categories
    const defaultCategories = [
      { categoryType: 'EXAM_FEE', level: 'UG', code: 'UG_REG_SEM4', name: 'UG Semester 4 Regular Exam Fee', amount: 850 },
      { categoryType: 'EXAM_FEE', level: 'UG', code: 'UG_SUPPLY_SINGLE', name: 'UG Supplementary Exam Fee (Single Paper)', amount: 350 },
      { categoryType: 'EXAM_FEE', level: 'UG', code: 'UG_SUPPLY_FULL', name: 'UG Supplementary Exam Fee (Whole Exam)', amount: 850 },
      { categoryType: 'EXAM_FEE', level: 'PG', code: 'PG_REG_SEM2', name: 'PG Semester 2 Regular Exam Fee', amount: 1200 },
      { categoryType: 'CERTIFICATE_FEE', level: 'N/A', code: 'CERT_OD_ABSENTIA', name: 'Original Degree (OD) Certificate - In-Absentia', amount: 1500 },
      { categoryType: 'CERTIFICATE_FEE', level: 'N/A', code: 'CERT_CMM', name: 'Consolidated Marks Memo (CMM)', amount: 600 },
      { categoryType: 'CERTIFICATE_FEE', level: 'N/A', code: 'CERT_PC', name: 'Provisional Certificate (PC)', amount: 500 },
      { categoryType: 'CERTIFICATE_FEE', level: 'N/A', code: 'CERT_MIGRATION', name: 'Migration Certificate', amount: 400 },
      { categoryType: 'CERTIFICATE_FEE', level: 'N/A', code: 'CERT_REVAL', name: 'Answer Script Revaluation Fee (Per Paper)', amount: 750 }
    ];

    for (const cat of defaultCategories) {
      await FeeCategory.findOneAndUpdate({ code: cat.code }, cat, { upsert: true, new: true });
    }

    for (const stud of sampleStudents) {
      await StudentMaster.findOneAndUpdate({ hallTicketNo: stud.hallTicketNo }, stud, { upsert: true, new: true });
    }

    res.json({ success: true, message: 'Fee Categories & Master Student Records seeded successfully!' });
  } catch (error) {
    next(error);
  }
});

/**
 * =========================================================
 * DYNAMIC MASTER DATA CONFIGURATION ENDPOINTS (ADMIN)
 * =========================================================
 */

// 1. GET /api/payments/admin/all-categories
router.get('/admin/all-categories', authenticateToken, rbac(['Super Admin', 'Admin', 'Controller of Examinations', 'Finance Verifier']), async (req, res, next) => {
  try {
    const categories = await FeeCategory.find().sort({ categoryType: 1, level: 1, name: 1 });
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
});

// 2. POST /api/payments/admin/categories (Create Fee Category)
router.post('/admin/categories', authenticateToken, rbac(['Super Admin', 'Admin', 'Controller of Examinations', 'Finance Verifier']), async (req, res, next) => {
  try {
    const {
      categoryType, level, degree, course, semester, certType, code, name, description, amount,
      notificationDate, lastDateWithoutLateFee, lastDateWithLateFee,
      backlogPerPaperAmount, backlogMaxCapAmount, perBelatedYearFineAmount,
      lateFeeSlab1, lateFeeSlab2, lateFeeSlab3, isActive
    } = req.body;

    if (!categoryType || !code || amount === undefined) {
      return res.status(400).json({ success: false, message: 'Category Type, Code, and Amount are required.' });
    }

    const existing = await FeeCategory.findOne({ code: code.trim().toUpperCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: `Fee Category Code "${code}" already exists.` });
    }

    const typeLabel = categoryType === 'REGULAR_EXAM_FEE' ? 'Regular Exam Fee'
      : categoryType === 'BACKLOG_EXAM_FEE' ? 'Backlog Exam Fee'
      : categoryType === 'REVALUATION_FEE' ? 'Revaluation Fee'
      : categoryType === 'CERTIFICATE_FEE' ? 'Certificate Fee'
      : 'Exam Fee';
    const autoName = name && name.trim() ? name.trim() : [degree, course, certType || semester, typeLabel].filter(Boolean).join(' ');

    const catData = {
      categoryType,
      level: level || 'UG',
      degree: degree ? degree.trim() : '',
      course: course ? course.trim() : '',
      semester: semester ? semester.trim() : '',
      certType: certType ? certType.trim() : '',
      code: code.trim().toUpperCase(),
      name: autoName,
      description: description || '',
      amount: Number(amount),
      notificationDate: notificationDate ? new Date(notificationDate) : null,
      lastDateWithoutLateFee: lastDateWithoutLateFee ? new Date(lastDateWithoutLateFee) : null,
      lastDateWithLateFee: lastDateWithLateFee ? new Date(lastDateWithLateFee) : null,
      isActive: isActive !== undefined ? isActive : true
    };
    // Only set optional fee fields if explicitly provided (no defaults)
    if (backlogPerPaperAmount !== undefined && backlogPerPaperAmount !== '') catData.backlogPerPaperAmount = Number(backlogPerPaperAmount);
    if (backlogMaxCapAmount !== undefined && backlogMaxCapAmount !== '') catData.backlogMaxCapAmount = Number(backlogMaxCapAmount);
    if (perBelatedYearFineAmount !== undefined && perBelatedYearFineAmount !== '') catData.perBelatedYearFineAmount = Number(perBelatedYearFineAmount);
    if (lateFeeSlab1 !== undefined && lateFeeSlab1 !== '') catData.lateFeeSlab1 = Number(lateFeeSlab1);
    if (lateFeeSlab2 !== undefined && lateFeeSlab2 !== '') catData.lateFeeSlab2 = Number(lateFeeSlab2);
    if (lateFeeSlab3 !== undefined && lateFeeSlab3 !== '') catData.lateFeeSlab3 = Number(lateFeeSlab3);

    const category = new FeeCategory(catData);

    await category.save();
    res.json({ success: true, message: 'Fee Category created successfully!', data: category });
  } catch (error) {
    next(error);
  }
});

// 3. PUT /api/payments/admin/categories/:id (Update Fee Category)
router.put('/admin/categories/:id', authenticateToken, rbac(['Super Admin', 'Admin', 'Controller of Examinations', 'Finance Verifier']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      categoryType, level, degree, course, semester, certType, name, description, amount,
      notificationDate, lastDateWithoutLateFee, lastDateWithLateFee,
      backlogPerPaperAmount, backlogMaxCapAmount, perBelatedYearFineAmount,
      lateFeeSlab1, lateFeeSlab2, lateFeeSlab3, isActive
    } = req.body;

    const category = await FeeCategory.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Fee Category not found.' });
    }

    if (categoryType) category.categoryType = categoryType;
    if (level) category.level = level;
    if (degree !== undefined) category.degree = degree.trim();
    if (course !== undefined) category.course = course.trim();
    if (semester !== undefined) category.semester = semester.trim();
    if (certType !== undefined) category.certType = certType.trim();

    if (name) {
      category.name = name.trim();
    } else {
      category.name = [category.degree, category.course, category.certType || category.semester, category.categoryType === 'EXAM_FEE' ? 'Exam Fee' : 'Certificate Fee'].filter(Boolean).join(' ');
    }
    if (description !== undefined) category.description = description;
    if (amount !== undefined) category.amount = Number(amount);
    if (notificationDate !== undefined) category.notificationDate = notificationDate ? new Date(notificationDate) : null;
    if (lastDateWithoutLateFee !== undefined) category.lastDateWithoutLateFee = lastDateWithoutLateFee ? new Date(lastDateWithoutLateFee) : null;
    if (lastDateWithLateFee !== undefined) category.lastDateWithLateFee = lastDateWithLateFee ? new Date(lastDateWithLateFee) : null;
    if (backlogPerPaperAmount !== undefined) category.backlogPerPaperAmount = Number(backlogPerPaperAmount);
    if (backlogMaxCapAmount !== undefined) category.backlogMaxCapAmount = Number(backlogMaxCapAmount);
    if (perBelatedYearFineAmount !== undefined) category.perBelatedYearFineAmount = Number(perBelatedYearFineAmount);
    if (lateFeeSlab1 !== undefined) category.lateFeeSlab1 = Number(lateFeeSlab1);
    if (lateFeeSlab2 !== undefined) category.lateFeeSlab2 = Number(lateFeeSlab2);
    if (lateFeeSlab3 !== undefined) category.lateFeeSlab3 = Number(lateFeeSlab3);
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();
    res.json({ success: true, message: 'Fee Category updated successfully!', data: category });
  } catch (error) {
    next(error);
  }
});

// 4. DELETE /api/payments/admin/categories/:id
router.delete('/admin/categories/:id', authenticateToken, rbac(['Super Admin', 'Admin', 'Controller of Examinations']), async (req, res, next) => {
  try {
    const { id } = req.params;
    await FeeCategory.findByIdAndDelete(id);
    res.json({ success: true, message: 'Fee Category deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

// 5. GET /api/payments/admin/students (Search Student Master)
router.get('/admin/students', authenticateToken, rbac(['Super Admin', 'Admin', 'Controller of Examinations', 'Finance Verifier', 'Assistant Registrar']), async (req, res, next) => {
  try {
    const { q } = req.query;
    let query = {};
    if (q) {
      const searchRegex = new RegExp(q.trim(), 'i');
      query = {
        $or: [
          { hallTicketNo: searchRegex },
          { studentName: searchRegex },
          { collegeCode: searchRegex },
          { course: searchRegex }
        ]
      };
    }

    const students = await StudentMaster.find(query).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: students });
  } catch (error) {
    next(error);
  }
});

// 6. POST /api/payments/admin/students (Add Single Student)
router.post('/admin/students', authenticateToken, rbac(['Super Admin', 'Admin', 'Controller of Examinations']), async (req, res, next) => {
  try {
    const { hallTicketNo, studentName, course, level, semester, collegeCode, collegeName, mobile, email, dob } = req.body;
    if (!hallTicketNo || !studentName || !course || !collegeCode || !mobile) {
      return res.status(400).json({ success: false, message: 'Hall Ticket No, Name, Course, College Code, and Mobile are required.' });
    }

    const htNo = hallTicketNo.trim().toUpperCase();
    const existing = await StudentMaster.findOne({ hallTicketNo: htNo });
    if (existing) {
      return res.status(400).json({ success: false, message: `Student with Hall Ticket Number "${htNo}" already exists.` });
    }

    const student = new StudentMaster({
      hallTicketNo: htNo,
      studentName: studentName.trim(),
      course: course.trim(),
      level: level || 'UG',
      semester: semester || 'Sem I',
      collegeCode: collegeCode.trim().toUpperCase(),
      collegeName: collegeName ? collegeName.trim() : '',
      mobile: mobile.trim(),
      email: email ? email.trim().toLowerCase() : '',
      dob: dob || ''
    });

    await student.save();
    res.json({ success: true, message: 'Student Master record added successfully!', data: student });
  } catch (error) {
    next(error);
  }
});

// 7. PUT /api/payments/admin/students/:id (Update Student)
router.put('/admin/students/:id', authenticateToken, rbac(['Super Admin', 'Admin', 'Controller of Examinations']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { studentName, course, level, semester, collegeCode, collegeName, mobile, email, dob } = req.body;

    const student = await StudentMaster.findById(id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student record not found.' });
    }

    if (studentName) student.studentName = studentName.trim();
    if (course) student.course = course.trim();
    if (level) student.level = level;
    if (semester) student.semester = semester;
    if (collegeCode) student.collegeCode = collegeCode.trim().toUpperCase();
    if (collegeName !== undefined) student.collegeName = collegeName.trim();
    if (mobile) student.mobile = mobile.trim();
    if (email !== undefined) student.email = email.trim().toLowerCase();
    if (dob !== undefined) student.dob = dob;

    await student.save();
    res.json({ success: true, message: 'Student Master record updated successfully!', data: student });
  } catch (error) {
    next(error);
  }
});

// 8. DELETE /api/payments/admin/students/:id
router.delete('/admin/students/:id', authenticateToken, rbac(['Super Admin', 'Admin', 'Controller of Examinations']), async (req, res, next) => {
  try {
    const { id } = req.params;
    await StudentMaster.findByIdAndDelete(id);
    res.json({ success: true, message: 'Student record deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

// 9. POST /api/payments/admin/upload-students-excel (Bulk Import Master Students)
router.post('/admin/upload-students-excel', authenticateToken, rbac(['Super Admin', 'Admin', 'Controller of Examinations']), upload.single('excelFile'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Excel file is required.' });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!sheetData || sheetData.length === 0) {
      return res.status(400).json({ success: false, message: 'Excel file is empty or formatted incorrectly.' });
    }

    let insertedCount = 0;
    let updatedCount = 0;

    for (const row of sheetData) {
      const htNo = (row['HallTicketNo'] || row['Hall Ticket No'] || row['rollNo'] || row['HTNO'] || '').toString().trim().toUpperCase();
      const name = (row['StudentName'] || row['Name'] || row['Student Name'] || '').toString().trim();
      const course = (row['Course'] || row['Branch'] || 'UG').toString().trim();
      const level = (row['Level'] || 'UG').toString().trim().toUpperCase();
      const sem = (row['Semester'] || row['Sem'] || 'Sem I').toString().trim();
      const clgCode = (row['CollegeCode'] || row['College Code'] || '101').toString().trim().toUpperCase();
      const clgName = (row['CollegeName'] || row['College Name'] || '').toString().trim();
      const mobile = (row['Mobile'] || row['Phone'] || '9876543210').toString().trim();
      const email = (row['Email'] || row['Email Address'] || `${htNo.toLowerCase()}@aknu.edu.in`).toString().trim().toLowerCase();

      if (!htNo || !name) continue;

      const doc = {
        hallTicketNo: htNo,
        studentName: name,
        course,
        level: ['UG', 'PG', 'DIPLOMA'].includes(level) ? level : 'UG',
        semester: sem,
        collegeCode: clgCode,
        collegeName: clgName,
        mobile,
        email
      };

      const resUpdate = await StudentMaster.findOneAndUpdate(
        { hallTicketNo: htNo },
        doc,
        { upsert: true, new: true, rawResult: true }
      );

      if (resUpdate.lastErrorObject?.updatedExisting) {
        updatedCount++;
      } else {
        insertedCount++;
      }
    }

    res.json({
      success: true,
      message: `Bulk Student Master Import Complete! Inserted: ${insertedCount}, Updated: ${updatedCount} student records.`
    });
  } catch (error) {
    next(error);
  }
});

export default router;
