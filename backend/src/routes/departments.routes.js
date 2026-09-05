const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
const MANAGE_ROLES = ['Admin', 'HR Manager', 'HR Payroll User', 'HR Payroll Manager'];

router.use(authenticate);

// GET /api/departments — anyone logged in can view (needed for dropdowns everywhere)
router.get('/', async (req, res) => {
  const departments = await prisma.department.findMany({
    include: { _count: { select: { employees: true } } },
    orderBy: { name: 'asc' },
  });
  res.json(departments);
});

router.get('/:id', async (req, res) => {
  const dept = await prisma.department.findUnique({
    where: { id: Number(req.params.id) },
    include: { employees: true },
  });
  if (!dept) return res.status(404).json({ error: 'Department not found' });
  res.json(dept);
});

router.post('/', requireRole(...MANAGE_ROLES), async (req, res) => {
  try {
    const { name, parentDepartmentId } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const dept = await prisma.department.create({
      data: { name, parentDepartmentId: parentDepartmentId || null },
    });
    res.status(201).json(dept);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create department' });
  }
});

router.put('/:id', requireRole(...MANAGE_ROLES), async (req, res) => {
  try {
    const { name, parentDepartmentId } = req.body;
    const dept = await prisma.department.update({
      where: { id: Number(req.params.id) },
      data: { name, parentDepartmentId: parentDepartmentId ?? null },
    });
    res.json(dept);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update department' });
  }
});

router.delete('/:id', requireRole(...MANAGE_ROLES), async (req, res) => {
  try {
    await prisma.department.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete department — it may still have employees linked to it' });
  }
});

module.exports = router;
