// backend/routes/attendance.routes.js
// Phase 2 — Attendance
//
const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');

// Roles allowed to view the global list / make manual corrections.
// Adjust these to match your seeded Role.name values exactly
// (schema shows: Admin, HR Manager, HR Payroll User, HR Payroll Manager, Employee).
const HR_ROLES = ['Admin', 'HR Manager', 'HR Payroll User', 'HR Payroll Manager'];

function computeHours(checkIn, checkOut) {
  const ms = new Date(checkOut) - new Date(checkIn);
  return Math.round((ms / 1000 / 60 / 60) * 100) / 100; // hours, 2dp
}

function toEmployeeId(raw) {
  const id = parseInt(raw, 10);
  return Number.isNaN(id) ? null : id;
}

// POST /attendance/check-in
// Self check-in. Rejects with 409 if an open (no checkOut) record
// already exists for this employee — the "already checked in" guard.
router.post('/check-in', authenticate, async (req, res) => {
  try {
    const employeeId = toEmployeeId(req.user.employeeId || req.body.employeeId);
    if (!employeeId) return res.status(400).json({ error: 'employeeId required' });

    const open = await prisma.attendance.findFirst({
      where: { employeeId, checkOut: null },
      orderBy: { checkIn: 'desc' },
    });
    if (open) {
      const openDay = new Date(open.checkIn); openDay.setHours(0, 0, 0, 0);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (openDay.getTime() === today.getTime()) {
        // Genuinely still checked in from earlier today — block the duplicate.
        return res.status(409).json({ error: 'Already checked in', attendance: open });
      }
      // A record from a previous day was never checked out (missed checkout,
      // crashed tab, etc). Rather than let it keep accumulating hours
      // forever and blocking every future check-in, auto-close it at the
      // end of that day and flag it, then let this check-in proceed.
      const autoCheckout = new Date(open.checkIn);
      autoCheckout.setHours(23, 59, 59, 999);
      await prisma.attendance.update({
        where: { id: open.id },
        data: {
          checkOut: autoCheckout,
          status: 'checked_out',
          workedHours: computeHours(open.checkIn, autoCheckout),
          note: [open.note, 'Auto-closed: missing checkout'].filter(Boolean).join(' | '),
        },
      });
    }

    const attendance = await prisma.attendance.create({
      data: {
        employeeId,
        checkIn: new Date(),
        status: 'checked_in',
        source: 'self',
      },
    });
    res.status(201).json(attendance);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to check in' });
  }
});

// POST /attendance/check-out
// Closes the employee's currently open record and computes workedHours.
router.post('/check-out', authenticate, async (req, res) => {
  try {
    const employeeId = toEmployeeId(req.user.employeeId || req.body.employeeId);
    if (!employeeId) return res.status(400).json({ error: 'employeeId required' });

    const open = await prisma.attendance.findFirst({
      where: { employeeId, checkOut: null },
      orderBy: { checkIn: 'desc' },
    });
    if (!open) {
      return res.status(400).json({ error: 'No active check-in found' });
    }

    const checkOut = new Date();
    const updated = await prisma.attendance.update({
      where: { id: open.id },
      data: {
        checkOut,
        status: 'checked_out',
        workedHours: computeHours(open.checkIn, checkOut),
      },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to check out' });
  }
});

// GET /attendance/me
// Self-service: an employee's own attendance history, optional date range.
router.get('/me', authenticate, async (req, res) => {
  try {
    const employeeId = toEmployeeId(req.user.employeeId);
    if (!employeeId) {
      return res.status(400).json({ error: 'No employee record linked to this user' });
    }
    const { from, to } = req.query;
    const where = { employeeId };
    if (from || to) {
      where.checkIn = {};
      if (from) where.checkIn.gte = new Date(from);
      if (to) where.checkIn.lte = new Date(to);
    }

    const records = await prisma.attendance.findMany({
      where,
      orderBy: { checkIn: 'desc' },
    });
    res.json(records);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// GET /attendance
// Global list, HR Manager+ only. Optional employeeId + date-range filters.
router.get('/', authenticate, requireRole(...HR_ROLES), async (req, res) => {
  try {
    const { employeeId, from, to } = req.query;
    const where = {};
    if (employeeId) where.employeeId = toEmployeeId(employeeId);
    if (from || to) {
      where.checkIn = {};
      if (from) where.checkIn.gte = new Date(from);
      if (to) where.checkIn.lte = new Date(to);
    }

    const records = await prisma.attendance.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true } },
      },
      orderBy: { checkIn: 'desc' },
    });
    res.json(records);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// PATCH /attendance/:id
// Manual correction, HR Manager+ only. Stamps source="manual" + correctedById.
router.patch('/:id', authenticate, requireRole(...HR_ROLES), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { checkIn, checkOut, note } = req.body;

    const existing = await prisma.attendance.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Attendance record not found' });

    const data = { source: 'manual', correctedById: req.user.id };
    if (checkIn) data.checkIn = new Date(checkIn);
    if (checkOut) data.checkOut = new Date(checkOut);
    if (note !== undefined) data.note = note;

    const finalCheckIn = data.checkIn || existing.checkIn;
    const finalCheckOut = data.checkOut !== undefined ? data.checkOut : existing.checkOut;
    if (finalCheckOut) {
      data.workedHours = computeHours(finalCheckIn, finalCheckOut);
      data.status = 'checked_out';
    }

    const updated = await prisma.attendance.update({ where: { id }, data });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update attendance' });
  }
});

module.exports = router;