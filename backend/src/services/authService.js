import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import User from '../models/User.js';
import { parseUserAgent } from '../utils/userAgent.js';
import { sendPasswordResetEmail } from './emailService.js';
import { logAction } from './auditService.js';

const ACCESS_EXPIRY = '2h';
const REFRESH_EXPIRY = '7d';

/**
 * Generate Access and Refresh Tokens
 * @param {object} user User document
 * @param {string} sessionId Active session ID
 * @returns {object} { accessToken, refreshToken }
 */
function generateTokens(user, sessionId) {
  const payload = {
    userId: user._id,
    username: user.username,
    role: user.role,
    sessionId: sessionId
  };

  const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRY
  });

  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRY
  });

  return { accessToken, refreshToken };
}

export async function loginUser({ email, password, ip, userAgent }) {
  const { browser, device } = parseUserAgent(userAgent);

  const user = await User.findOne({ email });
  if (!user) {
    const error = new Error('Invalid Email or Password');
    error.statusCode = 401;
    throw error;
  }

  if (!user.isActive) {
    const error = new Error('Your account is deactivated. Contact administrator.');
    error.statusCode = 403;
    throw error;
  }

  // Check lock status
  if (user.isLocked) {
    const error = new Error(`Account locked. Try again after ${user.lockUntil.toLocaleTimeString()}`);
    error.statusCode = 403;
    throw error;
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= 5) {
      user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lock
      await user.save();

      const error = new Error('Account locked due to too many failed login attempts. Try again in 15 minutes.');
      error.statusCode = 403;
      throw error;
    }

    await user.save();

    const error = new Error('Invalid username or password');
    error.statusCode = 401;
    throw error;
  }

  // Login Success: Reset attempts and locks, establish new sessionId
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  user.loginCount = (user.loginCount || 0) + 1;
  user.lastLoginAt = new Date();
  const newSessionId = uuidv4();
  user.currentSessionId = newSessionId;
  await user.save();

  // Log Activity
  await logAction({
    userId: user._id,
    username: user.username,
    role: user.role,
    action: 'LOGIN',
    ipAddress: ip,
    userAgent,
    details: { message: 'User logged in successfully' }
  });

  const { accessToken, refreshToken } = generateTokens(user, newSessionId);

  return {
    user: {
      id: user._id,
      username: user.username,
      role: user.role,
      email: user.email,
      mobile: user.mobile,
      forcePasswordChange: user.forcePasswordChange
    },
    accessToken,
    refreshToken
  };
}

export async function refreshSession(oldRefreshToken) {
  try {
    const decoded = jwt.verify(oldRefreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive || user.currentSessionId !== decoded.sessionId) {
      const error = new Error('Session is invalid or expired. Please login again.');
      error.statusCode = 401;
      throw error;
    }

    // Session rotation: generate new tokens with same sessionId
    const { accessToken, refreshToken } = generateTokens(user, user.currentSessionId);
    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        email: user.email,
        mobile: user.mobile,
        forcePasswordChange: user.forcePasswordChange
      }
    };
  } catch (error) {
    const err = new Error('Session is invalid or expired. Please login again.');
    err.statusCode = 401;
    throw err;
  }
}

export async function logoutUser(userId, sessionId, ip, userAgent) {
  const user = await User.findById(userId);
  const { browser, device } = parseUserAgent(userAgent);

  if (user) {
    // Invalidate session ID
    user.currentSessionId = undefined;
    await user.save();

    await logAction({
      userId: user._id,
      username: user.username,
      role: user.role,
      action: 'LOGOUT',
      ipAddress: ip,
      userAgent,
      details: { message: 'User logged out' }
    });
  }
}

export async function updatePassword(userId, currentPassword, newPassword, ip, userAgent) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) throw new Error('Incorrect current password');

  user.password = newPassword;
  user.forcePasswordChange = false;
  // Reset session to force re-login elsewhere
  user.currentSessionId = uuidv4();
  await user.save();

  return generateTokens(user, user.currentSessionId);
}

export async function resetPrincipalPassword(principalUserId, newPassword, ip, userAgent) {
  const user = await User.findById(principalUserId);
  if (!user || user.role !== 'Principal') throw new Error('Principal user not found');

  user.password = newPassword;
  user.forcePasswordChange = true; // Force change on next login
  user.currentSessionId = undefined; // Log out active session
  await user.save();
}

export async function forgotPassword(email, ip, userAgent) {
  const user = await User.findOne({ email });
  if (!user) {
    // Return early to prevent username/email enumeration
    return;
  }

  const token = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = token;
  user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  await user.save();

  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
  await sendPasswordResetEmail({
    toEmail: user.email,
    userName: user.username,
    resetUrl
  });
}

export async function resetPasswordWithToken(token, newPassword, ip, userAgent) {
  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    const error = new Error('Password reset token is invalid or has expired.');
    error.statusCode = 400;
    throw error;
  }

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  user.forcePasswordChange = false;
  user.currentSessionId = undefined; // Force logout everywhere
  await user.save();
}
