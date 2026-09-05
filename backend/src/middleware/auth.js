const jwt = require('jsonwebtoken');

/**
 * Verifies the JWT from the Authorization header and attaches
 * { id, role, employeeId } to req.user.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, email, role, employeeId }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Role guard. Usage: requireRole(['Admin', 'HR Manager'])
 * This is the AUTHORITATIVE access control layer - the frontend
 * hiding nav items is UX only, this is what actually enforces permissions.
 */
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden: requires one of [${allowedRoles.join(', ')}], you have '${req.user.role}'`,
      });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
