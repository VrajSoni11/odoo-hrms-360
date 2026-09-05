const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');
const { computeSalary, ALLOWED_CATEGORIES, ALLOWED_METHODS } = require('../lib/salaryEngine');

const router = express.Router();
// Salary Rules are Admin-only — HR Payroll User and HR Payroll Manager no
// longer have access to this section (they still see Payroll Dashboard,
// Payruns, Salary Structures, and Payslips).
const READ_ROLES = ['Admin'];
const WRITE_ROLES = ['Admin'];
router.use(authenticate, requireRole(...READ_ROLES));

function validateRule(body) {
  if (!body.name || !body.code || !ALLOWED_CATEGORIES.has(body.category)) return 'name, code, and a valid category are required';
  if (!ALLOWED_METHODS.has(body.computationMethod)) return 'computationMethod must be fixed, percentage, or formula';
  if (body.computationMethod === 'fixed' && (body.amount === undefined || body.amount === '')) return 'Fixed rules require amount';
  if (body.computationMethod === 'percentage' && (!body.percentageOf || body.percentageRate === undefined || body.percentageRate === '')) return 'Percentage rules require percentageOf and percentageRate';
  if (body.computationMethod === 'formula' && !body.formula) return 'Formula rules require formula';
  return null;
}

function ruleData(body) {
  return { name: body.name, code: body.code, category: body.category, sequence: Number(body.sequence || 10), computationMethod: body.computationMethod, amount: body.computationMethod === 'fixed' ? Number(body.amount) : null, percentageOf: body.computationMethod === 'percentage' ? body.percentageOf : null, percentageRate: body.computationMethod === 'percentage' ? Number(body.percentageRate) : null, formula: body.computationMethod === 'formula' ? body.formula : null, isActive: body.isActive !== false };
}

router.get('/', async (req, res) => {
  const where = req.query.structureId ? { structureId: Number(req.query.structureId) } : {};
  res.json(await prisma.salaryRule.findMany({ where, orderBy: [{ sequence: 'asc' }, { id: 'asc' }] }));
});

router.post('/preview', async (req, res) => {
  const wage = Number(req.body.sampleWage);
  if (!req.body.structureId || !Number.isFinite(wage)) return res.status(400).json({ error: 'structureId and sampleWage are required' });
  const structure = await prisma.salaryStructure.findUnique({ where: { id: Number(req.body.structureId) }, include: { rules: true } });
  if (!structure) return res.status(404).json({ error: 'Salary structure not found' });
  res.json(computeSalary(structure.rules, wage));
});

router.post('/', requireRole(...WRITE_ROLES), async (req, res) => {
  const error = validateRule(req.body);
  if (error) return res.status(400).json({ error });
  try { res.status(201).json(await prisma.salaryRule.create({ data: { structureId: Number(req.body.structureId), ...ruleData(req.body) } })); }
  catch (err) { res.status(err.code === 'P2002' ? 409 : 500).json({ error: err.code === 'P2002' ? 'Rule code already exists in this structure' : 'Could not create salary rule' }); }
});

router.put('/:id', requireRole(...WRITE_ROLES), async (req, res) => {
  const error = validateRule(req.body);
  if (error) return res.status(400).json({ error });
  try { res.json(await prisma.salaryRule.update({ where: { id: Number(req.params.id) }, data: ruleData(req.body) })); }
  catch (err) { res.status(500).json({ error: 'Could not update salary rule' }); }
});

router.delete('/:id', requireRole(...WRITE_ROLES), async (req, res) => {
  try { await prisma.salaryRule.delete({ where: { id: Number(req.params.id) } }); res.json({ ok: true }); }
  catch (err) { res.status(500).json({ error: 'Could not delete salary rule' }); }
});

module.exports = router;