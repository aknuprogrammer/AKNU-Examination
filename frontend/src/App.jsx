import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, CircularProgress, Typography, Button, Alert, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, TextField
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import RefreshIcon from '@mui/icons-material/Refresh';

// Layout & Protected Route
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

// Pages
import Login from './pages/Login.jsx';
import ChangePassword from './pages/ChangePassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Colleges from './pages/Colleges.jsx';
import PaperDistribution from './pages/PaperDistribution.jsx';
import Deployment from './pages/Deployment.jsx';
import ActivityLogs from './pages/ActivityLogs.jsx';

// Redux & Api
import { loginSuccess, logoutSuccess } from './store/authSlice.js';
import api from './utils/api.js';

// Index Redirect/Portal wrapper
function IndexPortal() {
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [college, setCollege] = useState(null);
  const [password, setPassword] = useState('');
  const [pwMessage, setPwMessage] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [copyMsg, setCopyMsg] = useState('');

  // OTP Verification Modal state
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSuccessMsg, setOtpSuccessMsg] = useState('');

  const loadPortal = async () => {
    setLoading(true);
    try {
      const res = await api.get('/colleges');
      if (res.data.success && res.data.data.length > 0) {
        const clg = res.data.data[0];
        setCollege(clg);

        // Try fetching released password if deployed and downloaded
        if (clg.isDeployed && clg.zipDownloaded) {
          try {
            const pwRes = await api.get('/colleges/released-password');
            if (pwRes.data.success) {
              setPassword(pwRes.data.password);
              setPwMessage('');
            }
          } catch (err) {
            setPassword('');
            setPwMessage(err.response?.data?.message || 'Decryption password will be available 10 minutes after deployment.');
          }
        } else if (!clg.isDeployed) {
          setPassword('');
          setPwMessage('Question papers have not been deployed by Exam Cell yet.');
        } else if (!clg.zipDownloaded) {
          setPassword('');
          setPwMessage('Please verify OTP and download the Question Paper ZIP to view decryption password.');
        }
      }
    } catch (err) {
      console.error('Failed to load portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'Principal') return;
    loadPortal();
  }, [user]);

  // Telemetry & Anti-Tamper Shield (Monitors Network Drops, DevTools Inspection, and Tab Switches)
  useEffect(() => {
    if (!user || user.role !== 'Principal' || !college?.collegeCode) return;
    
    const sendTelemetry = (eventType, details) => {
      api.post('/colleges/telemetry', {
        collegeCode: college.collegeCode,
        eventType,
        details
      }).catch(() => {});
    };

    const handleOffline = () => sendTelemetry('NETWORK_OFFLINE', 'Principal client lost internet/ISP connectivity.');
    const handleOnline = () => sendTelemetry('NETWORK_ONLINE', 'Principal client restored internet/ISP connectivity.');
    
    const handleVisibility = () => {
      if (document.hidden) {
        sendTelemetry('TAB_BLURRED', 'Principal switched browser tabs or minimized window while inside active portal.');
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) || (e.ctrlKey && e.key.toLowerCase() === 'u')) {
        sendTelemetry('DEVTOOLS_DETECTED', `Principal pressed inspection key shortcut (${e.key}).`);
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [user?.role, college?.collegeCode]);

  if (!user) return <Navigate to="/login" replace />;

  const isAdminOrStaff = [
    'Super Admin',
    'Admin',
    'Controller of Examinations',
    'Confidential Section',
    'Exam Cell Staff',
    'Observer'
  ].includes(user.role);

  if (isAdminOrStaff) return <Navigate to="/colleges" replace />;

  const executeZipDownload = async () => {
    setDownloading(true);
    api.post('/colleges/telemetry', { collegeCode: college?.collegeCode, eventType: 'DOWNLOAD_STARTED', details: 'Principal initiated Question Paper ZIP download.' }).catch(() => {});
    try {
      const response = await api.get('/colleges/download-papers', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/zip' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `QP_${college?.collegeCode || 'College_QP'}.zip`;
      link.click();
      api.post('/colleges/telemetry', { collegeCode: college?.collegeCode, eventType: 'DOWNLOAD_COMPLETED', details: 'Question Paper ZIP download completed successfully.' }).catch(() => {});
      await loadPortal();
    } catch (err) {
      console.error('Download failed:', err);
      api.post('/colleges/telemetry', { collegeCode: college?.collegeCode, eventType: 'DOWNLOAD_INTERRUPTED', details: `Download interrupted/failed: ${err.message || 'Network error'}` }).catch(() => {});
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadClick = () => {
    if (college?.downloadOtpVerified) {
      // Already verified -> download directly
      executeZipDownload();
    } else {
      // Open OTP modal & send OTP right away
      setOtpDialogOpen(true);
      setOtpError('');
      setOtpSuccessMsg('');
      handleSendOtp();
    }
  };

  const handleSendOtp = async () => {
    setOtpLoading(true);
    setOtpError('');
    setOtpSuccessMsg('');
    try {
      const res = await api.post('/colleges/send-download-otp');
      if (res.data.success) {
        setOtpSent(true);
        setOtpSuccessMsg(res.data.message);
      }
    } catch (err) {
      setOtpError(err.response?.data?.message || err.message || 'Failed to send OTP email.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyAndDownload = async () => {
    if (!otpInput.trim() || otpInput.trim().length < 6) {
      setOtpError('Please enter the 6-digit OTP sent to your registered email or mobile phone.');
      return;
    }
    setOtpLoading(true);
    setOtpError('');
    try {
      const res = await api.post('/colleges/verify-download-otp', { otp: otpInput.trim() });
      if (res.data.success) {
        setOtpDialogOpen(false);
        setOtpInput('');
        await executeZipDownload();
        loadPortal();
      }
    } catch (err) {
      setOtpError(err.response?.data?.message || err.message || 'Verification failed.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(password);
    setCopyMsg('Copied!');
    api.post('/colleges/telemetry', { collegeCode: college?.collegeCode, eventType: 'PASSWORD_COPIED', details: 'Principal copied decryption password to clipboard.' }).catch(() => {});
    setTimeout(() => setCopyMsg(''), 2000);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, mb: 3, gap: 2 }}>
        <Typography variant="h4" fontWeight={800}>
          Principal <span style={{ color: '#547A95' }}>Portal</span>
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <IconButton onClick={loadPortal} size="small" title="Refresh portal status" sx={{ bgcolor: '#E8EDF2' }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
          <Typography variant="body2" color="text.secondary">
            Welcome, <strong>{user.username}</strong>
          </Typography>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1, overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
          <Table size="small" sx={{ minWidth: 600 }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f7fa' }}>
                <TableCell sx={{ fontWeight: 700, width: 60 }}>S. No</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ZIP File Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ZIP Password</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 120 }} align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!college || !college.zipFileHash || !college.isDeployed ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4, color: college?.isExpired ? 'error.main' : 'text.secondary', fontStyle: 'italic', fontWeight: college?.isExpired ? 600 : 400 }}>
                    {college?.isExpired
                      ? '⚡ Question paper download window (1 hour from deployment) has expired. The college question paper ZIP folder is no longer accessible in the portal.'
                      : 'No college question paper ZIP folder is available for download in your portal yet.'}
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow hover>
                  {/* S. No */}
                  <TableCell sx={{ fontWeight: 600 }}>1</TableCell>

                  {/* ZIP File Name */}
                  <TableCell>

                    <Box>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        QP_{college.collegeCode}.zip
                      </Typography>
                      {college.examDate && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Exam: {college.examDate} ({college.examSession || 'AM'} Session)
                        </Typography>
                      )}
                    </Box>

                  </TableCell>

                  {/* ZIP Password */}
                  <TableCell>
                    {password ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <code style={{ fontSize: '0.85rem', background: '#f0fdf4', padding: '2px 10px', borderRadius: 4, fontWeight: 700, color: '#16a34a', letterSpacing: 1 }}>
                          {password}
                        </code>
                        <Tooltip title={copyMsg || 'Copy password'}>
                          <IconButton size="small" onClick={handleCopy}>
                            <ContentCopyIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" color="warning.dark" fontStyle="italic" fontWeight={600}>
                          {pwMessage || 'Decryption password locked.'}
                        </Typography>
                      </Box>
                    )}
                  </TableCell>

                  {/* Action — Download */}
                  <TableCell align="center">
                    {college.zipDownloaded ? (
                      <Box sx={{ maxWidth: 200, mx: 'auto', p: 1, bgcolor: '#fff5f5', borderRadius: 2, border: '1px solid #fed7d7' }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#c53030', display: 'block', lineHeight: 1.3 }}>
                          Download Completed
                        </Typography>

                      </Box>
                    ) : (
                      <Tooltip title={downloading ? 'Downloading…' : 'Verify OTP & Download ZIP'}>
                        <span>
                          <Button
                            variant="contained"
                            color={college.isRedeploy || college.downloadCount >= 1 ? 'info' : 'warning'}
                            onClick={handleDownloadClick}
                            disabled={downloading}
                            size="small"
                            startIcon={downloading ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
                            sx={{ textTransform: 'none', fontWeight: 800, fontSize: '0.78rem' }}
                          >
                            {college.isRedeploy || college.downloadCount >= 1 ? 'Verify & Re-Download' : 'Verify & Download'}
                          </Button>
                        </span>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* OTP Verification Modal */}
      <Dialog open={otpDialogOpen} onClose={() => { if (!otpLoading) setOtpDialogOpen(false); }} maxWidth="xs" fullWidth sx={{ '& .MuiDialog-paper': { m: { xs: 1.5, sm: 4 }, width: { xs: 'calc(100% - 24px)', sm: 'auto' } } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>OTP Verification Required</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" mb={2}>
            To securely download your Question Papers and unlock your decryption password, please enter the 6-digit verification code sent to your registered Principal Email ({college?.principalEmail || 'email'}) and Mobile Phone ({college?.principalPhone ? '+91-' + college.principalPhone : 'mobile'}).
          </Typography>

          {otpSuccessMsg && <Alert severity="success" sx={{ mb: 2 }}>{otpSuccessMsg}</Alert>}
          {otpError && <Alert severity="error" sx={{ mb: 2 }}>{otpError}</Alert>}

          <Box sx={{ my: 2 }}>
            <TextField
              label="6-Digit Verification Code"
              placeholder="e.g. 123456"
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value)}
              slotProps={{ input: { maxLength: 6 } }}
              fullWidth
              size="small"
              autoFocus
              disabled={otpLoading}
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Did not receive the code?
            </Typography>
            <Button size="small" onClick={handleSendOtp} disabled={otpLoading} sx={{ textTransform: 'none', fontWeight: 700 }}>
              Resend OTP
            </Button>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOtpDialogOpen(false)} disabled={otpLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleVerifyAndDownload}
            disabled={otpLoading || !otpInput.trim() || otpInput.trim().length < 6}
            sx={{ fontWeight: 700 }}
          >
            {otpLoading ? <CircularProgress size={20} color="inherit" /> : 'Verify & Download'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default function App() {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const res = await api.post('/auth/refresh');
        if (res.data.success && res.data.accessToken) {
          dispatch(loginSuccess({
            user: res.data.user,
            accessToken: res.data.accessToken
          }));
        }
      } catch (err) {
        console.log('No active session found to restore.');
      } finally {
        setIsRestoring(false);
      }
    };

    restoreSession();
  }, [dispatch]);

  useEffect(() => {
    // Catch global logout event from Axios interceptor
    const handleGlobalLogout = () => {
      dispatch(logoutSuccess());
    };

    window.addEventListener('auth-logout', handleGlobalLogout);
    return () => {
      window.removeEventListener('auth-logout', handleGlobalLogout);
    };
  }, [dispatch]);

  if (isRestoring) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  const adminRoles = ['Super Admin', 'Admin', 'Controller of Examinations', 'Confidential Section', 'Exam Cell Staff', 'Observer'];

  return (
    <Routes>
      {/* Public Login Route */}
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/" replace /> : <Login />
        }
      />

      {/* Public Reset Password Route */}
      <Route
        path="/reset-password"
        element={
          isAuthenticated ? <Navigate to="/" replace /> : <ResetPassword />
        }
      />

      {/* Forced Password Reset Route */}
      <Route
        path="/change-password"
        element={
          <ProtectedRoute>
            <ChangePassword />
          </ProtectedRoute>
        }
      />

      {/* Main Protected Routes Panel */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Index Redirection Portal */}
        <Route index element={<IndexPortal />} />

        {/* College Management */}
        <Route
          path="colleges"
          element={
            <ProtectedRoute allowedRoles={adminRoles}>
              <Colleges />
            </ProtectedRoute>
          }
        />

        {/* Paper Distribution */}
        <Route
          path="paper-distribution"
          element={
            <ProtectedRoute allowedRoles={adminRoles}>
              <PaperDistribution />
            </ProtectedRoute>
          }
        />

        {/* Deployment */}
        <Route
          path="deployment"
          element={
            <ProtectedRoute allowedRoles={adminRoles}>
              <Deployment />
            </ProtectedRoute>
          }
        />

        {/* Activity Logs (Super Admin Only) */}
        <Route
          path="activity-logs"
          element={
            <ProtectedRoute allowedRoles={['Super Admin']}>
              <ActivityLogs />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Redirect fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
