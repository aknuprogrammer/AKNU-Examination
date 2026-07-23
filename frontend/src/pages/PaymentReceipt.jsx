import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Card, CardContent, Typography, Button, CircularProgress, Alert, Paper, Grid, Divider, Chip } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import api from '../utils/api.js';

export default function PaymentReceipt() {
  const { receiptNo } = useParams();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (receiptNo) {
      api.get(`/payments/receipt/${receiptNo}`)
        .then(res => {
          if (res.data.success) {
            setReceipt(res.data.data);
          }
        })
        .catch(err => {
          setError(err.response?.data?.message || 'Failed to fetch receipt.');
        })
        .finally(() => setLoading(false));
    }
  }, [receiptNo]);

  if (loading) {
    return <Box sx={{ textAlign: 'center', py: 10 }}><CircularProgress /></Box>;
  }

  if (error || !receipt) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', py: 8, px: 2 }}>
        <Alert severity="error">{error || 'Receipt not found.'}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', py: 6, px: 2 }}>
      <Paper variant="outlined" sx={{ p: 4, borderRadius: 3, border: '2px solid #2C3947', bgcolor: '#fff' }}>
        <Box sx={{ textAlign: 'center', mb: 3, borderBottom: '2px dashed #cbd5e1', pb: 2 }}>
          <Box component="img" src="/aknu_logo.png" alt="AKNU" sx={{ height: 60, mb: 1 }} />
          <Typography variant="h5" fontWeight={900} color="primary.main">
            ADIKAVI NANNAYA UNIVERSITY
          </Typography>
          <Typography variant="subtitle2" color="text.secondary">
            RAJAMAHENDRAVARAM, ANDHRA PRADESH - 533296
          </Typography>
          <Typography variant="caption" fontWeight={800} sx={{ letterSpacing: 1, textTransform: 'uppercase', bgcolor: '#e2e8f0', px: 2, py: 0.5, borderRadius: 1, mt: 1, display: 'inline-block' }}>
            OFFICIAL FEE PAYMENT ACKNOWLEDGEMENT RECEIPT
          </Typography>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary" display="block">Receipt Number</Typography>
            <Typography variant="subtitle2" fontWeight={800} color="primary.main">{receipt.receiptNo}</Typography>
          </Grid>
          <Grid item xs={6} align="right">
            <Typography variant="caption" color="text.secondary" display="block">Transaction Date & Time</Typography>
            <Typography variant="subtitle2" fontWeight={800}>{new Date(receipt.updatedAt || receipt.createdAt).toLocaleString()}</Typography>
          </Grid>

          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary" display="block">Payer Details</Typography>
            <Typography variant="body2" fontWeight={800}>{receipt.studentName || `College (${receipt.collegeCode})`}</Typography>
          </Grid>
          <Grid item xs={6} align="right">
            <Typography variant="caption" color="text.secondary" display="block">Hall Ticket / College Code</Typography>
            <Typography variant="body2" fontWeight={800}>{receipt.hallTicketNo || receipt.collegeCode}</Typography>
          </Grid>

          <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>

          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary" display="block">Fee Description</Typography>
            <Typography variant="body2" fontWeight={800}>{receipt.feeCategoryName}</Typography>
          </Grid>
          <Grid item xs={6} align="right">
            <Typography variant="caption" color="text.secondary" display="block">Amount Paid</Typography>
            <Typography variant="h6" fontWeight={900} color="success.main">₹{receipt.amountPaid}</Typography>
          </Grid>

          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary" display="block">Payment Reference ID</Typography>
            <Typography variant="caption" fontWeight={700} sx={{ fontFamily: 'monospace' }}>{receipt.razorpayPaymentId || 'pay_razorpay_confirmed'}</Typography>
          </Grid>
          <Grid item xs={6} align="right">
            <Typography variant="caption" color="text.secondary" display="block">Verification Status</Typography>
            <Chip label={receipt.verificationStatus} size="small" color={receipt.verificationStatus === 'APPROVED_BY_AR' ? 'success' : 'warning'} sx={{ fontWeight: 800 }} />
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 2, borderTop: '1px solid #eee' }}>
          <Typography variant="caption" color="text.secondary">
            * Computer Generated Official Receipt. Verified by AKNU Examination System.
          </Typography>
          <Button variant="contained" startIcon={<PrintIcon />} onClick={() => window.print()}>
            Print Receipt
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
