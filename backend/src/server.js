require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const departmentRoutes = require('./routes/departments.routes');
const employeeRoutes = require('./routes/employees.routes');
const userRoutes = require('./routes/users.routes');
const unlinkedEmployeesRoutes = require('./routes/employees.unlinked.routes');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'peoplepay360-backend', phase: 0 });
});

app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/employees-unlinked', unlinkedEmployeesRoutes); // before /api/employees to avoid path clash
app.use('/api/employees', employeeRoutes);
app.use('/api/users', userRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`PeoplePay360 backend (Phase 0) running on http://localhost:${PORT}`);
});
