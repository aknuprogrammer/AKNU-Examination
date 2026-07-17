import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Box, Card, CardContent, Typography, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Alert, IconButton
} from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';
import EditIcon from '@mui/icons-material/Edit';
import KeyIcon from '@mui/icons-material/Key';
import api from '../utils/api.js';

export default function Principals() {
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Password Reset Dialog
  const [resetOpen, setResetOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [resetError, setResetError] = useState(null);
  const [resetSuccess, setResetSuccess] = useState(null);

  // Edit Principal Dialog
  const [editOpen, setEditOpen] = useState(false);
  const [selectedCollege, setSelectedCollege] = useState(null);
  const [editError, setEditError] = useState(null);

  const { register: registerReset, handleSubmit: handleResetSubmit, reset: resetResetForm, formState: { errors: resetErrors } } = useForm();
  const { register: registerEdit, handleSubmit: handleEditSubmit, reset: resetEditForm, formState: { errors: editErrors } } = useForm();

  const fetchColleges = async () => {
    setLoading(true);
    try {
      const res = await api.get('/colleges');
      if (res.data.success) {
        setColleges(res.data.data);
      }
    } catch (e) {
      console.error('Failed to load colleges', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchColleges();
  }, []);

  const handleOpenReset = (clg) => {
    setSelectedUser(clg.principalUserId);
    setResetError(null);
    setResetSuccess(null);
    resetResetForm({ newPassword: '' });
    setResetOpen(true);
  };

  const handleOpenEdit = (clg) => {
    setSelectedCollege(clg);
    setEditError(null);
    resetEditForm({
      principalName: clg.principalName,
      principalEmail: clg.principalEmail,
      principalMobile: clg.principalMobile
    });
    setEditOpen(true);
  };

  const onResetSubmit = async (data) => {
    setResetError(null);
    setResetSuccess(null);
    try {
      const res = await api.post(`/auth/reset-principal-password/${selectedUser._id || selectedUser}`, {
        newPassword: data.newPassword
      });
      if (res.data.success) {
        setResetSuccess(res.data.message);
        setTimeout(() => setResetOpen(false), 2000);
      }
    } catch (e) {
      setResetError(e.message || 'Failed to reset password.');
    }
  };

  const onEditSubmit = async (data) => {
    setEditError(null);
    try {
      const res = await api.put(`/colleges/${selectedCollege._id}`, {
        collegeName: selectedCollege.collegeName,
        district: selectedCollege.district,
        ...data
      });
      if (res.data.success) {
        fetchColleges();
        setEditOpen(false);
      }
    } catch (e) {
      setEditError(e.message || 'Failed to update principal contact.');
    }
  };

  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" fontWeight={800}>
          Principal <span style={{ color: '#547A95' }}>Accounts</span>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage system login details and credentials for affiliated college principals.
        </Typography>
      </Box>

      {loading ? (
        <Typography>Loading principal accounts...</Typography>
      ) : (
        <TableContainer component={Paper} sx={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
          <Table sx={{ minWidth: 750 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>College Code</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Principal Username</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Principal Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Email Address</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Mobile Number</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Credentials State</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {colleges.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">No colleges linked with principal accounts yet.</TableCell>
                </TableRow>
              ) : (
                colleges.map((clg) => {
                  const user = clg.principalUserId || {};
                  return (
                    <TableRow key={clg._id}>
                      <TableCell fontWeight={600}>{clg.collegeCode}</TableCell>
                      <TableCell fontFamily="monospace">{user.username || `principal_${clg.collegeCode}`}</TableCell>
                      <TableCell>{clg.principalName}</TableCell>
                      <TableCell>{clg.principalEmail}</TableCell>
                      <TableCell>{clg.principalMobile}</TableCell>
                      <TableCell>
                        <Chip
                          label={user.forcePasswordChange ? 'FORCE CHANGE ON LOGIN' : 'ACTIVE / SECURE'}
                          color={user.forcePasswordChange ? 'warning' : 'success'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          onClick={() => handleOpenEdit(clg)}
                          color="primary"
                          title="Edit Contacts"
                          sx={{ mr: 1 }}
                        >
                          <EditIcon />
                        </IconButton>
                        <Button
                          variant="outlined"
                          color="warning"
                          size="small"
                          startIcon={<LockResetIcon />}
                          onClick={() => handleOpenReset(clg)}
                          disabled={!clg.principalUserId}
                        >
                          Reset Pass
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Password Reset Dialog */}
      <Dialog open={resetOpen} onClose={() => setResetOpen(false)} maxWidth="xs" fullWidth sx={{ '& .MuiDialog-paper': { m: { xs: 1.5, sm: 4 }, width: { xs: 'calc(100% - 24px)', sm: 'auto' } } }}>
        <DialogTitle fontWeight={700}>Reset Principal Password</DialogTitle>
        <form onSubmit={handleResetSubmit(onResetSubmit)} noValidate>
          <DialogContent>
            {resetError && <Alert severity="error" sx={{ mb: 2 }}>{resetError}</Alert>}
            {resetSuccess && <Alert severity="success" sx={{ mb: 2 }}>{resetSuccess}</Alert>}
            
            <Typography variant="body2" color="text.secondary" mb={3}>
              You are resetting the password for principal user. This will invalidate any active sessions and force a password update upon their next login.
            </Typography>

            <TextField
              label="New Password"
              type="password"
              fullWidth
              {...registerReset('newPassword', { 
                required: 'New password is required',
                minLength: { value: 8, message: 'Password must be at least 8 characters' }
              })}
              error={!!resetErrors.newPassword}
              helperText={resetErrors.newPassword?.message}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setResetOpen(false)} color="inherit">Cancel</Button>
            <Button type="submit" variant="contained" color="warning">Reset Password</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Edit Contacts Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="xs" fullWidth sx={{ '& .MuiDialog-paper': { m: { xs: 1.5, sm: 4 }, width: { xs: 'calc(100% - 24px)', sm: 'auto' } } }}>
        <DialogTitle fontWeight={700}>Update Principal Details</DialogTitle>
        <form onSubmit={handleEditSubmit(onEditSubmit)} noValidate>
          <DialogContent>
            {editError && <Alert severity="error" sx={{ mb: 2 }}>{editError}</Alert>}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, py: 1 }}>
              <TextField
                label="Principal Name"
                fullWidth
                {...registerEdit('principalName', { required: 'Name is required' })}
                error={!!editErrors.principalName}
                helperText={editErrors.principalName?.message}
              />
              <TextField
                label="Principal Email"
                fullWidth
                {...registerEdit('principalEmail', {
                  required: 'Email is required',
                  pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' }
                })}
                error={!!editErrors.principalEmail}
                helperText={editErrors.principalEmail?.message}
              />
              <TextField
                label="Principal Mobile"
                fullWidth
                {...registerEdit('principalMobile', {
                  required: 'Mobile is required',
                  pattern: { value: /^[6-9]\d{9}$/, message: 'Invalid 10-digit number' }
                })}
                error={!!editErrors.principalMobile}
                helperText={editErrors.principalMobile?.message}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setEditOpen(false)} color="inherit">Cancel</Button>
            <Button type="submit" variant="contained">Save Changes</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
