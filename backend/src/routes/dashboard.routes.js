const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');
const { resolveContract } = require('../lib/payrollHelpers');

const router = express.Router();
const ROLES = ['Admin', 'HR Payroll User', 'HR Payroll Manager'];
router.use(authenticate, requireRole(...ROLES));

function period(query) {
  if (query.period && /^\d{4}-\d{2}$/.test(query.period)) {
    const [year, month] = query.period.split('-').map(Number);
    return { start: new Date(Date.UTC(year, month - 1, 1)), end: new Date(Date.UTC(year, month, 0, 23, 59, 59)) };
  }
  const end = new Date(); const start = new Date(end); start.setUTCDate(1); start.setUTCHours(0, 0, 0, 0);
  return { start, end };
}

function employeeWhere(query) {
  return { ...(query.departmentId ? { departmentId: Number(query.departmentId) } : {}), ...(query.employeeType ? { employeeType: query.employeeType } : {}) };
}

router.get('/kpis', async (req, res) => {
  const { start, end } = period(req.query); const employees = await prisma.employee.findMany({ where: employeeWhere(req.query), select: { id: true } }); const ids = employees.map((e) => e.id);
  const slips = await prisma.payslip.findMany({ where: { employeeId: { in: ids }, periodStart: { lte: end }, periodEnd: { gte: start }, status: 'paid' }, select: { netAmount: true, grossAmount: true } });
  const leave = await prisma.timeOffRequest.count({ where: { employeeId: { in: ids }, status: 'approved', startDate: { lte: end }, endDate: { gte: start } } });
  const attendance = await prisma.attendance.count({ where: { employeeId: { in: ids }, checkIn: { gte: start, lte: end } } });
  res.json({ totalNetSalaryPaid: slips.reduce((sum, s) => sum + Number(s.netAmount), 0), payslipsGenerated: slips.length, averageSalary: slips.length ? slips.reduce((sum, s) => sum + Number(s.grossAmount), 0) / slips.length : 0, approvedTimeOff: leave, attendanceHealth: employees.length ? Math.min(100, attendance / employees.length * 100) : 0 });
});

router.get('/salary-by-department', async (req, res) => {
  const { start, end } = period(req.query);
  // Bars are driven by each department's *active contract* wage bill, not by
  // which departments happen to have a processed/paid payslip in the exact
  // selected period — payroll for a given month can lag behind for some
  // departments, and that used to leave every bar but one empty. Using the
  // live contract cost means every department with staff always shows a
  // real value, and it always adds up to the same total as the Department
  // Overview panel below.
  const employees = await prisma.employee.findMany({
    where: employeeWhere(req.query),
    include: { department: true, contracts: { where: { state: 'active' } } },
  });
  const grouped = {};
  employees.forEach((e) => {
    const name = e.department?.name || 'Unassigned';
    grouped[name] ||= { department: name, departmentId: e.department?.id ?? null, net: 0, paidThisPeriod: 0, headcount: 0 };
    grouped[name].headcount += 1;
    grouped[name].net += e.contracts.reduce((sum, c) => sum + Number(c.wage), 0);
  });
  const slips = await prisma.payslip.findMany({
    where: { periodStart: { lte: end }, periodEnd: { gte: start }, status: 'paid', employee: employeeWhere(req.query) },
    select: { netAmount: true, employee: { select: { department: { select: { id: true, name: true } } } } },
  });
  slips.forEach((s) => {
    const name = s.employee.department?.name || 'Unassigned';
    grouped[name] ||= { department: name, departmentId: s.employee.department?.id ?? null, net: 0, paidThisPeriod: 0, headcount: 0 };
    grouped[name].paidThisPeriod += Number(s.netAmount);
  });
  res.json(Object.values(grouped).sort((a, b) => b.net - a.net));
});

router.get('/salary-trend', async (req, res) => {
  const months = Math.min(24, Math.max(1, Number(req.query.months || 6))); const now = new Date(); const output = [];
  for (let i = months - 1; i >= 0; i -= 1) { const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)); const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59)); const slips = await prisma.payslip.aggregate({ where: { periodStart: { lte: end }, periodEnd: { gte: date }, status: 'paid' }, _sum: { netAmount: true } }); output.push({ month: date.toISOString().slice(0, 7), net: Number(slips._sum.netAmount || 0) }); } res.json(output);
});

router.get('/attendance-overview', async (req, res) => { const { start, end } = period(req.query); const rows = await prisma.attendance.findMany({ where: { checkIn: { gte: start, lte: end }, employee: employeeWhere(req.query) }, select: { status: true, source: true, checkOut: true } }); const result = { Present: 0, Late: 0, Absent: 0, Overtime: 0, 'Missing Checkouts': 0, 'Manual Edits': 0 }; rows.forEach((r) => { result[r.status] = (result[r.status] || 0) + 1; if (!r.checkOut) result['Missing Checkouts'] += 1; if (r.source === 'manual') result['Manual Edits'] += 1; }); res.json(result); });
router.get('/timeoff-overview', async (req, res) => { const { start, end } = period(req.query); const [approved, pending, balances] = await Promise.all([prisma.timeOffRequest.aggregate({ where: { status: 'approved', startDate: { lte: end }, endDate: { gte: start } }, _sum: { requestedAmount: true } }), prisma.timeOffRequest.count({ where: { status: 'pending' } }), prisma.timeOffAllocation.aggregate({ where: { status: 'approved' }, _sum: { remainingAmount: true } })]); res.json({ approvedDays: Number(approved._sum.requestedAmount || 0), pendingRequests: pending, remainingBalance: Number(balances._sum.remainingAmount || 0) }); });
router.get('/department-overview', async (req, res) => {
  const employees = await prisma.employee.findMany({ where: employeeWhere(req.query), include: { department: true, contracts: { where: { state: 'active' } } } });
  const grouped = {};
  employees.forEach((e) => {
    const name = e.department?.name || 'Unassigned';
    grouped[name] ||= { department: name, departmentId: e.department?.id ?? null, headcount: 0, salaryExpenditure: 0 };
    grouped[name].headcount += 1;
    grouped[name].salaryExpenditure += e.contracts.reduce((sum, c) => sum + Number(c.wage), 0);
  });
  const rows = Object.values(grouped).sort((a, b) => b.salaryExpenditure - a.salaryExpenditure);
  const total = rows.reduce((sum, r) => sum + r.salaryExpenditure, 0);
  res.json(rows.map((r) => ({ ...r, share: total ? Number(((r.salaryExpenditure / total) * 100).toFixed(1)) : 0 })));
});
router.get('/alerts', async (req, res) => {
  const { start, end } = period(req.query);
  const [warnings, employees] = await Promise.all([
    prisma.payrollWarning.findMany({ where: { resolved: false }, include: { employee: true }, orderBy: { createdAt: 'desc' } }),
    prisma.employee.findMany({ where: employeeWhere(req.query), select: { id: true, name: true, contracts: { where: { state: 'active', startDate: { lte: end }, OR: [{ endDate: null }, { endDate: { gte: start } }] }, select: { id: true } } } }),
  ]);
  const liveAlerts = employees.filter((employee) => employee.contracts.length === 0).map((employee) => ({ id: `live-contract-${employee.id}`, employee, type: 'no_active_contract', severity: 'high', message: `No active contract found for ${employee.name} in the selected period`, resolved: false }));
  res.json([...warnings, ...liveAlerts]);
});

module.exports = router;
