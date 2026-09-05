const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
const HR_ROLES = ['Admin', 'HR Manager'];
router.use(authenticate);
const include = { employee: { select: { id: true, name: true, workEmail: true } }, timeOffType: true, allocation: true, decidedBy: { select: { id: true, email: true } } };

router.get('/', async (req, res) => {
  const isHr = HR_ROLES.includes(req.user.roleName);
  res.json(await prisma.timeOffRequest.findMany({ where: isHr ? {} : { employeeId: req.user.employeeId || -1 }, include, orderBy: { createdAt: 'desc' } }));
});

router.post('/', async (req, res) => {
  try {
    const { timeOffTypeId, startDate, endDate, requestedAmount, reason } = req.body;
    const amount = Number(requestedAmount);
    if (!req.user.employeeId || !timeOffTypeId || !startDate || !endDate || !Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'An employee, type, dates, and positive requestedAmount are required' });
    const allocation = await prisma.timeOffAllocation.findFirst({ where: { employeeId: req.user.employeeId, timeOffTypeId: Number(timeOffTypeId), status: 'approved', remainingAmount: { gte: amount } }, orderBy: { createdAt: 'asc' } });
    if (!allocation) return res.status(409).json({ error: 'No approved allocation has enough remaining balance for this request' });
    const request = await prisma.timeOffRequest.create({ data: { employeeId: req.user.employeeId, timeOffTypeId: Number(timeOffTypeId), allocationId: allocation.id, startDate: new Date(startDate), endDate: new Date(endDate), requestedAmount: amount, reason: reason || null }, include });
    res.status(201).json(request);
  } catch (err) { res.status(500).json({ error: 'Could not create time-off request' }); }
});

router.patch('/:id/approve', requireRole(...HR_ROLES), async (req, res) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.timeOffRequest.findUnique({ where: { id: Number(req.params.id) } });
      if (!request || request.status !== 'pending') throw new Error('PENDING_NOT_FOUND');
      const allocation = await tx.timeOffAllocation.findFirst({ where: { id: request.allocationId || -1, status: 'approved', remainingAmount: { gte: request.requestedAmount } } });
      if (!allocation) throw new Error('INSUFFICIENT_BALANCE');
      await tx.timeOffAllocation.update({ where: { id: allocation.id }, data: { remainingAmount: { decrement: request.requestedAmount } } });
      return tx.timeOffRequest.update({ where: { id: request.id }, data: { status: 'approved', decidedById: req.user.id, decidedAt: new Date() }, include });
    });
    res.json(result);
  } catch (err) { res.status(409).json({ error: err.message === 'INSUFFICIENT_BALANCE' ? 'Allocation does not have enough remaining balance' : 'Request was not found, is not pending, or could not be approved' }); }
});

router.patch('/:id/refuse', requireRole(...HR_ROLES), async (req, res) => {
  try { const result = await prisma.timeOffRequest.update({ where: { id: Number(req.params.id), status: 'pending' }, data: { status: 'refused', decidedById: req.user.id, decidedAt: new Date() }, include }); res.json(result); }
  catch (err) { res.status(409).json({ error: 'Request was not found or is not pending' }); }
});

router.patch('/:id/cancel', async (req, res) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.timeOffRequest.findUnique({ where: { id: Number(req.params.id) } });
      const isHr = HR_ROLES.includes(req.user.roleName);
      if (!request || (!isHr && request.employeeId !== req.user.employeeId) || !['pending', 'approved'].includes(request.status)) throw new Error('NOT_ALLOWED');
      if (request.status === 'approved' && request.allocationId) await tx.timeOffAllocation.update({ where: { id: request.allocationId }, data: { remainingAmount: { increment: request.requestedAmount } } });
      return tx.timeOffRequest.update({ where: { id: request.id }, data: { status: 'cancelled' }, include });
    });
    res.json(result);
  } catch (err) { res.status(409).json({ error: 'Request cannot be cancelled' }); }
});

module.exports = router;
