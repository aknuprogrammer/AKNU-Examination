import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { 
   Box, Card, CardContent, Typography, TextField, Button, Alert, 
   InputAdornment, IconButton, CircularProgress 
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import api from '../utils/api.js';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { newPassword: '', confirmPassword: '' }
  });

  const passwordVal = watch('newPassword');

  const onSubmit = async (data) => {
    if (!token) {
      setSubmitError('Invalid reset session: No token provided in URL.');
      return;
    }

    setSubmitError(null);
    setLoading(true);
    try {
      const res = await api.post(`/auth/reset-password/${token}`, {
        newPassword: data.newPassword
      });
      if (res.data.success) {
        setSubmitSuccess(true);
      }
    } catch (err) {
      console.error(err);
      setSubmitError(err.response?.data?.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', position: 'relative' }}>
      <div className="animate-glow" style={{ top: '20%', left: '30%' }}></div>
      <Card sx={{ width: { xs: 'calc(100% - 32px)', sm: 420 }, maxWidth: 420, mx: 'auto', py: 2, px: 1, zIndex: 10, backdropFilter: 'blur(24px)' }}>
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
            <Box sx={{ p: 1.5, borderRadius: '50%', background: 'rgba(74, 68, 102, 0.1)', mb: 2 }}>
              <LockIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            </Box>
            <Typography variant="h5" component="h1" fontWeight={700} gutterBottom>
              Reset Password
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Configure a new secure password for your account
            </Typography>
          </Box>

          {submitError && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {submitError}
            </Alert>
          )}

          {submitSuccess ? (
            <Box sx={{ textAlign: 'center' }}>
              <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
                Your password has been reset successfully!
              </Alert>
              <Button
                variant="contained"
                fullWidth
                onClick={() => navigate('/login')}
                sx={{ height: 48, fontWeight: 700 }}
              >
                Go to Login
              </Button>
            </Box>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField
                  label="New Password"
                  type={showPassword ? 'text' : 'password'}
                  variant="outlined"
                  fullWidth
                  {...register('newPassword', { 
                    required: 'New password is required',
                    pattern: {
                      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                      message: 'Password must be at least 8 characters long, and contain uppercase, lowercase, a number, and a special character.'
                    }
                  })}
                  error={!!errors.newPassword}
                  helperText={errors.newPassword?.message}
                  disabled={loading}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" disabled={loading}>
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }
                  }}
                />

                <TextField
                  label="Confirm New Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  variant="outlined"
                  fullWidth
                  {...register('confirmPassword', { 
                    required: 'Please confirm your new password',
                    validate: (val) => val === passwordVal || 'Passwords do not match'
                  })}
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword?.message}
                  disabled={loading}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end" disabled={loading}>
                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }
                  }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={loading || !token}
                  sx={{ height: 48, fontWeight: 700, mt: 1 }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Update Password'}
                </Button>
              </Box>
            </form>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
