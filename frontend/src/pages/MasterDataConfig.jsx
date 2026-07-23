import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Tabs, Tab, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Button, Chip, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, CircularProgress, Alert,
  Switch, FormControlLabel, MenuItem, InputAdornment, IconButton, Grid, Autocomplete
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';
import api from '../utils/api.js';

// Dependent Master Data Option Maps
const DEGREE_MAP = {
  UG: ['B.Tech', 'B.Sc', 'B.Com', 'B.A', 'B.B.A', 'B.C.A', 'B.Ed', 'B.Pharm', 'L.L.B', 'B.P.Ed', 'B.Voc'],
  PG: ['M.Tech', 'M.Sc', 'M.Com', 'M.A', 'M.B.A', 'M.C.A', 'M.Ed', 'M.Pharm', 'L.L.M', 'M.P.Ed'],
  DIPLOMA: ['Diploma in Engineering', 'PG Diploma', 'Diploma in Pharmacy'],
  'N/A': ['All Degrees / N/A']
};

const COURSE_MAP = {
  'B.Tech': ['Computer Science & Engineering (CSE)', 'Electronics & Communication Engineering (ECE)', 'Electrical & Electronics Engineering (EEE)', 'Mechanical Engineering', 'Civil Engineering', 'Information Technology (IT)', 'Artificial Intelligence & Data Science (AI & DS)', 'Cyber Security'],
  'M.Tech': ['Computer Science & Engineering (CSE)', 'VLSI Design', 'Software Engineering', 'Power Systems', 'Thermal Engineering', 'Structural Engineering'],
  'B.Sc': ['Mathematics, Physics, Chemistry (MPC)', 'Mathematics, Physics, Computer Science (MPCs)', 'Botany, Zoology, Chemistry (BZC)', 'Biotechnology, Biochemistry, Chemistry (BBC)', 'Microbiology, Biochemistry, Chemistry (MBC)', 'Data Science, Statistics, Computer Science (MSCs)'],
  'M.Sc': ['Organic Chemistry', 'Analytical Chemistry', 'Physics', 'Applied Mathematics', 'Computer Science', 'Biotechnology', 'Botany', 'Zoology', 'Microbiology'],
  'B.Com': ['General', 'Computer Applications (CA)', 'Accounting & Finance', 'Taxation & E-Commerce', 'Banking & Insurance'],
  'M.Com': ['General', 'Finance & Accounting', 'Banking & Financial Services'],
  'B.A': ['History, Economics, Political Science (HEP)', 'History, Telugu, Political Science (HTP)', 'Economics, Statistics, Computer Applications (ESCA)', 'English Literature', 'Public Administration'],
  'M.A': ['English', 'Telugu', 'Economics', 'Political Science & Public Administration', 'Psychology', 'Social Work (MSW)'],
  'B.B.A': ['General Management', 'Digital Marketing', 'Hospitality & Tourism', 'Retail Management'],
  'M.B.A': ['Finance', 'Marketing', 'Human Resource Management (HRM)', 'Systems & Operations'],
  'B.C.A': ['Computer Applications', 'Cloud Computing', 'Web Technologies & Mobile Apps'],
  'M.C.A': ['Computer Applications', 'Software Development', 'Data Analytics'],
  'B.Pharm': ['Pharmaceutical Sciences'],
  'M.Pharm': ['Pharmaceutics', 'Pharmacology', 'Pharmaceutical Chemistry', 'Pharmacognosy']
};

const CERTIFICATE_TYPES_LIST = [
  'Original Degree (OD)',
  'Consolidated Marks Memo (CMM)',
  'Provisional Certificate (PC)',
  'Migration Certificate',
  'Transfer Certificate (TC)',
  'Duplicate Marks Memo',
  'Duplicate Degree Certificate',
  'Name / Surname Correction',
  'Genuineness / Official Transcript Verification',
  'Rank Certificate',
  'Medium of Instruction Certificate',
  'Revaluation / Answer Script Scrutiny'
];

const SEMESTER_OPTIONS = [
  'Semester I', 'Semester II', 'Semester III', 'Semester IV',
  'Semester V', 'Semester VI', 'Semester VII', 'Semester VIII',
];

const formatDateWithTime = (dateVal) => {
  if (!dateVal) return '—';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '—';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const formattedHours = String(hours).padStart(2, '0');
  
  return `${day}/${month}/${year} ${formattedHours}:${minutes} ${ampm}`;
};

