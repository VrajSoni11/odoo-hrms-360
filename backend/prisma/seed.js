/**
 * PeoplePay360 - Phase 0 Seed Script
 *
 * This is a STARTING dataset only, so the app isn't empty on first login
 * and every role can sign in immediately. Everything it creates could
 * equally have been created by hand through the webapp - nothing here
 * is a substitute for the CRUD screens.
 *
 * Run with: npm run seed
 * Safe to re-run: it clears Phase 0 tables first (dev/demo use only -
 * do NOT run this against a real production database).
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Password@123'; // same password for every seeded login, for demo convenience

async function main() {
  console.log('Seeding PeoplePay360 Phase 0 data...');

  // Clean slate (order matters due to FKs)
  await prisma.user.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.department.deleteMany();
  await prisma.role.deleteMany();

  // 1. Roles
  const roleNames = ['Employee', 'HR Manager', 'HR Payroll User', 'HR Payroll Manager', 'Admin'];
  const roles = {};
  for (const name of roleNames) {
    roles[name] = await prisma.role.create({ data: { name } });
  }
  console.log(`Created ${roleNames.length} roles`);

  // 2. Departments
  const engineering = await prisma.department.create({ data: { name: 'Engineering' } });
  const hr = await prisma.department.create({ data: { name: 'Human Resources' } });
  const sales = await prisma.department.create({ data: { name: 'Sales' } });
  console.log('Created 3 departments');

  // 3. Employees (8 total) - includes a manager chain
  const priya = await prisma.employee.create({
    data: {
      name: 'Priya Sharma',
      workEmail: 'priya.sharma@peoplepay360.com',
      phone: '+91-9876500001',
      departmentId: engineering.id,
      jobPosition: 'Engineering Manager',
      status: 'active',
      employeeType: 'full_time',
    },
  });

  const arjun = await prisma.employee.create({
    data: {
      name: 'Arjun Mehta',
      workEmail: 'arjun.mehta@peoplepay360.com',
      phone: '+91-9876500002',
      departmentId: engineering.id,
      managerId: priya.id,
      jobPosition: 'Payroll Specialist',
      status: 'active',
      employeeType: 'full_time',
    },
  });

  const ananya = await prisma.employee.create({
    data: {
      name: 'Ananya Rao',
      workEmail: 'ananya.rao@peoplepay360.com',
      phone: '+91-9876500003',
      departmentId: hr.id,
      jobPosition: 'HR Manager',
      status: 'active',
      employeeType: 'full_time',
    },
  });

  const rohan = await prisma.employee.create({
    data: {
      name: 'Rohan Iyer',
      workEmail: 'rohan.iyer@peoplepay360.com',
      phone: '+91-9876500004',
      departmentId: hr.id,
      managerId: ananya.id,
      jobPosition: 'HR Payroll Admin',
      status: 'active',
      employeeType: 'full_time',
    },
  });

  const kabir = await prisma.employee.create({
    data: {
      name: 'Kabir Nair',
      workEmail: 'kabir.nair@peoplepay360.com',
      phone: '+91-9876500005',
      departmentId: sales.id,
      jobPosition: 'Sales Executive',
      status: 'active',
      employeeType: 'full_time',
    },
  });

  const meera = await prisma.employee.create({
    data: {
      name: 'Meera Patel',
      workEmail: 'meera.patel@peoplepay360.com',
      phone: '+91-9876500006',
      departmentId: engineering.id,
      managerId: priya.id,
      jobPosition: 'Software Engineer',
      status: 'active',
      employeeType: 'full_time',
    },
  });

  const aditya = await prisma.employee.create({
    data: {
      name: 'Aditya Kapoor',
      workEmail: 'aditya.kapoor@peoplepay360.com',
      phone: '+91-9876500007',
      departmentId: sales.id,
      jobPosition: 'Sales Intern',
      status: 'active',
      employeeType: 'contract',
    },
  });

  const zara = await prisma.employee.create({
    data: {
      name: 'Zara Khan',
      workEmail: 'zara.khan@peoplepay360.com',
      phone: '+91-9876500008',
      departmentId: hr.id,
      jobPosition: 'System Administrator',
      status: 'active',
      employeeType: 'full_time',
    },
  });

  console.log('Created 8 employees');

  // 4. Users - one per role, linked to an employee, all sharing DEMO_PASSWORD
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const seededUsers = [
    { email: 'meera.patel@peoplepay360.com', role: 'Employee', employeeId: meera.id },
    { email: 'ananya.rao@peoplepay360.com', role: 'HR Manager', employeeId: ananya.id },
    { email: 'arjun.mehta@peoplepay360.com', role: 'HR Payroll User', employeeId: arjun.id },
    { email: 'rohan.iyer@peoplepay360.com', role: 'HR Payroll Manager', employeeId: rohan.id },
    { email: 'zara.khan@peoplepay360.com', role: 'Admin', employeeId: zara.id },
  ];

  for (const u of seededUsers) {
    await prisma.user.create({
      data: {
        email: u.email,
        passwordHash,
        roleId: roles[u.role].id,
        employeeId: u.employeeId,
      },
    });
  }

  console.log(`Created ${seededUsers.length} login users (all use password: ${DEMO_PASSWORD})`);
  console.log('');
  console.log('=== Seeded login credentials ===');
  seededUsers.forEach((u) => console.log(`  ${u.role.padEnd(20)} -> ${u.email}`));
  console.log(`  Password for all      -> ${DEMO_PASSWORD}`);
  console.log('=================================');
  console.log('');
  console.log('Seed complete. Kabir Nair and Aditya Kapoor were seeded as employees WITHOUT a login,');
  console.log('to demonstrate that employees can exist before any user account is created for them.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
