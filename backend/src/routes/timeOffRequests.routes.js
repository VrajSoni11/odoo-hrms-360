const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
const HR_ROLES = ['Admin', 'HR Manager'];
router.use(authenticate);
const include = { employee: { select: { id: true, name: true, workEmail: true } }, timeOffType: true, allocation: true, decidedBy: { select: { id: true, email: true } } };

function dayCount(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  return Math.floor((end - start) / 86400000) + 1;
}

function formatDate(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function overlaps(startDate, endDate, request) {
  return new Date(startDate) <= new Date(request.endDate) && new Date(request.startDate) <= new Date(endDate);
}

function overlapMessage(request) {
  return `This overlaps with leave request #${request.id} from ${formatDate(request.startDate)} to ${formatDate(request.endDate)}`;
}

router.get('/', async (req, res) => {
  const isHr = HR_ROLES.includes(req.user.roleName);
  res.json(await prisma.timeOffRequest.findMany({ where: isHr ? {} : { employeeId: req.user.employeeId || -1 }, include, orderBy: { createdAt: 'desc' } }));
});

router.post('/', async (req, res) => {
  try {
    const { timeOffTypeId, startDate, endDate, reason } = req.body;
    const amount = dayCount(startDate, endDate);
    if (!req.user.employeeId || !timeOffTypeId || !startDate || !endDate || amount <= 0) return res.status(400).json({ error: 'An employee, type, and valid dates are required' });
    const existing = await prisma.timeOffRequest.findMany({ where: { employeeId: req.user.employeeId, status: { in: ['pending', 'approved'] } }, orderBy: { startDate: 'asc' } });
    const clash = existing.find((request) => overlaps(startDate, endDate, request));
    if (clash) return res.status(409).json({ error: overlapMessage(clash) });
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
      const clashes = await tx.timeOffRequest.findMany({ where: { employeeId: request.employeeId, status: 'approved', id: { not: request.id } } });
      const clash = clashes.find((candidate) => overlaps(request.startDate, request.endDate, candidate));
      if (clash) throw new Error(overlapMessage(clash));
      const allocation = await tx.timeOffAllocation.findFirst({ where: { id: request.allocationId || -1, status: 'approved', remainingAmount: { gte: request.requestedAmount } } });
      if (!allocation) throw new Error('INSUFFICIENT_BALANCE');
      await tx.timeOffAllocation.update({ where: { id: allocation.id }, data: { remainingAmount: { decrement: request.requestedAmount } } });
      return tx.timeOffRequest.update({ where: { id: request.id }, data: { status: 'approved', decidedById: req.user.id, decidedAt: new Date() }, include });
    });
    res.json(result);
  } catch (err) { res.status(409).json({ error: err.message === 'INSUFFICIENT_BALANCE' ? 'Allocation does not have enough remaining balance' : err.message === 'PENDING_NOT_FOUND' ? 'Request was not found or is not pending' : err.message }); }
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
