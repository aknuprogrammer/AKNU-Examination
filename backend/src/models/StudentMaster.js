import mongoose from 'mongoose';

const studentMasterSchema = new mongoose.Schema({
  hallTicketNo: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  studentName: {
    type: String,
    required: true,
    trim: true
  },
  course: {
    type: String,
    required: true,
    trim: true
  },
  level: {
    type: String,
    enum: ['UG', 'PG', 'DIPLOMA'],
    required: true
  },
  branch: {
    type: String,
    trim: true
  },
  semester: {
    type: String,
    required: true,
    trim: true
  },
  collegeCode: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  collegeName: {
    type: String,
    trim: true
  },
  mobile: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  dob: {
    type: String, // YYYY-MM-DD
    trim: true
  },
  otp: {
    code: String,
    expiresAt: Date,
    isVerified: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

const StudentMaster = mongoose.model('StudentMaster', studentMasterSchema);
export default StudentMaster;
