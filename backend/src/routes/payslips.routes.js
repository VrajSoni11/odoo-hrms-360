const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
const PAYROLL_ROLES = ['Admin', 'HR Payroll User', 'HR Payroll Manager'];
const MANAGER_ROLES = ['Admin', 'HR Payroll Manager'];
router.use(authenticate, requireRole(...PAYROLL_ROLES));
const include = { employee: true, contract: true, payrun: { include: { salaryStructure: true } }, lines: { orderBy: { sequence: 'asc' }, include: { salaryRule: true } } };

router.get('/', async (req, res) => {
  const where = { ...(req.query.payrunId ? { payrunId: Number(req.query.payrunId) } : {}), ...(req.query.employeeId ? { employeeId: Number(req.query.employeeId) } : {}) };
  if (req.user.roleName === 'Employee') where.employeeId = req.user.employeeId || -1;
  res.json(await prisma.payslip.findMany({ where, include, orderBy: { employeeId: 'asc' } }));
});
router.get('/:id', async (req, res) => {
  const payslip = await prisma.payslip.findUnique({ where: { id: Number(req.params.id) }, include });
  if (!payslip) return res.status(404).json({ error: 'Payslip not found' });
  if (req.user.roleName === 'Employee' && payslip.employeeId !== req.user.employeeId) return res.status(403).json({ error: 'Forbidden' });
  res.json(payslip);
});
router.put('/:id', async (req, res) => {
  try { const payslip = await prisma.payslip.findUnique({ where: { id: Number(req.params.id) } }); if (!payslip || payslip.status === 'paid') return res.status(409).json({ error: 'Paid payslips cannot be edited' }); if (req.user.roleName === 'Employee') return res.status(403).json({ error: 'Forbidden' }); res.json(await prisma.payslip.update({ where: { id: payslip.id }, data: { pdfUrl: req.body.pdfUrl } , include })); }
  catch (err) { res.status(500).json({ error: 'Could not update payslip' }); }
});
router.delete('/:id', requireRole(...MANAGER_ROLES), async (req, res) => { try { const payslip = await prisma.payslip.findUnique({ where: { id: Number(req.params.id) } }); if (!payslip || payslip.status === 'paid') return res.status(409).json({ error: 'Paid payslips cannot be deleted' }); await prisma.payslip.delete({ where: { id: payslip.id } }); res.json({ ok: true }); } catch (err) { res.status(500).json({ error: 'Could not delete payslip' }); } });

module.exports = router;
