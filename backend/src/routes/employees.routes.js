const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
const MANAGE_ROLES = ['Admin', 'HR Manager', 'HR Payroll User', 'HR Payroll Manager'];

const toIntOrNull = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const FK_FIELD_FROM_INDEX = {
  'employees_departmentId_fkey (index)': 'Department',
  'employees_scheduleId_fkey (index)': 'Working Schedule',
  'employees_managerId_fkey (index)': 'Manager',
};

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
//
// Supports backend pagination so large workforces don't get shipped to the
// client in one shot:
//   GET /api/employees              -> first page, 15 records
//   GET /api/employees?page=2       -> second page (still 15 per page)
//   GET /api/employees?page=2&limit=25
//   GET /api/employees?all=true     -> full, unpaginated list (used by
//                                      dropdowns/selects elsewhere in the
//                                      app that need every employee, e.g.
//                                      the manager picker or filters)
const DEFAULT_PAGE_SIZE = 15;
const MAX_PAGE_SIZE = 100;

router.get('/', requireRole(...MANAGE_ROLES), async (req, res) => {
  // Dropdowns/selects that need the complete roster (not a single page)
  // opt in explicitly with ?all=true and keep getting a plain array back,
  // so nothing else in the app breaks.
  if (req.query.all === 'true') {
    const employees = await prisma.employee.findMany({
      include: EMPLOYEE_INCLUDE,
      orderBy: { name: 'asc' },
    });
    return res.json(employees);
  }

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_PAGE_SIZE),
  );
  const skip = (page - 1) * limit;

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      include: EMPLOYEE_INCLUDE,
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
    prisma.employee.count(),
  ]);

  res.json({
    data: employees,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
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
        departmentId: toIntOrNull(departmentId),
        managerId: toIntOrNull(managerId),
        jobPosition: jobPosition || null,
        status: status || 'active',
        employeeType: employeeType || 'full_time',
        scheduleId: toIntOrNull(scheduleId),
      },
      include: EMPLOYEE_INCLUDE,
    });
    res.status(201).json(employee);
  } catch (err) {
    console.error(err);
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'An employee with that work email already exists' });
    }
    if (err.code === 'P2003') {
      const field = FK_FIELD_FROM_INDEX[err.meta?.field_name] || 'Linked record';
      return res.status(400).json({ error: `${field} not found — please pick a valid option from the dropdown` });
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
        departmentId: toIntOrNull(departmentId),
        managerId: toIntOrNull(managerId),
        jobPosition: jobPosition || null,
        status,
        employeeType,
        scheduleId: toIntOrNull(scheduleId),
      },
      include: EMPLOYEE_INCLUDE,
    });
    res.json(employee);
  } catch (err) {
    console.error(err);
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'An employee with that work email already exists' });
    }
    if (err.code === 'P2003') {
      const field = FK_FIELD_FROM_INDEX[err.meta?.field_name] || 'Linked record';
      return res.status(400).json({ error: `${field} not found — please pick a valid option from the dropdown` });
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
