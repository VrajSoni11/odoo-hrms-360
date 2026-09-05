const express = require('express');
const prisma = require('../utils/prisma');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

const MANAGE_ROLES = ['HR Manager', 'HR Payroll User', 'HR Payroll Manager', 'Admin'];

const employeeInclude = {
  department: true,
  manager: { select: { id: true, name: true } },
};

// GET /api/employees/me - Employee self-service: their own record only
router.get('/me', authenticate, async (req, res) => {
  if (!req.user.employeeId) {
    return res.status(404).json({ error: 'No employee record linked to this account' });
  }
  const employee = await prisma.employee.findUnique({
    where: { id: req.user.employeeId },
    include: employeeInclude,
  });
  if (!employee) return res.status(404).json({ error: 'Employee not found' });
  res.json(employee);
});

// GET /api/employees - full list, HR Manager+ only
router.get('/', authenticate, requireRole(MANAGE_ROLES), async (req, res) => {
  const { search, departmentId, status } = req.query;

  const where = {
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { workEmail: { contains: search, mode: 'insensitive' } },
        { jobPosition: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(departmentId && { departmentId: Number(departmentId) }),
    ...(status && { status }),
  };

  const employees = await prisma.employee.findMany({
    where,
    include: employeeInclude,
    orderBy: { name: 'asc' },
  });
  res.json(employees);
});

// GET /api/employees/:id - HR Manager+ only (Employee role must use /me)
router.get('/:id', authenticate, requireRole(MANAGE_ROLES), async (req, res) => {
  const employee = await prisma.employee.findUnique({
    where: { id: Number(req.params.id) },
    include: employeeInclude,
  });
  if (!employee) return res.status(404).json({ error: 'Employee not found' });
  res.json(employee);
});

// POST /api/employees
router.post('/', authenticate, requireRole(MANAGE_ROLES), async (req, res) => {
  try {
    const { name, workEmail, phone, departmentId, managerId, jobPosition, status, employeeType, photoUrl } = req.body;

    if (!name || !workEmail) {
      return res.status(400).json({ error: 'name and workEmail are required' });
    }

    const employee = await prisma.employee.create({
      data: {
        name,
        workEmail: workEmail.toLowerCase().trim(),
        phone: phone || null,
        departmentId: departmentId ? Number(departmentId) : null,
        managerId: managerId ? Number(managerId) : null,
        jobPosition: jobPosition || null,
        status: status || 'active',
        employeeType: employeeType || 'full_time',
        photoUrl: photoUrl || null,
      },
      include: employeeInclude,
    });

    res.status(201).json(employee);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'An employee with this work email already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

// PUT /api/employees/:id
router.put('/:id', authenticate, requireRole(MANAGE_ROLES), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, workEmail, phone, departmentId, managerId, jobPosition, status, employeeType, photoUrl } = req.body;

    if (managerId && Number(managerId) === id) {
      return res.status(400).json({ error: 'An employee cannot be their own manager' });
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        name,
        workEmail: workEmail ? workEmail.toLowerCase().trim() : undefined,
        phone,
        departmentId: departmentId ? Number(departmentId) : null,
        managerId: managerId ? Number(managerId) : null,
        jobPosition,
        status,
        employeeType,
        photoUrl,
      },
      include: employeeInclude,
    });

    res.json(employee);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'An employee with this work email already exists' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Employee not found' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// DELETE /api/employees/:id
router.delete('/:id', authenticate, requireRole(MANAGE_ROLES), async (req, res) => {
  try {
    await prisma.employee.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Employee not found' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to delete employee (they may have linked records, e.g. a user account)' });
  }
});

module.exports = router;
