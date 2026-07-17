import { Router } from 'express';
import * as authService from '../services/authService.js';
import { authenticateToken } from '../middlewares/auth.js';
import { rbac } from '../middlewares/rbac.js';
import { authLimiter } from '../middlewares/rateLimiter.js';
import { validate } from '../middlewares/validate.js';
import { loginSchema, updatePasswordSchema, resetPasswordSchema, forgotPasswordSchema } from '../validators/schemas.js';

const router = Router();

// Login
router.post('/login', authLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';

    const result = await authService.loginUser({ username, password, ip, userAgent });

    // Set refresh token in HttpOnly Cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      message: 'Logged in successfully.',
      accessToken: result.accessToken,
      user: result.user
    });
  } catch (error) {
    next(error);
  }
});

// Refresh token rotation
router.post('/refresh', async (req, res, next) => {
  try {
    const oldRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!oldRefreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token required.' });
    }

    const { accessToken, refreshToken, user } = await authService.refreshSession(oldRefreshToken);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      accessToken,
      user
    });
  } catch (error) {
    next(error);
  }
});

// Logout
router.post('/logout', authenticateToken, async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';
    
    await authService.logoutUser(req.user.id, req.user.sessionId, ip, userAgent);
    
    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
});

// Self update password
router.post('/change-password', authenticateToken, validate(updatePasswordSchema), async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';

    const { accessToken, refreshToken } = await authService.updatePassword(
      req.user.id,
      currentPassword,
      newPassword,
      ip,
      userAgent
    );

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      message: 'Password changed successfully.',
      accessToken
    });
  } catch (error) {
    next(error);
  }
});

// Reset principal password (Admin only)
router.post(
  '/reset-principal-password/:principalUserId',
  authenticateToken,
  rbac(['Super Admin', 'Controller of Examinations']),
  validate(resetPasswordSchema),
  async (req, res, next) => {
    try {
      const { principalUserId } = req.params;
      const { newPassword } = req.body;
      const ip = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'] || '';

      await authService.resetPrincipalPassword(principalUserId, newPassword, ip, userAgent);

      res.json({
        success: true,
        message: 'Principal password reset successfully and forcePasswordChange set to true.'
      });
    } catch (error) {
      next(error);
    }
  }
);

// Forgot password (Public)
router.post(
  '/forgot-password',
  validate(forgotPasswordSchema),
  async (req, res, next) => {
    try {
      const { email } = req.body;
      const ip = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'] || '';

      await authService.forgotPassword(email, ip, userAgent);

      res.json({
        success: true,
        message: 'If the email matches an account, a password reset link has been sent.'
      });
    } catch (error) {
      next(error);
    }
  }
);

// Reset password with token (Public)
router.post(
  '/reset-password/:token',
  validate(resetPasswordSchema),
  async (req, res, next) => {
    try {
      const { token } = req.params;
      const { newPassword } = req.body;
      const ip = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'] || '';

      await authService.resetPasswordWithToken(token, newPassword, ip, userAgent);

      res.json({
        success: true,
        message: 'Password reset successfully.'
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
