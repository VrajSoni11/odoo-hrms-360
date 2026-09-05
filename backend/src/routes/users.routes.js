const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, requireRole('Admin'));

router.get('/', async (req, res) => {
  const users = await prisma.user.findMany({
    include: { role: true, employee: { select: { id: true, name: true, workEmail: true } } },
    orderBy: { id: 'asc' },
  });
  res.json(users.map(({ passwordHash, ...rest }) => rest));
});

router.get('/roles', async (req, res) => {
  const roles = await prisma.role.findMany({ orderBy: { id: 'asc' } });
  res.json(roles);
});

// Employees not yet linked to a login — feeds the "create user" dropdown
router.get('/unlinked-employees', async (req, res) => {
  const employees = await prisma.employee.findMany({
    where: { user: null },
    select: { id: true, name: true, workEmail: true },
    orderBy: { name: 'asc' },
  });
  res.json(employees);
});

router.post('/', async (req, res) => {
  try {
    const { email, password, roleId, employeeId } = req.body;
    if (!email || !password || !roleId) {
      return res.status(400).json({ error: 'email, password, and roleId are required' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, roleId: Number(roleId), employeeId: employeeId ? Number(employeeId) : null },
      include: { role: true, employee: true },
    });
    const { passwordHash: _, ...safeUser } = user;
    res.status(201).json(safeUser);
  } catch (err) {
    console.error(err);
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'That email or employee is already linked to a login' });
    }
    res.status(500).json({ error: 'Could not create user' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const targetId = Number(req.params.id);
    const { roleId, isActive, password } = req.body;

    // Self-elevation / self-lockout prevention: an Admin cannot change their
    // own role or deactivate their own account through this endpoint.
    if (targetId === req.user.id) {
      if (roleId !== undefined || isActive !== undefined) {
        return res.status(403).json({
          error: 'You cannot change your own role or active status. Ask another Admin to do it.',
        });
      }
    }

    const data = {};
    if (roleId !== undefined) data.roleId = Number(roleId);
    if (isActive !== undefined) data.isActive = isActive;
    if (password) data.passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
      where: { id: targetId },
      data,
      include: { role: true, employee: true },
    });
    const { passwordHash: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update user' });
  }
});

router.delete('/:id', async (req, res) => {
  const targetId = Number(req.params.id);
  if (targetId === req.user.id) {
    return res.status(403).json({ error: 'You cannot delete your own account' });
  }
  try {
    await prisma.user.delete({ where: { id: targetId } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete user' });
  }
});

module.exports = router;
