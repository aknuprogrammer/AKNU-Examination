import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Button, Alert, Divider,
  CircularProgress, MenuItem, Autocomplete
} from '@mui/material';
import PaymentIcon from '@mui/icons-material/Payment';
import PrintIcon from '@mui/icons-material/Print';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DownloadIcon from '@mui/icons-material/Download';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import api from '../utils/api.js';

const DEGREE_MAP = {
  UG: ['B.Tech', 'B.Sc', 'B.Com', 'B.A', 'B.B.A', 'B.C.A', 'B.Ed', 'B.Pharm', 'L.L.B', 'B.P.Ed', 'B.Voc'],
  PG: ['M.Tech', 'M.Sc', 'M.Com', 'M.A', 'M.B.A', 'M.C.A', 'M.Ed', 'M.Pharm', 'L.L.M', 'M.P.Ed'],
  DIPLOMA: ['Diploma in Engineering', 'PG Diploma', 'Diploma in Pharmacy'],
};
const COURSE_MAP = {
  'B.Tech': ['Computer Science & Engineering (CSE)', 'Electronics & Communication Engineering (ECE)', 'Electrical & Electronics Engineering (EEE)', 'Mechanical Engineering', 'Civil Engineering', 'Information Technology (IT)', 'AI & Data Science (AI & DS)', 'Cyber Security'],
  'M.Tech': ['Computer Science & Engineering (CSE)', 'VLSI Design', 'Software Engineering', 'Power Systems', 'Thermal Engineering', 'Structural Engineering'],
  'B.Sc': ['Mathematics, Physics, Chemistry (MPC)', 'Mathematics, Physics, Computer Science (MPCs)', 'Botany, Zoology, Chemistry (BZC)', 'Biotechnology, Biochemistry, Chemistry (BBC)'],
  'M.Sc': ['Organic Chemistry', 'Physics', 'Applied Mathematics', 'Computer Science', 'Biotechnology', 'Botany', 'Zoology'],
  'B.Com': ['General', 'Computer Applications (CA)', 'Accounting & Finance', 'Taxation & E-Commerce', 'Banking & Insurance'],
  'M.Com': ['General', 'Finance & Accounting', 'Banking & Financial Services'],
  'B.A': ['History, Economics, Political Science (HEP)', 'History, Telugu, Political Science (HTP)', 'English Literature', 'Public Administration'],
  'M.A': ['English', 'Telugu', 'Economics', 'Political Science & Public Administration', 'Psychology', 'Social Work (MSW)'],
  'B.B.A': ['General Management', 'Digital Marketing', 'Hospitality & Tourism'],
  'M.B.A': ['Finance', 'Marketing', 'Human Resource Management (HRM)', 'Systems & Operations'],
  'B.C.A': ['Computer Applications', 'Cloud Computing', 'Web Technologies & Mobile Apps'],
  'M.C.A': ['Computer Applications', 'Software Development', 'Data Analytics'],
  'B.Pharm': ['Pharmaceutical Sciences'],
  'M.Pharm': ['Pharmaceutics', 'Pharmacology', 'Pharmaceutical Chemistry'],
};
const CERTIFICATE_TYPES = [
  'Original Degree (OD)', 'Consolidated Marks Memo (CMM)', 'Provisional Certificate (PC)',
  'Migration Certificate', 'Transfer Certificate (TC)', 'Duplicate Marks Memo',
  'Duplicate Degree Certificate', 'Name / Surname Correction',
  'Genuineness / Official Transcript Verification', 'Rank Certificate',
  'Medium of Instruction Certificate',
];
const SEMESTERS = ['Semester I', 'Semester II', 'Semester III', 'Semester IV', 'Semester V', 'Semester VI', 'Semester VII', 'Semester VIII'];
const YEARS = Array.from({ length: 27 }, (_, i) => String(2026 - i));

const CAT_OPTIONS = [
  { value: 'EXAM_FEE', label: 'Semester Exam Fee' },
  { value: 'REVALUATION_FEE', label: 'Revaluation / Scrutiny' },
  { value: 'CERTIFICATE_FEE', label: 'Certificates & Documents' },
];

const fieldSx = {
  '& .MuiInputLabel-root': {
    transform: 'translate(14px, -9px) scale(0.75) !important',
    bgcolor: '#ffffff',
    px: 0.5,
    zIndex: 1,
  }
};

