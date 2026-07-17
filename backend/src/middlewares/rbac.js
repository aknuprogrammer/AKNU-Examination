/**
 * Role-Based Access Control middleware
 * @param {Array<string>} allowedRoles List of roles permitted to access this resource
 */
export function rbac(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Forbidden: role "${req.user.role}" does not have permission to access this resource.` 
      });
    }

    next();
  };
}
