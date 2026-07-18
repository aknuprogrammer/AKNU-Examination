import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import {
  Box, Card, CardContent, Typography, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Chip, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Alert, Divider,
  Tabs, Tab, Grid
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import BlockIcon from '@mui/icons-material/Block';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import GetAppIcon from '@mui/icons-material/GetApp';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import { ConfirmDialog, ToastAlert, useToast } from '../components/ConfirmDialog.jsx';
import api from '../utils/api.js';

export default function Colleges() {
  const { user } = useSelector((state) => state.auth);
  const canWrite = user && ['Super Admin', 'Admin', 'Controller of Examinations'].includes(user.role);

  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCollege, setEditingCollege] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  // Delete confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState(null); // college object to delete

  // Bulk Upload Modal State
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState('');
  const [bulkErrorsList, setBulkErrorsList] = useState([]);

  // Toast notifications
  const { toast, showToast, hideToast } = useToast();

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm();

  const fetchColleges = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await api.get('/colleges');
      if (res.data.success) {
        setColleges(res.data.data);
      }
    } catch (e) {
      console.error('Failed to load colleges', e);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    fetchColleges(true);
  }, []);

  const handleOpenDialog = (college = null) => {
    setEditingCollege(college);
    setSubmitError(null);
    if (college) {
      reset({
        collegeCode: college.collegeCode,
        collegeName: college.collegeName,
        district: college.district,
        principalName: college.principalName,
        principalMobile: college.principalMobile,
        principalEmail: college.principalEmail,
        portalStatus: college.portalStatus
      });
    } else {
      reset({
        collegeCode: '',
        collegeName: '',
        district: '',
        principalName: '',
        principalMobile: '',
        principalEmail: '',
        portalStatus: 'active'
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = (event, reason) => {
    if (reason === 'backdropClick' || reason === 'escapeKeyDown') return;
    setDialogOpen(false);
    setEditingCollege(null);
  };

  const onSubmit = async (data) => {
    setSubmitError(null);
    try {
      if (editingCollege) {
        const res = await api.put(`/colleges/${editingCollege._id}`, data);
        if (res.data.success) {
          fetchColleges(false);
          handleCloseDialog();
        }
      } else {
        const res = await api.post('/colleges', data);
        if (res.data.success) {
          fetchColleges(false);
          handleCloseDialog();
        }
      }
    } catch (e) {
      setSubmitError(e.message || 'Failed to save college data.');
    }
  };

  // Opens the confirmation modal — actual delete happens in handleDeleteConfirm
  const handleDelete = (college) => {
    setDeleteTarget(college);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      const res = await api.delete(`/colleges/${deleteTarget._id}`);
      if (res.data.success) {
        showToast(`College "${deleteTarget.collegeName}" permanently deleted.`, 'success');
        setColleges((prev) => prev.filter((c) => c._id !== deleteTarget._id));
        fetchColleges(false);
      }
    } catch (e) {
      showToast(e.message || 'Deletion failed.', 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  // CSV Parsing & Bulk Upload Logic
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target.result;
        const lines = text.split(/\r?\n/);
        if (lines.length < 2) {
          throw new Error('CSV is empty or missing headers.');
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const expectedRequired = ['collegecode', 'collegename', 'principalname', 'principalmobile', 'principalemail'];

        // Basic header validation
        const missing = expectedRequired.filter(exp => !headers.includes(exp));
        if (missing.length > 0) {
          throw new Error(`Invalid CSV format. Missing required headers: ${missing.join(', ')}`);
        }

        const parsedColleges = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Split line respecting possible quoted fields
          const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
          const cleanedValues = values.map(v => v.trim().replace(/^"|"$/g, ''));

          const districtIdx = headers.indexOf('district');
          const hasDistrict = districtIdx !== -1;
          const requiredLength = hasDistrict ? 6 : 5;
          if (cleanedValues.length < requiredLength) continue;

          parsedColleges.push({
            collegeCode: cleanedValues[headers.indexOf('collegecode')],
            collegeName: cleanedValues[headers.indexOf('collegename')],
            district: hasDistrict ? cleanedValues[districtIdx] : '',
            principalName: cleanedValues[headers.indexOf('principalname')],
            principalMobile: cleanedValues[headers.indexOf('principalmobile')],
            principalEmail: cleanedValues[headers.indexOf('principalemail')]
          });
        }

        if (parsedColleges.length === 0) {
          throw new Error('No valid rows found in CSV.');
        }

        // Send to backend immediately
        const res = await api.post('/colleges/bulk', { colleges: parsedColleges });
        if (res.data.success) {
          const { successCount, errors: bulkErrors } = res.data.data;
          setBulkSuccessMsg(`Successfully registered ${successCount} colleges!`);
          setBulkErrorsList(bulkErrors);
          setResultsDialogOpen(true);
          fetchColleges(false);
        }
      } catch (err) {
        showToast(err.message || 'Failed to process bulk upload.', 'error');
      } finally {
        e.target.value = ''; // clear input
      }
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const headers = 'collegeCode,collegeName,district,principalName,principalMobile,principalEmail\n';
    const sample = '101,AKNU College of Science,Rajamahendravaram,Dr. Prasad,9988776655,prasad@aknu.edu.in\n102,Aditya College,Kakinada,Dr. Lakshmi,9876543210,lakshmi@aknu.edu.in\n';
    const blob = new Blob([headers + sample], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'colleges_template.csv');
    a.click();
  };

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    showToast(`${type} copied to clipboard!`, 'info');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, mb: 2, minHeight: 40, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" fontWeight={800}>
          Exam Centre <span style={{ color: '#547A95' }}>Management</span>
        </Typography>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<GetAppIcon />}
            onClick={downloadTemplate}
          >
            Template
          </Button>

          {canWrite && (
            <>
              <Button
                variant="outlined"
                size="small"
                component="label"
                startIcon={<CloudUploadIcon />}
              >
                Bulk Upload
                <input
                  type="file"
                  accept=".csv"
                  hidden
                  onChange={handleFileChange}
                />
              </Button>

              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
              >
                Add Exam Centre
              </Button>
            </>
          )}
        </Box>
      </Box>

      {loading ? (
        <Typography>Loading Exam Centres...</Typography>
      ) : (
        <TableContainer component={Paper} sx={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
          <Table sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Exam Centre Code</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Exam Centre Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>District</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Principal Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Principal Email</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Principal Mobile</TableCell>
                {/* <TableCell sx={{ fontWeight: 700 }}>Portal Status</TableCell> */}
                {canWrite && <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {colleges.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canWrite ? 8 : 7} align="center">No colleges added yet.</TableCell>
                </TableRow>
              ) : (
                colleges.map((clg) => (
                  <TableRow key={clg._id}>
                    <TableCell sx={{ fontWeight: 600 }}>{clg.collegeCode}</TableCell>
                    <TableCell>{clg.collegeName}</TableCell>
                    <TableCell>{clg.district}</TableCell>
                    <TableCell>{clg.principalName}</TableCell>
                    <TableCell>{clg.principalEmail}</TableCell>
                    <TableCell>{clg.principalMobile}</TableCell>
                    {/* <TableCell>
                      <Chip
                        icon={clg.portalStatus === 'active' ? <CheckIcon /> : <BlockIcon />}
                        label={clg.portalStatus.toUpperCase()}
                        color={clg.portalStatus === 'active' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell> */}
                    {canWrite && (
                      <TableCell align="right">
                        <IconButton onClick={() => handleOpenDialog(clg)} size="small" sx={{ mr: 1, color: 'text.secondary' }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          onClick={() => handleDelete(clg)}
                          size="small"
                          sx={{ color: 'text.secondary' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}



      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth sx={{ '& .MuiDialog-paper': { m: { xs: 1.5, sm: 4 }, width: { xs: 'calc(100% - 24px)', sm: 'auto' } } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          {editingCollege ? 'Modify Exam Centre Details' : 'Register New Exam Centre'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogContent sx={{ pt: 1, pb: 2 }}>
            {submitError && <Alert severity="error" sx={{ mb: 2 }}>{submitError}</Alert>}

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Exam Centre Code (Unique)"
                  size="small"
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  {...register('collegeCode', { required: 'Exam Centre code is required' })}
                  error={!!errors.collegeCode}  
                  helperText={errors.collegeCode?.message}
                  disabled={!!editingCollege} // code is immutable
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Exam Centre Name"
                  size="small"
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  {...register('collegeName', { required: 'Exam Centre name is required' })}
                  error={!!errors.collegeName}
                  helperText={errors.collegeName?.message}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="District (Optional)"
                  size="small"
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  {...register('district')}
                />
              </Grid>
              {editingCollege && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    select
                    label="Status"
                    size="small"
                    fullWidth
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={watch('portalStatus') || 'active'}
                    onChange={(e) => setValue('portalStatus', e.target.value)}
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                  </TextField>
                </Grid>
              )}

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Principal Full Name"
                  size="small"
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  {...register('principalName', { required: 'Principal name is required' })}
                  error={!!errors.principalName}
                  helperText={errors.principalName?.message}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Principal Email (System Login)"
                  size="small"
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  {...register('principalEmail', {
                    required: 'Principal email is required',
                    pattern: { value: /^\S+@\S+$/i, message: 'Invalid email address' }
                  })}
                  error={!!errors.principalEmail}
                  helperText={errors.principalEmail?.message}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Principal Mobile (SMS OTP)"
                  size="small"
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  {...register('principalMobile', {
                    required: 'Mobile is required',
                    pattern: { value: /^[6-9]\d{9}$/, message: 'Invalid 10-digit mobile number' }
                  })}
                  error={!!errors.principalMobile}
                  helperText={errors.principalMobile?.message}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={handleCloseDialog} color="inherit" size="small">Cancel</Button>
            <Button type="submit" variant="contained" size="small">Save College</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Bulk Upload Results Dialog */}
      <Dialog open={resultsDialogOpen} onClose={() => setResultsDialogOpen(false)} maxWidth="sm" fullWidth sx={{ '& .MuiDialog-paper': { m: { xs: 1.5, sm: 4 }, width: { xs: 'calc(100% - 24px)', sm: 'auto' } } }}>
        <DialogTitle fontWeight={700}>Bulk Import Results</DialogTitle>
        <DialogContent>
          <Alert severity="success" sx={{ mb: 2 }}>{bulkSuccessMsg}</Alert>
          {bulkErrorsList.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="error.main" fontWeight={700} mb={1}>
                Some rows failed to import:
              </Typography>
              <Paper variant="outlined" sx={{ maxHeight: 200, overflowY: 'auto', p: 1.5, backgroundColor: 'rgba(0, 0, 0, 0.02)' }}>
                {bulkErrorsList.map((err, idx) => (
                  <Typography key={idx} variant="caption" display="block" sx={{ mb: 0.5 }}>
                    • <strong>College {err.collegeCode}</strong>: {err.message}
                  </Typography>
                ))}
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResultsDialogOpen(false)} variant="contained">Close</Button>
        </DialogActions>
      </Dialog>
      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Permanently Delete College"
        message={`Are you sure you want to permanently delete the college "${deleteTarget?.collegeName}" and its principal account? This action cannot be undone.`}
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

    </Box>
  );
}
