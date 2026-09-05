require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth.routes');
const employeesRoutes = require('./routes/employees.routes');
const departmentsRoutes = require('./routes/departments.routes');
const usersRoutes = require('./routes/users.routes');
const schedulesRoutes = require('./routes/schedules.routes');
const contractsRoutes = require('./routes/contracts.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const timeOffTypesRoutes = require('./routes/timeOffTypes.routes');
const timeOffAllocationsRoutes = require('./routes/timeOffAllocations.routes');
const timeOffRequestsRoutes = require('./routes/timeOffRequests.routes');
const salaryStructuresRoutes = require('./routes/salaryStructures.routes');
const salaryRulesRoutes = require('./routes/salaryRules.routes');
const payrunsRoutes = require('./routes/payruns.routes');
const payslipsRoutes = require('./routes/payslips.routes');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',');
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'peoplepay360-backend' }));

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/schedules', schedulesRoutes);
app.use('/api/contracts', contractsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/time-off-types', timeOffTypesRoutes);
app.use('/api/time-off-allocations', timeOffAllocationsRoutes);
app.use('/api/time-off-requests', timeOffRequestsRoutes);
app.use('/api/salary-structures', salaryStructuresRoutes);
app.use('/api/salary-rules', salaryRulesRoutes);
app.use('/api/payruns', payrunsRoutes);
app.use('/api/payslips', payslipsRoutes);

// Central error handler (catches anything thrown outside try/catch blocks)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`PeoplePay360 backend listening on http://localhost:${PORT}`);
});