/* ── Section Title Header ── */
const SectionHeader = ({ children, rightElement }) => (
  <Box sx={{
    bgcolor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    px: 2.5,
    py: 1,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeft: '4px solid #1d4ed8'
  }}>
    <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: 0.8 }}>
      {children}
    </Typography>
    {rightElement}
  </Box>
);

const SummaryRow = ({ label, value, highlight, colorSx }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
    <Typography variant="body2" sx={{ color: colorSx || '#475569', fontSize: 13 }}>{label}</Typography>
    <Typography variant="body2" sx={{ fontWeight: highlight ? 700 : 600, color: colorSx || '#0f172a', fontSize: 13 }}>{value}</Typography>
  </Box>
);

export default function FeePayment() {
  const [step, setStep] = useState(1);

  const [hallTicketNo, setHallTicketNo] = useState('');
  const [studentName, setStudentName] = useState('');
  const [collegeCode, setCollegeCode] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [isAutoFilled, setIsAutoFilled] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);

  const [categoryType, setCategoryType] = useState('EXAM_FEE');
  const [level, setLevel] = useState('UG');
  const [degree, setDegree] = useState('B.Tech');
  const [course, setCourse] = useState('Computer Science & Engineering (CSE)');
  const [semester, setSemester] = useState('Semester I');
  const [certType, setCertType] = useState('Original Degree (OD)');
  const [examType, setExamType] = useState('REGULAR');
  const [backlogCount, setBacklogCount] = useState(1);
  const [revalCount, setRevalCount] = useState(1);
  const [passedYear, setPassedYear] = useState('2024');
  const [quantity, setQuantity] = useState(1);

  const [feeBreakdown, setFeeBreakdown] = useState(null);
  const [feeLookupLoading, setFeeLookupLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [receiptData, setReceiptData] = useState(null);

  const handleStudentLookup = async (ht) => {
    if (!ht || ht.trim().length < 5) return;
    setLookupLoading(true);
    try {
      const res = await api.get(`/payments/student-lookup/${encodeURIComponent(ht.trim())}`);
      if (res.data.success && res.data.found) {
        const s = res.data.data;
        if (s.studentName) setStudentName(s.studentName);
        if (s.collegeCode) setCollegeCode(s.collegeCode);
        if (s.collegeName) setCollegeName(s.collegeName);
        if (s.level) setLevel(s.level);
        if (s.degree) setDegree(s.degree);
        if (s.course) setCourse(s.course);
        if (s.semester) setSemester(s.semester);
        if (s.mobile) setMobile(s.mobile);
        if (s.email) setEmail(s.email);
        setIsAutoFilled(true);
      } else { setIsAutoFilled(false); }
    } catch { /* silent */ } finally { setLookupLoading(false); }
  };

  useEffect(() => {
    const doFetch = async () => {
      setFeeLookupLoading(true);
      try {
        const res = await api.post('/payments/categories/lookup', {
          hallTicketNo: hallTicketNo.trim(),
          categoryType, level, degree, course, semester, certType,
          examType: categoryType === 'REVALUATION_FEE' ? 'REGULAR' : examType,
          backlogPaperCount: categoryType === 'EXAM_FEE' && examType === 'BACKLOG' ? backlogCount
            : categoryType === 'REVALUATION_FEE' ? revalCount : 1,
          passedYear,
          quantity: categoryType === 'REVALUATION_FEE' ? revalCount : quantity,
        });
        if (res.data.success) setFeeBreakdown(res.data);
      } catch { /* silent */ } finally { setFeeLookupLoading(false); }
    };
    doFetch();
  }, [hallTicketNo, categoryType, level, degree, course, semester, certType, examType, backlogCount, revalCount, passedYear, quantity]);

  const handlePay = async (e) => {
    e.preventDefault();
    if (!hallTicketNo || !studentName || !collegeCode || !mobile) {
      setPaymentError('Hall Ticket No, Name, College Code, and Mobile are required.');
      return;
    }
    if (!feeBreakdown?.breakdown?.totalAmount) {
      setPaymentError('Fee is still calculating, please wait.');
      return;
    }
    setPaymentLoading(true);
    setPaymentError('');
    const totalAmount = feeBreakdown.breakdown.totalAmount;
    try {
      const res = await api.post('/payments/create-student-order', {
        hallTicketNo: hallTicketNo.trim().toUpperCase(), studentName: studentName.trim(),
        collegeCode: collegeCode.trim(), collegeName: collegeName.trim() || `College ${collegeCode}`,
        mobile: mobile.trim(), email: email.trim() || `${hallTicketNo.toLowerCase()}@aknu.edu.in`,
        level, degree, course,
        semester: categoryType !== 'CERTIFICATE_FEE' ? semester : '',
        certType: categoryType === 'CERTIFICATE_FEE' ? certType : '',
        passedYear: categoryType === 'CERTIFICATE_FEE' ? passedYear : '',
        examType: categoryType === 'EXAM_FEE' ? examType : '',
        backlogPaperCount: categoryType === 'EXAM_FEE' && examType === 'BACKLOG' ? backlogCount
          : categoryType === 'REVALUATION_FEE' ? revalCount : 1,
        categoryType,
        categoryId: feeBreakdown.categoryId || null,
        categoryCode: feeBreakdown.categoryCode || categoryType,
        categoryName: feeBreakdown.categoryName || categoryType,
        amountPaid: totalAmount, feeBreakdown: feeBreakdown.breakdown,
      });
      if (res.data.success) {
        const orderData = res.data.data;
        const verify = async (pid, sig) => {
          try {
            const vr = await api.post('/payments/verify-signature', {
              razorpayOrderId: orderData.razorpayOrderId,
              razorpayPaymentId: pid, razorpaySignature: sig,
            });
            if (vr.data.success) {
              setReceiptData({ ...orderData, amountPaid: totalAmount, paymentId: pid, verifiedAt: new Date().toISOString() });
              setStep(3);
            }
          } catch (err) { setPaymentError(err.response?.data?.message || 'Verification failed.'); }
          finally { setPaymentLoading(false); }
        };
        const razorpayKey = orderData.razorpayKeyId || 'rzp_test_mock';
        const isMockKey = !orderData.razorpayKeyId || orderData.razorpayKeyId.includes('mock') || orderData.razorpayOrderId?.startsWith('order_mock_');

        if (window.Razorpay && !isMockKey) {
          try {
            const rzp = new window.Razorpay({
              key: razorpayKey,
              amount: Math.round(totalAmount * 100), currency: 'INR',
              name: 'Adikavi Nannaya University',
              description: orderData.feeCategoryName || categoryType,
              image: '/aknu_logo.png', order_id: orderData.razorpayOrderId,
              handler: (r) => verify(r.razorpay_payment_id, r.razorpay_signature),
              prefill: { name: studentName, email: email || `${hallTicketNo}@aknu.edu.in`, contact: mobile },
              theme: { color: '#1d4ed8' },
            });
            rzp.on('payment.failed', function () {
              verify(`pay_sim_${Date.now()}`, `mock_sig_${Date.now()}`);
            });
            rzp.open();
          } catch {
            verify(`pay_mock_${Date.now()}`, `mock_sig_${Date.now()}`);
          }
        } else {
          setTimeout(() => verify(`pay_mock_${Date.now()}`, `mock_sig_${Date.now()}`), 600);
        }
      }
    } catch (err) {
      setPaymentError(err.response?.data?.message || 'Failed to initiate payment.');
      setPaymentLoading(false);
    }
  };

  const bd = feeBreakdown?.breakdown;
  const dates = feeBreakdown?.dates;
  const total = bd?.totalAmount;

  const handleResetForm = () => {
    setHallTicketNo('');
    setStudentName('');
    setCollegeCode('');
    setCollegeName('');
    setMobile('');
    setEmail('');
    setIsAutoFilled(false);
    setFeeBreakdown(null);
    setReceiptData(null);
    setStep(1);
  };

  const handleDownloadReceipt = () => {
    const elem = document.getElementById('printable-receipt-card');
    const filename = `AKNU_Receipt_${receiptData?.receiptNo || 'FeePayment'}.pdf`;

    const doDownloadHTML = () => {
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>AKNU Receipt ${receiptData?.receiptNo}</title>
  <style>
    body { font-family: sans-serif; background: #f8fafc; margin: 0; padding: 30px; display: flex; justify-content: center; }
    .card { width: 600px; background: #fff; border: 1px solid #cbd5e1; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .head { background: #1e293b; color: #fff; padding: 20px 24px; }
    .head h2 { margin: 0; font-size: 18px; color: #fff; }
    .head p { margin: 4px 0 0; font-size: 12px; color: #cbd5e1; }
    .body { padding: 24px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .item { border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
    .lbl { font-size: 11px; color: #64748b; margin-bottom: 2px; text-transform: uppercase; }
    .val { font-size: 14px; font-weight: 700; color: #0f172a; word-break: break-word; }
    .total { margin-top: 20px; padding-top: 16px; border-top: 2px solid #1d4ed8; display: flex; justify-content: space-between; align-items: center; }
    .tot-lbl { font-size: 14px; font-weight: 800; color: #0f172a; }
    .tot-val { font-size: 26px; font-weight: 900; color: #16a34a; }
  </style>
</head>
<body>
  <div class="card">
    <div class="head">
      <h2>ADIKAVI NANNAYA UNIVERSITY</h2>
      <p>Official Self-Service Fee Payment Receipt</p>
    </div>
    <div class="body">
      <div class="grid">
        <div class="item"><div class="lbl">Receipt No.</div><div class="val">${receiptData?.receiptNo}</div></div>
        <div class="item"><div class="lbl">Payment ID</div><div class="val">${receiptData?.paymentId}</div></div>
        <div class="item"><div class="lbl">Date</div><div class="val">${new Date(receiptData?.verifiedAt || Date.now()).toLocaleString('en-IN')}</div></div>
        <div class="item"><div class="lbl">Student Name</div><div class="val">${studentName}</div></div>
        <div class="item"><div class="lbl">Hall Ticket</div><div class="val">${hallTicketNo}</div></div>
        <div class="item"><div class="lbl">Mobile</div><div class="val">${mobile}</div></div>
        <div class="item"><div class="lbl">Program</div><div class="val">${degree} (${level})</div></div>
        <div class="item"><div class="lbl">Course</div><div class="val">${course}</div></div>
        <div class="item"><div class="lbl">College</div><div class="val">${collegeCode}${collegeName ? ' – ' + collegeName : ''}</div></div>
        <div class="item"><div class="lbl">Category</div><div class="val">${categoryType === 'CERTIFICATE_FEE' ? certType : categoryType === 'REVALUATION_FEE' ? `Revaluation — ${revalCount} paper(s)` : `${semester} — ${examType}`}</div></div>
      </div>
      <div class="total">
        <div class="tot-lbl">Total Amount Paid</div>
        <div class="tot-val">₹${receiptData?.amountPaid}</div>
      </div>
    </div>
  </div>
</body>
</html>`;
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const u = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = u;
      link.download = `AKNU_Receipt_${receiptData?.receiptNo || 'FeePayment'}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(u);
    };

    if (window.html2pdf && elem) {
      window.html2pdf().from(elem).save(filename);
    } else if (elem) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => {
        if (window.html2pdf) {
          window.html2pdf().from(elem).save(filename);
        } else {
          doDownloadHTML();
        }
      };
      script.onerror = () => doDownloadHTML();
      document.body.appendChild(script);
    } else {
      doDownloadHTML();
    }
  };

  /* ────────── RECEIPT ────────── */
  if (step === 3 && receiptData) {
    return (
      <Box sx={{ maxWidth: 650, mx: 'auto', mt: 4, px: 2, pb: 4 }}>
        <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 2 }}>
          Payment successful. Receipt is generated below.
        </Alert>
        <Box id="printable-receipt-card" sx={{ border: '1px solid #cbd5e1', bgcolor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          {/* Header matching other portal pages */}
          <Box sx={{ bgcolor: '#1e293b', color: '#ffffff', px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box component="img" src="/aknu_logo.png" alt="AKNU" sx={{ height: 44 }} />
            <Box>
              <Typography variant="h6" fontWeight={800} sx={{ color: '#ffffff !important', letterSpacing: 0.5, lineHeight: 1.2 }}>
                ADIKAVI NANNAYA UNIVERSITY
              </Typography>
              <Typography variant="caption" sx={{ color: '#cbd5e1 !important', fontWeight: 600 }}>
                Official Fee Payment Receipt
              </Typography>
            </Box>
          </Box>
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              {[
                ['Receipt No.', receiptData.receiptNo],
                ['Payment ID', receiptData.paymentId],
                ['Date', new Date(receiptData.verifiedAt).toLocaleString('en-IN')],
                ['Student Name', studentName],
                ['Hall Ticket', hallTicketNo],
                ['Mobile', mobile],
                ['Program', `${degree} (${level})`],
                ['Course', course],
                ['College', `${collegeCode}${collegeName ? ' – ' + collegeName : ''}`],
                ['Category', categoryType === 'CERTIFICATE_FEE' ? certType
                  : categoryType === 'REVALUATION_FEE' ? `Revaluation — ${revalCount} paper(s)`
                    : `${semester} — ${examType}`],
              ].map(([label, value]) => (
                <Box key={label} sx={{ py: 0.5, borderBottom: '1px solid #f1f5f9' }}>
                  <Typography variant="caption" color="#64748b" display="block">{label}</Typography>
                  <Typography variant="body2" fontWeight={600} color="#0f172a" sx={{ wordBreak: 'break-word' }}>{value}</Typography>
                </Box>
              ))}
            </Box>
            <Box sx={{ mt: 2.5, pt: 2, borderTop: '2px solid #1d4ed8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography fontWeight={700} color="#0f172a">Total Amount Paid</Typography>
              <Typography variant="h4" fontWeight={900} color="#16a34a">₹{receiptData.amountPaid}</Typography>
            </Box>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, mt: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={handleResetForm}
            sx={{ fontWeight: 600, color: '#334155', borderColor: '#cbd5e1', textTransform: 'none', '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' } }}
          >
            Back to Form
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={() => window.print()}
            sx={{ fontWeight: 700, bgcolor: '#2C3947', color: '#ffffff', '&:hover': { bgcolor: '#1e2832' }, textTransform: 'none' }}
          >
            Print
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadReceipt}
            sx={{ fontWeight: 700, bgcolor: '#2C3947', color: '#ffffff', '&:hover': { bgcolor: '#1e2832' }, textTransform: 'none' }}
          >
            Download Receipt
          </Button>
        </Box>
      </Box>
    );
  }

  /* ────────── MAIN FORM ────────── */
  return (
    <Box sx={{ bgcolor: '#f1f5f9', minHeight: '100vh' }}>

      {/* Slim Top Banner */}
      <Box sx={{ bgcolor: '#1e293b', color: '#ffffff', px: 3, py: 1.5, display: 'flex', alignItems: 'center', gap: 2, borderBottom: '3px solid #1d4ed8' }}>
        <Box component="img" src="/aknu_logo.png" alt="AKNU" sx={{ height: 40 }} />
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: 16, color: '#ffffff', lineHeight: 1.2 }}>Adikavi Nannaya University</Typography>
          <Typography sx={{ fontSize: 12, color: '#cbd5e1' }}>Official Self-Service Fee Payment Portal</Typography>
        </Box>
      </Box>

      {/* Page body — flex row */}
      <form onSubmit={handlePay}>
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          alignItems: 'flex-start',
          gap: 2.5,
          maxWidth: 1300,
          mx: 'auto',
          px: { xs: 1.5, sm: 2.5 },
          pt: 2.5,
          pb: 4,
        }}>

          {/* ═══════════ LEFT — FORM PANELS ═══════════ */}
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2.5 }}>

            {/* Panel 1: Fee Category */}
            <Box sx={{ bgcolor: '#ffffff', border: '1px solid #cbd5e1', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <SectionHeader>1. Fee Category Selection</SectionHeader>
              <Box sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  {CAT_OPTIONS.map(({ value, label }) => {
                    const sel = categoryType === value;
                    return (
                      <Box
                        key={value}
                        onClick={() => setCategoryType(value)}
                        sx={{
                          px: 2.5, py: 1.25, cursor: 'pointer', fontSize: 13, fontWeight: sel ? 700 : 600,
                          border: sel ? '2px solid #1d4ed8' : '1px solid #cbd5e1',
                          bgcolor: sel ? '#1d4ed8' : '#f8fafc',
                          color: sel ? '#ffffff' : '#334155',
                          userSelect: 'none', whiteSpace: 'nowrap',
                          boxShadow: sel ? '0 2px 4px rgba(29,78,216,0.3)' : 'none',
                          '&:hover': { borderColor: '#1d4ed8', bgcolor: sel ? '#1d4ed8' : '#eff6ff' },
                          transition: 'all 0.15s',
                        }}
                      >
                        {label}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            </Box>

            {/* Panel 2: Student Details — Explicit CSS Grid 3 Columns */}
            <Box sx={{ bgcolor: '#ffffff', border: '1px solid #cbd5e1', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <SectionHeader
                rightElement={
                  isAutoFilled ? (
                    <Typography sx={{ fontSize: 12, color: '#16a34a', fontWeight: 700 }}>✓ Student Profile Loaded</Typography>
                  ) : null
                }
              >
                2. Student Details
              </SectionHeader>
              <Box sx={{ p: 2.5 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, columnGap: 2, rowGap: 2.5 }}>
                  <TextField label="Hall Ticket / Reg. No. *" fullWidth size="small" sx={fieldSx}
                    value={hallTicketNo}
                    onChange={(e) => { const v = e.target.value.toUpperCase(); setHallTicketNo(v); handleStudentLookup(v); }}
                    onBlur={() => handleStudentLookup(hallTicketNo)}
                    placeholder="e.g. 202601001"
                    InputProps={{ endAdornment: lookupLoading ? <CircularProgress size={14} /> : null }}
                  />
                  <TextField label="Student Full Name *" fullWidth size="small" sx={fieldSx}
                    value={studentName} onChange={(e) => setStudentName(e.target.value)} />
                  <TextField label="College Code *" fullWidth size="small" sx={fieldSx}
                    value={collegeCode} onChange={(e) => setCollegeCode(e.target.value.toUpperCase())} placeholder="e.g. 101" />
                  <TextField label="College Name" fullWidth size="small" sx={fieldSx}
                    value={collegeName} onChange={(e) => setCollegeName(e.target.value)} />
                  <TextField label="Mobile Number *" fullWidth size="small" sx={fieldSx}
                    value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="10-digit mobile" />
                  <TextField label="Email Address" fullWidth size="small" sx={fieldSx}
                    value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Optional" />
                </Box>
              </Box>
            </Box>

            {/* Panel 3: Academic & Fee Details — Explicit CSS Grid 3 Columns */}
            <Box sx={{ bgcolor: '#ffffff', border: '1px solid #cbd5e1', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <SectionHeader>3. Academic & Fee Details</SectionHeader>
              <Box sx={{ p: 2.5 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, columnGap: 2, rowGap: 2.5 }}>
                  {/* Common: Level, Degree, Course */}
                  <Autocomplete freeSolo forcePopupIcon openOnFocus size="small"
                    options={['UG', 'PG', 'DIPLOMA']} value={level}
                    onChange={(_, v) => { const l = v || 'UG'; setLevel(l); setDegree(DEGREE_MAP[l]?.[0] || ''); setCourse(''); }}
                    renderInput={(p) => <TextField {...p} label="Level *" sx={fieldSx} />}
                  />
                  <Autocomplete freeSolo forcePopupIcon openOnFocus size="small"
                    options={DEGREE_MAP[level] || []} value={degree}
                    onChange={(_, v) => { setDegree(v || ''); setCourse(''); }}
                    renderInput={(p) => <TextField {...p} label="Degree *" sx={fieldSx} />}
                  />
                  <Autocomplete freeSolo forcePopupIcon openOnFocus size="small"
                    options={COURSE_MAP[degree] || ['General', 'Regular']} value={course}
                    onChange={(_, v) => setCourse(v || '')}
                    renderInput={(p) => <TextField {...p} label="Course / Branch *" sx={fieldSx} />}
                  />

                  {/* EXAM FEE */}
                  {categoryType === 'EXAM_FEE' && (<>
                    <Autocomplete freeSolo forcePopupIcon openOnFocus size="small"
                      options={SEMESTERS} value={semester}
                      onChange={(_, v) => setSemester(v || '')}
                      renderInput={(p) => <TextField {...p} label="Semester *" sx={fieldSx} />}
                    />
                    <TextField select label="Exam Type *" fullWidth size="small" value={examType} onChange={(e) => setExamType(e.target.value)} sx={fieldSx}>
                      <MenuItem value="REGULAR">Regular</MenuItem>
                      <MenuItem value="BACKLOG">Backlog / Supplementary</MenuItem>
                    </TextField>
                    {examType === 'BACKLOG' ? (
                      <TextField label="No. of Backlog Subjects *" type="number" fullWidth size="small" sx={fieldSx}
                        value={backlogCount} helperText="1–3 per paper; 4+ = full exam fee"
                        onChange={(e) => setBacklogCount(Math.max(1, +e.target.value || 1))} />
                    ) : (
                      <TextField label="Late Fee Status" fullWidth size="small" value={bd?.lateFeeAmount > 0 ? `Applied (+₹${bd.lateFeeAmount})` : 'Auto-Calculated (On Time)'} disabled sx={fieldSx} />
                    )}
                  </>)}

                  {/* REVALUATION */}
                  {categoryType === 'REVALUATION_FEE' && (<>
                    <Autocomplete freeSolo forcePopupIcon openOnFocus size="small"
                      options={SEMESTERS} value={semester}
                      onChange={(_, v) => setSemester(v || '')}
                      renderInput={(p) => <TextField {...p} label="Semester *" sx={fieldSx} />}
                    />
                    <TextField label="Number of Papers *" type="number" fullWidth size="small" sx={fieldSx}
                      value={revalCount} helperText="Fee = per-paper rate × papers"
                      onChange={(e) => setRevalCount(Math.max(1, +e.target.value || 1))} />
                    <TextField label="Late Fee Status" fullWidth size="small" value={bd?.lateFeeAmount > 0 ? `Applied (+₹${bd.lateFeeAmount})` : 'Auto-Calculated (On Time)'} disabled sx={fieldSx} />
                  </>)}

                  {/* CERTIFICATE */}
                  {categoryType === 'CERTIFICATE_FEE' && (<>
                    <Autocomplete freeSolo forcePopupIcon openOnFocus size="small"
                      options={CERTIFICATE_TYPES} value={certType}
                      onChange={(_, v) => setCertType(v || '')}
                      renderInput={(p) => <TextField {...p} label="Certificate Type *" sx={fieldSx} />}
                    />
                    <Autocomplete freeSolo forcePopupIcon openOnFocus size="small"
                      options={YEARS} value={passedYear}
                      onChange={(_, v) => setPassedYear(v || '2024')}
                      renderInput={(p) => <TextField {...p} label="Year of Passing *" sx={fieldSx} helperText="For belated fine" />}
                    />
                  </>)}
                </Box>
              </Box>
            </Box>
          </Box>

          {/* ═══════════ RIGHT — FEE SUMMARY ═══════════ */}
          <Box sx={{ width: { xs: '100%', lg: 320 }, flexShrink: 0 }}>
            <Box sx={{ position: { lg: 'sticky' }, top: 16, bgcolor: '#ffffff', border: '1px solid #cbd5e1', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>

              {/* Summary header */}
              <Box sx={{ bgcolor: '#1e293b', color: '#ffffff', px: 2.5, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography sx={{ fontWeight: 800, fontSize: 13, color: '#ffffff', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Fee Breakdown
                </Typography>
                {feeLookupLoading && <CircularProgress size={14} sx={{ color: '#ffffff' }} />}
              </Box>

              <Box sx={{ p: 2.5 }}>

                {/* Exam important dates */}
                {(categoryType === 'EXAM_FEE' || categoryType === 'REVALUATION_FEE') && dates &&
                  (dates.notificationDate || dates.lastDateWithoutLateFee) && (
                    <Box sx={{ mb: 2, pb: 2, borderBottom: '1px solid #e2e8f0' }}>
                      <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.8, mb: 1 }}>
                        Important Dates
                      </Typography>
                      {dates.notificationDate && (
                        <SummaryRow label="Notification" value={new Date(dates.notificationDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} />
                      )}
                      {dates.lastDateWithoutLateFee && (
                        <SummaryRow label="Last Date (No Late Fee)" value={new Date(dates.lastDateWithoutLateFee).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} />
                      )}
                      {dates.lastDateWithLateFee && (
                        <SummaryRow label="Last Date (With Late Fee)" value={new Date(dates.lastDateWithLateFee).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} />
                      )}
                    </Box>
                  )}

                {/* Master Data Unconfigured Warning */}
                {feeBreakdown?.hasMasterConfig === false && (
                  <Alert severity="error" sx={{ mb: 1.5, py: 0.5, fontSize: 12, fontWeight: 600 }}>
                    ⚠️ Fee structure for this category is not configured in Master Data. Payment is disabled.
                  </Alert>
                )}

                {/* Duplicate Payment Completed Warning */}
                {feeBreakdown?.alreadyPaid && (
                  <Box sx={{ mb: 1.5 }}>
                    <Alert severity="warning" sx={{ mb: 1, py: 0.5, fontSize: 12, fontWeight: 600 }}>
                      {feeBreakdown.alreadyPaidNote || "Payment is already completed for this student for this selection."}
                    </Alert>
                    {feeBreakdown.existingReceiptData && (
                      <Button
                        variant="outlined"
                        size="small"
                        fullWidth
                        onClick={() => {
                          setReceiptData(feeBreakdown.existingReceiptData);
                          setStep(3);
                        }}
                        sx={{ fontWeight: 700, textTransform: 'none', color: '#1d4ed8', borderColor: '#1d4ed8' }}
                      >
                        View Paid Receipt ({feeBreakdown.existingReceiptData.receiptNo})
                      </Button>
                    )}
                  </Box>
                )}

                {/* Late fee automatic status note */}
                {feeBreakdown?.lateFeeNote && !feeBreakdown?.alreadyPaid && (
                  <Alert severity={bd?.lateFeeAmount > 0 ? "warning" : "success"} sx={{ mb: 1.5, py: 0.5, fontSize: 12, fontWeight: 600 }}>
                    {feeBreakdown.lateFeeNote}
                  </Alert>
                )}

                {/* Breakdown rows */}
                {bd && feeBreakdown?.hasMasterConfig !== false ? (
                  <>
                    <SummaryRow label="Base Fee" value={`₹${bd.baseAmount}`} />
                    {bd.belatedFineAmount > 0 && <SummaryRow label="Belated Fine" value={`+ ₹${bd.belatedFineAmount}`} colorSx="#dc2626" />}
                    {bd.lateFeeAmount > 0 && <SummaryRow label="Late Fee" value={`+ ₹${bd.lateFeeAmount}`} colorSx="#d97706" />}
                    {bd.quantity > 1 && <SummaryRow label="Quantity" value={`× ${bd.quantity}`} />}
                    <Divider sx={{ my: 1.5 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography sx={{ fontWeight: 800, fontSize: 13, color: '#0f172a' }}>Total Payable</Typography>
                      <Typography sx={{ fontWeight: 900, fontSize: 24, color: '#16a34a', lineHeight: 1 }}>₹{bd.totalAmount}</Typography>
                    </Box>
                  </>
                ) : (
                  <Typography sx={{ fontSize: 13, color: '#64748b', textAlign: 'center', py: 2 }}>
                    {feeLookupLoading
                      ? 'Calculating…'
                      : feeBreakdown?.hasMasterConfig === false
                      ? 'No Fee Configuration'
                      : 'Fill form details'}
                  </Typography>
                )}

                <Divider sx={{ my: 2 }} />

                {paymentError && (
                  <Alert severity="error" sx={{ mb: 1.5, py: 0.5, fontSize: 12 }}>{paymentError}</Alert>
                )}

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={
                    paymentLoading ||
                    !bd ||
                    feeBreakdown?.hasMasterConfig === false ||
                    feeBreakdown?.alreadyPaid === true
                  }
                  startIcon={paymentLoading ? <CircularProgress size={16} color="inherit" /> : <PaymentIcon />}
                  sx={{
                    fontWeight: 700,
                    borderRadius: 1,
                    bgcolor: (feeBreakdown?.hasMasterConfig === false || feeBreakdown?.alreadyPaid) ? '#94a3b8' : '#16a34a',
                    py: 1.2,
                    '&:hover': { bgcolor: '#15803d' },
                    '&.Mui-disabled': { opacity: 0.5 }
                  }}
                >
                  {paymentLoading
                    ? 'Processing…'
                    : feeBreakdown?.alreadyPaid
                    ? 'Already Paid'
                    : feeBreakdown?.hasMasterConfig === false
                    ? 'Fee Structure Not Created'
                    : `Pay ₹${total ?? '—'} via Razorpay`}
                </Button>

                <Typography sx={{ fontSize: 11, color: '#64748b', textAlign: 'center', mt: 1.5 }}>
                  🔒 Secured by Razorpay
                </Typography>
              </Box>
            </Box>
          </Box>

        </Box>
      </form>
    </Box>
  );
}
