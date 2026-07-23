import mongoose from 'mongoose';

const feeCategorySchema = new mongoose.Schema({
  categoryType: {
    type: String,
    required: true,
    enum: ['REGULAR_EXAM_FEE', 'BACKLOG_EXAM_FEE', 'REVALUATION_FEE', 'CERTIFICATE_FEE', 'EXAM_FEE']
  },
  level: {
    type: String,
    trim: true,
    default: 'UG'
  },
  degree: {
    type: String,
    trim: true,
    default: ''
  },
  course: {
    type: String,
    trim: true,
    default: ''
  },
  semester: {
    type: String,
    trim: true,
    default: ''
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    trim: true,
    default: ''
  },
  certType: {
    type: String,
    trim: true,
    default: ''
  },
  // Backlog / Supplementary Exam Configuration
  isBacklogSupported: {
    type: Boolean,
    default: false
  },
  backlogFeeType: {
    type: String,
    enum: ['PER_PAPER_WITH_CAP', 'FLAT'],
    default: 'PER_PAPER_WITH_CAP'
  },
  backlogPerPaperAmount: { type: Number },
  backlogMaxCapAmount: { type: Number },

  // Belated Year Fine Configuration
  isBelatedYearFineApplicable: {
    type: Boolean,
    default: false
  },
  belatedFineRule: {
    type: String,
    enum: ['OD_SLAB', 'PER_BELATED_YEAR'],
    default: 'PER_BELATED_YEAR'
  },
  perBelatedYearFineAmount: { type: Number },
  freeYearsCount: { type: Number },

  // Exam Notification & Deadline Dates
  notificationDate: { type: Date },
  lastDateWithoutLateFee: { type: Date },
  lastDateWithLateFee: { type: Date },

  // Exam Late Fees
  lateFeeSlab1: { type: Number },
  lateFeeSlab2: { type: Number },
  lateFeeSlab3: { type: Number },

  // Multiplier / Quantity (e.g. transcript copies)
  isQuantitySupported: {
    type: Boolean,
    default: false
  },

  description: {
    type: String,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const FeeCategory = mongoose.model('FeeCategory', feeCategorySchema);
export default FeeCategory;
