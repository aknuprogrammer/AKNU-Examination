import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { NavLink, useNavigate } from 'react-router-dom';
import { Box, List, ListItemButton, ListItemIcon, Typography, Drawer, Chip } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SchoolIcon from '@mui/icons-material/School';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import LogoutIcon from '@mui/icons-material/Logout';
import HistoryIcon from '@mui/icons-material/History';
import PropTypes from 'prop-types';
import api from '../utils/api.js';
import { logoutSuccess } from '../store/authSlice.js';

export default function Sidebar({ mobileOpen, onDrawerClose }) {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error('Logout API failed, logging out locally', e);
    }
    dispatch(logoutSuccess());
    navigate('/login');
  };

  const isAdminOrStaff = [
    'Super Admin',
    'Admin',
    'Controller of Examinations',
    'Confidential Section',
    'Exam Cell Staff',
    'Observer'
  ].includes(user.role);

  const menuItems = [];

  if (isAdminOrStaff) {
    menuItems.push(
      { text: 'Exam Centres', path: '/colleges', icon: <SchoolIcon /> },
      { text: 'QP & Password Upload', path: '/paper-distribution', icon: <CloudUploadIcon /> },
      { text: 'Deployment', path: '/deployment', icon: <RocketLaunchIcon /> }
    );
    
    if (user.role === 'Super Admin') {
      menuItems.push({ text: 'Activity Logs', path: '/activity-logs', icon: <HistoryIcon /> });
    }
  } else if (user.role === 'Principal') {
    menuItems.push(
      { text: 'Exam Centre Portal', path: '/', icon: <DashboardIcon /> }
    );
  }

  const drawerContent = (
    <Box sx={{ py: 3, px: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography
        variant="overline"
        display="block"
        sx={{ px: 2, mb: 1, color: '#C2A56D', fontWeight: 800, letterSpacing: '1.5px' }}
      >
        Navigation
      </Typography>
      <List component="nav" disablePadding sx={{ flexGrow: 1 }}>
        {menuItems.map((item) => (
          <ListItemButton
            key={item.text}
            component={NavLink}
            to={item.path}
            onClick={onDrawerClose}
            sx={{
              borderRadius: 2.5,
              mb: 0.8,
              color: '#E8EDF2',
              transition: 'all 0.2s ease',
              '&.active': {
                backgroundColor: 'rgba(84, 122, 149, 0.3)',
                color: '#ffffff',
                borderLeft: '4px solid #C2A56D',
                borderRadius: '0px 10px 10px 0px',
                fontWeight: 700,
              },
              '&:hover': {
                backgroundColor: 'rgba(84, 122, 149, 0.15)',
                color: '#ffffff',
              },
            }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: 38 }}>
              {item.icon}
            </ListItemIcon>
            <Typography sx={{ fontSize: '0.92rem', fontWeight: 'inherit', color: 'inherit' }}>
              {item.text}
            </Typography>
          </ListItemButton>
        ))}
      </List>

      {/* User info & Logout button at bottom of left sidebar */}
      <Box sx={{ mt: 'auto', pt: 2, borderTop: '1px solid rgba(84, 122, 149, 0.25)', display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Box sx={{ px: 2, pb: 1.5, display: 'flex', flexDirection: 'column' }}>

          <Box sx={{ mt: 0.5 }}>
            <Chip
              label={user.role}
              size="small"
              variant="outlined"
              sx={{ height: 20, fontSize: '0.68rem', borderColor: '#C2A56D', color: '#C2A56D', bgcolor: 'rgba(194, 165, 109, 0.15)', fontWeight: 700 }}
            />
          </Box>
        </Box>

        <ListItemButton
          onClick={handleLogout}
          sx={{
            borderRadius: 2.5,
            color: '#ff6b6b',
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#ff5252',
            },
          }}
        >
          <ListItemIcon sx={{ color: 'inherit', minWidth: 38 }}>
            <LogoutIcon />
          </ListItemIcon>
          <Typography sx={{ fontSize: '0.92rem', fontWeight: 700, color: 'inherit' }}>
            Logout
          </Typography>
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <>
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onDrawerClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: 260,
            background: '#2C3947',
            borderRight: '1px solid rgba(84, 122, 149, 0.25)'
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop permanent side panel (Fixed) */}
      <Box
        sx={{
          display: { xs: 'none', md: 'block' },
          width: 260,
          flexShrink: 0,
          borderRight: '1px solid rgba(84, 122, 149, 0.25)',
          background: '#2C3947',
          height: 'calc(100vh - 76px)',
          overflowY: 'auto',
          position: 'fixed',
          top: 76,
          left: 0,
          zIndex: (theme) => theme.zIndex.drawer
        }}
      >
        {drawerContent}
      </Box>
    </>
  );
}

Sidebar.propTypes = {
  mobileOpen: PropTypes.bool.isRequired,
  onDrawerClose: PropTypes.func.isRequired,
};
