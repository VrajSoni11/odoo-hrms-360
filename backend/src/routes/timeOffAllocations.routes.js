const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
const HR_ROLES = ['Admin', 'HR Manager'];
router.use(authenticate);

const include = { employee: { select: { id: true, name: true, workEmail: true } }, timeOffType: true, approvedBy: { select: { id: true, email: true } } };

router.get('/', async (req, res) => {
  const isHr = HR_ROLES.includes(req.user.roleName);
  const where = isHr ? {} : { employeeId: req.user.employeeId || -1 };
  res.json(await prisma.timeOffAllocation.findMany({ where, include, orderBy: { createdAt: 'desc' } }));
});

router.post('/', requireRole(...HR_ROLES), async (req, res) => {
  try {
    const { employeeId, timeOffTypeId, allocatedAmount } = req.body;
    const amount = Number(allocatedAmount);
    if (!employeeId || !timeOffTypeId || !Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'employeeId, timeOffTypeId, and a positive allocatedAmount are required' });
    const allocation = await prisma.timeOffAllocation.create({ data: { employeeId: Number(employeeId), timeOffTypeId: Number(timeOffTypeId), allocatedAmount: amount, remainingAmount: amount }, include });
    res.status(201).json(allocation);
  } catch (err) { res.status(500).json({ error: 'Could not create allocation' }); }
});

router.patch('/:id/approve', requireRole(...HR_ROLES), async (req, res) => {
  try {
    const allocation = await prisma.timeOffAllocation.update({ where: { id: Number(req.params.id), status: 'draft' }, data: { status: 'approved', approvedById: req.user.id, approvedAt: new Date() }, include });
    res.json(allocation);
  } catch (err) { res.status(409).json({ error: 'Allocation was not found or is already approved' }); }
});

router.patch('/:id', requireRole(...HR_ROLES), async (req, res) => {
  try {
    const { allocatedAmount } = req.body;
    const allocation = await prisma.timeOffAllocation.update({ where: { id: Number(req.params.id), status: 'draft' }, data: { allocatedAmount: Number(allocatedAmount), remainingAmount: Number(allocatedAmount) }, include });
    res.json(allocation);
  } catch (err) { res.status(409).json({ error: 'Only draft allocations can be updated' }); }
});

router.delete('/:id', requireRole(...HR_ROLES), async (req, res) => {
  try { await prisma.timeOffAllocation.delete({ where: { id: Number(req.params.id), status: 'draft' } }); res.json({ ok: true }); }
  catch (err) { res.status(409).json({ error: 'Only draft allocations can be deleted' }); }
});

module.exports = router;
