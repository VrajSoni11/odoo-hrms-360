const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');
const { computeSalary } = require('../lib/salaryEngine');
const { resolveContract, workedDays, approvedLeaveDays, eligibleEmployees } = require('../lib/payrollHelpers');

const router = express.Router();
const PAYROLL_ROLES = ['Admin', 'HR Payroll User', 'HR Payroll Manager'];
const MANAGER_ROLES = ['Admin', 'HR Payroll Manager'];
router.use(authenticate, requireRole(...PAYROLL_ROLES));
const summary = { _count: { select: { employees: true, payslips: true, warnings: true } }, salaryStructure: true };

router.get('/', async (req, res) => res.json(await prisma.payrun.findMany({ include: summary, orderBy: { createdAt: 'desc' } })));
router.get('/eligible-employees', async (req, res) => {
  const { periodStart, periodEnd } = req.query;
  if (!periodStart || !periodEnd) return res.status(400).json({ error: 'periodStart and periodEnd are required' });
  const employees = await eligibleEmployees(periodStart, periodEnd);
  res.json(employees.filter((employee) => !req.query.departmentId || employee.departmentId === Number(req.query.departmentId)).filter((employee) => !req.query.employeeType || employee.employeeType === req.query.employeeType));
});
router.get('/:id', async (req, res) => {
  const payrun = await prisma.payrun.findUnique({ where: { id: Number(req.params.id) }, include: { ...summary, employees: { include: { employee: true } }, payslips: { include: { employee: true }, orderBy: { employeeId: 'asc' } }, warnings: { include: { employee: true }, orderBy: { severity: 'asc' } } } });
  if (!payrun) return res.status(404).json({ error: 'Payrun not found' });
  res.json(payrun);
});

router.post('/', async (req, res) => {
  try {
    const { name, salaryStructureId, periodStart, periodEnd, employeeIds } = req.body;
    if (!name || !salaryStructureId || !periodStart || !periodEnd || !Array.isArray(employeeIds) || !employeeIds.length) return res.status(400).json({ error: 'name, salaryStructureId, period dates, and employeeIds are required' });
    const payrun = await prisma.payrun.create({ data: { name, salaryStructureId: Number(salaryStructureId), periodStart: new Date(periodStart), periodEnd: new Date(periodEnd), createdById: req.user.id, employees: { create: employeeIds.map((employeeId) => ({ employeeId: Number(employeeId), included: true })) } }, include: summary });
    res.status(201).json(payrun);
  } catch (err) { res.status(500).json({ error: 'Could not create payrun' }); }
});

router.post('/:id/compute', async (req, res) => {
  const id = Number(req.params.id);
  const payrun = await prisma.payrun.findUnique({ where: { id }, include: { employees: true, salaryStructure: { include: { rules: true } } } });
  if (!payrun) return res.status(404).json({ error: 'Payrun not found' });
  if (payrun.status !== 'draft') return res.status(409).json({ error: `Payrun cannot be computed from status '${payrun.status}'` });
  const results = [];
  for (const selected of payrun.employees.filter((row) => row.included)) {
    const resolution = await resolveContract(selected.employeeId, payrun.periodStart, payrun.periodEnd);
    if (resolution.warning) { results.push({ employeeId: selected.employeeId, warning: resolution.warning }); continue; }
    const contract = resolution.contract;
    const structure = contract.salaryStructure || payrun.salaryStructure;
    if (!structure) { results.push({ employeeId: selected.employeeId, warning: { type: 'missing_salary_structure', severity: 'high', message: 'No salary structure is assigned to the employee contract or payrun' } }); continue; }
    const existing = await prisma.payslip.findUnique({ where: { payrunId_employeeId: { payrunId: id, employeeId: selected.employeeId } } });
    if (existing) { results.push({ employeeId: selected.employeeId, warning: { type: 'duplicate_payslip', severity: 'medium', message: 'A payslip already exists for this employee in this payrun' } }); continue; }
    const calculation = computeSalary(structure.rules, contract.wage);
    const errors = calculation.lines.filter((line) => line.error);
    if (errors.length) { results.push({ employeeId: selected.employeeId, warning: { type: 'salary_rule_error', severity: 'high', message: errors.map((line) => `${line.code}: ${line.error}`).join('; ') } }); continue; }
    const gross = calculation.totals.GROSS ?? 0;
    const net = calculation.totals.NET ?? gross;
    const lines = calculation.lines.map((line) => ({ salaryRuleId: structure.rules.find((rule) => rule.code === line.code).id, ruleName: line.name, category: line.category, amount: line.amount, sequence: line.sequence }));
    results.push({ employeeId: selected.employeeId, contractId: contract.id, workedDays: await workedDays(selected.employeeId, payrun.periodStart.toISOString().slice(0, 10), payrun.periodEnd.toISOString().slice(0, 10)), gross, net, lines });
  }
  await prisma.$transaction(async (tx) => {
    for (const result of results) {
      if (result.warning) await tx.payrollWarning.create({ data: { payrunId: id, employeeId: result.employeeId, ...result.warning } });
      else await tx.payslip.create({ data: { payrunId: id, employeeId: result.employeeId, contractId: result.contractId, periodStart: payrun.periodStart, periodEnd: payrun.periodEnd, workedDays: result.workedDays, status: 'computed', grossAmount: result.gross, netAmount: result.net, lines: { create: result.lines } } });
    }
    await tx.payrun.update({ where: { id }, data: { status: 'computed' } });
  });
  res.json(await prisma.payrun.findUnique({ where: { id }, include: { payslips: true, warnings: true } }));
});

router.post('/:id/validate', async (req, res) => {
  const id = Number(req.params.id); const payrun = await prisma.payrun.findUnique({ where: { id }, include: { warnings: { where: { resolved: false, severity: 'high' } } } });
  if (!payrun || payrun.status !== 'computed') return res.status(409).json({ error: 'Only computed payruns can be validated' });
  if (payrun.warnings.length && !MANAGER_ROLES.includes(req.user.roleName)) return res.status(409).json({ error: 'Resolve high-severity warnings before validation', warnings: payrun.warnings });
  await prisma.payrun.update({ where: { id }, data: { status: 'validated' } }); res.json({ ok: true, status: 'validated', overridden: payrun.warnings.length > 0 });
});
router.post('/:id/mark-paid', requireRole(...MANAGER_ROLES), async (req, res) => {
  const id = Number(req.params.id); const payrun = await prisma.payrun.findUnique({ where: { id } });
  if (!payrun || payrun.status !== 'validated') return res.status(409).json({ error: 'Only validated payruns can be marked paid' });
  await prisma.$transaction([prisma.payrun.update({ where: { id }, data: { status: 'paid' } }), prisma.payslip.updateMany({ where: { payrunId: id }, data: { status: 'paid' } })]); res.json({ ok: true, status: 'paid' });
});
router.patch('/:id/warnings/:warningId/resolve', requireRole(...MANAGER_ROLES), async (req, res) => { res.json(await prisma.payrollWarning.update({ where: { id: Number(req.params.warningId), payrunId: Number(req.params.id) }, data: { resolved: true } })); });
router.delete('/:id', requireRole(...MANAGER_ROLES), async (req, res) => { const payrun = await prisma.payrun.findUnique({ where: { id: Number(req.params.id) } }); if (!payrun || payrun.status !== 'draft') return res.status(409).json({ error: 'Only draft payruns can be deleted' }); await prisma.payrun.delete({ where: { id: payrun.id } }); res.json({ ok: true }); });

module.exports = router;
