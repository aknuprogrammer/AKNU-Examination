import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2C3947', // Deep Charcoal Navy
      light: '#547A95',
      dark: '#1e2832',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#547A95', // Refined Slate Blue
      light: '#7298b3',
      dark: '#3d5c73',
      contrastText: '#ffffff',
    },
    background: {
      default: '#E8EDF2', // Soft Cool Slate Gray
      paper: '#ffffff',
    },
    success: {
      main: '#10b981', // Emerald
    },
    warning: {
      main: '#C2A56D', // Elegant Warm Gold
    },
    error: {
      main: '#ef4444', // Red
    },
    text: {
      primary: '#2C3947',
      secondary: '#547A95',
    },
    divider: '#E8EDF2',
  },
  typography: {
    fontFamily: "'Plus Jakarta Sans', 'Roboto', 'Helvetica', 'Arial', sans-serif",
    h1: { fontWeight: 800, color: '#2C3947', letterSpacing: '-0.025em', fontSize: '2.5rem', '@media (max-width:600px)': { fontSize: '2rem' } },
    h2: { fontWeight: 800, color: '#2C3947', letterSpacing: '-0.02em', fontSize: '2rem', '@media (max-width:600px)': { fontSize: '1.6rem' } },
    h3: { fontWeight: 700, color: '#2C3947', letterSpacing: '-0.02em', fontSize: '1.75rem', '@media (max-width:600px)': { fontSize: '1.4rem' } },
    h4: { fontWeight: 700, color: '#2C3947', letterSpacing: '-0.015em', fontSize: '1.5rem', '@media (max-width:600px)': { fontSize: '1.25rem' } },
    h5: { fontWeight: 700, color: '#2C3947', letterSpacing: '-0.01em', fontSize: '1.25rem', '@media (max-width:600px)': { fontSize: '1.1rem' } },
    h6: { fontWeight: 600, color: '#2C3947', letterSpacing: '-0.01em', fontSize: '1.1rem', '@media (max-width:600px)': { fontSize: '1rem' } },
    subtitle1: { fontWeight: 600, color: '#2C3947', fontSize: '1rem', '@media (max-width:600px)': { fontSize: '0.95rem' } },
    subtitle2: { fontWeight: 600, color: '#547A95', fontSize: '0.875rem', '@media (max-width:600px)': { fontSize: '0.825rem' } },
    body1: { color: '#2C3947', fontSize: '1rem', '@media (max-width:600px)': { fontSize: '0.95rem' } },
    body2: { color: '#547A95', fontSize: '0.875rem', '@media (max-width:600px)': { fontSize: '0.825rem' } },
    button: { textTransform: 'none', fontWeight: 700, letterSpacing: '0.02em' },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 18px',
          fontWeight: 700,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(44, 57, 71, 0.15)',
            transform: 'translateY(-0.5px)',
          },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #2C3947 0%, #1e2832 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #1e2832 0%, #12181e 100%)',
          },
        },
        containedSecondary: {
          background: 'linear-gradient(135deg, #547A95 0%, #3d5c73 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #3d5c73 0%, #2b4355 100%)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          border: '1px solid #E8EDF2',
          boxShadow: '0 4px 20px -2px rgba(44, 57, 71, 0.05)',
          borderRadius: 14,
          transition: 'all 0.2s ease-in-out',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#ffffff',
          backgroundImage: 'none',
          border: '1px solid #E8EDF2',
          boxShadow: '0 20px 48px rgba(44, 57, 71, 0.12)',
          borderRadius: 16,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: '#E8EDF2',
          borderBottom: '2px solid #547A95',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          color: '#2C3947',
          fontWeight: 800,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          fontSize: '0.75rem',
          padding: '12px 16px',
        },
        body: {
          borderColor: '#E8EDF2',
          padding: '12px 16px',
          color: '#2C3947',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: '#ffffff',
            '& fieldset': {
              borderColor: '#cbd5e1',
            },
            '&:hover fieldset': {
              borderColor: '#547A95',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#2C3947',
            },
          },
        },
      },
    },
  },
});

export default theme;
