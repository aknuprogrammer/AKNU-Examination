import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { 
  Box, Card, CardContent, Typography, TextField, Button, Alert, 
  InputAdornment, IconButton, CircularProgress, FormControl, 
  InputLabel, OutlinedInput, FormHelperText 
} from '@mui/material';
import KeyIcon from '@mui/icons-material/Key';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import api from '../utils/api.js';
import { loginSuccess } from '../store/authSlice.js';

export default function ChangePassword() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' }
  });

  const newPassword = watch('newPassword');

  const onSubmit = async (data) => {
    setLoading(true);
    setSubmitError(null);
    try {
      const res = await api.post('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      });

      if (res.data.success) {
        // Update user state (forcePasswordChange is now false) and save new access token
        dispatch(loginSuccess({
          user: { ...user, forcePasswordChange: false },
          accessToken: res.data.accessToken
        }));
        navigate('/', { replace: true });
      }
    } catch (err) {
      setSubmitError(err.message || 'Failed to update password. Ensure current password is correct.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', position: 'relative' }}>
      <div className="animate-glow" style={{ top: '30%', left: '20%' }}></div>
      <Card sx={{ width: { xs: 'calc(100% - 32px)', sm: 440 }, maxWidth: 440, mx: 'auto', py: 2, px: 1, zIndex: 10, backdropFilter: 'blur(24px)' }}>
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <Box sx={{ p: 1.5, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', mb: 2 }}>
              <KeyIcon sx={{ fontSize: 32, color: '#f87171' }} />
            </Box>
            <Typography variant="h5" component="h1" fontWeight={700} gutterBottom>
              Update Password
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              You must update your temporary password to secure your account before proceeding.
            </Typography>
          </Box>

          <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
            Password must be at least 8 characters, include 1 uppercase, 1 lowercase, 1 number, and 1 special character.
          </Alert>

          {submitError && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {submitError}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
              <TextField
                label="Current Password"
                type="password"
                variant="outlined"
                fullWidth
                {...register('currentPassword', { required: 'Current password is required' })}
                error={!!errors.currentPassword}
                helperText={errors.currentPassword?.message}
                disabled={loading}
              />
              
              <FormControl variant="outlined" fullWidth error={!!errors.newPassword} disabled={loading}>
                <InputLabel htmlFor="new-password">New Password</InputLabel>
                <OutlinedInput
                  id="new-password"
                  label="New Password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('newPassword', { 
                    required: 'New password is required',
                    minLength: { value: 8, message: 'Password must be at least 8 characters' },
                    validate: {
                      hasUpper: (v) => /[A-Z]/.test(v) || 'Must contain at least one uppercase letter',
                      hasLower: (v) => /[a-z]/.test(v) || 'Must contain at least one lowercase letter',
                      hasDigit: (v) => /[0-9]/.test(v) || 'Must contain at least one digit',
                      hasSpecial: (v) => /[^A-Za-z0-9]/.test(v) || 'Must contain at least one special character'
                    }
                  })}
                  endAdornment={
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        disabled={loading}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  }
                />
                {errors.newPassword && (
                  <FormHelperText error>{errors.newPassword.message}</FormHelperText>
                )}
              </FormControl>

              <FormControl variant="outlined" fullWidth error={!!errors.confirmPassword} disabled={loading}>
                <InputLabel htmlFor="confirm-password">Confirm New Password</InputLabel>
                <OutlinedInput
                  id="confirm-password"
                  label="Confirm New Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  {...register('confirmPassword', { 
                    required: 'Please confirm your new password',
                    validate: (v) => v === newPassword || 'Passwords do not match'
                  })}
                  endAdornment={
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                        disabled={loading}
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  }
                />
                {errors.confirmPassword && (
                  <FormHelperText error>{errors.confirmPassword.message}</FormHelperText>
                )}
              </FormControl>

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                sx={{ height: 48, fontWeight: 700, mt: 1 }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Secure My Account'}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
