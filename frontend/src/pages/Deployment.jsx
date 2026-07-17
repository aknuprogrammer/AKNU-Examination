import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Chip, IconButton,
  TextField, Alert, CircularProgress, InputAdornment, Tooltip, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider
} from '@mui/material';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import HistoryIcon from '@mui/icons-material/History';
import { useToast } from '../components/ConfirmDialog.jsx';
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

export default function Deployment() {
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadStatusFilter, setDownloadStatusFilter] = useState('ALL');

  // Deployment controls using exact Add College form label styling and MenuItem
  const [deployDate, setDeployDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [deploySession, setDeploySession] = useState('AM');
  const [deployLoading, setDeployLoading] = useState(false);

  // Re-deploy modal state (for capturing required reason)
  const [redeployModalOpen, setRedeployModalOpen] = useState(false);
  const [redeployTargetCollege, setRedeployTargetCollege] = useState(null);
  const [redeployReasonInput, setRedeployReasonInput] = useState('');
  const [redeploySubmitting, setRedeploySubmitting] = useState(false);

  // Audit history modal state
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditTargetCollege, setAuditTargetCollege] = useState(null);

  // AI Smart Audit & Session Summarizer modal & state
  const [aiSummaryModalOpen, setAiSummaryModalOpen] = useState(false);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummaryData, setAiSummaryData] = useState(null);

  // AI Re-Deploy Reason categorization preview state
  const [redeployAiCategory, setRedeployAiCategory] = useState('📌 General Technical Issue');
  const [redeployAiExplanation, setRedeployAiExplanation] = useState('');

  const { showToast } = useToast();

  const fetchColleges = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await api.get('/colleges');
      if (res.data.success) {
        setColleges(res.data.data);
      }
    } catch (e) {
      console.error('Failed to load deployment data:', e);
      showToast('Failed to load deployment data.', 'error');
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    fetchColleges(true);
  }, []);

  const handleDeploySession = async () => {
    setDeployLoading(true);
    try {
      const res = await api.post('/colleges/deploy-papers', {
        examSession: deploySession,
        examDate: deployDate
      });
      if (res.data.success) {
        showToast(res.data.message, 'success');
        fetchColleges(false);
      }
    } catch (e) {
      console.error(e);
      showToast(e.response?.data?.message || e.message || 'Failed to deploy session question papers.', 'error');
    } finally {
      setDeployLoading(false);
    }
  };

  const handleCopyPassword = (pw) => {
    navigator.clipboard.writeText(pw);
    showToast('Decryption password copied to clipboard!', 'success');
  };

  const handleOpenRedeployModal = (clg) => {
    setRedeployTargetCollege(clg);
    setRedeployReasonInput('');
    setRedeployModalOpen(true);
  };

  useEffect(() => {
    if (!redeployReasonInput.trim()) {
      setRedeployAiCategory('📌 General Technical Issue');
      setRedeployAiExplanation('Please describe the root cause.');
      return;
    }
    const lower = redeployReasonInput.toLowerCase();
    if (lower.includes('power') || lower.includes('printer') || lower.includes('hardware') || lower.includes('system') || lower.includes('crash') || lower.includes('current') || lower.includes('ups')) {
      setRedeployAiCategory('🔌 Power / Hardware Failure');
      setRedeployAiExplanation('AI classified: Electrical or hardware failure');
    } else if (lower.includes('network') || lower.includes('net') || lower.includes('wifi') || lower.includes('disconnect') || lower.includes('server') || lower.includes('slow') || lower.includes('internet')) {
      setRedeployAiCategory('🌐 Network / ISP Disconnection');
      setRedeployAiExplanation('AI classified: Network connectivity or bandwidth drop');
    } else if (lower.includes('corrupt') || lower.includes('crc') || lower.includes('winrar') || lower.includes('7zip') || lower.includes('archive') || lower.includes('password') || lower.includes('open') || lower.includes('extract') || lower.includes('zip')) {
      setRedeployAiCategory('💻 OS / Archive Software Glitch');
      setRedeployAiExplanation('AI classified: Archive extraction / CRC mismatch');
    } else if (lower.includes('wrong') || lower.includes('mistake') || lower.includes('human') || lower.includes('staff')) {
      setRedeployAiCategory('⚠️ Human / Operator Error');
      setRedeployAiExplanation('AI classified: Operator oversight');
    } else if (lower.includes('tamper') || lower.includes('devtools') || lower.includes('f12') || lower.includes('suspicious')) {
      setRedeployAiCategory('🔒 Security / Suspicious Activity');
      setRedeployAiExplanation('AI classified: Potential security violation');
    } else {
      setRedeployAiCategory('📌 General Technical Issue');
      setRedeployAiExplanation('AI classified: General support request');
    }
  }, [redeployReasonInput]);

  const handleGenerateAiSummary = async () => {
    setAiSummaryModalOpen(true);
    setAiSummaryLoading(true);
    try {
      const res = await api.post('/colleges/ai/summarize-session', {
        examDate: deployDate,
        examSession: deploySession
      });
      if (res.data.success) {
        setAiSummaryData(res.data.summary);
      }
    } catch (err) {
      showToast('Failed to generate AI Session Summary', 'error');
    } finally {
      setAiSummaryLoading(false);
    }
  };

  const handleConfirmRedeploy = async () => {
    if (!redeployTargetCollege || !redeployReasonInput.trim()) {
      showToast('Please enter a specific reason for re-deploying (required for audit trail).', 'error');
      return;
    }
    try {
      setRedeploySubmitting(true);
      const res = await api.post(`/colleges/redeploy/${redeployTargetCollege.collegeCode}`, {
        reason: redeployReasonInput.trim(),
        category: redeployAiCategory
      });
      if (res.data.success) {
        showToast(res.data.message || `Re-deployed for ${redeployTargetCollege.collegeCode}`, 'success');
        setRedeployModalOpen(false);
        await fetchColleges(false);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to re-deploy college question paper ZIP folder.', 'error');
    } finally {
      setRedeploySubmitting(false);
    }
  };

  const handleOpenAuditModal = (clg) => {
    setAuditTargetCollege(clg);
    setAuditModalOpen(true);
  };

  // Filter colleges matching the selected date/session or search query (only show DEPLOYED in table)
  const filteredColleges = colleges.filter((clg) => {
    if (!clg.zipFileHash || !clg.isDeployed) return false;
    if (downloadStatusFilter === 'PENDING' && (clg.zipDownloaded || clg.isRedeploy || clg.downloadCount > 0)) return false;
    if (downloadStatusFilter === 'DOWNLOADED' && (!clg.zipDownloaded || clg.isRedeploy || clg.downloadCount > 1)) return false;
    if (downloadStatusFilter === 'PENDING_REDOWNLOAD' && (clg.zipDownloaded || (!clg.isRedeploy && clg.downloadCount === 0))) return false;
    if (downloadStatusFilter === 'REDOWNLOADED' && (!clg.zipDownloaded || (!clg.isRedeploy && clg.downloadCount <= 1))) return false;
    const matchesSearch =
      clg.collegeCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clg.collegeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clg.district?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const sessionMatchesCount = colleges.filter(
    (c) => c.zipFileHash && c.examDate === deployDate && c.examSession === deploySession
  ).length;

  const deployedInSessionCount = colleges.filter(
    (c) => c.zipFileHash && c.examDate === deployDate && c.examSession === deploySession && c.isDeployed
  ).length;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, mb: 3, gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <RocketLaunchIcon sx={{ fontSize: 32, color: '#C2A56D' }} />
            Question Paper <span style={{ color: '#C2A56D' }}>Deployment</span>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Deploy scheduled examination session question papers exactly 30 minutes prior to exam start time.
          </Typography>
        </Box>
        <IconButton onClick={() => fetchColleges(false)} size="small" title="Refresh data" sx={{ color: 'text.secondary', bgcolor: '#E8EDF2' }}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Deployment Control Panel */}
      <Paper variant="outlined" sx={{ p: 3, mb: 4, borderRadius: 1, bgcolor: '#fffbf5', borderColor: '#fbd38d', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.08)' }}>
        <Typography variant="h6" fontWeight={800} color="warning.dark" mb={1} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          ⚡ Session Deployment Controller
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Select the Examination Date and Session below. Clicking deploy will instantly unlock the encrypted question paper ZIP folders for all colleges scheduled for that session.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2.5, flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'stretch', md: 'center' }, mt: 2, mb: 1 }}>
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 200px' }, width: { xs: '100%', md: 'auto' } }}>
            <TextField
              type="date"
              label="Examination Date"
              size="small"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
              value={deployDate}
              onChange={(e) => setDeployDate(e.target.value)}
              sx={{ bgcolor: '#fff' }}
            />
          </Box>
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 230px' }, width: { xs: '100%', md: 'auto' } }}>
            <TextField
              select
              label="Examination Session"
              size="small"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
              value={deploySession}
              onChange={(e) => setDeploySession(e.target.value)}
              sx={{ bgcolor: '#fff' }}
            >
              <MenuItem value="AM">AM (Morning Session)</MenuItem>
              <MenuItem value="PM">PM (Afternoon Session)</MenuItem>
            </TextField>
          </Box>
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 280px' }, width: { xs: '100%', md: 'auto' } }}>
            <Button
              variant="contained"
              color="warning"
              fullWidth
              onClick={handleDeploySession}
              disabled={deployLoading || sessionMatchesCount === 0}
              startIcon={deployLoading ? <CircularProgress size={20} color="inherit" /> : <RocketLaunchIcon />}
              sx={{ py: 1.1, fontWeight: 800, textTransform: 'none', fontSize: '0.95rem', boxShadow: 2 }}
            >
              {deployLoading ? 'Deploying Papers…' : `Deploy ${deploySession} Session (${sessionMatchesCount} ZIP folders)`}
            </Button>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: { xs: 1, sm: 3 }, mt: 2.5, pt: 2, borderTop: '1px dashed #f6ad55', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ScheduleIcon fontSize="small" color="action" /> Scheduled ZIP Folders for {deployDate ? deployDate.split('-').reverse().join('-') : ''} ({deploySession}): <strong>{sessionMatchesCount}</strong>
            </Typography>
            <Typography variant="caption" fontWeight={700} color={deployedInSessionCount > 0 ? 'success.main' : 'text.secondary'}>
              Status: <strong>{deployedInSessionCount === sessionMatchesCount && sessionMatchesCount > 0 ? 'ALL DEPLOYED' : `${deployedInSessionCount} / ${sessionMatchesCount} Deployed`}</strong>
            </Typography>
          </Box>
          <Button
            variant="outlined"
            size="small"
            onClick={handleGenerateAiSummary}
            sx={{ fontWeight: 800, textTransform: 'none', borderRadius: 2, borderColor: '#3B82F6', color: '#2563EB', bgcolor: '#EFF6FF', '&:hover': { bgcolor: '#DBEAFE', borderColor: '#2563EB' } }}
          >
            ✨ Generate AI Session Summary
          </Button>
        </Box>
      </Paper>

      {/* Search Bar & Download Status Filter */}
      <Box sx={{ mb: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, flexGrow: 1, width: { xs: '100%', md: 'auto' } }}>
          <TextField
            placeholder="Search ZIP folders by college code, name, or district..."
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ maxWidth: { xs: '100%', sm: 420 }, flexGrow: 1, width: { xs: '100%', sm: 'auto' } }}
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
            sx={{ width: { xs: '100%', sm: 210 }, bgcolor: '#fff' }}
          >
            <MenuItem value="ALL">All Statuses</MenuItem>
            <MenuItem value="PENDING">Pending</MenuItem>
            <MenuItem value="DOWNLOADED">Downloaded (1st Time)</MenuItem>
            <MenuItem value="PENDING_REDOWNLOAD">Pending Re-Download</MenuItem>
            <MenuItem value="REDOWNLOADED">Re-Downloaded</MenuItem>
          </TextField>
        </Box>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          Showing {filteredColleges.length} deployed college question paper ZIP folder(s)
        </Typography>
      </Box>

      {/* Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1, overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
          <Table size="small" sx={{ minWidth: 1150 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 700 }}>S. No</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>College Code</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>College Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ZIP File Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Scheduled Date & Session</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Deployed At</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Download Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Downloaded At</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Decryption Password</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Deploy System IP</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredColleges.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                    {searchQuery ? 'No deployed ZIP folders match your search.' : 'No question paper ZIP folders have been deployed yet. Use the Session Deployment Controller above to deploy scheduled ZIP folders.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredColleges.map((clg, index) => (
                  <TableRow key={clg._id} hover>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{clg.collegeCode}</TableCell>
                    <TableCell>{clg.collegeName}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        QP_{clg.collegeCode}.zip
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {clg.examDate ? (
                        <Box>
                          <Typography variant="body2" fontWeight={700}>{clg.examDate ? clg.examDate.split('-').reverse().join('-') : ''}</Typography>
                          <Chip label={`${clg.examSession || 'AM'} SESSION`} size="small" color="info" sx={{ height: 20, fontSize: '0.68rem', mt: 0.5, fontWeight: 700 }} />
                        </Box>
                      ) : (
                        <span style={{ color: '#aaa', fontSize: '0.85rem' }}>—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {clg.deployedAt ? (
                        <Box>
                          <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.82rem', marginBottom: '3px' }}>
                            {formatTimestampDate(clg.deployedAt)}
                          </div>
                          <div style={{ fontWeight: 600, color: '#64748b', fontSize: '0.74rem', marginBottom: '4px' }}>
                            🕒 {formatTimestampTime(clg.deployedAt)}
                          </div>
                          {clg.initialDeployedAt && new Date(clg.initialDeployedAt).getTime() !== new Date(clg.deployedAt).getTime() && (
                            <div style={{ color: '#0369a1', fontSize: '0.66rem', marginTop: '3px', fontWeight: 700 }}>
                              Initial: {formatTimestampTime(clg.initialDeployedAt)}
                            </div>
                          )}
                        </Box>
                      ) : (
                        <span style={{ color: '#aaa', fontSize: '0.85rem' }}>—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {clg.zipDownloaded ? (
                        clg.isRedeploy || clg.downloadCount > 1 ? (
                          <Box>
                            <Chip icon={<CheckCircleIcon />} label="RE-DOWNLOADED" color="info" size="small" sx={{ fontWeight: 800, mb: 0.5 }} />
                            {clg.redeployReason && (
                              <Typography variant="caption" display="block" sx={{ color: '#c53030', fontWeight: 700, mt: 0.3, maxWidth: 200, fontStyle: 'italic', bgcolor: '#fff5f5', p: 0.5, borderRadius: 1 }}>
                                ⚠️ Reason: {clg.redeployReason}
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          <Chip icon={<CheckCircleIcon />} label="DOWNLOADED" color="success" size="small" sx={{ fontWeight: 800 }} />
                        )
                      ) : clg.isRedeploy || clg.downloadCount >= 1 ? (
                        <Box>
                          <Chip icon={<ScheduleIcon />} label="PENDING RE-DOWNLOAD" color="warning" size="small" sx={{ fontWeight: 800, mb: 0.5 }} />
                          {clg.redeployReason && (
                            <Typography variant="caption" display="block" sx={{ color: '#c53030', fontWeight: 700, mt: 0.3, maxWidth: 200, fontStyle: 'italic', bgcolor: '#fff5f5', p: 0.5, borderRadius: 1 }}>
                              ⚠️ Reason: {clg.redeployReason}
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Chip icon={<ScheduleIcon />} label="PENDING" color="default" size="small" sx={{ fontWeight: 800 }} />
                      )}
                    </TableCell>
                    <TableCell>
                      {clg.zipDownloaded ? (
                        clg.isRedeploy || clg.downloadCount > 1 ? (
                          clg.redownloadedAt || clg.zipDownloadedAt ? (
                            <Box>
                              <div style={{ fontWeight: 700, color: '#0288d1', fontSize: '0.82rem', marginBottom: '3px' }}>
                                {formatTimestampDate(clg.redownloadedAt || clg.zipDownloadedAt)}
                              </div>
                              <div style={{ fontWeight: 600, color: '#64748b', fontSize: '0.74rem', marginBottom: '4px' }}>
                                🕒 {formatTimestampTime(clg.redownloadedAt || clg.zipDownloadedAt)}
                              </div>
                              <Chip label="Re-download" size="small" sx={{ height: 16, fontSize: '0.62rem', bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 700, mt: 0.3 }} />
                            </Box>
                          ) : <span style={{ color: '#aaa', fontSize: '0.85rem' }}>—</span>
                        ) : (
                          clg.firstDownloadedAt || clg.zipDownloadedAt ? (
                            <Box>
                              <div style={{ fontWeight: 700, color: '#2e7d32', fontSize: '0.82rem', marginBottom: '3px' }}>
                                {formatTimestampDate(clg.firstDownloadedAt || clg.zipDownloadedAt)}
                              </div>
                              <div style={{ fontWeight: 600, color: '#64748b', fontSize: '0.74rem', marginBottom: '4px' }}>
                                🕒 {formatTimestampTime(clg.firstDownloadedAt || clg.zipDownloadedAt)}
                              </div>
                            </Box>
                          ) : <span style={{ color: '#aaa', fontSize: '0.85rem' }}>—</span>
                        )
                      ) : (
                        <span style={{ color: '#aaa', fontSize: '0.85rem' }}>—</span>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {clg.dayPassword ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                          <code style={{ fontSize: '0.82rem', background: '#f5f5f5', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                            {clg.dayPassword}
                          </code>
                          <IconButton size="small" onClick={() => handleCopyPassword(clg.dayPassword)} title="Copy Password">
                            <ContentCopyIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Box>
                      ) : (
                        <span style={{ color: '#aaa', fontSize: '0.85rem' }}>N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {(clg.redeployedIp || clg.deployedIp || clg.redownloadedIp || clg.firstDownloadedIp) ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {(clg.redeployedIp || clg.deployedIp) && (
                            <Chip
                              label={`Deploy: ${clg.redeployedIp || clg.deployedIp}`}
                              size="small"
                              sx={{ height: 20, fontSize: '0.66rem', fontFamily: 'monospace', fontWeight: 700, bgcolor: '#f1f5f9', color: '#334155' }}
                            />
                          )}
                          {(clg.redownloadedIp || clg.firstDownloadedIp) && (
                            <Chip
                              label={`Download: ${clg.redownloadedIp || clg.firstDownloadedIp}`}
                              size="small"
                              sx={{ height: 20, fontSize: '0.66rem', fontFamily: 'monospace', fontWeight: 700, bgcolor: '#e0f2fe', color: '#0369a1' }}
                            />
                          )}
                        </Box>
                      ) : (
                        <span style={{ color: '#aaa', fontSize: '0.85rem' }}>—</span>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8, alignItems: 'center' }}>
                        {clg.zipDownloaded ? (
                          <Button
                            variant="outlined"
                            color="warning"
                            size="small"
                            onClick={() => handleOpenRedeployModal(clg)}
                            startIcon={<RocketLaunchIcon />}
                            sx={{ textTransform: 'none', fontWeight: 800, fontSize: '0.72rem', borderRadius: 1.5, whiteSpace: 'nowrap' }}
                          >
                            Re-Deploy with Reason
                          </Button>
                        ) : clg.isRedeploy || clg.downloadCount >= 1 ? (
                          <Chip label="Ready for Re-Download" color="info" size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                        ) : (
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>Active (1 Attempt)</Typography>
                        )}

                        {(clg.auditLogs?.length > 0 || clg.firstDownloadedAt || clg.redeployedAt) && (
                          <Button
                            variant="text"
                            color="primary"
                            size="small"
                            onClick={() => handleOpenAuditModal(clg)}
                            startIcon={<HistoryIcon sx={{ fontSize: 15 }} />}
                            sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.71rem', p: 0.2 }}
                          >
                            Audit Log ({clg.auditLogs?.length || 1})
                          </Button>
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

      {/* Re-Deployment Reason Dialog Modal */}
      <Dialog open={redeployModalOpen} onClose={() => !redeploySubmitting && setRedeployModalOpen(false)} maxWidth="sm" fullWidth sx={{ '& .MuiDialog-paper': { m: { xs: 1.5, sm: 4 }, width: { xs: 'calc(100% - 24px)', sm: 'auto' } } }}>
        <DialogTitle sx={{ bgcolor: '#2C3947', color: '#fff', fontWeight: 800 }}>
          Re-Deploy & Authorize Re-Download
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 2, mt: 1 }}>
          {redeployTargetCollege && (
            <Box>
              <Alert severity="info" sx={{ mb: 2.5, fontWeight: 600 }}>
                College: <strong>{redeployTargetCollege.collegeCode} - {redeployTargetCollege.collegeName}</strong>
                <br />
                Re-deploying will grant the Principal a fresh 1-hour download window and exactly 1 more download attempt.
              </Alert>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: '#2C3947' }}>
                Reason for Re-Deployment (Required for Audit Trail):
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                placeholder="e.g., Principal called reporting power failure while saving initial ZIP file. Verified identity via phone."
                value={redeployReasonInput}
                onChange={(e) => setRedeployReasonInput(e.target.value)}
                variant="outlined"
                autoFocus
                sx={{ mb: 1.5 }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.2, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid #e2e8f0' }}>
                <Typography variant="caption" fontWeight={800} color="text.secondary">
                  AI Root Cause Tag:
                </Typography>
                <Chip label={redeployAiCategory} size="small" sx={{ fontWeight: 800, bgcolor: '#EFF6FF', color: '#2563EB' }} />
                <Typography variant="caption" color="text.secondary">
                  ({redeployAiExplanation})
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setRedeployModalOpen(false)} disabled={redeploySubmitting} sx={{ fontWeight: 700, textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmRedeploy}
            disabled={redeploySubmitting || !redeployReasonInput.trim()}
            variant="contained"
            color="warning"
            startIcon={redeploySubmitting ? <CircularProgress size={16} color="inherit" /> : <RocketLaunchIcon />}
            sx={{ fontWeight: 800, textTransform: 'none' }}
          >
            {redeploySubmitting ? 'Re-Deploying…' : 'Confirm Re-Deployment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Audit Log Timeline Dialog Modal */}
      <Dialog open={auditModalOpen} onClose={() => setAuditModalOpen(false)} maxWidth="md" fullWidth scroll="paper" sx={{ '& .MuiDialog-paper': { m: { xs: 1.5, sm: 4 }, width: { xs: 'calc(100% - 24px)', sm: 'auto' } } }}>
        <DialogTitle sx={{ bgcolor: '#547A95', color: '#fff', fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
          <span>Chronological Audit & Re-Download History</span>
          {auditTargetCollege && <Chip label={auditTargetCollege.collegeCode} size="small" sx={{ bgcolor: '#C2A56D', color: '#2C3947', fontWeight: 900 }} />}
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 3, pb: 3, bgcolor: '#f8fafc', overflowY: 'auto', maxHeight: '65vh' }}>
          {auditTargetCollege && (
            <Box>
              <Box sx={{ mb: 3, p: 2, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <Typography variant="subtitle1" fontWeight={800} color="#2C3947">
                  {auditTargetCollege.collegeName} ({auditTargetCollege.collegeCode})
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Scheduled Exam: <strong>{auditTargetCollege.examDate ? auditTargetCollege.examDate.split('-').reverse().join('-') : 'N/A'}</strong> ({auditTargetCollege.examSession || 'AM'} Session) | Total Downloads: <strong>{auditTargetCollege.downloadCount || 0}</strong>
                </Typography>
              </Box>

              <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5, color: '#2C3947', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Timeline of Events:
              </Typography>

              {(!auditTargetCollege.auditLogs || auditTargetCollege.auditLogs.length === 0) ? (
                <Alert severity="warning">No structured logs available. Initial Deploy: {auditTargetCollege.deployedAt ? `${formatTimestampDate(auditTargetCollege.deployedAt)} at ${formatTimestampTime(auditTargetCollege.deployedAt)}` : 'N/A'}</Alert>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {auditTargetCollege.auditLogs.map((log, index) => (
                    <Paper key={index} elevation={0} sx={{ p: 2, borderLeft: `5px solid ${log.action === 'REDEPLOY' ? '#ed6c02' : log.action === 'REDOWNLOAD' ? '#0288d1' : log.action === 'DOWNLOAD' ? '#2e7d32' : '#547A95'}`, borderTop: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5, flexWrap: 'wrap' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={log.action}
                            size="small"
                            color={log.action === 'REDEPLOY' ? 'warning' : log.action === 'REDOWNLOAD' ? 'info' : log.action === 'DOWNLOAD' ? 'success' : ['DEVTOOLS_DETECTED', 'NETWORK_OFFLINE', 'TAB_BLURRED', 'TELEMETRY_ALERT'].includes(log.action) ? 'error' : 'primary'}
                            sx={{ fontWeight: 800, fontSize: '0.7rem' }}
                          />
                          {log.category && (
                            <Chip label={log.category} size="small" sx={{ fontWeight: 800, fontSize: '0.66rem', bgcolor: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE' }} />
                          )}
                          <Typography variant="caption" fontWeight={700} color="text.secondary">
                            By: {log.performedBy || 'System'}
                          </Typography>
                          {log.ipAddress && (
                            <Chip label={`💻 IP: ${log.ipAddress}`} size="small" sx={{ height: 18, fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 700, bgcolor: '#f1f5f9', color: '#334155' }} />
                          )}
                        </Box>
                        <Typography variant="caption" fontWeight={700} color="#2C3947" sx={{ bgcolor: '#f1f5f9', px: 1, py: 0.3, borderRadius: 1 }}>
                          🕒 {formatTimestampDate(log.timestamp)} at {formatTimestampTime(log.timestamp)}
                        </Typography>
                      </Box>
                      {log.reason && (
                        <Typography variant="body2" sx={{ mt: 1, fontWeight: 600, color: log.action === 'REDEPLOY' ? '#c53030' : 'text.primary', bgcolor: log.action === 'REDEPLOY' ? '#fff5f5' : '#f8fafc', p: 1, borderRadius: 1 }}>
                          Reason / Details: "{log.reason}"
                        </Typography>
                      )}
                    </Paper>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5, bgcolor: '#fff' }}>
          <Button onClick={() => setAuditModalOpen(false)} variant="contained" color="primary" sx={{ fontWeight: 700, textTransform: 'none' }}>
            Close Timeline
          </Button>
        </DialogActions>
      </Dialog>

      {/* AI Smart Audit & Session Summarizer Modal */}
      <Dialog open={aiSummaryModalOpen} onClose={() => setAiSummaryModalOpen(false)} maxWidth="md" fullWidth sx={{ '& .MuiDialog-paper': { m: { xs: 1.5, sm: 4 }, width: { xs: 'calc(100% - 24px)', sm: 'auto' } } }}>
        <DialogTitle sx={{ bgcolor: '#1E293B', color: '#fff', fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span>✨ AI Smart Audit & Session Summary</span>
            <Chip label={deploySession || 'ALL'} size="small" sx={{ bgcolor: '#3B82F6', color: 'white', fontWeight: 800 }} />
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 3, pb: 3, bgcolor: '#f8fafc', maxHeight: '70vh', overflowY: 'auto' }}>
          {aiSummaryLoading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 2 }}>
              <CircularProgress size={36} color="primary" />
              <Typography fontWeight={700} color="text.secondary">
                AI is reading audit logs, telemetry signals, and root-cause categories...
              </Typography>
            </Box>
          ) : aiSummaryData ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Executive Metrics Row */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' }, gap: 2 }}>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #e2e8f0', bgcolor: '#fff', textAlign: 'center' }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">Total Scheduled</Typography>
                  <Typography variant="h4" fontWeight={900} color="#1E293B">{aiSummaryData.totalScheduled}</Typography>
                </Paper>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #e2e8f0', bgcolor: '#fff', textAlign: 'center' }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">Downloaded</Typography>
                  <Typography variant="h4" fontWeight={900} color="#10B981">{aiSummaryData.downloadedCount}</Typography>
                </Paper>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #e2e8f0', bgcolor: '#fff', textAlign: 'center' }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">Re-Deployments</Typography>
                  <Typography variant="h4" fontWeight={900} color="#F59E0B">{aiSummaryData.redeployCount}</Typography>
                </Paper>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #e2e8f0', bgcolor: '#fff', textAlign: 'center' }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">Overall Health</Typography>
                  <Typography variant="h4" fontWeight={900} color="#3B82F6">{aiSummaryData.healthPercentage}%</Typography>
                </Paper>
              </Box>

              {/* AI Key Insights Box */}
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, bgcolor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                <Typography variant="subtitle2" fontWeight={800} color="#1E3A8A" gutterBottom>
                  🤖 Executive AI Briefing & Recommendations:
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                  {aiSummaryData.insights && aiSummaryData.insights.map((ins, idx) => (
                    <Typography key={idx} variant="body2" fontWeight={600} color="#1E40AF">
                      • {ins}
                    </Typography>
                  ))}
                </Box>
              </Paper>

              {/* Root Cause Analytics Breakdown */}
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, bgcolor: '#fff', border: '1px solid #e2e8f0' }}>
                <Typography variant="subtitle2" fontWeight={800} color="#1E293B" gutterBottom>
                  Root Cause Category Breakdown across Session Logs:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1.5 }}>
                  {aiSummaryData.categoryBreakdown && Object.entries(aiSummaryData.categoryBreakdown).map(([catName, count], idx) => (
                    <Chip
                      key={idx}
                      label={`${catName}: ${count}`}
                      sx={{ fontWeight: 800, bgcolor: count > 0 ? '#FEF3C7' : '#F1F5F9', color: count > 0 ? '#B45309' : '#64748B' }}
                    />
                  ))}
                </Box>
              </Paper>

              {/* Critical Exceptions List */}
              {aiSummaryData.criticalExceptions && aiSummaryData.criticalExceptions.length > 0 && (
                <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, bgcolor: '#fff', border: '1px solid #e2e8f0' }}>
                  <Typography variant="subtitle2" fontWeight={800} color="#DC2626" gutterBottom>
                    ⚠️ Critical Re-Deployment Exceptions (Top 5):
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
                    {aiSummaryData.criticalExceptions.map((exc, idx) => (
                      <Box key={idx} sx={{ p: 1.5, borderRadius: 1.5, bgcolor: '#FEF2F2', borderLeft: '4px solid #EF4444' }}>
                        <Typography variant="caption" fontWeight={800} color="#991B1B">
                          {exc.collegeCode} - {exc.collegeName}
                        </Typography>
                        <Typography variant="body2" fontWeight={600} color="#7F1D1D" sx={{ mt: 0.3 }}>
                          Reason: "{exc.reason}" | Tag: <strong>{exc.category}</strong>
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Paper>
              )}
            </Box>
          ) : (
            <Alert severity="info">No summary available for this filter configuration.</Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5, bgcolor: '#fff' }}>
          <Button onClick={() => setAiSummaryModalOpen(false)} variant="contained" sx={{ fontWeight: 700 }}>
            Close Briefing
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
