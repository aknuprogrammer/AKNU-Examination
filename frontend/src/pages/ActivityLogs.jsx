import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, MenuItem, Button, CircularProgress, Chip, IconButton, TablePagination
} from '@mui/material';
import GetAppIcon from '@mui/icons-material/GetApp';
import RefreshIcon from '@mui/icons-material/Refresh';
import api from '../utils/api.js';

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/audit-logs');
      if (res.data.success) {
        setLogs(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchRole = roleFilter === 'ALL' || log.role === roleFilter;
    const matchAction = actionFilter === 'ALL' || log.action === actionFilter;
    const query = searchQuery.toLowerCase();
    const matchSearch = !query || 
      log.username?.toLowerCase().includes(query) || 
      log.ipAddress?.toLowerCase().includes(query);
    return matchRole && matchAction && matchSearch;
  });

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    const val = event.target.value;
    setRowsPerPage(val === 'ALL' ? 'ALL' : parseInt(val, 10));
    setPage(0);
  };

  const paginatedLogs = rowsPerPage === 'ALL' 
    ? filteredLogs 
    : filteredLogs.slice(page * Number(rowsPerPage), page * Number(rowsPerPage) + Number(rowsPerPage));

  const formatDetails = (details) => {
    if (!details || Object.keys(details).length === 0) return '—';
    if (typeof details === 'string') return details;
    
    if (details.message && Object.keys(details).length === 1) return details.message;
    
    return Object.entries(details)
      .map(([key, val]) => `${key}: ${val}`)
      .join(', ');
  };

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Username', 'Role', 'Action', 'IP Address', 'System Info', 'Details'];
    let csvContent = headers.join(',') + '\n';

    filteredLogs.forEach(log => {
      const row = [
        `"${new Date(log.createdAt).toLocaleString()}"`,
        `"${log.username}"`,
        `"${log.role}"`,
        `"${log.action}"`,
        `"${log.ipAddress || ''}"`,
        `"${log.systemInfo || ''}"`,
        `"${JSON.stringify(log.details || {}).replace(/"/g, '""')}"`
      ];
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity_logs_${new Date().getTime()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Activity <span style={{ color: '#C2A56D' }}>Logs</span>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Audit administrative actions, user logins, paper downloads, and security events across the portal.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" size="small" onClick={handleExportCSV} startIcon={<GetAppIcon />} sx={{ bgcolor: '#fff' }}>
            Export CSV
          </Button>
          <IconButton onClick={fetchLogs} size="small" sx={{ bgcolor: '#E8EDF2' }}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
        {/* Left Side: Search */}
        <Box>
          <TextField
            label="Search Username or IP"
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ minWidth: 250 }}
          />
        </Box>

        {/* Right Side: Dropdowns */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            select
            label="Filter by Role"
            size="small"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="ALL">All Roles</MenuItem>
            <MenuItem value="Super Admin">Super Admin</MenuItem>
            <MenuItem value="Admin">Admin</MenuItem>
            <MenuItem value="Controller of Examinations">Controller</MenuItem>
            <MenuItem value="Principal">Principal</MenuItem>
          </TextField>
          
          <TextField
            select
            label="Filter by Action"
            size="small"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="ALL">All Actions</MenuItem>
            <MenuItem value="LOGIN">Login</MenuItem>
            <MenuItem value="LOGOUT">Logout</MenuItem>
            <MenuItem value="UPLOAD_PAPERS">Upload Papers</MenuItem>
            <MenuItem value="DEPLOY_PAPERS">Deploy Papers</MenuItem>
            <MenuItem value="DOWNLOAD_PAPERS">Download Papers</MenuItem>
          </TextField>

          <TextField
            select
            label="Rows per page"
            size="small"
            value={rowsPerPage}
            onChange={handleChangeRowsPerPage}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="ALL">All</MenuItem>
            <MenuItem value={10}>10</MenuItem>
            <MenuItem value={20}>20</MenuItem>
            <MenuItem value={50}>50</MenuItem>
            <MenuItem value={100}>100</MenuItem>
          </TextField>
        </Box>
      </Paper>

      {/* Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>S.No</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Username</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>IP Address</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3 }}>No logs found.</TableCell>
                </TableRow>
              ) : (
                paginatedLogs.map((log, index) => (
                  <TableRow key={log._id} hover>
                    <TableCell>{rowsPerPage === 'ALL' ? index + 1 : page * Number(rowsPerPage) + index + 1}</TableCell>
                    <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{log.username}</TableCell>
                    <TableCell><Chip label={log.role} size="small" variant="outlined" /></TableCell>
                    <TableCell><Chip label={log.action} size="small" color="primary" sx={{ fontWeight: 600 }} /></TableCell>
                    <TableCell>{log.ipAddress || '—'}</TableCell>
                    <TableCell sx={{ maxWidth: 300 }}>
                      <Typography variant="body2" sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                        {formatDetails(log.details)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
