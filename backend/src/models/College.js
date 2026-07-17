import mongoose from 'mongoose';

const collegeSchema = new mongoose.Schema({
  collegeCode: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  collegeName: {
    type: String,
    required: true,
    trim: true
  },
  district: {
    type: String,
    trim: true
  },
  principalName: {
    type: String,
    required: true,
    trim: true
  },
  principalMobile: {
    type: String,
    required: true,
    trim: true
  },
  principalEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  portalStatus: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  principalUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  dayPasswordEncrypted: {
    type: String,
    default: ''
  },
  dayPasswordIv: {
    type: String,
    default: ''
  },
  dayPasswordTag: {
    type: String,
    default: ''
  },
  zipFileHash: {
    type: String,
    default: ''
  },
  examDate: {
    type: String,
    default: ''
  },
  examSession: {
    type: String,
    enum: ['', 'AM', 'PM'],
    default: ''
  },
  isDeployed: {
    type: Boolean,
    default: false
  },
  deployedAt: {
    type: Date,
    default: null
  },
  downloadOtp: {
    type: String,
    default: ''
  },
  downloadOtpExpires: {
    type: Date,
    default: null
  },
  zipDownloaded: {
    type: Boolean,
    default: false
  },
  zipDownloadedAt: {
    type: Date,
    default: null
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  isRedeploy: {
    type: Boolean,
    default: false
  },
  downloadOtpVerified: {
    type: Boolean,
    default: false
  },
  initialDeployedAt: {
    type: Date,
    default: null
  },
  firstDownloadedAt: {
    type: Date,
    default: null
  },
  redeployedAt: {
    type: Date,
    default: null
  },
  redeployReason: {
    type: String,
    default: ''
  },
  redownloadedAt: {
    type: Date,
    default: null
  },
  zipUploadedAt: {
    type: Date,
    default: null
  },
  zipUploadedIp: {
    type: String,
    default: ''
  },
  deployedIp: {
    type: String,
    default: ''
  },
  redeployedIp: {
    type: String,
    default: ''
  },
  firstDownloadedIp: {
    type: String,
    default: ''
  },
  redownloadedIp: {
    type: String,
    default: ''
  },
  auditLogs: [
    {
      action: {
        type: String,
        enum: ['UPLOAD', 'DEPLOY', 'DOWNLOAD', 'REDEPLOY', 'REDOWNLOAD', 'TELEMETRY_ALERT', 'DEVTOOLS_DETECTED', 'NETWORK_OFFLINE', 'TAB_BLURRED', 'OTP_FAILED']
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      reason: {
        type: String,
        default: ''
      },
      category: {
        type: String,
        default: ''
      },
      performedBy: {
        type: String,
        default: ''
      },
      ipAddress: {
        type: String,
        default: ''
      }
    }
  ],
  telemetryLogs: [
    {
      eventType: {
        type: String,
        required: true
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      details: {
        type: String,
        default: ''
      },
      ipAddress: {
        type: String,
        default: ''
      },
      userAgent: {
        type: String,
        default: ''
      }
    }
  ]
}, {
  timestamps: true
});

const College = mongoose.model('College', collegeSchema);
export default College;
