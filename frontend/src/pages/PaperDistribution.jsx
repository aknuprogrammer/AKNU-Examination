import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Box, Typography, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Chip, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Alert, Divider,
  Switch, FormControlLabel, CircularProgress, InputAdornment, Tooltip, Stepper, Step, StepLabel, MenuItem
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import LockIcon from '@mui/icons-material/Lock';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ScheduleIcon from '@mui/icons-material/Schedule';
import JSZip from 'jszip';
import { ConfirmDialog, ToastAlert, useToast } from '../components/ConfirmDialog.jsx';
import api from '../utils/api.js';

const formatTimestampDate = (dateVal) => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const formatTimestampTime = (dateVal) => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

export default function PaperDistribution() {
  const { user } = useSelector((state) => state.auth);
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [dialogStep, setDialogStep] = useState(0); // 0 = pick file, 1 = set passwords
  const [zipFile, setZipFile] = useState(null);
  const [preflightReport, setPreflightReport] = useState(null);
  const [preflightLoading, setPreflightLoading] = useState(false);
  const [detectedColleges, setDetectedColleges] = useState([]); // [{ code, paperCount }]
  const [perCollegePasswords, setPerCollegePasswords] = useState({}); // { collegeCode: password }
  const [showPasswords, setShowPasswords] = useState({}); // { collegeCode: bool }
  const [zipParseError, setZipParseError] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadStatusFilter, setDownloadStatusFilter] = useState('ALL');

  // Delete confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState(null); // collegeCode string

  // Toast notifications
  const { toast, showToast, hideToast } = useToast();

  // Upload Date & Session state
  const [uploadDate, setUploadDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [uploadSession, setUploadSession] = useState('AM');

  const fetchColleges = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await api.get('/colleges');
      if (res.data.success) {
        setColleges(res.data.data);
      }
    } catch (e) {
      console.error('Failed to load colleges data:', e);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    fetchColleges(true);
  }, []);

  const resetUploadDialog = () => {
    setDialogStep(0);
    setZipFile(null);
    setDetectedColleges([]);
    setPerCollegePasswords({});
    setShowPasswords({});
    setZipParseError(null);
    setUploadError(null);
    setUploadResult(null);
    setPreflightReport(null);
    setPreflightLoading(false);
    setUploadDate(new Date().toISOString().split('T')[0]);
    setUploadSession('AM');
    const fileInput = document.getElementById('dialog-zip-input');
    if (fileInput) fileInput.value = '';
  };

  // Step 1: parse the ZIP client-side to extract unique college codes
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setZipParseError(null);
    setZipFile(file);
    setDetectedColleges([]);
    setPerCollegePasswords({});

    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const collegeMap = {}; // { collegeCode: count }

      zip.forEach((relativePath, zipEntry) => {
        if (zipEntry.dir) return;
        const name = relativePath.split('/').pop();
        // Expected filename format: {QPCode}_{CollegeCode}.pdf
        const match = name.match(/^([A-Za-z0-9_-]+)_([A-Za-z0-9]+)\.pdf$/i);
        if (match) {
          const code = match[2];
          collegeMap[code] = (collegeMap[code] || 0) + 1;
        }
      });

      const detected = Object.entries(collegeMap).map(([code, count]) => ({ code, count }));
      if (detected.length === 0) {
        setZipParseError('No valid PDF files found. Ensure filenames follow the format: QPCode_CollegeCode.pdf');
        setZipFile(null);
        return;
      }

      // Initialise per-college password map with auto-generated passwords
      const pwMap = {};
      const showMap = {};
      detected.forEach(({ code }) => { 
        pwMap[code] = code + '@' + Math.random().toString(36).substring(2, 8).toUpperCase(); 
        showMap[code] = false; 
      });
      setDetectedColleges(detected);
      setPerCollegePasswords(pwMap);
      setShowPasswords(showMap);

      setPreflightLoading(true);
      api.post('/colleges/ai/preflight-check', {
        fileName: file.name,
        examDate: uploadDate || new Date().toISOString().split('T')[0],
        examSession: uploadSession || 'AM',
        fileSize: file.size,
        totalPages: detected.reduce((acc, curr) => acc + curr.count, 0)
      }).then(res => {
        if (res.data.success) setPreflightReport(res.data);
      }).catch(() => {}).finally(() => setPreflightLoading(false));
    } catch (err) {
      setZipParseError('Failed to read the ZIP file. Please ensure it is a valid ZIP archive.');
      setZipFile(null);
    }
  };

  // Step 2: validate passwords and deploy
  const handleUploadCombined = async () => {
    setUploadError(null);
    setUploadResult(null);

    // Validate all passwords are set and meet minimum length
    const missing = detectedColleges.filter(c => !perCollegePasswords[c.code]?.trim());
    const tooShort = detectedColleges.filter(c => perCollegePasswords[c.code]?.trim().length > 0 && perCollegePasswords[c.code].trim().length < 6);

    if (missing.length > 0) {
      setUploadError(`Please set a password for: ${missing.map(c => c.code).join(', ')}`);
      return;
    }
    if (tooShort.length > 0) {
      setUploadError(`Password must be at least 6 characters for: ${tooShort.map(c => c.code).join(', ')}`);
      return;
    }

    const formData = new FormData();
    formData.append('zipFile', zipFile);
    formData.append('examDate', uploadDate);
    formData.append('examSession', uploadSession);
    // Send per-college passwords as a JSON string
    const cleanPasswords = {};
    detectedColleges.forEach(c => { cleanPasswords[c.code] = perCollegePasswords[c.code].trim(); });
    formData.append('passwords', JSON.stringify(cleanPasswords));

    setUploadLoading(true);
    try {
      const res = await api.post('/colleges/upload-papers', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        setUploadResult(res.data.data);
        fetchColleges(false);
      }
    } catch (err) {
      console.error(err);
      setUploadError(err.response?.data?.message || err.message || 'Failed to process combined ZIP file.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDownloadZip = async (collegeCode) => {
    try {
      const response = await api.get(`/colleges/download-papers/${collegeCode}`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/zip' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `QP_${collegeCode}.zip`;
      link.click();
    } catch (err) {
      showToast(err.message || `No question papers are deployed for college ${collegeCode} yet.`, 'error');
    }
  };

  // Opens delete confirmation modal
  const handleDeletePapers = (collegeCode) => {
    setDeleteTarget(collegeCode);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      const res = await api.delete(`/colleges/papers/${deleteTarget}`);
      if (res.data.success) {
        showToast(res.data.message || `Deleted deployed papers for college ${deleteTarget}.`, 'success');
        setColleges((prev) =>
          prev.map((c) =>
            c.collegeCode === deleteTarget
              ? { ...c, isDeployed: false, isUploaded: false, zipDownloaded: false, deployedAt: null, downloadCount: 0 }
              : c
          )
        );
        fetchColleges(false);
      }
    } catch (err) {
      showToast(err.message || 'Failed to delete deployed papers.', 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleCopyPassword = (pass) => {
    navigator.clipboard.writeText(pass);
    showToast('Password copied to clipboard!', 'info');
  };

  // Filter colleges: only show those that have an uploaded college question paper ZIP folder (zipFileHash present)
  // and match the search query
  const filteredColleges = colleges.filter(clg => {
    if (!clg.zipFileHash) return false;
    if (downloadStatusFilter === 'PENDING' && (clg.zipDownloaded || clg.isRedeploy || clg.downloadCount > 0)) return false;
    if (downloadStatusFilter === 'DOWNLOADED' && (!clg.zipDownloaded || clg.isRedeploy || clg.downloadCount > 1)) return false;
    if (downloadStatusFilter === 'PENDING_REDOWNLOAD' && (clg.zipDownloaded || (!clg.isRedeploy && clg.downloadCount === 0))) return false;
    if (downloadStatusFilter === 'REDOWNLOADED' && (!clg.zipDownloaded || (!clg.isRedeploy && clg.downloadCount <= 1))) return false;

    const query = searchQuery.toLowerCase();
    return (
      clg.collegeCode.toLowerCase().includes(query) ||
      clg.collegeName.toLowerCase().includes(query) ||
      (clg.district && clg.district.toLowerCase().includes(query))
    );
  });

  return (
    <Box>
      {/* Header Container (aligned exactly with Colleges.jsx) */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, mb: 2, minHeight: 40, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" fontWeight={800}>
          Quetion Paper & Password Upload
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, flexWrap: 'wrap' }}>
          <IconButton onClick={() => fetchColleges(false)} size="small" title="Refresh Table data" sx={{ color: 'text.secondary', mr: 1 }}>
            <RefreshIcon fontSize="small" />
          </IconButton>

          <Button
            variant="contained"
            size="small"
            startIcon={<CloudUploadIcon />}
            onClick={() => {
              setUploadError(null);
              setUploadResult(null);
              setZipFile(null);
              setUploadDialogOpen(true);
            }}
          >
            Upload Combined QP
          </Button>
        </Box>
      </Box>

      {/* Search and Filters row */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search colleges by code, name, or district..."
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ maxWidth: { xs: '100%', sm: 400 }, flexGrow: 1, width: { xs: '100%', sm: 'auto' } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }
          }}
        />
        <TextField
          select
          label="Download Status"
          size="small"
          value={downloadStatusFilter}
          onChange={(e) => setDownloadStatusFilter(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: { xs: '100%', sm: 210 }, bgcolor: '#fff', borderRadius: 2 }}
        >
          <MenuItem value="ALL">All Statuses</MenuItem>
          <MenuItem value="PENDING">Pending</MenuItem>
          <MenuItem value="DOWNLOADED">Downloaded (1st Time)</MenuItem>
          <MenuItem value="PENDING_REDOWNLOAD">Pending Re-Download</MenuItem>
          <MenuItem value="REDOWNLOADED">Re-Downloaded</MenuItem>
        </TextField>
      </Box>

      {/* Main Table of status */}
      {
        loading ? (
          <Typography>Loading paper distribution registry...</Typography>
        ) : (
          <TableContainer component={Paper} sx={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
            <Table sx={{ minWidth: 950 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Exam Centre Code</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Exam Centre Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>ZIP File Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Exam Date & Session</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Uploaded At</TableCell>
                  {user?.role === 'Super Admin' && <TableCell sx={{ fontWeight: 700 }}>Uploaded System IP</TableCell>}
                  {user?.role === 'Super Admin' && <TableCell sx={{ fontWeight: 700 }}>ZIP Decryption Password</TableCell>}
                  <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredColleges.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={user?.role === 'Super Admin' ? 8 : 6} align="center" sx={{ py: 4 }}>
                      {searchQuery ? 'No matching college question paper ZIP folders found.' : 'No college question paper ZIP folders uploaded yet. Click "Upload Combined QP" to get started.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredColleges.map((clg) => (
                    <TableRow key={clg._id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{clg.collegeCode}</TableCell>
                      <TableCell>{clg.collegeName}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                          QP_{clg.collegeCode}.zip
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {clg.examDate ? (
                          <Box>
                            <Typography variant="body2" fontWeight={600}>{clg.examDate ? clg.examDate.split('-').reverse().join('-') : ''}</Typography>
                            <Chip label={`${clg.examSession || 'AM'} SESSION`} size="small" color="info" sx={{ height: 20, fontSize: '0.68rem', mt: 0.5, fontWeight: 700 }} />
                          </Box>
                        ) : (
                          <span style={{ color: '#aaa', fontSize: '0.85rem' }}>—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {clg.zipUploadedAt || clg.updatedAt ? (
                          <Box>
                            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.82rem', marginBottom: '3px' }}>
                              {formatTimestampDate(clg.zipUploadedAt || clg.updatedAt)}
                            </div>
                            <div style={{ fontWeight: 600, color: '#64748b', fontSize: '0.74rem' }}>
                              🕒 {formatTimestampTime(clg.zipUploadedAt || clg.updatedAt)}
                            </div>
                          </Box>
                        ) : (
                          <span style={{ color: '#aaa', fontSize: '0.85rem' }}>—</span>
                        )}
                      </TableCell>
                      {user?.role === 'Super Admin' && (
                        <TableCell>
                          {clg.zipUploadedIp ? (
                            <Chip label={`💻 ${clg.zipUploadedIp}`} size="small" sx={{ fontFamily: 'monospace', fontWeight: 700, bgcolor: '#f1f5f9', color: '#334155' }} />
                          ) : (
                            <span style={{ color: '#aaa', fontSize: '0.85rem' }}>—</span>
                          )}
                        </TableCell>
                      )}
                      {user?.role === 'Super Admin' && (
                        <TableCell>
                          {clg.dayPassword ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <code>{clg.dayPassword}</code>
                              <IconButton size="small" onClick={() => handleCopyPassword(clg.dayPassword)} title="Copy Password">
                                <ContentCopyIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Box>
                          ) : (
                            <span style={{ color: '#aaa', fontSize: '0.85rem' }}>N/A</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell align="right">
                        <IconButton
                          onClick={() => handleDownloadZip(clg.collegeCode)}
                          disabled={!clg.zipFileHash}
                          size="small"
                          sx={{ color: clg.zipFileHash ? 'primary.main' : 'text.disabled', mr: 0.5 }}
                          title="Download College Question Paper ZIP Folder"
                        >
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          onClick={() => handleDeletePapers(clg.collegeCode)}
                          disabled={!clg.zipFileHash}
                          size="small"
                          sx={{ color: clg.zipFileHash ? 'error.main' : 'text.disabled' }}
                          title="Delete College Question Paper ZIP Folder & Password"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )
      }

      {/* Upload Combined Dialog Modal */}
      <Dialog
        open={uploadDialogOpen}
        onClose={(event, reason) => {
          if (reason === 'backdropClick') return;
          if (!uploadLoading) {
            resetUploadDialog();
            setUploadDialogOpen(false);
          }
        }}
        maxWidth="sm"
        fullWidth
        sx={{ '& .MuiDialog-paper': { m: { xs: 1.5, sm: 4 }, width: { xs: 'calc(100% - 24px)', sm: 'auto' } } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Deploy Combined Papers ZIP</DialogTitle>
        <DialogContent dividers>
          {/* No Stepper needed anymore */}

          {uploadError && <Alert severity="error" sx={{ mb: 2 }}>{uploadError}</Alert>}
          {zipParseError && <Alert severity="warning" sx={{ mb: 2 }}>{zipParseError}</Alert>}

          {/* --- RESULT VIEW --- */}
          {uploadResult ? (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                Processed college question paper ZIP folders successfully for {uploadResult.successCount} colleges!
              </Alert>

              {uploadResult.errors?.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="error.main" fontWeight={700} mb={0.5}>
                    Failed/Skipped Items ({uploadResult.errors.length}):
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 1.5, maxHeight: 100, overflowY: 'auto', backgroundColor: '#fff8f8' }}>
                    {uploadResult.errors.map((err, idx) => (
                      <Typography key={idx} variant="caption" display="block" color="error.main">
                        • <strong>{err.filename || `CollegeCode ${err.collegeCode}`}</strong>: {err.message}
                      </Typography>
                    ))}
                  </Paper>
                </Box>
              )}

              {user?.role === 'Super Admin' && uploadResult.passwords?.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} mb={1}>College ZIP Extraction Passwords:</Typography>
                  <Paper variant="outlined" sx={{ p: 1, maxHeight: 220, overflowY: 'auto' }}>
                    {uploadResult.passwords.map((p, idx) => (
                      <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75, borderBottom: idx < uploadResult.passwords.length - 1 ? '1px solid #eee' : 'none' }}>
                        <Box>
                          <Typography variant="caption" fontWeight={700}>{p.collegeCode}</Typography>
                          <Typography variant="caption" color="text.secondary"> — {p.collegeName}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <code style={{ fontSize: '0.78rem', background: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }}>{p.password}</code>
                          <IconButton size="small" onClick={() => handleCopyPassword(p.password)} title="Copy">
                            <ContentCopyIcon sx={{ fontSize: 13 }} />
                          </IconButton>
                        </Box>
                      </Box>
                    ))}
                  </Paper>
                </Box>
              )}
            </Box>

          ) : (
            /* --- File Picker & Date/Session --- */
            <Box sx={{ py: 1 }}>
              <Box sx={{ mb: 3.5, p: 2.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <Typography variant="subtitle2" fontWeight={700} mb={2.5} color="primary.main">
                  1. Examination Date & Session Details
                </Typography>
                <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap', mt: 1.5, mb: 1 }}>
                  <TextField
                    type="date"
                    size="small"
                    label="Examination Date *"
                    value={uploadDate}
                    onChange={(e) => setUploadDate(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                    sx={{ bgcolor: '#fff', width: 200 }}
                  />
                  <TextField
                    select
                    size="small"
                    label="Examination Session *"
                    value={uploadSession}
                    onChange={(e) => setUploadSession(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                    sx={{ bgcolor: '#fff', width: 220 }}
                  >
                    <MenuItem value="AM">AM (Morning Session)</MenuItem>
                    <MenuItem value="PM">PM (Afternoon Session)</MenuItem>
                  </TextField>
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>
                  These papers will be scheduled for deployment 30 minutes before the selected date and session.
                </Typography>
              </Box>

              <Typography variant="subtitle2" fontWeight={700} mb={1} color="primary.main">
                2. Select Combined Question Papers ZIP
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Upload the combined ZIP file containing all question papers named as{' '}
                <code>QPCode_CollegeCode.pdf</code> (e.g. <code>QP200_123.pdf</code>).
              </Typography>

              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUploadIcon />}
                fullWidth
                sx={{ py: 2.5, borderStyle: 'dashed', borderWidth: 2 }}
              >
                {zipFile ? `✔ ${zipFile.name}` : 'Choose Combined ZIP File'}
                <input
                  id="dialog-zip-input"
                  type="file"
                  accept=".zip"
                  hidden
                  onChange={handleFileChange}
                />
              </Button>

              {detectedColleges.length > 0 && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  Detected <strong>{detectedColleges.length} college(s)</strong>:{' '}
                  {detectedColleges.map(c => `${c.code} (${c.count} paper${c.count > 1 ? 's' : ''})`).join(', ')}
                </Alert>
              )}

              {/* AI Pre-Flight OCR Inspector Box */}
              {preflightLoading && (
                <Box sx={{ mt: 2, p: 2, bgcolor: '#f8fafc', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.5, border: '1px solid #e2e8f0' }}>
                  <CircularProgress size={20} />
                  <Typography variant="body2" fontWeight={700} color="text.secondary">AI Pre-Flight Inspector is checking header dates, session match, and file integrity...</Typography>
                </Box>
              )}
              {preflightReport && (
                <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: preflightReport.passed ? '#f0fdf4' : '#fef2f2', border: `1px solid ${preflightReport.passed ? '#bbf7d0' : '#fecaca'}` }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="subtitle2" fontWeight={800} color={preflightReport.passed ? '#166534' : '#991b1b'}>
                      🤖 AI Pre-Flight Check: {preflightReport.passed ? 'PASSED (Ready for Deployment)' : 'WARNINGS / ISSUES DETECTED'}
                    </Typography>
                    <Chip label={`Quality Score: ${preflightReport.qualityScore}/100`} size="small" color={preflightReport.passed ? 'success' : 'error'} sx={{ fontWeight: 800 }} />
                  </Box>
                  {preflightReport.issues && preflightReport.issues.length > 0 && (
                    <Box sx={{ mb: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {preflightReport.issues.map((iss, idx) => (
                        <Typography key={idx} variant="caption" display="block" color="#dc2626" fontWeight={700}>
                          ⚠️ {iss}
                        </Typography>
                      ))}
                    </Box>
                  )}
                  {preflightReport.recommendations && preflightReport.recommendations.map((rec, idx) => (
                    <Typography key={idx} variant="caption" display="block" color="#15803d" fontWeight={600}>
                      ✨ {rec}
                    </Typography>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          {uploadResult ? (
            <Button variant="contained" onClick={() => { resetUploadDialog(); setUploadDialogOpen(false); }}>
              Done
            </Button>
          ) : (
            <>
              <Button onClick={() => { resetUploadDialog(); setUploadDialogOpen(false); }} disabled={uploadLoading}>Cancel</Button>
              <Button
                variant="contained"
                disabled={detectedColleges.length === 0 || uploadLoading}
                onClick={handleUploadCombined}
                startIcon={uploadLoading && <CircularProgress size={16} color="inherit" />}
              >
                {uploadLoading ? 'Processing & Zipping...' : 'Deploy Papers'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Deployed Papers"
        message={`Are you sure you want to permanently delete the deployed question papers and password for college "${deleteTarget}"? Their access will be revoked immediately.`}
        confirmLabel="Delete"
        confirmColor="error"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Auto-dismissing Toast */}
      <ToastAlert
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={hideToast}
      />
    </Box >
  );
}
