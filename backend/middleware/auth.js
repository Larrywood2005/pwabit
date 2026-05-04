import jwt from 'jsonwebtoken';

export const authenticate = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      console.log('[v0] No token provided in Authorization header');
      return res.status(401).json({ message: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    
    console.log('[v0] Token verified successfully:', {
      userId: decoded._id || decoded.userId,
      role: decoded.role,
      type: decoded.type
    });
    
    next();
  } catch (error) {
    console.error('[v0] Token verification failed:', {
      message: error.message,
      name: error.name
    });
    return res.status(401).json({ message: 'Invalid token', error: error.message });
  }
};

export const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      console.error('[v0] Authorization failed - No user in request');
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const userRole = req.user.role;
    
    console.log('[v0] Authorization check:', {
      userRole,
      requiredRoles: roles,
      hasAccess: roles.length === 0 || roles.includes(userRole)
    });
    
    if (roles.length && !roles.includes(userRole)) {
      console.error('[v0] Authorization failed:', {
        userRole,
        requiredRoles: roles,
        userId: req.user._id || req.user.userId
      });
      return res.status(403).json({ 
        message: 'Not authorized - insufficient permissions',
        userRole,
        requiredRoles: roles
      });
    }
    
    next();
  };
};
