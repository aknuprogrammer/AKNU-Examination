import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Tabs, Tab, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Button, Chip, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem, CircularProgress, Alert,
  IconButton, Tooltip, Divider, Grid, TablePagination
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ReceiptIcon from '@mui/icons-material/Receipt';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import CloseIcon from '@mui/icons-material/Close';
import api from '../utils/api.js';

export default function PaymentVerification() {
  const [tabValue, setTabValue] = useState(0); // 0 = Finance Queue, 1 = AR Queue
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState('ALL');

  // Action Dialog State
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [actionType, setActionType] = useState(''); // 'VERIFY' | 'APPROVE' | 'REJECT_FINANCE' | 'REJECT_AR'
  const [comments, setComments] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Modals for Receipt & All Details
  const [receiptModalTxn, setReceiptModalTxn] = useState(null);
  const [detailsModalTxn, setDetailsModalTxn] = useState(null);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let endpoint = '/payments/finance/queue';
      if (tabValue === 1) endpoint = '/payments/ar/queue';

      const res = await api.get(endpoint);
      if (res.data.success) {
        setTransactions(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load transaction queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(0);
    fetchTransactions();
  }, [tabValue]);

  const paginatedTransactions = rowsPerPage === 'ALL'
    ? transactions
    : transactions.slice(page * Number(rowsPerPage), page * Number(rowsPerPage) + Number(rowsPerPage));

  const handleOpenActionDialog = (txn, type) => {
    setSelectedTxn(txn);
    setActionType(type);
    setComments('');
    setErrorMsg('');
  };

  const handleExecuteAction = async () => {
    if (!selectedTxn) return;
    setActionLoading(true);
    setErrorMsg('');

    try {
      let endpoint = '';
      let payload = { comments };

      if (actionType === 'VERIFY') {
        endpoint = `/payments/finance/verify/${selectedTxn._id}`;
        payload.status = 'VERIFIED_BY_FINANCE';
      } else if (actionType === 'APPROVE') {
        endpoint = `/payments/ar/approve/${selectedTxn._id}`;
        payload.status = 'APPROVED_BY_AR';
      } else if (actionType === 'REJECT_FINANCE') {
        endpoint = `/payments/finance/verify/${selectedTxn._id}`;
        payload.status = 'REJECTED';
      } else if (actionType === 'REJECT_AR') {
        endpoint = `/payments/ar/approve/${selectedTxn._id}`;
        payload.status = 'REJECTED';
      }

      const res = await api.post(endpoint, payload);
      if (res.data.success) {
        setSelectedTxn(null);
        fetchTransactions();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update transaction status.');
    } finally {
      setActionLoading(false);
    }
  };

  // Export to Excel / CSV Helper
  const handleExportToExcel = () => {
    if (!transactions || transactions.length === 0) return;

    const queueName = tabValue === 0 ? 'Finance_Verification_Queue' : 'AR_Approval_Queue';
    const headers = [
      'Receipt No', 'Payer Type', 'Student Name', 'Hall Ticket No',
      'College Code', 'College Name', 'Mobile', 'Program/Degree',
      'Course', 'Category Name', 'Amount Paid (INR)', 'Payment Status',
      'Verification Status', 'Date'
    ];

    const rows = transactions.map(t => [
      `"${t.receiptNo || ''}"`,
      `"${t.payerType || 'STUDENT'}"`,
      `"${t.studentName || ''}"`,
      `"${t.hallTicketNo || ''}"`,
      `"${t.collegeCode || ''}"`,
      `"${t.collegeName || ''}"`,
      `"${t.mobile || ''}"`,
      `"${t.degree || ''} (${t.level || ''})"`,
      `"${t.course || ''}"`,
      `"${t.feeCategoryName || t.feeCategoryCode || ''}"`,
      t.amountPaid || 0,
      `"${t.paymentStatus || ''}"`,
      `"${t.verificationStatus || ''}"`,
      `"${new Date(t.createdAt).toLocaleString('en-IN')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `AKNU_${queueName}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download Receipt PDF Helper
  const handleDownloadReceiptPDF = (txn) => {
    const elem = document.getElementById('verification-receipt-modal-card');
    const filename = `AKNU_Receipt_${txn?.receiptNo || 'Receipt'}.pdf`;

    const doDownloadHTML = () => {
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>AKNU Receipt ${txn?.receiptNo}</title>
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
    .total { margin-top: 20px; padding-top: 16px; border-top: 2px solid #2C3947; display: flex; justify-content: space-between; align-items: center; }
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
        <div class="item"><div class="lbl">Receipt No.</div><div class="val">${txn?.receiptNo}</div></div>
        <div class="item"><div class="lbl">Payment ID</div><div class="val">${txn?.razorpayPaymentId || 'N/A'}</div></div>
        <div class="item"><div class="lbl">Date</div><div class="val">${new Date(txn?.createdAt).toLocaleString('en-IN')}</div></div>
        <div class="item"><div class="lbl">Student Name</div><div class="val">${txn?.studentName || 'N/A'}</div></div>
        <div class="item"><div class="lbl">Hall Ticket</div><div class="val">${txn?.hallTicketNo || 'N/A'}</div></div>
        <div class="item"><div class="lbl">Mobile</div><div class="val">${txn?.mobile || 'N/A'}</div></div>
        <div class="item"><div class="lbl">Program</div><div class="val">${txn?.degree || ''} (${txn?.level || ''})</div></div>
        <div class="item"><div class="lbl">Course</div><div class="val">${txn?.course || 'N/A'}</div></div>
        <div class="item"><div class="lbl">College</div><div class="val">${txn?.collegeCode || ''}${txn?.collegeName ? ' – ' + txn?.collegeName : ''}</div></div>
        <div class="item"><div class="lbl">Category</div><div class="val">${txn?.feeCategoryName || txn?.feeCategoryCode || 'Fee'}</div></div>
      </div>
      <div class="total">
        <div class="tot-lbl">Total Amount Paid</div>
        <div class="tot-val">₹${txn?.amountPaid}</div>
      </div>
    </div>
  </div>
</body>
</html>`;
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const u = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = u;
      link.download = `AKNU_Receipt_${txn?.receiptNo || 'Receipt'}.html`;
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

  return (
    <Box>
      {/* Header Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Fee Verification & <span style={{ color: '#C2A56D' }}>Audit Dashboard</span>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Verify online student fee receipts, audit bank transactions, and issue official university fee clearance approvals.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          startIcon={<FileDownloadIcon />}
          onClick={handleExportToExcel}
          disabled={transactions.length === 0}
          sx={{ fontWeight: 600, textTransform: 'none', bgcolor: '#ffffff' }}
        >
          Export CSV
        </Button>
      </Box>

      {/* Tabs & Rows per page Controls */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Tabs value={tabValue} onChange={(e, val) => setTabValue(val)} indicatorColor="primary" textColor="primary">
          <Tab label="Finance Verification" sx={{ fontWeight: 700 }} />
          <Tab label="Assistant Registrar (AR) Verification" sx={{ fontWeight: 700 }} />
        </Tabs>

        <TextField
          select
          label="Rows per page"
          size="small"
          value={rowsPerPage}
          onChange={(e) => {
            const val = e.target.value;
            setRowsPerPage(val === 'ALL' ? 'ALL' : parseInt(val, 10));
            setPage(0);
          }}
          sx={{ minWidth: 140, mb: 0.5 }}
        >
          <MenuItem value="ALL">All</MenuItem>
          <MenuItem value={10}>10</MenuItem>
          <MenuItem value={20}>20</MenuItem>
          <MenuItem value={50}>50</MenuItem>
          <MenuItem value={100}>100</MenuItem>
        </TextField>
      </Box>

      {/* Transactions Queue Table */}
      {loading ? (
        <Typography>Loading verification queue...</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Txn ID / Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Payer & Details</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Amount (₹)</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Payment Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Verification Stage</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No transactions pending verification in this queue.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTransactions.map((txn) => (
                  <TableRow key={txn._id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={800} color="primary.main">
                        {txn.razorpayPaymentId || txn.receiptNo}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(txn.createdAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>
                        {txn.payerType === 'STUDENT' ? txn.studentName : `College Bulk (${txn.collegeCode})`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        HT No: {txn.hallTicketNo || 'Bulk Batch'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={800} color="success.main">₹{txn.amountPaid}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={txn.paymentStatus} size="small" color={txn.paymentStatus === 'SUCCESS' ? 'success' : 'error'} sx={{ fontWeight: 800 }} />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={txn.verificationStatus}
                        size="small"
                        color={
                          txn.verificationStatus === 'APPROVED_BY_AR' ? 'success' :
                            txn.verificationStatus === 'VERIFIED_BY_FINANCE' ? 'info' :
                              txn.verificationStatus === 'REJECTED' ? 'error' : 'warning'
                        }
                        sx={{ fontWeight: 800 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', alignItems: 'center' }}>
                        {/* 1. View & Download Receipt Icon */}
                        <Tooltip title="View & Download Receipt">
                          <IconButton size="small" sx={{ color: 'text.secondary' }} onClick={() => setReceiptModalTxn(txn)}>
                            <ReceiptIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {/* 2. View All Details Icon */}
                        <Tooltip title="View All Transaction Details">
                          <IconButton size="small" sx={{ color: 'text.secondary' }} onClick={() => setDetailsModalTxn(txn)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {/* 3. Stage 1: Finance Verification Icons */}
                        {tabValue === 0 && (
                          <>
                            <Tooltip title="Verify / Approve Payment">
                              <IconButton size="small" sx={{ color: 'text.secondary' }} onClick={() => handleOpenActionDialog(txn, 'VERIFY')}>
                                <CheckCircleIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Reject Payment">
                              <IconButton size="small" sx={{ color: 'text.secondary' }} onClick={() => handleOpenActionDialog(txn, 'REJECT_FINANCE')}>
                                <CancelIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}

                        {/* 4. Stage 2: AR Approval Icons */}
                        {tabValue === 1 && (
                          <>
                            <Tooltip title="Assistant Registrar Sign-Off Approval">
                              <IconButton size="small" sx={{ color: 'text.secondary' }} onClick={() => handleOpenActionDialog(txn, 'APPROVE')}>
                                <VerifiedUserIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Reject Payment">
                              <IconButton size="small" sx={{ color: 'text.secondary' }} onClick={() => handleOpenActionDialog(txn, 'REJECT_AR')}>
                                <CancelIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Action Dialog Modal */}
      <Dialog open={!!selectedTxn} onClose={() => setSelectedTxn(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {actionType.startsWith('VERIFY') ? 'Finance Team Verification' :
            actionType.startsWith('APPROVE') ? 'Assistant Registrar (AR) Sign-Off' : 'Reject Transaction'}
        </DialogTitle>
        <DialogContent dividers>
          {errorMsg && <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>}
          {selectedTxn && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">Receipt Ref</Typography>
              <Typography variant="subtitle2" fontWeight={800}>{selectedTxn.receiptNo}</Typography>
              <Typography variant="caption" color="text.secondary">Amount</Typography>
              <Typography variant="subtitle2" fontWeight={800} color="success.main">₹{selectedTxn.amountPaid}</Typography>
            </Box>
          )}

          <TextField
            label="Verification Notes / Comments"
            multiline
            rows={3}
            fullWidth
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Add optional verification notes or rejection reason..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedTxn(null)} disabled={actionLoading}>Cancel</Button>
          <Button
            variant="contained"
            color={actionType.includes('REJECT') ? 'error' : 'success'}
            onClick={handleExecuteAction}
            disabled={actionLoading}
          >
            {actionLoading ? <CircularProgress size={20} color="inherit" /> : 'Confirm Action'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 🧾 RECEIPT VIEW & DOWNLOAD MODAL */}
      <Dialog open={!!receiptModalTxn} onClose={() => setReceiptModalTxn(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography variant="subtitle1" fontWeight={800}>Fee Payment Receipt Preview</Typography>
          <IconButton onClick={() => setReceiptModalTxn(null)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {receiptModalTxn && (
            <Box id="verification-receipt-modal-card" sx={{ border: '1px solid #cbd5e1', bgcolor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
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
                    ['Receipt No.', receiptModalTxn.receiptNo],
                    ['Payment ID', receiptModalTxn.razorpayPaymentId || 'N/A'],
                    ['Date', new Date(receiptModalTxn.createdAt).toLocaleString('en-IN')],
                    ['Student Name', receiptModalTxn.studentName || 'N/A'],
                    ['Hall Ticket', receiptModalTxn.hallTicketNo || 'N/A'],
                    ['Mobile', receiptModalTxn.mobile || 'N/A'],
                    ['Program', `${receiptModalTxn.degree || ''} (${receiptModalTxn.level || ''})`],
                    ['Course', receiptModalTxn.course || 'N/A'],
                    ['College', `${receiptModalTxn.collegeCode || ''}${receiptModalTxn.collegeName ? ' – ' + receiptModalTxn.collegeName : ''}`],
                    ['Category', receiptModalTxn.feeCategoryName || receiptModalTxn.feeCategoryCode || 'Fee'],
                  ].map(([label, value]) => (
                    <Box key={label} sx={{ py: 0.5, borderBottom: '1px solid #f1f5f9' }}>
                      <Typography variant="caption" color="#64748b" display="block">{label}</Typography>
                      <Typography variant="body2" fontWeight={600} color="#0f172a" sx={{ wordBreak: 'break-word' }}>{value}</Typography>
                    </Box>
                  ))}
                </Box>
                <Box sx={{ mt: 2.5, pt: 2, borderTop: '2px solid #2C3947', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography fontWeight={700} color="#0f172a">Total Amount Paid</Typography>
                  <Typography variant="h4" fontWeight={900} color="#16a34a">₹{receiptModalTxn.amountPaid}</Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="outlined" onClick={() => setReceiptModalTxn(null)}>Close</Button>
          <Box sx={{ flex: 1 }} />
          <Button variant="contained" startIcon={<PrintIcon />} onClick={() => window.print()} sx={{ bgcolor: '#2C3947' }}>Print</Button>
          <Button variant="contained" startIcon={<DownloadIcon />} onClick={() => handleDownloadReceiptPDF(receiptModalTxn)} sx={{ bgcolor: '#2C3947' }}>Download Receipt</Button>
        </DialogActions>
      </Dialog>

      {/* 🔍 ALL TRANSACTION & STUDENT DETAILS MODAL */}
      <Dialog open={!!detailsModalTxn} onClose={() => setDetailsModalTxn(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#1e293b', color: '#ffffff', py: 2 }}>
          <Typography variant="h6" fontWeight={800} sx={{ color: '#ffffff !important' }}>
            Complete Transaction & Audit Record
          </Typography>
          <IconButton onClick={() => setDetailsModalTxn(null)} size="small" sx={{ color: '#ffffff' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3, bgcolor: '#f8fafc' }}>
          {detailsModalTxn && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

              {/* Section 1: Student Identification */}
              <Paper elevation={0} sx={{ p: 2.5, border: '1px solid #cbd5e1', bgcolor: '#ffffff', borderRadius: 1.5 }}>
                <Typography variant="subtitle2" fontWeight={800} color="#1d4ed8" sx={{ textTransform: 'uppercase', letterSpacing: 0.8, mb: 2, borderBottom: '2px solid #e2e8f0', pb: 1 }}>
                  1. Student Identification & Contact Details
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
                  {[
                    ['Student Name', detailsModalTxn.studentName],
                    ['Hall Ticket No.', detailsModalTxn.hallTicketNo],
                    ['College Code', detailsModalTxn.collegeCode],
                    ['College Name', detailsModalTxn.collegeName || 'N/A'],
                    ['Mobile Number', detailsModalTxn.mobile || 'N/A'],
                    ['Email Address', detailsModalTxn.email || 'N/A'],
                  ].map(([label, value]) => (
                    <Box key={label} sx={{ p: 1.5, border: '1px solid #e2e8f0', bgcolor: '#f8fafc', borderRadius: 1 }}>
                      <Typography variant="caption" color="#64748b" display="block" fontWeight={600}>{label}</Typography>
                      <Typography variant="body2" fontWeight={700} color="#0f172a" sx={{ wordBreak: 'break-word', mt: 0.5 }}>{value}</Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>

              {/* Section 2: Academic Details */}
              <Paper elevation={0} sx={{ p: 2.5, border: '1px solid #cbd5e1', bgcolor: '#ffffff', borderRadius: 1.5 }}>
                <Typography variant="subtitle2" fontWeight={800} color="#1d4ed8" sx={{ textTransform: 'uppercase', letterSpacing: 0.8, mb: 2, borderBottom: '2px solid #e2e8f0', pb: 1 }}>
                  2. Academic & Course Mapping
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' }, gap: 2 }}>
                  {[
                    ['Level', detailsModalTxn.level || 'UG'],
                    ['Degree Program', detailsModalTxn.degree || 'N/A'],
                    ['Course / Branch', detailsModalTxn.course || 'N/A'],
                    ['Semester', detailsModalTxn.semester || 'N/A'],
                    ['Exam Type', detailsModalTxn.examType || 'REGULAR'],
                    ['Certificate Type', detailsModalTxn.certType || 'N/A'],
                    ['Year of Passing', detailsModalTxn.passedYear || 'N/A'],
                    ['Backlog Subject Count', detailsModalTxn.backlogPaperCount || 'N/A'],
                  ].map(([label, value]) => (
                    <Box key={label} sx={{ p: 1.5, border: '1px solid #e2e8f0', bgcolor: '#f8fafc', borderRadius: 1 }}>
                      <Typography variant="caption" color="#64748b" display="block" fontWeight={600}>{label}</Typography>
                      <Typography variant="body2" fontWeight={700} color="#0f172a" sx={{ wordBreak: 'break-word', mt: 0.5 }}>{value}</Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>

              {/* Section 3: Payment Audit & Verification */}
              <Paper elevation={0} sx={{ p: 2.5, border: '1px solid #cbd5e1', bgcolor: '#ffffff', borderRadius: 1.5 }}>
                <Typography variant="subtitle2" fontWeight={800} color="#1d4ed8" sx={{ textTransform: 'uppercase', letterSpacing: 0.8, mb: 2, borderBottom: '2px solid #e2e8f0', pb: 1 }}>
                  3. Payment Audit & Verification Status
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
                  {[
                    ['Receipt No.', detailsModalTxn.receiptNo],
                    ['Payment ID', detailsModalTxn.razorpayPaymentId || 'N/A'],
                    ['Order ID', detailsModalTxn.razorpayOrderId || 'N/A'],
                    ['Payment Status', detailsModalTxn.paymentStatus],
                    ['Verification Stage', detailsModalTxn.verificationStatus],
                    ['Total Amount Paid', `₹${detailsModalTxn.amountPaid}`],
                    ['Transaction Date', new Date(detailsModalTxn.createdAt).toLocaleString('en-IN')],
                  ].map(([label, value]) => (
                    <Box key={label} sx={{ p: 1.5, border: '1px solid #e2e8f0', bgcolor: '#f8fafc', borderRadius: 1 }}>
                      <Typography variant="caption" color="#64748b" display="block" fontWeight={600}>{label}</Typography>
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        color={label.includes('Amount') ? '#16a34a' : '#0f172a'}
                        sx={{ wordBreak: 'break-word', mt: 0.5 }}
                      >
                        {value}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>

            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#ffffff' }}>
          <Button variant="contained" onClick={() => setDetailsModalTxn(null)} sx={{ bgcolor: '#2C3947', fontWeight: 700 }}>
            Close Details
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
