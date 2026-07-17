import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { 
  Box, Card, CardContent, Typography, TextField, Button, Alert, 
  InputAdornment, IconButton, CircularProgress, FormControl, 
  InputLabel, OutlinedInput, FormHelperText, Chip, Divider 
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import StarIcon from '@mui/icons-material/Star';
import VerifiedIcon from '@mui/icons-material/Verified';
import SchoolIcon from '@mui/icons-material/School';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SecurityIcon from '@mui/icons-material/Security';
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
    <Box 
      sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh', 
        position: 'relative',
        background: 'linear-gradient(135deg, #16202a 0%, #2C3947 55%, #1d2b36 100%)',
        py: { xs: 3, md: 5 },
        px: { xs: 2, sm: 3 }
      }}
    >
      {/* Decorative ambient lighting elements */}
      <Box 
        sx={{ 
          position: 'absolute', 
          width: 450, 
          height: 450, 
          borderRadius: '50%', 
          background: 'radial-gradient(circle, rgba(194, 165, 109, 0.15) 0%, rgba(0,0,0,0) 70%)',
          top: '10%', 
          left: '15%',
          pointerEvents: 'none',
          zIndex: 1
        }} 
      />
      <Box 
        sx={{ 
          position: 'absolute', 
          width: 500, 
          height: 500, 
          borderRadius: '50%', 
          background: 'radial-gradient(circle, rgba(84, 122, 149, 0.2) 0%, rgba(0,0,0,0) 70%)',
          bottom: '10%', 
          right: '15%',
          pointerEvents: 'none',
          zIndex: 1
        }} 
      />

      <Card 
        sx={{ 
          width: '100%', 
          maxWidth: 980, 
          borderRadius: '24px !important', 
          overflow: 'hidden', 
          boxShadow: '0 25px 65px rgba(0, 0, 0, 0.45) !important', 
          border: '1px solid rgba(194, 165, 109, 0.3) !important',
          zIndex: 10,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' }
        }}
      >
        {/* Left Hero & Branding Section */}
        <Box 
          sx={{ 
            flex: { xs: '1', md: '1.25' }, 
            background: 'linear-gradient(155deg, #2C3947 0%, #1e2832 60%, #12181e 100%)',
            p: { xs: 3.5, sm: 4.5, md: 5 },
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            borderRight: { md: '1px solid rgba(194, 165, 109, 0.25)' },
            borderBottom: { xs: '1px solid rgba(194, 165, 109, 0.25)', md: 'none' }
          }}
        >
          {/* Top subtle golden bar accent */}
          <Box 
            sx={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              width: '100%', 
              height: 5, 
              background: 'linear-gradient(90deg, #C2A56D 0%, #ecd6a7 50%, #C2A56D 100%)' 
            }} 
          />

          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', mt: 1 }}>
            {/* High-res Official University Logo */}
            <Box 
              component="img" 
              src="/aknu_logo.png" 
              alt="Adikavi Nannaya University Emblem" 
              sx={{ 
                height: { xs: 95, sm: 125, md: 135 }, 
                width: 'auto', 
                mb: 2.5,
                filter: 'drop-shadow(0 8px 20px rgba(0, 0, 0, 0.5))'
              }} 
            />

            <Typography 
              variant="overline" 
              sx={{ 
                color: '#C2A56D', 
                fontWeight: 800, 
                letterSpacing: '2.5px', 
                fontSize: { xs: '0.68rem', sm: '0.75rem' },
                lineHeight: 1.2,
                mb: 0.8,
                display: 'block'
              }}
            >
              STATE UNIVERSITY OF ANDHRA PRADESH
            </Typography>

            <Typography 
              component="h1" 
              sx={{ 
                fontWeight: 800, 
                color: '#ffffff', 
                fontSize: { xs: '1.45rem', sm: '1.75rem', md: '1.95rem' }, 
                lineHeight: 1.2, 
                mb: 1.2,
                letterSpacing: '0.3px'
              }}
            >
              ADIKAVI NANNAYA UNIVERSITY
            </Typography>

            <Box 
              sx={{ 
                px: 2, 
                py: 0.6, 
                borderRadius: 3, 
                bgcolor: 'rgba(84, 122, 149, 0.2)', 
                border: '1px solid rgba(84, 122, 149, 0.4)',
                mb: 3.5
              }}
            >
              <Typography 
                sx={{ 
                  color: '#E8EDF2', 
                  fontSize: { xs: '0.75rem', sm: '0.82rem' }, 
                  fontWeight: 700, 
                  letterSpacing: '0.3px' 
                }}
              >
                📍 RAJAMAHENDRAVARAM, ANDHRA PRADESH INDIA - 533296
              </Typography>
            </Box>

            {/* Distinctions & Certifications Grid */}
            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1.2, mb: 3 }}>
              {/* Row 1: NAAC & ISO */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.2 }}>
                <Box 
                  sx={{ 
                    p: 1.3, 
                    borderRadius: 2.5, 
                    bgcolor: 'rgba(194, 165, 109, 0.12)', 
                    border: '1px solid rgba(194, 165, 109, 0.35)',
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1.2,
                    textAlign: 'left'
                  }}
                >
                  <EmojiEventsIcon sx={{ color: '#C2A56D', fontSize: 24, flexShrink: 0 }} />
                  <Box>
                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, color: '#C2A56D', lineHeight: 1.1 }}>
                      NAAC &apos;B+&apos; Grade
                    </Typography>
                    <Typography sx={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.7)', mt: 0.2 }}>
                      Accredited Institution
                    </Typography>
                  </Box>
                </Box>

                <Box 
                  sx={{ 
                    p: 1.3, 
                    borderRadius: 2.5, 
                    bgcolor: 'rgba(84, 122, 149, 0.16)', 
                    border: '1px solid rgba(84, 122, 149, 0.35)',
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1.2,
                    textAlign: 'left'
                  }}
                >
                  <VerifiedIcon sx={{ color: '#60a5fa', fontSize: 24, flexShrink: 0 }} />
                  <Box>
                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.1 }}>
                      ISO 9001:2025
                    </Typography>
                    <Typography sx={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.7)', mt: 0.2 }}>
                      Certified Quality System
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Row 2: 5 Star & Affiliation Banner */}
              <Box 
                sx={{ 
                  p: 1.4, 
                  borderRadius: 2.5, 
                  background: 'linear-gradient(135deg, rgba(194, 165, 109, 0.18) 0%, rgba(44, 57, 71, 0.4) 100%)', 
                  border: '1px solid rgba(194, 165, 109, 0.45)',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  textAlign: 'left',
                  gap: 1
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                  <SchoolIcon sx={{ color: '#C2A56D', fontSize: 26, flexShrink: 0 }} />
                  <Box>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.15 }}>
                      Largest State University in A.P.
                    </Typography>
                    <Typography sx={{ fontSize: '0.68rem', color: '#C2A56D', fontWeight: 700, mt: 0.2 }}>
                      In terms of Affiliated Colleges & Network
                    </Typography>
                  </Box>
                </Box>
                <Chip 
                  label="5 ★ Rated" 
                  size="small" 
                  sx={{ 
                    height: 24, 
                    fontWeight: 800, 
                    bgcolor: '#FFD700', 
                    color: '#1e2832', 
                    fontSize: '0.72rem',
                    flexShrink: 0
                  }} 
                />
              </Box>
            </Box>
          </Box>

          {/* Bottom Confidentiality Footer */}
          <Box 
            sx={{ 
              pt: 2.5, 
              borderTop: '1px solid rgba(255, 255, 255, 0.12)', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1.5 
            }}
          >
            <Box 
              sx={{ 
                p: 1, 
                borderRadius: '50%', 
                bgcolor: 'rgba(194, 165, 109, 0.15)', 
                color: '#C2A56D',
                display: 'flex' 
              }}
            >
              <SecurityIcon fontSize="small" />
            </Box>
            <Box sx={{ textAlign: 'left' }}>
              <Typography sx={{ color: '#ffffff', fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.5px' }}>
                EDEP CONFIDENTIAL PORTAL
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem', lineHeight: 1.3 }}>
                End-to-End Secure Examination Question Paper & Password Distribution System
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Right Interactive Form Section */}
        <Box 
          sx={{ 
            flex: { xs: '1', md: '1' }, 
            bgcolor: '#ffffff', 
            p: { xs: 3.5, sm: 4.5, md: 5 },
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}
        >
          <Box sx={{ mb: 4, textAlign: 'left' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Box sx={{ p: 1.2, borderRadius: 2, background: 'rgba(44, 57, 71, 0.08)', color: 'primary.main', display: 'flex' }}>
                <LockIcon sx={{ fontSize: 26 }} />
              </Box>
              <Box>
                <Typography variant="h5" component="h2" fontWeight={800} color="primary.main" sx={{ lineHeight: 1.1 }}>
                  {isForgotMode ? 'Password Recovery' : 'Secure Login'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'secondary.main', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  EDEP Platform Access
                </Typography>
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {isForgotMode 
                ? 'Enter your registered university email below to receive a secure password reset link.' 
                : 'Please enter your official username and password to enter the confidential examination dashboard.'}
            </Typography>
          </Box>

          {!isForgotMode ? (
            <>
              {error && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2, fontWeight: 600 }}>
                  {error}
                </Alert>
              )}

              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.8 }}>
                  <TextField
                    label="Username / College Code"
                    variant="outlined"
                    fullWidth
                    {...register('username', { required: 'Username is required' })}
                    error={!!errors.username}
                    helperText={errors.username?.message}
                    disabled={loading}
                    placeholder="e.g. admin or college code"
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

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: -1 }}>
                    <Button 
                      variant="text" 
                      size="small" 
                      onClick={() => {
                        setIsForgotMode(true);
                        setForgotError('');
                        setForgotSuccess('');
                        setForgotEmail('');
                      }}
                      sx={{ textTransform: 'none', fontWeight: 700, color: 'secondary.main' }}
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
                    sx={{ 
                      height: 52, 
                      fontWeight: 800, 
                      fontSize: '1.02rem',
                      background: 'linear-gradient(135deg, #2C3947 0%, #1a232c 100%)',
                      boxShadow: '0 8px 20px rgba(44, 57, 71, 0.25)',
                      mt: 0.5,
                      '&:hover': {
                        background: 'linear-gradient(135deg, #1a232c 0%, #0e1318 100%)',
                        boxShadow: '0 12px 25px rgba(44, 57, 71, 0.35)',
                      }
                    }}
                  >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
                  </Button>
                </Box>
              </form>
            </>
          ) : (
            <>
              {forgotError && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2, fontWeight: 600 }}>
                  {forgotError}
                </Alert>
              )}
              {forgotSuccess && (
                <Alert severity="success" sx={{ mb: 3, borderRadius: 2, fontWeight: 600 }}>
                  {forgotSuccess}
                </Alert>
              )}

              <form onSubmit={handleForgotSubmit} noValidate>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <TextField
                    label="Official Email Address"
                    variant="outlined"
                    type="email"
                    fullWidth
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    disabled={forgotLoading}
                    placeholder="name@aknu.edu.in"
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={forgotLoading || !!forgotSuccess}
                    sx={{ 
                      height: 52, 
                      fontWeight: 800, 
                      fontSize: '1.02rem',
                      background: 'linear-gradient(135deg, #2C3947 0%, #1a232c 100%)',
                      boxShadow: '0 8px 20px rgba(44, 57, 71, 0.25)',
                    }}
                  >
                    {forgotLoading ? <CircularProgress size={24} color="inherit" /> : 'Send Recovery Link'}
                  </Button>

                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => setIsForgotMode(false)}
                    disabled={forgotLoading}
                    sx={{ 
                      height: 48, 
                      textTransform: 'none', 
                      fontWeight: 700, 
                      borderColor: '#cbd5e1', 
                      color: 'text.primary',
                      '&:hover': { borderColor: '#94a3b8', bgcolor: 'rgba(0,0,0,0.02)' }
                    }}
                  >
                    Back to Login
                  </Button>
                </Box>
              </form>
            </>
          )}

          {/* Quick Legal / Help Notice at Bottom */}
          <Divider sx={{ my: 3.5, borderColor: '#f1f5f9' }} />
          
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem', display: 'block', lineHeight: 1.4 }}>
              Protected by 256-bit SSL & JWT Encryption. Unauthorized distribution or copying of confidential question papers is punishable under applicable University & State laws.
            </Typography>
          </Box>
        </Box>
      </Card>
    </Box>
  );
}
