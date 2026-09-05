const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
const HR_ROLES = ['Admin', 'HR Manager'];
router.use(authenticate);

router.get('/', async (req, res) => {
  res.json(await prisma.timeOffType.findMany({ orderBy: { name: 'asc' } }));
});

router.post('/', requireRole(...HR_ROLES), async (req, res) => {
  try {
    const { name, unit, requiresAllocation, requiresApproval, affectsPayroll } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const type = await prisma.timeOffType.create({
      data: { name, unit: unit || 'days', requiresAllocation: requiresAllocation !== false, requiresApproval: requiresApproval !== false, affectsPayroll: affectsPayroll === true },
    });
    res.status(201).json(type);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'A time-off type with that name already exists' });
    res.status(500).json({ error: 'Could not create time-off type' });
  }
});

router.patch('/:id', requireRole(...HR_ROLES), async (req, res) => {
  try {
    const type = await prisma.timeOffType.update({ where: { id: Number(req.params.id) }, data: req.body });
    res.json(type);
  } catch (err) { res.status(500).json({ error: 'Could not update time-off type' }); }
});

router.delete('/:id', requireRole(...HR_ROLES), async (req, res) => {
  try {
    await prisma.timeOffType.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (err) { res.status(409).json({ error: 'Cannot delete a type that has allocations or requests' }); }
});

module.exports = router;
