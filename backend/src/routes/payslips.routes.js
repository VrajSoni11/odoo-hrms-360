const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');
const payslipTemplate = require('../templates/payslip.template');
const { renderPayslipPdf } = require('../lib/payslipPdf');

const router = express.Router();
const PAYROLL_ROLES = ['Admin', 'HR Payroll User', 'HR Payroll Manager'];
const MANAGER_ROLES = ['Admin', 'HR Payroll Manager'];
router.use(authenticate, requireRole(...PAYROLL_ROLES));
const include = { employee: true, contract: true, payrun: { include: { salaryStructure: true } }, lines: { orderBy: { sequence: 'asc' }, include: { salaryRule: true } } };
const datePart = (value) => new Date(value).toISOString().slice(0, 10);

const DEFAULT_PAGE_SIZE = 15;
const MAX_PAGE_SIZE = 100;

// GET /api/payslips — list
//
// Backend-paginated, 15 per page by default, same shape/params as the
// employees list:
//   GET /api/payslips                 -> first page, 15 records
//   GET /api/payslips?page=2&limit=25
//   GET /api/payslips?all=true        -> full, unpaginated list (kept for
//                                         any future consumer that needs
//                                         every record at once)
// Existing filters (?payrunId, ?employeeId) still apply on top of paging.
router.get('/', async (req, res) => {
  const where = { ...(req.query.payrunId ? { payrunId: Number(req.query.payrunId) } : {}), ...(req.query.employeeId ? { employeeId: Number(req.query.employeeId) } : {}) };
  if (req.user.roleName === 'Employee') where.employeeId = req.user.employeeId || -1;

  if (req.query.all === 'true') {
    return res.json(await prisma.payslip.findMany({ where, include, orderBy: { employeeId: 'asc' } }));
  }

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_PAGE_SIZE));
  const skip = (page - 1) * limit;

  const [slips, total] = await Promise.all([
    prisma.payslip.findMany({ where, include, orderBy: { employeeId: 'asc' }, skip, take: limit }),
    prisma.payslip.count({ where }),
  ]);

  res.json({
    data: slips,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
});

router.get('/:id/pdf', async (req, res) => {
  try {
    const payslip = await prisma.payslip.findUnique({ where: { id: Number(req.params.id) }, include });
    if (!payslip) return res.status(404).json({ error: 'Payslip not found' });
    const pdf = await renderPayslipPdf(payslipTemplate(payslip));
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="payslip-${payslip.employeeId}-${datePart(payslip.periodStart)}.pdf"`, 'Content-Length': pdf.length });
    res.end(pdf);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Could not generate payslip PDF' }); }
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
