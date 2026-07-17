import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    
    // Fetch user to verify active state and session alignment
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated.' });
    }

    // Single active session check
    if (user.currentSessionId !== decoded.sessionId) {
      return res.status(401).json({ 
        success: false, 
        message: 'This session has been invalidated by another login.' 
      });
    }

    req.user = {
      id: user._id,
      username: user.username,
      role: user.role,
      email: user.email,
      mobile: user.mobile,
      sessionId: decoded.sessionId
    };

    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Token is invalid or expired.' });
  }
}
