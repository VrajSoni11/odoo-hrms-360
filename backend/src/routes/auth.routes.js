const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const SESSION_MINUTES = 15;
const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_DAYS = 3;
const accessCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: SESSION_MINUTES * 60 * 1000,
};
const refreshCookieOptions = {
  ...accessCookieOptions,
  maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
};
const clearCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
};

function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createAccessToken(user) {
  return jwt.sign({ id: user.id, roleId: user.roleId, roleName: user.role.name, employeeId: user.employeeId }, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
}

async function issueRefreshToken(userId) {
  const token = crypto.randomBytes(48).toString('base64url');
  await prisma.refreshToken.create({ data: { tokenHash: hashRefreshToken(token), userId, expiresAt: new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000) } });
  return token;
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true, employee: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const accessToken = createAccessToken(user);
    const refreshToken = await issueRefreshToken(user.id);
    res.cookie('accessToken', accessToken, accessCookieOptions);
    res.cookie('refreshToken', refreshToken, refreshCookieOptions);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role.name,
        employee: user.employee,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/refresh — rotates a refresh token and returns a new access token.
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.cookies || {};
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken is required' });
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hashRefreshToken(refreshToken) }, include: { user: { include: { role: true } } } });
    if (!stored || stored.revokedAt || stored.expiresAt <= new Date() || !stored.user.isActive) return res.status(401).json({ error: 'Invalid or expired refresh token' });

    const replacement = await prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
      const nextToken = crypto.randomBytes(48).toString('base64url');
      await tx.refreshToken.create({ data: { tokenHash: hashRefreshToken(nextToken), userId: stored.userId, expiresAt: new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000) } });
      return nextToken;
    });
    res.cookie('accessToken', createAccessToken(stored.user), accessCookieOptions);
    res.cookie('refreshToken', replacement, refreshCookieOptions);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not refresh session' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        role: true,
        employee: { include: { department: true, schedule: true, manager: true } },
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      id: user.id,
      email: user.email,
      role: user.role.name,
      employee: user.employee,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load current user' });
  }
});

// POST /api/auth/logout — revoke the supplied refresh token.
router.post('/logout', async (req, res) => {
  try {
    if (req.cookies?.refreshToken) {
      await prisma.refreshToken.updateMany({ where: { tokenHash: hashRefreshToken(req.cookies.refreshToken), revokedAt: null }, data: { revokedAt: new Date() } });
    }
    res.clearCookie('accessToken', clearCookieOptions);
    res.clearCookie('refreshToken', clearCookieOptions);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Could not log out' });
  }
});

module.exports = router;
