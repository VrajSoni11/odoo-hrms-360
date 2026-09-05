const express = require('express');
const prisma = require('../utils/prisma');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

const MANAGE_ROLES = ['HR Manager', 'HR Payroll User', 'HR Payroll Manager', 'Admin'];

// GET /api/departments - anyone authenticated can view (needed for dropdowns everywhere)
router.get('/', authenticate, async (req, res) => {
  const departments = await prisma.department.findMany({
    include: { parentDepartment: true, _count: { select: { employees: true } } },
    orderBy: { name: 'asc' },
  });
  res.json(departments);
});

// GET /api/departments/:id
router.get('/:id', authenticate, async (req, res) => {
  const department = await prisma.department.findUnique({
    where: { id: Number(req.params.id) },
    include: { employees: true },
  });
  if (!department) return res.status(404).json({ error: 'Department not found' });
  res.json(department);
});

// POST /api/departments
router.post('/', authenticate, requireRole(MANAGE_ROLES), async (req, res) => {
  try {
    const { name, parentDepartmentId } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const department = await prisma.department.create({
      data: { name, parentDepartmentId: parentDepartmentId || null },
    });
    res.status(201).json(department);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create department' });
  }
});

// PUT /api/departments/:id
router.put('/:id', authenticate, requireRole(MANAGE_ROLES), async (req, res) => {
  try {
    const { name, parentDepartmentId } = req.body;
    const department = await prisma.department.update({
      where: { id: Number(req.params.id) },
      data: { name, parentDepartmentId: parentDepartmentId || null },
    });
    res.json(department);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update department' });
  }
});

// DELETE /api/departments/:id
router.delete('/:id', authenticate, requireRole(MANAGE_ROLES), async (req, res) => {
  try {
    await prisma.department.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete department (it may have employees linked to it)' });
  }
});

module.exports = router;