export default function MasterDataConfig() {
  const [tabValue, setTabValue] = useState(0); // 0 = Fee Categories, 1 = Student Master Records

  // ==========================================
  // TAB 0: FEE CATEGORIES STATE & HANDLERS
  // ==========================================
  const [categories, setCategories] = useState([]);
  const [catLoading, setCatLoading] = useState(true);
  const [catSearch, setCatSearch] = useState('');

  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState(null); // null = new, object = edit
  const [catForm, setCatForm] = useState({
    categoryType: 'REGULAR_EXAM_FEE',
    level: 'UG',
    degree: 'B.Tech',
    course: 'Computer Science & Engineering (CSE)',
    semester: 'Semester I',
    certType: 'Original Degree (OD)',
    code: '',
    name: '',
    description: '',
    amount: '',
    notificationDate: '',
    lastDateWithoutLateFee: '',
    lastDateWithLateFee: '',
    backlogPerPaperAmount: '',
    backlogMaxCapAmount: '',
    perBelatedYearFineAmount: '',
    lateFeeSlab1: '',
    lateFeeSlab2: '',
    lateFeeSlab3: '',
    isActive: true
  });
  const [catFormError, setCatFormError] = useState('');
  const [catFormLoading, setCatFormLoading] = useState(false);

  const fetchCategories = async (showSpinner = true) => {
    if (showSpinner) setCatLoading(true);
    try {
      const res = await api.get('/payments/admin/all-categories');
      if (res.data.success) setCategories(res.data.data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      if (showSpinner) setCatLoading(false);
    }
  };

  const handleOpenCatDialog = (cat = null) => {
    setEditingCat(cat);
    setCatFormError('');
    if (cat) {
      setCatForm({
        categoryType: cat.categoryType,
        level: cat.level,
        degree: cat.degree || '',
        course: cat.course || '',
        semester: cat.semester || '',
        certType: cat.certType || '',
        code: cat.code,
        name: cat.name,
        description: cat.description || '',
        amount: cat.amount !== undefined && cat.amount !== null ? cat.amount : '',
        notificationDate: cat.notificationDate ? new Date(cat.notificationDate).toISOString().split('T')[0] : '',
        lastDateWithoutLateFee: cat.lastDateWithoutLateFee ? new Date(cat.lastDateWithoutLateFee).toISOString().split('T')[0] : '',
        lastDateWithLateFee: cat.lastDateWithLateFee ? new Date(cat.lastDateWithLateFee).toISOString().split('T')[0] : '',
        backlogPerPaperAmount: cat.backlogPerPaperAmount !== undefined && cat.backlogPerPaperAmount !== null ? cat.backlogPerPaperAmount : '',
        backlogMaxCapAmount: cat.backlogMaxCapAmount !== undefined && cat.backlogMaxCapAmount !== null ? cat.backlogMaxCapAmount : '',
        perBelatedYearFineAmount: cat.perBelatedYearFineAmount !== undefined && cat.perBelatedYearFineAmount !== null ? cat.perBelatedYearFineAmount : '',
        lateFeeSlab1: cat.lateFeeSlab1 !== undefined && cat.lateFeeSlab1 !== null ? cat.lateFeeSlab1 : '',
        lateFeeSlab2: cat.lateFeeSlab2 !== undefined && cat.lateFeeSlab2 !== null ? cat.lateFeeSlab2 : '',
        lateFeeSlab3: cat.lateFeeSlab3 !== undefined && cat.lateFeeSlab3 !== null ? cat.lateFeeSlab3 : '',
        isActive: cat.isActive !== undefined ? cat.isActive : true
      });
    } else {
      setCatForm({
        categoryType: 'REGULAR_EXAM_FEE',
        level: 'UG',
        degree: 'B.Tech',
        course: 'Computer Science & Engineering (CSE)',
        semester: 'Semester I',
        certType: 'Original Degree (OD)',
        code: '',
        name: '',
        description: '',
        amount: '',
        notificationDate: '',
        lastDateWithoutLateFee: '',
        lastDateWithLateFee: '',
        backlogPerPaperAmount: '',
        backlogMaxCapAmount: '',
        perBelatedYearFineAmount: '',
        lateFeeSlab1: '',
        lateFeeSlab2: '',
        lateFeeSlab3: '',
        isActive: true
      });
    }
    setCatDialogOpen(true);
  };

  const handleSaveCat = async (e) => {
    e.preventDefault();
    setCatFormError('');
    if (catForm.amount === '') {
      setCatFormError('Fee Amount is required.');
      return;
    }

    const isCert = catForm.categoryType === 'CERTIFICATE_FEE';
    const autoName = isCert
      ? [catForm.degree, catForm.course, catForm.certType || 'Certificate', 'Fee'].filter(Boolean).join(' ')
      : [catForm.degree, catForm.course, catForm.semester, 'Exam Fee'].filter(Boolean).join(' ');
    const autoCode = catForm.code || `${catForm.level}_${(catForm.degree || 'GEN').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}_${Date.now().toString().slice(-6)}`;
    const payload = { ...catForm, name: autoName, code: autoCode };

    setCatFormLoading(true);
    try {
      let res;
      if (editingCat) {
        res = await api.put(`/payments/admin/categories/${editingCat._id}`, payload);
      } else {
        res = await api.post('/payments/admin/categories', payload);
      }

      if (res.data.success) {
        setCatDialogOpen(false);
        fetchCategories();
      }
    } catch (err) {
      setCatFormError(err.response?.data?.message || 'Failed to save Fee Category.');
    } finally {
      setCatFormLoading(false);
    }
  };

  const handleDeleteCat = async (id) => {
    if (!window.confirm('Are you sure you want to delete this Fee Category?')) return;
    try {
      setCategories(prev => prev.filter(c => c._id !== id));
      await api.delete(`/payments/admin/categories/${id}`);
      fetchCategories(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete category.');
      fetchCategories(false);
    }
  };

  // ==========================================
  // TAB 1: STUDENT MASTER STATE & HANDLERS
  // ==========================================
  const [students, setStudents] = useState([]);
  const [studLoading, setStudLoading] = useState(true);
  const [studQuery, setStudQuery] = useState('');

  const [studDialogOpen, setStudDialogOpen] = useState(false);
  const [editingStud, setEditingStud] = useState(null);
  const [studForm, setStudForm] = useState({
    hallTicketNo: '',
    studentName: '',
    course: '',
    level: 'UG',
    semester: 'Sem I',
    collegeCode: '',
    collegeName: '',
    mobile: '',
    email: ''
  });
  const [studFormError, setStudFormError] = useState('');
  const [studFormLoading, setStudFormLoading] = useState(false);

  // Bulk Excel Upload Dialog
  const [excelDialogOpen, setExcelDialogOpen] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelMsg, setExcelMsg] = useState('');

  const fetchStudents = async (search = studQuery, showSpinner = true) => {
    if (showSpinner) setStudLoading(true);
    try {
      const res = await api.get(`/payments/admin/students?q=${encodeURIComponent(search)}`);
      if (res.data.success) setStudents(res.data.data);
    } catch (err) {
      console.error('Failed to load student master:', err);
    } finally {
      if (showSpinner) setStudLoading(false);
    }
  };

  useEffect(() => {
    if (tabValue === 0) fetchCategories();
    if (tabValue === 1) fetchStudents();
  }, [tabValue]);

  const handleOpenStudDialog = (stud = null) => {
    setEditingStud(stud);
    setStudFormError('');
    if (stud) {
      setStudForm({
        hallTicketNo: stud.hallTicketNo,
        studentName: stud.studentName,
        course: stud.course,
        level: stud.level,
        semester: stud.semester,
        collegeCode: stud.collegeCode,
        collegeName: stud.collegeName || '',
        mobile: stud.mobile,
        email: stud.email || ''
      });
    } else {
      setStudForm({
        hallTicketNo: '',
        studentName: '',
        course: '',
        level: 'UG',
        semester: 'Sem I',
        collegeCode: '',
        collegeName: '',
        mobile: '',
        email: ''
      });
    }
    setStudDialogOpen(true);
  };

  const handleSaveStud = async (e) => {
    e.preventDefault();
    setStudFormError('');
    if (!studForm.hallTicketNo || !studForm.studentName || !studForm.course || !studForm.collegeCode || !studForm.mobile) {
      setStudFormError('Hall Ticket No, Name, Course, College Code, and Mobile are required.');
      return;
    }

    setStudFormLoading(true);
    try {
      let res;
      if (editingStud) {
        res = await api.put(`/payments/admin/students/${editingStud._id}`, studForm);
      } else {
        res = await api.post('/payments/admin/students', studForm);
      }

      if (res.data.success) {
        setStudDialogOpen(false);
        fetchStudents();
      }
    } catch (err) {
      setStudFormError(err.response?.data?.message || 'Failed to save student record.');
    } finally {
      setStudFormLoading(false);
    }
  };

  const handleDeleteStud = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student record?')) return;
    try {
      setStudents(prev => prev.filter(s => s._id !== id));
      await api.delete(`/payments/admin/students/${id}`);
      fetchStudents(studQuery, false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete student.');
      fetchStudents(studQuery, false);
    }
  };

  const handleBulkUploadExcel = async () => {
    if (!excelFile) return;
    setExcelLoading(true);
    setExcelMsg('');

    const formData = new FormData();
    formData.append('excelFile', excelFile);

    try {
      const res = await api.post('/payments/admin/upload-students-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        setExcelMsg(res.data.message);
        fetchStudents();
      }
    } catch (err) {
      setExcelMsg(err.response?.data?.message || 'Failed to import student Excel.');
    } finally {
      setExcelLoading(false);
    }
  };

  const filteredCategories = categories.filter(c => {
    const q = catSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.categoryType && c.categoryType.toLowerCase().includes(q)) ||
      (c.level && c.level.toLowerCase().includes(q)) ||
      (c.degree && c.degree.toLowerCase().includes(q)) ||
      (c.course && c.course.toLowerCase().includes(q)) ||
      (c.semester && c.semester.toLowerCase().includes(q)) ||
      (c.certType && c.certType.toLowerCase().includes(q)) ||
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.code && c.code.toLowerCase().includes(q)) ||
      (c.description && c.description.toLowerCase().includes(q))
    );
  });

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={800}>
          Master Data <span style={{ color: '#C2A56D' }}>Configuration</span>
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Configure university fee structures, degree programs, course categories, and student master profiles.
        </Typography>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, val) => setTabValue(val)} indicatorColor="primary" textColor="primary">
          <Tab label="Fee Categories Master" sx={{ fontWeight: 700 }} />
          <Tab label="Student Master Records" sx={{ fontWeight: 700 }} />
        </Tabs>
      </Box>

      {/* ========================================== */}
      {/* TAB 0: FEE CATEGORIES CONFIGURATION */}
      {/* ========================================== */}
      {tabValue === 0 && (
        <Box>
          <Paper sx={{ p: 2, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <TextField
              label="Search Category Type, Level, Degree, Course..."
              size="small"
              value={catSearch}
              onChange={(e) => setCatSearch(e.target.value)}
              sx={{ minWidth: 320 }}
            />

            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => handleOpenCatDialog(null)}
              sx={{ fontWeight: 700 }}
            >
              Add Fee Category
            </Button>
          </Paper>

          {catLoading ? (
            <Typography>Loading Fee Categories...</Typography>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Category Type</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Academic Level</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Degree Program</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Course / Branch</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Semester / Service</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Fee Amount (₹)</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Created Date & Time</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredCategories.map((cat) => (
                    <TableRow key={cat._id} hover>
                      <TableCell>
                        <Chip
                          label={
                            cat.categoryType === 'REGULAR_EXAM_FEE' ? 'Regular Exam Fee'
                            : cat.categoryType === 'BACKLOG_EXAM_FEE' ? 'Backlog Exam Fee'
                            : cat.categoryType === 'REVALUATION_FEE' ? 'Revaluation Fee'
                            : cat.categoryType === 'CERTIFICATE_FEE' ? 'Certificate Fee'
                            : 'Exam Fee'
                          }
                          size="small"
                          color={
                            cat.categoryType === 'REGULAR_EXAM_FEE' ? 'primary'
                            : cat.categoryType === 'BACKLOG_EXAM_FEE' ? 'warning'
                            : cat.categoryType === 'REVALUATION_FEE' ? 'error'
                            : 'secondary'
                          }
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip label={cat.level || 'N/A'} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>{cat.degree || 'All Degrees'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{cat.course || 'General'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{cat.certType || cat.semester || 'N/A'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight={900} color="success.main">₹{cat.amount}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>{formatDateWithTime(cat.createdAt)}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton onClick={() => handleOpenCatDialog(cat)} size="small" sx={{ mr: 1, color: 'text.secondary' }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton onClick={() => handleDeleteCat(cat._id)} size="small" sx={{ color: 'text.secondary' }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* ========================================== */}
      {/* TAB 1: STUDENT MASTER RECORDS CONFIGURATION */}
      {/* ========================================== */}
      {tabValue === 1 && (
        <Box>
          <Paper sx={{ p: 2, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <TextField
                label="Search Hall Ticket / Name / College"
                size="small"
                value={studQuery}
                onChange={(e) => setStudQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchStudents(studQuery)}
                sx={{ minWidth: 280 }}
              />
              <Button variant="outlined" size="small" onClick={() => fetchStudents(studQuery)} sx={{ height: 40, bgcolor: '#fff' }}>Search</Button>
            </Box>

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<CloudUploadIcon />}
                onClick={() => { setExcelFile(null); setExcelMsg(''); setExcelDialogOpen(true); }}
                sx={{ bgcolor: '#fff' }}
              >
                Bulk Upload Excel
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => handleOpenStudDialog(null)}
                sx={{ fontWeight: 700 }}
              >
                Add Student
              </Button>
            </Box>
          </Paper>

          {studLoading ? (
            <Typography>Loading Student Master Records...</Typography>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Hall Ticket No</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Student Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Course & Level</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Semester</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>College</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Registered Contact</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Created Date & Time</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {students.map((stud) => (
                    <TableRow key={stud._id} hover>
                      <TableCell><Typography variant="body2" fontWeight={800} color="primary.main">{stud.hallTicketNo}</Typography></TableCell>
                      <TableCell><Typography variant="body2" fontWeight={700}>{stud.studentName}</Typography></TableCell>
                      <TableCell>{stud.course} ({stud.level})</TableCell>
                      <TableCell><Chip label={stud.semester} size="small" variant="outlined" /></TableCell>
                      <TableCell>
                        <Typography variant="caption" fontWeight={700}>{stud.collegeCode}</Typography>
                        {stud.collegeName && <Typography variant="caption" color="text.secondary" display="block">{stud.collegeName}</Typography>}
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" display="block">📱 {stud.mobile}</Typography>
                        <Typography variant="caption" color="text.secondary">✉️ {stud.email || 'N/A'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>{formatDateWithTime(stud.createdAt)}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton onClick={() => handleOpenStudDialog(stud)} size="small" sx={{ mr: 1, color: 'text.secondary' }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton onClick={() => handleDeleteStud(stud._id)} size="small" sx={{ color: 'text.secondary' }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* ========================================== */}
      {/* DIALOG: ADD/EDIT FEE CATEGORY */}
      {/* ========================================== */}
      <Dialog open={catDialogOpen} onClose={() => setCatDialogOpen(false)} maxWidth="md" fullWidth sx={{ '& .MuiDialog-paper': { m: { xs: 1.5, sm: 4 }, width: { xs: 'calc(100% - 24px)', sm: 780 } } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          {editingCat ? 'Modify Fee Category Details' : 'Register New Fee Category'}
        </DialogTitle>
        <form onSubmit={handleSaveCat} noValidate>
          <DialogContent sx={{ pt: 1, pb: 2 }}>
            {catFormError && <Alert severity="error" sx={{ mb: 2 }}>{catFormError}</Alert>}

            <Grid container spacing={2}>
              {/* Row 1: Category Type & Academic Level */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Autocomplete
                  freeSolo
                  forcePopupIcon
                  openOnFocus
                  size="small"
                  options={['REGULAR_EXAM_FEE', 'BACKLOG_EXAM_FEE', 'REVALUATION_FEE', 'CERTIFICATE_FEE']}
                  value={catForm.categoryType || ''}
                  onChange={(e, newValue) => {
                    const val = typeof newValue === 'string' ? newValue : (newValue || '');
                    setCatForm(prev => ({
                      ...prev,
                      categoryType: val
                    }));
                  }}
                  onInputChange={(e, newValue, reason) => {
                    if (reason === 'input') {
                      setCatForm(prev => ({ ...prev, categoryType: newValue }));
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Category Type *"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      placeholder="Select category type..."
                    />
                  )}
                />
              </Grid>

              {/* Row 2: Academic Level & Degree Program */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Autocomplete
                  freeSolo
                  forcePopupIcon
                  openOnFocus
                  size="small"
                  options={['UG', 'PG', 'DIPLOMA']}
                  value={catForm.level || ''}
                  onChange={(e, newValue) => {
                    const val = typeof newValue === 'string' ? newValue : (newValue || '');
                    const defaultDegrees = DEGREE_MAP[val] || [];
                    setCatForm(prev => ({
                      ...prev,
                      level: val,
                      degree: defaultDegrees[0] || 'B.Tech',
                      course: ''
                    }));
                  }}
                  onInputChange={(e, newValue, reason) => {
                    if (reason === 'input') {
                      const defaultDegrees = DEGREE_MAP[newValue] || [];
                      setCatForm(prev => ({
                        ...prev,
                        level: newValue,
                        degree: defaultDegrees[0] || 'B.Tech',
                        course: ''
                      }));
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Academic Level *"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      placeholder="Select level..."
                    />
                  )}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Autocomplete
                  freeSolo
                  forcePopupIcon
                  openOnFocus
                  size="small"
                  options={DEGREE_MAP[catForm.level] || []}
                  value={catForm.degree || ''}
                  onChange={(e, newValue) => {
                    const val = typeof newValue === 'string' ? newValue : (newValue || '');
                    setCatForm(prev => ({ ...prev, degree: val, course: '' }));
                  }}
                  onInputChange={(e, newValue, reason) => {
                    if (reason === 'input') {
                      setCatForm(prev => ({ ...prev, degree: newValue }));
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Degree Program *"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      placeholder="Select degree program..."
                    />
                  )}
                />
              </Grid>

              {/* Row 3: Course / Branch & Semester / CertType */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Autocomplete
                  freeSolo
                  forcePopupIcon
                  openOnFocus
                  size="small"
                  options={COURSE_MAP[catForm.degree] || ['General', 'Computer Applications', 'Regular']}
                  value={catForm.course || ''}
                  onChange={(e, newValue) => {
                    const val = typeof newValue === 'string' ? newValue : (newValue || '');
                    setCatForm(prev => ({ ...prev, course: val }));
                  }}
                  onInputChange={(e, newValue, reason) => {
                    if (reason === 'input') {
                      setCatForm(prev => ({ ...prev, course: newValue }));
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Course / Branch *"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      placeholder="Select course or branch..."
                    />
                  )}
                />
              </Grid>

              {catForm.categoryType === 'CERTIFICATE_FEE' ? (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Autocomplete
                    freeSolo
                    forcePopupIcon
                    openOnFocus
                    size="small"
                    options={CERTIFICATE_TYPES_LIST}
                    value={catForm.certType || ''}
                    onChange={(e, newValue) => {
                      const val = typeof newValue === 'string' ? newValue : (newValue || '');
                      setCatForm(prev => ({ ...prev, certType: val }));
                    }}
                    onInputChange={(e, newValue, reason) => {
                      if (reason === 'input') {
                        setCatForm(prev => ({ ...prev, certType: newValue }));
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Certificate / Service Type *"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        placeholder="Select certificate service..."
                      />
                    )}
                  />
                </Grid>
              ) : (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Autocomplete
                    freeSolo
                    forcePopupIcon
                    openOnFocus
                    size="small"
                    options={SEMESTER_OPTIONS}
                    value={catForm.semester || ''}
                    onChange={(e, newValue) => {
                      const val = typeof newValue === 'string' ? newValue : (newValue || '');
                      setCatForm(prev => ({ ...prev, semester: val }));
                    }}
                    onInputChange={(e, newValue, reason) => {
                      if (reason === 'input') {
                        setCatForm(prev => ({ ...prev, semester: newValue }));
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Semester / Year *"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        placeholder="Select semester..."
                      />
                    )}
                  />
                </Grid>
              )}

              {/* Conditional Inputs based on Category Type */}
              {catForm.categoryType === 'REGULAR_EXAM_FEE' && (
                <>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Regular Base Fee Amount (₹) *"
                      type="number"
                      fullWidth
                      size="small"
                      slotProps={{ inputLabel: { shrink: true } }}
                      value={catForm.amount}
                      onChange={(e) => setCatForm({ ...catForm, amount: e.target.value })}
                      placeholder="e.g. 850"
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Exam Late Fee (+ ₹)"
                      type="number"
                      fullWidth
                      size="small"
                      slotProps={{ inputLabel: { shrink: true } }}
                      value={catForm.lateFeeSlab1}
                      onChange={(e) => setCatForm({ ...catForm, lateFeeSlab1: e.target.value })}
                      placeholder="e.g. 200"
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Notification Date"
                      type="date"
                      fullWidth
                      size="small"
                      slotProps={{ inputLabel: { shrink: true } }}
                      value={catForm.notificationDate}
                      onChange={(e) => setCatForm({ ...catForm, notificationDate: e.target.value })}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Last Date (No Late Fee)"
                      type="date"
                      fullWidth
                      size="small"
                      slotProps={{ inputLabel: { shrink: true } }}
                      value={catForm.lastDateWithoutLateFee}
                      onChange={(e) => setCatForm({ ...catForm, lastDateWithoutLateFee: e.target.value })}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Last Date (With Late Fee)"
                      type="date"
                      fullWidth
                      size="small"
                      slotProps={{ inputLabel: { shrink: true } }}
                      value={catForm.lastDateWithLateFee}
                      onChange={(e) => setCatForm({ ...catForm, lastDateWithLateFee: e.target.value })}
                    />
                  </Grid>
                </>
              )}

              {catForm.categoryType === 'BACKLOG_EXAM_FEE' && (
                <>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Backlog Per-Paper Amount (₹) *"
                      type="number"
                      fullWidth
                      size="small"
                      slotProps={{ inputLabel: { shrink: true } }}
                      value={catForm.backlogPerPaperAmount}
                      onChange={(e) => setCatForm({ ...catForm, backlogPerPaperAmount: e.target.value, amount: e.target.value })}
                      placeholder="e.g. 350"
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Backlog Max Whole-Exam Cap (₹) *"
                      type="number"
                      fullWidth
                      size="small"
                      slotProps={{ inputLabel: { shrink: true } }}
                      value={catForm.backlogMaxCapAmount}
                      onChange={(e) => setCatForm({ ...catForm, backlogMaxCapAmount: e.target.value })}
                      placeholder="e.g. 850"
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Exam Late Fee (+ ₹)"
                      type="number"
                      fullWidth
                      size="small"
                      slotProps={{ inputLabel: { shrink: true } }}
                      value={catForm.lateFeeSlab1}
                      onChange={(e) => setCatForm({ ...catForm, lateFeeSlab1: e.target.value })}
                      placeholder="e.g. 200"
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Notification Date"
                      type="date"
                      fullWidth
                      size="small"
                      slotProps={{ inputLabel: { shrink: true } }}
                      value={catForm.notificationDate}
                      onChange={(e) => setCatForm({ ...catForm, notificationDate: e.target.value })}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Last Date (No Late Fee)"
                      type="date"
                      fullWidth
                      size="small"
                      slotProps={{ inputLabel: { shrink: true } }}
                      value={catForm.lastDateWithoutLateFee}
                      onChange={(e) => setCatForm({ ...catForm, lastDateWithoutLateFee: e.target.value })}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Last Date (With Late Fee)"
                      type="date"
                      fullWidth
                      size="small"
                      slotProps={{ inputLabel: { shrink: true } }}
                      value={catForm.lastDateWithLateFee}
                      onChange={(e) => setCatForm({ ...catForm, lastDateWithLateFee: e.target.value })}
                    />
                  </Grid>
                </>
              )}

              {catForm.categoryType === 'REVALUATION_FEE' && (
                <>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Revaluation Fee Per Paper (₹) *"
                      type="number"
                      fullWidth
                      size="small"
                      slotProps={{ inputLabel: { shrink: true } }}
                      value={catForm.amount}
                      onChange={(e) => setCatForm({ ...catForm, amount: e.target.value })}
                      placeholder="e.g. 750"
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Late Fee (+ ₹)"
                      type="number"
                      fullWidth
                      size="small"
                      slotProps={{ inputLabel: { shrink: true } }}
                      value={catForm.lateFeeSlab1}
                      onChange={(e) => setCatForm({ ...catForm, lateFeeSlab1: e.target.value })}
                      placeholder="e.g. 200"
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Notification Date"
                      type="date"
                      fullWidth
                      size="small"
                      slotProps={{ inputLabel: { shrink: true } }}
                      value={catForm.notificationDate}
                      onChange={(e) => setCatForm({ ...catForm, notificationDate: e.target.value })}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Last Date to Submit (No Late Fee)"
                      type="date"
                      fullWidth
                      size="small"
                      slotProps={{ inputLabel: { shrink: true } }}
                      value={catForm.lastDateWithoutLateFee}
                      onChange={(e) => setCatForm({ ...catForm, lastDateWithoutLateFee: e.target.value })}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Last Date to Submit (With Late Fee)"
                      type="date"
                      fullWidth
                      size="small"
                      slotProps={{ inputLabel: { shrink: true } }}
                      value={catForm.lastDateWithLateFee}
                      onChange={(e) => setCatForm({ ...catForm, lastDateWithLateFee: e.target.value })}
                    />
                  </Grid>
                </>
              )}

              {catForm.categoryType === 'CERTIFICATE_FEE' && (
                <>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Base Fee Amount (₹) *"
                      type="number"
                      fullWidth
                      size="small"
                      slotProps={{ inputLabel: { shrink: true } }}
                      value={catForm.amount}
                      onChange={(e) => setCatForm({ ...catForm, amount: e.target.value })}
                      placeholder="e.g. 1000"
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Belated Fine Rate Per Year (₹)"
                      type="number"
                      fullWidth
                      size="small"
                      slotProps={{ inputLabel: { shrink: true } }}
                      value={catForm.perBelatedYearFineAmount}
                      onChange={(e) => setCatForm({ ...catForm, perBelatedYearFineAmount: e.target.value })}
                      placeholder="e.g. 100 or 300"
                    />
                  </Grid>
                </>
              )}

              {/* Full Width: Description / Notes */}
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Description / Notes (Optional)"
                  fullWidth
                  multiline
                  rows={2}
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={catForm.description}
                  onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                  placeholder="Additional instructions or official note..."
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setCatDialogOpen(false)} color="inherit" size="small" disabled={catFormLoading}>Cancel</Button>
            <Button type="submit" variant="contained" size="small" disabled={catFormLoading}>
              {catFormLoading ? <CircularProgress size={18} color="inherit" /> : 'Save Category'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ========================================== */}
      {/* DIALOG: ADD/EDIT STUDENT MASTER */}
      {/* ========================================== */}
      <Dialog open={studDialogOpen} onClose={() => setStudDialogOpen(false)} maxWidth="md" fullWidth sx={{ '& .MuiDialog-paper': { m: { xs: 1.5, sm: 4 }, width: { xs: 'calc(100% - 24px)', sm: 780 } } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          {editingStud ? 'Modify Student Master Record' : 'Register New Student Record'}
        </DialogTitle>
        <form onSubmit={handleSaveStud} noValidate>
          <DialogContent sx={{ pt: 1, pb: 2 }}>
            {studFormError && <Alert severity="error" sx={{ mb: 2 }}>{studFormError}</Alert>}

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Hall Ticket / Roll No (Unique)"
                  fullWidth
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                  disabled={!!editingStud}
                  value={studForm.hallTicketNo}
                  onChange={(e) => setStudForm({ ...studForm, hallTicketNo: e.target.value.toUpperCase() })}
                  placeholder="e.g. 202601005"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Student Full Name"
                  fullWidth
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={studForm.studentName}
                  onChange={(e) => setStudForm({ ...studForm, studentName: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Course / Branch"
                  fullWidth
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={studForm.course}
                  onChange={(e) => setStudForm({ ...studForm, course: e.target.value })}
                  placeholder="e.g. B.Tech CSE"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  label="Academic Level"
                  fullWidth
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={studForm.level}
                  onChange={(e) => setStudForm({ ...studForm, level: e.target.value })}
                >
                  <MenuItem value="UG">UG</MenuItem>
                  <MenuItem value="PG">PG</MenuItem>
                  <MenuItem value="DIPLOMA">DIPLOMA</MenuItem>
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Semester"
                  fullWidth
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={studForm.semester}
                  onChange={(e) => setStudForm({ ...studForm, semester: e.target.value })}
                  placeholder="e.g. Sem IV"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Exam Centre Code"
                  fullWidth
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={studForm.collegeCode}
                  onChange={(e) => setStudForm({ ...studForm, collegeCode: e.target.value.toUpperCase() })}
                  placeholder="e.g. 101"
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Exam Centre Full Name (Optional)"
                  fullWidth
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={studForm.collegeName}
                  onChange={(e) => setStudForm({ ...studForm, collegeName: e.target.value })}
                  placeholder="e.g. AKNU College of Engineering"
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Mobile Number (SMS OTP)"
                  fullWidth
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={studForm.mobile}
                  onChange={(e) => setStudForm({ ...studForm, mobile: e.target.value })}
                  placeholder="e.g. 9876543210"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Email Address (Email OTP)"
                  type="email"
                  fullWidth
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={studForm.email}
                  onChange={(e) => setStudForm({ ...studForm, email: e.target.value })}
                  placeholder="e.g. student@aknu.edu.in"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setStudDialogOpen(false)} color="inherit" size="small" disabled={studFormLoading}>Cancel</Button>
            <Button type="submit" variant="contained" size="small" disabled={studFormLoading}>
              {studFormLoading ? <CircularProgress size={18} color="inherit" /> : 'Save Student'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ========================================== */}
      {/* DIALOG: BULK IMPORT STUDENTS EXCEL */}
      {/* ========================================== */}
      <Dialog open={excelDialogOpen} onClose={() => setExcelDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Bulk Import Student Master Records via Excel
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 3 }}>
            💡 <strong>Expected Excel Column Headers:</strong><br />
            <code>HallTicketNo</code>, <code>StudentName</code>, <code>Course</code>, <code>Level</code> (UG/PG), <code>Semester</code>, <code>CollegeCode</code>, <code>Mobile</code>, <code>Email</code>
          </Alert>

          {excelMsg && <Alert severity="success" sx={{ mb: 2 }}>{excelMsg}</Alert>}

          <Button
            variant="outlined"
            component="label"
            fullWidth
            startIcon={<CloudUploadIcon />}
            sx={{ py: 3, borderStyle: 'dashed', borderWidth: 2 }}
          >
            {excelFile ? `✔ ${excelFile.name}` : 'Select Student Master Excel (.xlsx)'}
            <input
              type="file"
              accept=".xlsx, .xls"
              hidden
              onChange={(e) => setExcelFile(e.target.files[0])}
            />
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExcelDialogOpen(false)} disabled={excelLoading}>Close</Button>
          <Button
            variant="contained"
            color="success"
            disabled={!excelFile || excelLoading}
            onClick={handleBulkUploadExcel}
          >
            {excelLoading ? <CircularProgress size={20} color="inherit" /> : 'Import Student Excel'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
