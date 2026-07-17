import React from 'react';
import { useSelector } from 'react-redux';
import { AppBar, Toolbar, Typography, IconButton } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import MenuIcon from '@mui/icons-material/Menu';
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
        height: 64,
        background: 'rgba(44, 57, 71, 0.98)', 
        backdropFilter: 'blur(16px)', 
        borderBottom: '1px solid rgba(84, 122, 149, 0.25)', 
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.12)',
        zIndex: (theme) => theme.zIndex.drawer + 2
      }}
    >
      <Toolbar sx={{ px: { xs: 2, sm: 3 }, minHeight: '64px !important' }}>
        {user && (
          <IconButton
            color="inherit"
            aria-label="open sidebar drawer"
            edge="start"
            onClick={onDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' }, color: '#ffffff' }}
          >
            <MenuIcon />
          </IconButton>
        )}
        <LockIcon sx={{ mr: 1.2, color: '#C2A56D' }} />
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            flexGrow: 1, 
            fontWeight: 800, 
            letterSpacing: '0.5px',
            color: '#ffffff',
            fontSize: { xs: '1.1rem', sm: '1.25rem' }
          }}
        >
          AKNU <span style={{ color: '#C2A56D' }}>EDEP</span>
        </Typography>
      </Toolbar>
    </AppBar>
  );
}

Navbar.propTypes = {
  onDrawerToggle: PropTypes.func.isRequired,
};
