import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Box } from '@mui/material';
import Navbar from './Navbar.jsx';
import Sidebar from './Sidebar.jsx';
import HelpdeskBot from './HelpdeskBot.jsx';

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useSelector((state) => state.auth);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleToggleCollapse = () => {
    setCollapsed((prev) => !prev);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar
        onDrawerToggle={handleDrawerToggle}
        collapsed={collapsed}
        onToggleCollapse={handleToggleCollapse}
      />
      <Box sx={{ display: 'flex', flex: 1, position: 'relative', width: '100%' }}>
        <Sidebar
          mobileOpen={mobileOpen}
          onDrawerClose={handleDrawerToggle}
          collapsed={collapsed}
          onToggleCollapse={handleToggleCollapse}
        />
        <Box 
          component="main" 
          sx={{ 
            flexGrow: 1, 
            pt: { xs: '96px', md: '108px' },
            px: { xs: 2.5, md: 4 },
            pb: 4,
            ml: { xs: 0, md: collapsed ? '68px' : '260px' },
            width: { xs: '100%', md: collapsed ? 'calc(100% - 68px)' : 'calc(100% - 260px)' },
            overflowY: 'auto', 
            backgroundColor: 'transparent',
            transition: 'all 0.3s ease'
          }}
        >
          <Outlet />
        </Box>
      </Box>
      {user && <HelpdeskBot user={user} />}
    </Box>
  );
}
