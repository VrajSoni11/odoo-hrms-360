const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// Every route in this file is Admin-only - this is the User Management module.
router.use(authenticate, requireRole(['Admin']));

const userSelect = {
  id: true,
  email: true,
  isActive: true,
  createdAt: true,
  role: { select: { id: true, name: true } },
  employee: { select: { id: true, name: true, workEmail: true, jobPosition: true } },
};

// GET /api/users - list, with optional role filter
router.get('/', async (req, res) => {
  const { roleId, search } = req.query;

  const users = await prisma.user.findMany({
    where: {
      ...(roleId && { roleId: Number(roleId) }),
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { employee: { name: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    },
    select: userSelect,
    orderBy: { createdAt: 'desc' },
  });

  res.json(users);
});

// GET /api/users/roles - helper endpoint to populate the role radio buttons
router.get('/roles', async (req, res) => {
  const roles = await prisma.role.findMany({ orderBy: { id: 'asc' } });
  res.json(roles);
});

// GET /api/users/:id
router.get('/:id', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: Number(req.params.id) },
    select: userSelect,
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// POST /api/users - Create/Edit User panel "Create Account"
router.post('/', async (req, res) => {
  try {
    const { email, password, roleId, employeeId } = req.body;

    if (!email || !password || !roleId || !employeeId) {
      return res.status(400).json({ error: 'email, password, roleId and employeeId are all required' });
    }

    // Enforce: user accounts must be linked to an existing employee record
    const employee = await prisma.employee.findUnique({ where: { id: Number(employeeId) } });
    if (!employee) {
      return res.status(400).json({ error: 'Selected employee does not exist' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        roleId: Number(roleId),
        employeeId: Number(employeeId),
      },
      select: userSelect,
    });

    res.status(201).json(user);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'A user with this email already exists, or this employee already has an account' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /api/users/:id - edit role / status / password
router.put('/:id', async (req, res) => {
  try {
    const targetId = Number(req.params.id);
    const { roleId, isActive, password } = req.body;

    // Self-elevation prevention: an Admin cannot change their OWN role.
    // Another Admin must do it. Status toggling own account is also blocked
    // to avoid accidentally locking yourself out.
    if (targetId === req.user.id && (roleId !== undefined || isActive !== undefined)) {
      return res.status(403).json({
        error: 'You cannot change your own role or active status. Ask another Admin to do this.',
      });
    }

    const data = {};
    if (roleId !== undefined) data.roleId = Number(roleId);
    if (isActive !== undefined) data.isActive = isActive;
    if (password) data.passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
      where: { id: targetId },
      data,
      select: userSelect,
    });

    res.json(user);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  const targetId = Number(req.params.id);

  if (targetId === req.user.id) {
    return res.status(403).json({ error: 'You cannot delete your own account' });
  }

  try {
    await prisma.user.delete({ where: { id: targetId } });
    res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
