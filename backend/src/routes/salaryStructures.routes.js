const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
const READ_ROLES = ['Admin', 'HR Payroll User', 'HR Payroll Manager'];
const WRITE_ROLES = ['Admin', 'HR Payroll Manager'];
router.use(authenticate, requireRole(...READ_ROLES));

router.get('/', async (req, res) => {
  const structures = await prisma.salaryStructure.findMany({ include: { _count: { select: { rules: true, contracts: true } } }, orderBy: { name: 'asc' } });
  res.json(structures);
});

router.get('/:id', async (req, res) => {
  const structure = await prisma.salaryStructure.findUnique({ where: { id: Number(req.params.id) }, include: { rules: { orderBy: [{ sequence: 'asc' }, { id: 'asc' }] }, _count: { select: { contracts: true } } } });
  if (!structure) return res.status(404).json({ error: 'Salary structure not found' });
  res.json(structure);
});

router.post('/', requireRole(...WRITE_ROLES), async (req, res) => {
  try {
    const structure = await prisma.salaryStructure.create({ data: { name: req.body.name, isActive: req.body.isActive !== false } });
    res.status(201).json(structure);
  } catch (err) { res.status(err.code === 'P2002' ? 409 : 500).json({ error: err.code === 'P2002' ? 'A salary structure with that name already exists' : 'Could not create salary structure' }); }
});

router.put('/:id', requireRole(...WRITE_ROLES), async (req, res) => {
  try { res.json(await prisma.salaryStructure.update({ where: { id: Number(req.params.id) }, data: { name: req.body.name, isActive: req.body.isActive } })); }
  catch (err) { res.status(500).json({ error: 'Could not update salary structure' }); }
});

router.delete('/:id', requireRole(...WRITE_ROLES), async (req, res) => {
  const id = Number(req.params.id);
  const used = await prisma.contract.count({ where: { salaryStructureId: id } });
  if (used) return res.status(409).json({ error: 'Cannot delete a salary structure that is attached to contracts' });
  try { await prisma.salaryStructure.delete({ where: { id } }); res.json({ ok: true }); }
  catch (err) { res.status(500).json({ error: 'Could not delete salary structure' }); }
});

module.exports = router;