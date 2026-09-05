const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
const MANAGE_ROLES = ['Admin', 'HR Manager', 'HR Payroll User', 'HR Payroll Manager'];

router.use(authenticate);

/**
 * Computes total weekly hours from a list of schedule lines.
 * Each line: { dayOfWeek, startTime: "HH:mm", endTime: "HH:mm", breakMinutes }
 * Never trust a client-supplied total — always recompute server-side.
 */
function computeWeeklyHours(lines) {
  let totalMinutes = 0;
  for (const line of lines) {
    const [sh, sm] = line.startTime.split(':').map(Number);
    const [eh, em] = line.endTime.split(':').map(Number);
    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;
    const worked = Math.max(0, endMinutes - startMinutes - (line.breakMinutes || 0));
    totalMinutes += worked;
  }
  return Math.round((totalMinutes / 60) * 100) / 100; // 2 decimal places
}

// GET /api/schedules — anyone logged in (needed for contract/employee dropdowns)
router.get('/', async (req, res) => {
  const schedules = await prisma.workingSchedule.findMany({
    include: { lines: true, _count: { select: { employees: true, contracts: true } } },
    orderBy: { name: 'asc' },
  });
  res.json(schedules);
});

router.get('/:id', async (req, res) => {
  const schedule = await prisma.workingSchedule.findUnique({
    where: { id: Number(req.params.id) },
    include: { lines: { orderBy: { dayOfWeek: 'asc' } } },
  });
  if (!schedule) return res.status(404).json({ error: 'Schedule not found' });
  res.json(schedule);
});

// POST /api/schedules  { name, type, lines: [{dayOfWeek,startTime,endTime,breakMinutes}] }
router.post('/', requireRole(...MANAGE_ROLES), async (req, res) => {
  try {
    const { name, type, lines } = req.body;
    if (!name || !Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: 'name and at least one schedule line are required' });
    }

    const totalWeeklyHours = computeWeeklyHours(lines);

    const schedule = await prisma.workingSchedule.create({
      data: {
        name,
        type: type || 'full_time',
        totalWeeklyHours,
        lines: {
          create: lines.map((l) => ({
            dayOfWeek: l.dayOfWeek,
            startTime: l.startTime,
            endTime: l.endTime,
            breakMinutes: l.breakMinutes || 0,
          })),
        },
      },
      include: { lines: true },
    });

    res.status(201).json(schedule);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create schedule' });
  }
});

// PUT /api/schedules/:id — replaces lines wholesale and recomputes total hours
router.put('/:id', requireRole(...MANAGE_ROLES), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, type, lines } = req.body;

    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: 'At least one schedule line is required' });
    }

    const totalWeeklyHours = computeWeeklyHours(lines);

    const schedule = await prisma.$transaction(async (tx) => {
      await tx.scheduleLine.deleteMany({ where: { scheduleId: id } });
      return tx.workingSchedule.update({
        where: { id },
        data: {
          name,
          type,
          totalWeeklyHours,
          lines: {
            create: lines.map((l) => ({
              dayOfWeek: l.dayOfWeek,
              startTime: l.startTime,
              endTime: l.endTime,
              breakMinutes: l.breakMinutes || 0,
            })),
          },
        },
        include: { lines: true },
      });
    });

    res.json(schedule);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update schedule' });
  }
});

router.delete('/:id', requireRole(...MANAGE_ROLES), async (req, res) => {
  try {
    await prisma.workingSchedule.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete schedule — it may still be assigned to employees or contracts' });
  }
});

module.exports = router;
