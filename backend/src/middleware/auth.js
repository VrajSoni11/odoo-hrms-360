const jwt = require('jsonwebtoken');

/**
 * Verifies the JWT on the Authorization header and attaches the decoded
 * payload to req.user as { id, roleId, roleName, employeeId }.
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ')
    ? header.slice(7)
    : req.cookies?.accessToken;

  if (!token) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, roleId, roleName, employeeId }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Role-gate a route. Usage: requireRole('Admin', 'HR Manager')
 * Must run AFTER authenticate().
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!allowedRoles.includes(req.user.roleName)) {
      return res.status(403).json({ error: 'Forbidden — insufficient role for this action' });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
