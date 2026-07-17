import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { 
  Box, Card, CardContent, Typography, TextField, Button, Alert, 
  InputAdornment, IconButton, CircularProgress, FormControl, 
  InputLabel, OutlinedInput, FormHelperText 
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import api from '../utils/api.js';
import { loginStart, loginSuccess, loginFailure } from '../store/authSlice.js';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const { loading, error } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Forgot password mode states
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  
  const from = location.state?.from?.pathname || '/';

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { username: '', password: '' }
  });

  const onSubmit = async (data) => {
    dispatch(loginStart());
    try {
      const res = await api.post('/auth/login', data);
      if (res.data.success) {
        dispatch(loginSuccess({
          user: res.data.user,
          accessToken: res.data.accessToken
        }));
        
        // Redirect to target path or dashboard
        if (res.data.user.forcePasswordChange) {
          navigate('/change-password', { replace: true });
        } else {
          navigate(from, { replace: true });
        }
      }
    } catch (err) {
      dispatch(loginFailure(err.message || 'Login failed. Please check credentials.'));
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (!forgotEmail) {
      setForgotError('Email address is required.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: forgotEmail });
      if (res.data.success) {
        setForgotSuccess(res.data.message || 'Password reset link sent successfully.');
      }
    } catch (err) {
      console.error(err);
      setForgotError(err.response?.data?.message || 'Failed to send password reset link.');
    } finally {
      setForgotLoading(false);
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
              {isForgotMode ? 'Forgot Password' : 'Secure Login'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              EDEP - Examination Paper Distribution System
            </Typography>
          </Box>

          {!isForgotMode ? (
            <>
              {error && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                  {error}
                </Alert>
              )}

              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <TextField
                    label="Username"
                    variant="outlined"
                    fullWidth
                    {...register('username', { required: 'Username is required' })}
                    error={!!errors.username}
                    helperText={errors.username?.message}
                    disabled={loading}
                  />
                  <FormControl variant="outlined" fullWidth error={!!errors.password} disabled={loading}>
                    <InputLabel htmlFor="login-password">Password</InputLabel>
                    <OutlinedInput
                      id="login-password"
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      {...register('password', { required: 'Password is required' })}
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
                    {errors.password && (
                      <FormHelperText error>{errors.password.message}</FormHelperText>
                    )}
                  </FormControl>

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: -1.5 }}>
                    <Button 
                      variant="text" 
                      size="small" 
                      onClick={() => {
                        setIsForgotMode(true);
                        setForgotError('');
                        setForgotSuccess('');
                        setForgotEmail('');
                      }}
                      sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                      Forgot Password?
                    </Button>
                  </Box>

                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={loading}
                    sx={{ height: 48, fontWeight: 700, mt: 1 }}
                  >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Access Platform'}
                  </Button>
                </Box>
              </form>
            </>
          ) : (
            <>
              {forgotError && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                  {forgotError}
                </Alert>
              )}
              {forgotSuccess && (
                <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
                  {forgotSuccess}
                </Alert>
              )}

              <form onSubmit={handleForgotSubmit} noValidate>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    Enter your registered email address below, and we will send you a secure link to reset your account password.
                  </Typography>

                  <TextField
                    label="Email Address"
                    variant="outlined"
                    type="email"
                    fullWidth
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    disabled={forgotLoading}
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={forgotLoading || !!forgotSuccess}
                    sx={{ height: 48, fontWeight: 700, mt: 1 }}
                  >
                    {forgotLoading ? <CircularProgress size={24} color="inherit" /> : 'Send Reset Link'}
                  </Button>

                  <Button
                    variant="text"
                    fullWidth
                    onClick={() => setIsForgotMode(false)}
                    disabled={forgotLoading}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    Back to Login
                  </Button>
                </Box>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
