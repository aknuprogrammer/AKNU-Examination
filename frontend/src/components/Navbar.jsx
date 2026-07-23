import React from 'react';
import { useSelector } from 'react-redux';
import { AppBar, Toolbar, Typography, IconButton, Box, Chip } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import MenuIcon from '@mui/icons-material/Menu';
import StarIcon from '@mui/icons-material/Star';
import VerifiedIcon from '@mui/icons-material/Verified';
import PropTypes from 'prop-types';

export default function Navbar({ onDrawerToggle }) {
  const { user } = useSelector((state) => state.auth);

  return (
    <AppBar
      position="fixed"
      sx={{
        top: 0,
        left: 0,
        width: '100%',
        height: 76,
        background: 'linear-gradient(135deg, rgba(44, 57, 71, 0.98) 0%, rgba(30, 40, 50, 0.98) 100%)',
        backdropFilter: 'blur(16px)',
        borderBottom: '2px solid rgba(194, 165, 109, 0.4)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
        zIndex: (theme) => theme.zIndex.drawer + 2
      }}
    >
      <Toolbar sx={{ px: { xs: 1.5, sm: 3 }, minHeight: '76px !important', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
          {user && (
            <IconButton
              color="inherit"
              aria-label="open sidebar drawer"
              edge="start"
              onClick={onDrawerToggle}
              sx={{ mr: 1.5, display: { md: 'none' }, color: '#ffffff' }}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Box
            component="img"
            src="/aknu_logo.png"
            alt="AKNU Emblem"
            sx={{
              height: { xs: 46, sm: 54 },
              width: 'auto',
              mr: { xs: 1.2, sm: 2 },
              filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4))'
            }}
          />

          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="h6"
                component="div"
                sx={{
                  fontWeight: 800,
                  letterSpacing: '0.4px',
                  color: '#ffffff',
                  fontSize: { xs: '0.92rem', sm: '1.15rem', lg: '1.25rem' },
                  lineHeight: 1.1,
                  whiteSpace: 'nowrap'
                }}
              >
                ADIKAVI NANNAYA UNIVERSITY
              </Typography>
              <Chip
                label="5 Star Rated"
                size="small"
                icon={<StarIcon sx={{ color: '#FFD700 !important', fontSize: '14px !important' }} />}
                sx={{
                  display: { xs: 'none', lg: 'inline-flex' },
                  height: 22,
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  bgcolor: 'rgba(255, 215, 0, 0.15)',
                  color: '#FFD700',
                  border: '1px solid rgba(255, 215, 0, 0.4)',
                  ml: 0.5
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: { xs: 0.8, sm: 1.2 }, mt: 0.3 }}>
              <Typography
                sx={{
                  color: '#C2A56D',
                  fontWeight: 700,
                  fontSize: { xs: '0.62rem', sm: '0.72rem' },
                  letterSpacing: '0.3px',
                  textTransform: 'uppercase'
                }}
              >
                RAJAMAHENDRAVARAM, ANDHRA PRADESH INDIA - 533296
              </Typography>

              <Box sx={{ display: { xs: 'none', xl: 'flex' }, alignItems: 'center', gap: 1 }}>
                <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>|</Typography>
                <Typography sx={{ color: '#E8EDF2', fontSize: '0.68rem', fontWeight: 600 }}>
                  Accredited by NAAC with &apos;B+&apos; Grade
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>|</Typography>
                <Typography sx={{ color: '#E8EDF2', fontSize: '0.68rem', fontWeight: 600 }}>
                  ISO 9001:2025 Certified
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1, flexShrink: 0 }}>
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              flexDirection: 'column',
              alignItems: 'flex-end',
              px: 1.5,
              py: 0.5,
              borderRadius: 2,
              bgcolor: 'rgba(194, 165, 109, 0.12)',
              border: '1px solid rgba(194, 165, 109, 0.35)'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <VerifiedIcon sx={{ fontSize: 13, color: '#C2A56D' }} />
              <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: '#C2A56D', letterSpacing: '0.5px' }}>
                EDEP PORTAL
              </Typography>
            </Box>
            <Typography sx={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
              Largest State University in AP (Affiliation)
            </Typography>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

Navbar.propTypes = {
  onDrawerToggle: PropTypes.func.isRequired,
};
