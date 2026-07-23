import mongoose from 'mongoose';

const paymentTransactionSchema = new mongoose.Schema({
  receiptNo: {
    type: String,
    required: true,
    unique: true
  },
  payerType: {
    type: String,
    enum: ['STUDENT', 'COLLEGE_BULK'],
    required: true
  },
  feeCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FeeCategory',
    required: false   // Optional: self-service dynamic fee may not map to a category
  },
  feeCategoryCode: String,
  feeCategoryName: String,

  // Student Identification
  hallTicketNo: {
    type: String,
    trim: true,
    uppercase: true
  },
  studentName: String,
  collegeCode: {
    type: String,
    trim: true,
    uppercase: true
  },
  collegeName: String,
  mobile: String,
  email: String,

  // Academic Details
  level: { type: String, trim: true },           // UG / PG / DIPLOMA
  degree: { type: String, trim: true },          // B.Tech, M.Sc, etc.
  course: { type: String, trim: true },          // CSE, Chemistry, etc.
  semester: { type: String, trim: true },        // Semester I … VIII
  certType: { type: String, trim: true },        // OD, CMM, PC, etc.
  passedYear: { type: String, trim: true },      // Year of Passing (for belated fine)
  examType: { type: String, trim: true },        // REGULAR / BACKLOG
  backlogPaperCount: { type: Number },           // Number of backlog papers

  // Fee Breakdown (snapshot at time of payment)
  feeBreakdown: {
    baseAmount: Number,
    backlogAmount: Number,
    belatedFineAmount: Number,
    lateFeeAmount: Number,
    quantity: Number,
    totalAmount: Number
  },

  amountPaid: {
    type: Number,
    required: true
  },

  // Razorpay Specific Fields
  razorpayOrderId: {
    type: String,
    required: true
  },
  razorpayPaymentId: String,
  razorpaySignature: String,
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'SUCCESS', 'FAILED'],
    default: 'PENDING'
  },
  verificationStatus: {
    type: String,
    enum: ['PENDING_VERIFICATION', 'VERIFIED_BY_FINANCE', 'APPROVED_BY_AR', 'REJECTED'],
    default: 'PENDING_VERIFICATION'
  },

  // Bulk Excel Info if PayerType is COLLEGE_BULK
  bulkItems: [{
    hallTicketNo: String,
    studentName: String,
    amount: Number
  }],

  // Finance Verification
  financeVerifier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  financeVerifiedAt: Date,
  financeComments: String,

  // AR Approval
  arApprover: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  arApprovedAt: Date,
  arComments: String,
  rejectionReason: String
}, {
  timestamps: true
});

const PaymentTransaction = mongoose.model('PaymentTransaction', paymentTransactionSchema);
export default PaymentTransaction;
