import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Alert, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, MenuItem, TextField, CircularProgress, Chip
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PaymentIcon from '@mui/icons-material/Payment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import api from '../utils/api.js';

export default function CollegeBulkPayment() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [excelFile, setExcelFile] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bulkResult, setBulkResult] = useState(null);

  useEffect(() => {
    api.get('/payments/categories')
      .then(res => {
        if (res.data.success) {
          setCategories(res.data.data);
          if (res.data.data.length > 0) setSelectedCategory(res.data.data[0]._id);
        }
      })
      .catch(err => console.error('Failed to load categories:', err));
  }, []);

  const handleUploadBulkExcel = async () => {
    if (!excelFile) {
      setError('Please select an Excel file (.xlsx / .xls) to upload.');
      return;
    }
    if (!selectedCategory) {
      setError('Please select a Fee Category.');
      return;
    }

    setLoading(true);
    setError('');
    setBulkResult(null);

    const formData = new FormData();
    formData.append('excelFile', excelFile);
    formData.append('feeCategoryId', selectedCategory);

    try {
      const res = await api.post('/payments/college-bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        setBulkResult(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process bulk Excel file.');
    } finally {
      setLoading(false);
    }
  };

  const handlePayBulkRazorpay = async () => {
    if (!bulkResult) return;

    // Razorpay Checkout handler
    const processVerification = async (paymentId, signature) => {
      try {
        const verifyRes = await api.post('/payments/verify-signature', {
          razorpayOrderId: bulkResult.razorpayOrderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: signature
        });
        if (verifyRes.data.success) {
          alert(`Bulk Payment Successful! Receipt No: ${bulkResult.receiptNo}`);
          setBulkResult(null);
          setExcelFile(null);
        }
      } catch (err) {
        alert(err.response?.data?.message || 'Payment verification failed.');
      }
    };

    if (window.Razorpay) {
      const options = {
        key: bulkResult.keyId,
        amount: bulkResult.amountInPaise,
        currency: 'INR',
        name: 'Adikavi Nannaya University',
        description: `Bulk Exam Fee Payment (${bulkResult.validCount} Students)`,
        image: '/aknu_logo.png',
        order_id: bulkResult.razorpayOrderId,
        handler: function (response) {
          processVerification(response.razorpay_payment_id, response.razorpay_signature);
        },
        theme: { color: '#2C3947' }
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } else {
      // Mock fallback
      setTimeout(() => {
        processVerification(`pay_bulk_mock_${Date.now()}`, `mock_sig_${Date.now()}`);
      }, 1500);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={800}>
          Bulk Exam <span style={{ color: '#C2A56D' }}>Fee Payment</span>
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Upload batch student Excel sheets to calculate consolidated examination fees and complete single-checkout payments.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} mb={2}>
          Select Fee Category & Upload Student List
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
          <TextField
            select
            label="Select Fee Category *"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            sx={{ width: 350 }}
            size="small"
          >
            {categories.map((c) => (
              <MenuItem key={c._id} value={c._id}>
                {c.name} — ₹{c.amount} ({c.level})
              </MenuItem>
            ))}
          </TextField>

          <Button
            variant="outlined"
            component="label"
            startIcon={<CloudUploadIcon />}
            sx={{ borderStyle: 'dashed', borderWidth: 2, height: 40, textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
          >
            {excelFile ? `✔ ${excelFile.name}` : 'Upload Student Excel (.xlsx)'}
            <input
              type="file"
              accept=".xlsx, .xls"
              hidden
              onChange={(e) => setExcelFile(e.target.files[0])}
            />
          </Button>

          <Button
            variant="contained"
            disabled={!excelFile || loading}
            onClick={handleUploadBulkExcel}
            sx={{ height: 40, fontWeight: 700, textTransform: 'none', borderRadius: 2 }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : 'Process Excel & Calculate Total'}
          </Button>
        </Box>

        <Alert severity="info" sx={{ bgcolor: '#f8fafc' }}>
          💡 <strong>Excel Template Format:</strong> The Excel file must contain a column named <code>HallTicketNo</code> or <code>rollNo</code>.
        </Alert>
      </Paper>

      {/* Bulk Processing Summary & Checkout */}
      {bulkResult && (
        <Paper sx={{ p: 3, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h6" fontWeight={800} color="success.main">
                ✔ Excel Verification Complete!
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Receipt Ref: <strong>{bulkResult.receiptNo}</strong>
              </Typography>
            </Box>
            <Chip label={`${bulkResult.validCount} Students Verified`} color="success" sx={{ fontWeight: 800 }} />
          </Box>

          <Typography variant="h4" fontWeight={900} color="primary.main" my={2}>
            Total Amount Due: ₹{bulkResult.totalAmount}
          </Typography>

          <Button
            variant="contained"
            size="large"
            onClick={handlePayBulkRazorpay}
            startIcon={<PaymentIcon />}
            sx={{
              px: 4,
              py: 1.5,
              fontWeight: 800,
              fontSize: '1.05rem',
              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'
            }}
          >
            Pay ₹{bulkResult.totalAmount} via Razorpay
          </Button>
        </Paper>
      )}
    </Box>
  );
}
