import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Box } from '@mui/material';
import Navbar from './Navbar.jsx';
import Sidebar from './Sidebar.jsx';
import HelpdeskBot from './HelpdeskBot.jsx';

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useSelector((state) => state.auth);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar onDrawerToggle={handleDrawerToggle} />
      <Box sx={{ display: 'flex', flex: 1, position: 'relative', width: '100%' }}>
        <Sidebar mobileOpen={mobileOpen} onDrawerClose={handleDrawerToggle} />
        <Box 
          component="main" 
          sx={{ 
            flexGrow: 1, 
            pt: { xs: '96px', md: '108px' },
            px: { xs: 2.5, md: 4 },
            pb: 4,
            ml: { xs: 0, md: '260px' },
            width: { xs: '100%', md: 'calc(100% - 260px)' },
            overflowY: 'auto', 
            backgroundColor: 'transparent'
          }}
        >
          <Outlet />
        </Box>
      </Box>
      {user && <HelpdeskBot user={user} />}
    </Box>
  );
}
