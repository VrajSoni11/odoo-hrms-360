const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
const MANAGE_ROLES = ['Admin', 'HR Manager', 'HR Payroll User', 'HR Payroll Manager'];

const EMPLOYEE_INCLUDE = {
  department: true,
  manager: { select: { id: true, name: true } },
  schedule: true,
  _count: { select: { contracts: true } },
};

router.use(authenticate);

// GET /api/employees/me — every role can see their own record
router.get('/me', async (req, res) => {
  if (!req.user.employeeId) {
    return res.status(404).json({ error: 'This login is not linked to an employee record' });
  }
  const employee = await prisma.employee.findUnique({
    where: { id: req.user.employeeId },
    include: EMPLOYEE_INCLUDE,
  });
  res.json(employee);
});

// GET /api/employees — list (HR Manager and above only)
router.get('/', requireRole(...MANAGE_ROLES), async (req, res) => {
  const employees = await prisma.employee.findMany({
    include: EMPLOYEE_INCLUDE,
    orderBy: { name: 'asc' },
  });
  res.json(employees);
});

// GET /api/employees/:id — detail, with smart-button counts
router.get('/:id', requireRole(...MANAGE_ROLES), async (req, res) => {
  const employee = await prisma.employee.findUnique({
    where: { id: Number(req.params.id) },
    include: EMPLOYEE_INCLUDE,
  });
  if (!employee) return res.status(404).json({ error: 'Employee not found' });
  res.json(employee);
});

// GET /api/employees/:id/contracts — smart-button target
router.get('/:id/contracts', requireRole(...MANAGE_ROLES), async (req, res) => {
  const contracts = await prisma.contract.findMany({
    where: { employeeId: Number(req.params.id) },
    include: { department: true, schedule: true },
    orderBy: { startDate: 'desc' },
  });
  res.json(contracts);
});

router.post('/', requireRole(...MANAGE_ROLES), async (req, res) => {
  try {
    const { name, workEmail, phone, departmentId, managerId, jobPosition, status, employeeType, scheduleId } = req.body;
    if (!name || !workEmail) {
      return res.status(400).json({ error: 'name and workEmail are required' });
    }
    const employee = await prisma.employee.create({
      data: {
        name,
        workEmail,
        phone: phone || null,
        departmentId: departmentId || null,
        managerId: managerId || null,
        jobPosition: jobPosition || null,
        status: status || 'active',
        employeeType: employeeType || 'full_time',
        scheduleId: scheduleId || null,
      },
      include: EMPLOYEE_INCLUDE,
    });
    res.status(201).json(employee);
  } catch (err) {
    console.error(err);
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'An employee with that work email already exists' });
    }
    res.status(500).json({ error: 'Could not create employee' });
  }
});

router.put('/:id', requireRole(...MANAGE_ROLES), async (req, res) => {
  try {
    const { name, workEmail, phone, departmentId, managerId, jobPosition, status, employeeType, scheduleId } = req.body;
    const employee = await prisma.employee.update({
      where: { id: Number(req.params.id) },
      data: {
        name,
        workEmail,
        phone: phone || null,
        departmentId: departmentId || null,
        managerId: managerId || null,
        jobPosition: jobPosition || null,
        status,
        employeeType,
        scheduleId: scheduleId || null,
      },
      include: EMPLOYEE_INCLUDE,
    });
    res.json(employee);
  } catch (err) {
    console.error(err);
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'An employee with that work email already exists' });
    }
    res.status(500).json({ error: 'Could not update employee' });
  }
});

router.delete('/:id', requireRole(...MANAGE_ROLES), async (req, res) => {
  try {
    await prisma.employee.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete employee — they may have linked contracts, users, or reports' });
  }
});

module.exports = router;
