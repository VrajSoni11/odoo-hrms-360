const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
const MANAGE_ROLES = ['Admin', 'HR Manager', 'HR Payroll User', 'HR Payroll Manager'];

router.use(authenticate, requireRole(...MANAGE_ROLES));

const CONTRACT_INCLUDE = {
  employee: { select: { id: true, name: true, workEmail: true } },
  department: true,
  schedule: true,
};

/**
 * Application-layer overlap pre-check.
 *
 * This is NOT the source of truth — the real guarantee is the PostgreSQL
 * EXCLUDE constraint added in prisma/afterMigrate.js. This check exists only
 * to return a friendly 409 with a clear message instead of a raw Postgres
 * constraint-violation error bubbling up to the client.
 *
 * Two contracts overlap if: same employee, both state='active', and their
 * [startDate, endDate] ranges intersect (open-ended endDate treated as
 * "forever" for comparison purposes).
 */
async function findOverlappingActiveContract({ employeeId, startDate, endDate, state, excludeId }) {
  if (state !== 'active') return null; // only active contracts are constrained

  const candidates = await prisma.contract.findMany({
    where: {
      employeeId,
      state: 'active',
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });

  const newStart = new Date(startDate).getTime();
  const newEnd = endDate ? new Date(endDate).getTime() : Infinity;

  return candidates.find((c) => {
    const existingStart = new Date(c.startDate).getTime();
    const existingEnd = c.endDate ? new Date(c.endDate).getTime() : Infinity;
    return existingStart <= newEnd && newStart <= existingEnd;
  }) || null;
}

// GET /api/contracts?employeeId=&state=
router.get('/', async (req, res) => {
  const { employeeId, state } = req.query;
  const contracts = await prisma.contract.findMany({
    where: {
      ...(employeeId ? { employeeId: Number(employeeId) } : {}),
      ...(state ? { state } : {}),
    },
    include: CONTRACT_INCLUDE,
    orderBy: { startDate: 'desc' },
  });
  res.json(contracts);
});

router.get('/:id', async (req, res) => {
  const contract = await prisma.contract.findUnique({
    where: { id: Number(req.params.id) },
    include: CONTRACT_INCLUDE,
  });
  if (!contract) return res.status(404).json({ error: 'Contract not found' });
  res.json(contract);
});

/**
 * GET /api/contracts/active-for-period?employeeId=&start=&end=
 * Helper used by later phases (Payroll) to resolve the contract applicable
 * to a given period. Exposed now so Phase 5 can reuse it directly.
 */
router.get('/active-for-period', async (req, res) => {
  const { employeeId, start, end } = req.query;
  if (!employeeId || !start || !end) {
    return res.status(400).json({ error: 'employeeId, start, and end are required' });
  }

  const startDate = new Date(start);
  const endDate = new Date(end);

  const candidates = await prisma.contract.findMany({
    where: { employeeId: Number(employeeId), state: 'active' },
  });

  const matches = candidates.filter((c) => {
    const cStart = new Date(c.startDate);
    const cEnd = c.endDate ? new Date(c.endDate) : null;
    return cStart <= endDate && (cEnd === null || cEnd >= startDate);
  });

  if (matches.length === 0) {
    return res.status(404).json({ warning: 'NO_ACTIVE_CONTRACT', message: 'No active contract found for this period' });
  }
  if (matches.length > 1) {
    return res.status(409).json({ warning: 'MULTIPLE_ACTIVE_CONTRACTS', message: 'More than one active contract matches this period', matches });
  }
  res.json(matches[0]);
});

router.post('/', async (req, res) => {
  try {
    const { employeeId, departmentId, jobPosition, scheduleId, startDate, endDate, wage, state } = req.body;
    if (!employeeId || !startDate || wage === undefined) {
      return res.status(400).json({ error: 'employeeId, startDate, and wage are required' });
    }

    const overlap = await findOverlappingActiveContract({
      employeeId: Number(employeeId),
      startDate,
      endDate,
      state: state || 'draft',
    });
    if (overlap) {
      return res.status(409).json({
        error: `This employee already has an active contract (#${overlap.id}) covering an overlapping date range. Only one active contract per employee per period is allowed.`,
      });
    }

    const contract = await prisma.contract.create({
      data: {
        employeeId: Number(employeeId),
        departmentId: departmentId || null,
        jobPosition: jobPosition || null,
        scheduleId: scheduleId || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        wage,
        state: state || 'draft',
      },
      include: CONTRACT_INCLUDE,
    });
    res.status(201).json(contract);
  } catch (err) {
    console.error(err);
    // 23P01 = exclusion_violation — the DB constraint caught something our pre-check missed
    if (err.code === '23P01' || (err.meta && String(err.meta.message || '').includes('exclusion'))) {
      return res.status(409).json({ error: 'Overlapping active contract rejected by the database constraint.' });
    }
    res.status(500).json({ error: 'Could not create contract' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { employeeId, departmentId, jobPosition, scheduleId, startDate, endDate, wage, state } = req.body;

    const overlap = await findOverlappingActiveContract({
      employeeId: Number(employeeId),
      startDate,
      endDate,
      state,
      excludeId: id,
    });
    if (overlap) {
      return res.status(409).json({
        error: `This employee already has an active contract (#${overlap.id}) covering an overlapping date range.`,
      });
    }

    const contract = await prisma.contract.update({
      where: { id },
      data: {
        employeeId: Number(employeeId),
        departmentId: departmentId || null,
        jobPosition: jobPosition || null,
        scheduleId: scheduleId || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        wage,
        state,
      },
      include: CONTRACT_INCLUDE,
    });
    res.json(contract);
  } catch (err) {
    console.error(err);
    if (err.code === '23P01' || (err.meta && String(err.meta.message || '').includes('exclusion'))) {
      return res.status(409).json({ error: 'Overlapping active contract rejected by the database constraint.' });
    }
    res.status(500).json({ error: 'Could not update contract' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.contract.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete contract' });
  }
});

module.exports = router;
