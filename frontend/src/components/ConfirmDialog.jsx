/**
 * Shared reusable UI components:
 *   - ConfirmDialog  — modal confirmation instead of window.confirm
 *   - ToastAlert     — auto-dismissing in-app success/error message
 *   - useToast       — hook to manage toast state
 */
import React, { useState, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Alert, Collapse
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

// ---------------------------------------------------------------------------
// ConfirmDialog
// ---------------------------------------------------------------------------
/**
 * @param {boolean}  open
 * @param {string}   title
 * @param {string}   message
 * @param {string}   confirmLabel  e.g. "Delete"
 * @param {string}   confirmColor  MUI color: "error" | "warning" | "primary"
 * @param {()=>void} onConfirm
 * @param {()=>void} onCancel
 */
export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', confirmColor = 'error', onConfirm, onCancel }) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 800 }}>
        <WarningAmberIcon color={confirmColor} />
        {title}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={onCancel} variant="outlined" size="small">
          Cancel
        </Button>
        <Button onClick={onConfirm} variant="contained" color={confirmColor} size="small" autoFocus>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// ToastAlert — auto-dismissing in-app notification
// ---------------------------------------------------------------------------
/**
 * @param {{ open, message, severity, onClose }}
 */
export function ToastAlert({ open, message, severity = 'success', onClose }) {
  return (
    <Collapse in={open} timeout={300}>
      <Alert
        severity={severity}
        onClose={onClose}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          minWidth: 300,
          boxShadow: 4,
          borderRadius: 2,
        }}
      >
        {message}
      </Alert>
    </Collapse>
  );
}

// ---------------------------------------------------------------------------
// useToast — hook for managing toast state
// ---------------------------------------------------------------------------
export function useToast(autoDismissMs = 3500) {
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const showToast = useCallback((message, severity = 'success') => {
    setToast({ open: true, message, severity });
    setTimeout(() => setToast(prev => ({ ...prev, open: false })), autoDismissMs);
  }, [autoDismissMs]);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, open: false }));
  }, []);

  return { toast, showToast, hideToast };
}
