import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  TextField,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Avatar,
  Fade,
  Tooltip
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import api from '../utils/api.js';

export default function HelpdeskBot({ user, collegeCode }) {
  const storageKey = `edep_ai_chat_history_${user?.username || collegeCode || 'guest'}`;
  const defaultWelcome = [
    {
      sender: 'ai',
      text: `Hello ${user?.username || 'Principal'}! 👋 I am the **EDEP 24/7 AI Helpdesk Assistant**.\n\nI am here to instantly diagnose any technical issue with Question Paper ZIP downloads, CRC extraction errors, OTP delays, or Decryption Passwords. How can I help you today?`,
      actions: ['CRC / Extraction Error', 'OTP Email Delivery Delay', 'How to Copy Password', 'Re-Deployment Authorization']
    }
  ];

  const [open, setOpen] = useState(() => {
    return localStorage.getItem('edep_ai_chat_open') === 'true';
  });

  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse chat history from localStorage', e);
    }
    return defaultWelcome;
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch (e) {}
  }, [messages, storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem('edep_ai_chat_open', String(open));
    } catch (e) {}
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, open]);

  const handleResetChat = () => {
    setMessages(defaultWelcome);
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {}
  };

  const handleSend = async (queryText) => {
    const q = queryText || input;
    if (!q.trim() || loading) return;

    const userMsg = { sender: 'user', text: q };
    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInput('');
    setLoading(true);

    try {
      const res = await api.post('/colleges/ai/helpdesk', {
        query: q,
        collegeCode: collegeCode || user?.username
      });
      if (res.data.success) {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: res.data.answer,
            actions: res.data.suggestedActions || []
          }
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: '⚠️ Sorry, I encountered a temporary connection glitch. Please check your network and try again or contact Exam Cell Support directly at extension 104.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ position: 'fixed', bottom: { xs: 16, sm: 24 }, right: { xs: 16, sm: 24 }, zIndex: 1300 }}>
      {/* Floating Action Button */}
      {!open && (
        <Button
          onClick={() => setOpen(true)}
          variant="contained"
          color="primary"
          sx={{
            borderRadius: '28px',
            py: 1.2,
            px: 2.5,
            boxShadow: '0 8px 24px rgba(84, 122, 149, 0.35)',
            textTransform: 'none',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            background: 'linear-gradient(135deg, #1E293B 0%, #3B82F6 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #0F172A 0%, #2563EB 100%)',
              transform: 'translateY(-2px)'
            },
            transition: 'all 0.2s ease-in-out'
          }}
        >
          <SmartToyIcon sx={{ color: '#60A5FA', animation: 'pulse 2s infinite' }} />
          <Typography variant="body2" fontWeight={800} color="white">
            AI Helpdesk
          </Typography>
          <Chip label="24/7" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 800, height: 20, fontSize: '0.68rem' }} />
        </Button>
      )}

      {/* Chat Bot Dialog/Window */}
      <Fade in={open}>
        <Paper
          elevation={16}
          sx={{
            width: { xs: 'calc(100vw - 32px)', sm: 380 },
            height: 520,
            maxHeight: '80vh',
            borderRadius: 3,
            display: open ? 'flex' : 'none',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid rgba(84, 122, 149, 0.2)',
            bgcolor: '#ffffff',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.18)'
          }}
        >
          {/* Header */}
          <Box
            sx={{
              p: 2,
              background: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ bgcolor: '#3B82F6', color: '#FFFFFF', width: 38, height: 38, boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)' }}>
                <SupportAgentIcon fontSize="small" sx={{ color: '#FFFFFF' }} />
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight={800} color="#FFFFFF" sx={{ color: '#FFFFFF !important', letterSpacing: 0.3, lineHeight: 1.2 }}>
                  EDEP AI Helpdesk
                </Typography>
                <Typography variant="caption" sx={{ color: '#E2E8F0 !important', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.6, mt: 0.3 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block', boxShadow: '0 0 6px #10B981' }}></span>
                  Active & Ready to Diagnose
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Tooltip title="Clear & Reset Chat">
                <IconButton onClick={handleResetChat} size="small" sx={{ color: '#E2E8F0', bgcolor: 'rgba(255,255,255,0.08)', '&:hover': { color: '#FFFFFF', bgcolor: 'rgba(255,255,255,0.18)' } }}>
                  <RestartAltIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <IconButton onClick={() => setOpen(false)} size="small" sx={{ color: '#FFFFFF', bgcolor: 'rgba(255,255,255,0.08)', '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' } }}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>

          {/* Messages Container */}
          <Box
            sx={{
              flex: 1,
              p: 2,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              bgcolor: '#F8FAFC'
            }}
          >
            {messages.map((msg, i) => (
              <Box
                key={i}
                sx={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '88%'
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    borderRadius: msg.sender === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    bgcolor: msg.sender === 'user' ? '#3B82F6' : '#FFFFFF',
                    color: msg.sender === 'user' ? '#FFFFFF' : '#1E293B',
                    border: msg.sender === 'user' ? 'none' : '1px solid #E2E8F0',
                    fontSize: '0.875rem',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-line'
                  }}
                >
                  {msg.sender === 'ai' && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, color: '#3B82F6' }}>
                      <SmartToyIcon sx={{ fontSize: 16 }} />
                      <Typography variant="caption" fontWeight={800} color="primary.main">
                        AI Assistant
                      </Typography>
                    </Box>
                  )}
                  {msg.text}
                </Paper>

                {/* Suggested Action Buttons */}
                {msg.actions && msg.actions.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
                    {msg.actions.map((act, j) => (
                      <Chip
                        key={j}
                        label={act}
                        size="small"
                        onClick={() => handleSend(act)}
                        clickable
                        icon={<SupportAgentIcon sx={{ fontSize: '14px !important' }} />}
                        sx={{
                          bgcolor: '#EFF6FF',
                          color: '#2563EB',
                          fontWeight: 700,
                          fontSize: '0.72rem',
                          border: '1px solid #BFDBFE',
                          '&:hover': { bgcolor: '#DBEAFE' }
                        }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            ))}
            {loading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', p: 1 }}>
                <CircularProgress size={16} />
                <Typography variant="caption">AI is diagnosing...</Typography>
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Box>

          <Divider />

          {/* Input Area */}
          <Box
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            sx={{ p: 1.5, display: 'flex', gap: 1, bgcolor: '#FFFFFF' }}
          >
            <TextField
              size="small"
              fullWidth
              placeholder="Ask anything about CRC, OTP, Passwords..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#F8FAFC' } }}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={!input.trim() || loading}
              sx={{ minWidth: 44, p: 0, borderRadius: 2 }}
            >
              <SendIcon fontSize="small" />
            </Button>
          </Box>
        </Paper>
      </Fade>
    </Box>
  );
}
