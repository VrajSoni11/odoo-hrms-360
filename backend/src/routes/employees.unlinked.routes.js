// Small helper route mounted separately to keep employees.routes.js focused.
// GET /api/employees-unlinked - employees who don't yet have a user account,
// used to populate the "Employee" dropdown in the Create User panel.
const express = require('express');
const prisma = require('../utils/prisma');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, requireRole(['Admin']), async (req, res) => {
  const employees = await prisma.employee.findMany({
    where: { user: null },
    select: { id: true, name: true, workEmail: true, jobPosition: true },
    orderBy: { name: 'asc' },
  });
  res.json(employees);
});

module.exports = router;
