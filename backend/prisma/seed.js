/**
 * Standalone seed script — run with `npm run seed`.
 * Safe to re-run: wipes and recreates seed data each time (dev/demo only,
 * never do this against a real production DB).
 *
 * Creates:
 *  - 5 roles
 *  - 3 departments
 *  - 8 employees (with a manager chain)
 *  - 5 login users (one per role, password "Password@123")
 *  - 2 working schedules (Full-Time 40h, Part-Time 20h)
 *  - contracts for the seeded employees, including ONE deliberate overlap
 *    attempt that is caught and reported (not inserted) to prove the
 *    constraint works out of the box
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'Password@123';

const ROLE_NAMES = ['Admin', 'HR Manager', 'HR Payroll User', 'HR Payroll Manager', 'Employee'];

async function main() {
  console.log('Wiping existing seed-relevant data...');
  await prisma.timeOffRequest.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.payrollWarning.deleteMany();
  await prisma.payslipLine.deleteMany();
  await prisma.payslip.deleteMany();
  await prisma.payrunEmployee.deleteMany();
  await prisma.payrun.deleteMany();
  await prisma.timeOffAllocation.deleteMany();
  await prisma.timeOffType.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.salaryRule.deleteMany();
  await prisma.salaryStructure.deleteMany();
  await prisma.scheduleLine.deleteMany();
  await prisma.workingSchedule.deleteMany();
  await prisma.user.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.department.deleteMany();
  await prisma.role.deleteMany();

  console.log('Creating roles...');
  const roles = {};
  for (const name of ROLE_NAMES) {
    roles[name] = await prisma.role.create({ data: { name } });
  }

  console.log('Creating departments...');
  const engineering = await prisma.department.create({ data: { name: 'Engineering' } });
  const hr = await prisma.department.create({ data: { name: 'Human Resources' } });
  const sales = await prisma.department.create({ data: { name: 'Sales' } });

  console.log('Creating working schedules...');
  const fullTimeSchedule = await prisma.workingSchedule.create({
    data: {
      name: 'Standard Full-Time (Mon-Fri, 9-5)',
      type: 'full_time',
      totalWeeklyHours: 40,
      lines: {
        create: [0, 1, 2, 3, 4].map((day) => ({
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '18:00',
          breakMinutes: 60,
        })),
      },
    },
  });

  const partTimeSchedule = await prisma.workingSchedule.create({
    data: {
      name: 'Part-Time (Mon-Fri, half day)',
      type: 'part_time',
      totalWeeklyHours: 20,
      lines: {
        create: [0, 1, 2, 3, 4].map((day) => ({
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '13:00',
          breakMinutes: 0,
        })),
      },
    },
  });

  console.log('Creating employees...');
  const priya = await prisma.employee.create({
    data: {
      name: 'Priya Sharma',
      workEmail: 'priya.sharma@peoplepay360.demo',
      departmentId: engineering.id,
      jobPosition: 'Engineering Director',
      employeeType: 'full_time',
      scheduleId: fullTimeSchedule.id,
    },
  });

  const arjun = await prisma.employee.create({
    data: {
      name: 'Arjun Mehta',
      workEmail: 'arjun.mehta@peoplepay360.demo',
      departmentId: engineering.id,
      managerId: priya.id,
      jobPosition: 'Senior Backend Engineer',
      employeeType: 'full_time',
      scheduleId: fullTimeSchedule.id,
    },
  });

  const sneha = await prisma.employee.create({
    data: {
      name: 'Sneha Iyer',
      workEmail: 'sneha.iyer@peoplepay360.demo',
      departmentId: engineering.id,
      managerId: priya.id,
      jobPosition: 'Frontend Engineer',
      employeeType: 'full_time',
      scheduleId: fullTimeSchedule.id,
    },
  });

  const rahul = await prisma.employee.create({
    data: {
      name: 'Rahul Verma',
      workEmail: 'rahul.verma@peoplepay360.demo',
      departmentId: hr.id,
      jobPosition: 'HR Manager',
      employeeType: 'full_time',
      scheduleId: fullTimeSchedule.id,
    },
  });

  const ananya = await prisma.employee.create({
    data: {
      name: 'Ananya Gupta',
      workEmail: 'ananya.gupta@peoplepay360.demo',
      departmentId: hr.id,
      managerId: rahul.id,
      jobPosition: 'Payroll Specialist',
      employeeType: 'full_time',
      scheduleId: fullTimeSchedule.id,
    },
  });

  const vikram = await prisma.employee.create({
    data: {
      name: 'Vikram Nair',
      workEmail: 'vikram.nair@peoplepay360.demo',
      departmentId: sales.id,
      jobPosition: 'Sales Manager',
      employeeType: 'full_time',
      scheduleId: fullTimeSchedule.id,
    },
  });

  const divya = await prisma.employee.create({
    data: {
      name: 'Divya Reddy',
      workEmail: 'divya.reddy@peoplepay360.demo',
      departmentId: sales.id,
      managerId: vikram.id,
      jobPosition: 'Sales Executive',
      employeeType: 'part_time',
      scheduleId: partTimeSchedule.id,
    },
  });

  const karan = await prisma.employee.create({
    data: {
      name: 'Karan Kapoor',
      workEmail: 'karan.kapoor@peoplepay360.demo',
      departmentId: engineering.id,
      managerId: priya.id,
      jobPosition: 'QA Engineer',
      employeeType: 'full_time',
      scheduleId: fullTimeSchedule.id,
    },
  });

  console.log('Creating login users (one per role, password: ' + DEMO_PASSWORD + ')...');
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const seededUsers = [
    { email: 'admin@peoplepay360.demo', role: 'Admin', employeeId: priya.id },
    { email: 'hrmanager@peoplepay360.demo', role: 'HR Manager', employeeId: rahul.id },
    { email: 'payrolluser@peoplepay360.demo', role: 'HR Payroll User', employeeId: ananya.id },
    { email: 'payrollmanager@peoplepay360.demo', role: 'HR Payroll Manager', employeeId: vikram.id },
    { email: 'employee@peoplepay360.demo', role: 'Employee', employeeId: sneha.id },
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

  console.log('Creating time-off seed data...');
  const annualLeave = await prisma.timeOffType.create({
    data: {
      name: 'Annual Leave',
      unit: 'days',
      requiresAllocation: true,
      requiresApproval: true,
      affectsPayroll: false,
    },
  });
  await prisma.timeOffAllocation.create({
    data: {
      employeeId: sneha.id,
      timeOffTypeId: annualLeave.id,
      allocatedAmount: 20,
      remainingAmount: 20,
      status: 'approved',
    },
  });

  console.log('Creating salary structure and rules...');
  const regularSalary = await prisma.salaryStructure.create({ data: { name: 'Regular Salary' } });
  await prisma.salaryRule.createMany({ data: [
    { structureId: regularSalary.id, name: 'Basic Salary', code: 'BASIC', category: 'basic', sequence: 10, computationMethod: 'fixed', amount: 100000 },
    { structureId: regularSalary.id, name: 'House Rent Allowance', code: 'HRA', category: 'allowance', sequence: 20, computationMethod: 'percentage', percentageOf: 'BASIC', percentageRate: 40 },
    { structureId: regularSalary.id, name: 'Gross Salary', code: 'GROSS', category: 'gross', sequence: 30, computationMethod: 'formula', formula: 'BASIC + HRA' },
    { structureId: regularSalary.id, name: 'Provident Fund', code: 'PF', category: 'deduction', sequence: 40, computationMethod: 'percentage', percentageOf: 'BASIC', percentageRate: 12 },
    { structureId: regularSalary.id, name: 'Net Salary', code: 'NET', category: 'net', sequence: 50, computationMethod: 'formula', formula: 'GROSS - PF' },
  ] });

  console.log('Creating contracts...');
  // Priya: a closed historical contract, then a current active one
  await prisma.contract.create({
    data: {
      employeeId: priya.id,
      departmentId: engineering.id,
      jobPosition: 'Engineering Manager',
      scheduleId: fullTimeSchedule.id,
      startDate: new Date('2023-01-01'),
      endDate: new Date('2023-12-31'),
      wage: 140000,
      state: 'expired',
      salaryStructureId: regularSalary.id,
    },
  });
  await prisma.contract.create({
    data: {
      employeeId: priya.id,
      departmentId: engineering.id,
      jobPosition: 'Engineering Director',
      scheduleId: fullTimeSchedule.id,
      startDate: new Date('2024-01-01'),
      endDate: null,
      wage: 180000,
      state: 'active',
      salaryStructureId: regularSalary.id,
    },
  });

  // Arjun, Sneha, Rahul, Ananya, Vikram, Karan: single ongoing active contracts
  const simpleContracts = [
    { emp: arjun, position: 'Senior Backend Engineer', wage: 120000 },
    { emp: sneha, position: 'Frontend Engineer', wage: 105000 },
    { emp: rahul, position: 'HR Manager', wage: 95000 },
    { emp: ananya, position: 'Payroll Specialist', wage: 78000 },
    { emp: vikram, position: 'Sales Manager', wage: 110000 },
    { emp: karan, position: 'QA Engineer', wage: 82000 },
  ];
  for (const c of simpleContracts) {
    await prisma.contract.create({
      data: {
        employeeId: c.emp.id,
        departmentId: c.emp.departmentId,
        jobPosition: c.position,
        scheduleId: fullTimeSchedule.id,
        startDate: new Date('2024-06-01'),
        endDate: null,
        wage: c.wage,
        state: 'active',
      },
    });
  }

  // Divya: part-time active contract
  await prisma.contract.create({
    data: {
      employeeId: divya.id,
      departmentId: sales.id,
      jobPosition: 'Sales Executive',
      scheduleId: partTimeSchedule.id,
      startDate: new Date('2024-03-01'),
      endDate: null,
      wage: 45000,
      state: 'active',
    },
  });

  console.log('\nDemonstrating the overlap constraint (this INSERT should be rejected)...');
  try {
    await prisma.contract.create({
      data: {
        employeeId: arjun.id, // Arjun already has an open-ended active contract from 2024-06-01
        departmentId: engineering.id,
        jobPosition: 'Staff Engineer (duplicate attempt)',
        scheduleId: fullTimeSchedule.id,
        startDate: new Date('2025-01-01'),
        endDate: null,
        wage: 150000,
        state: 'active',
      },
    });
    console.log('   -> WARNING: overlap was NOT rejected. Did you run `npm run db:constraint`?');
  } catch (err) {
    console.log('   -> Correctly rejected by the DB constraint:', err.message.split('\n')[0]);
  }

  console.log('Creating payroll demo runs...');
  const paidPayrun = await prisma.payrun.create({
    data: {
      name: 'January 2025 Payroll',
      salaryStructureId: regularSalary.id,
      periodStart: new Date('2025-01-01'),
      periodEnd: new Date('2025-01-31'),
      status: 'paid',
      createdById: (await prisma.user.findUnique({ where: { email: 'admin@peoplepay360.demo' } })).id,
      employees: { create: [{ employeeId: priya.id }, { employeeId: arjun.id }] },
    },
  });
  const seededRules = await prisma.salaryRule.findMany({ where: { structureId: regularSalary.id }, orderBy: { sequence: 'asc' } });
  const paidEmployees = [{ employee: priya, contract: await prisma.contract.findFirst({ where: { employeeId: priya.id, state: 'active' } }) }, { employee: arjun, contract: await prisma.contract.findFirst({ where: { employeeId: arjun.id, state: 'active' } }) }];
  for (const item of paidEmployees) {
    const result = require('../src/lib/salaryEngine').computeSalary(seededRules, item.contract.wage);
    await prisma.payslip.create({ data: { payrunId: paidPayrun.id, employeeId: item.employee.id, contractId: item.contract.id, periodStart: paidPayrun.periodStart, periodEnd: paidPayrun.periodEnd, workedDays: 23, status: 'paid', grossAmount: result.totals.GROSS, netAmount: result.totals.NET, lines: { create: result.lines.map((line) => ({ salaryRuleId: seededRules.find((rule) => rule.code === line.code).id, ruleName: line.name, category: line.category, amount: line.amount, sequence: line.sequence })) } } });
  }
  const warningPayrun = await prisma.payrun.create({ data: { name: 'Draft Payroll With Warning', salaryStructureId: regularSalary.id, periodStart: new Date('2023-01-01'), periodEnd: new Date('2023-01-31'), createdById: (await prisma.user.findUnique({ where: { email: 'admin@peoplepay360.demo' } })).id, employees: { create: [{ employeeId: karan.id }] }, warnings: { create: { employeeId: karan.id, type: 'no_active_contract', severity: 'high', message: 'No active contract found for Karan Kapoor in the selected period' } } } });
  console.log(`   -> Created paid payrun #${paidPayrun.id} and draft warning payrun #${warningPayrun.id}`);

  console.log('\nSeed complete.');
  console.log('Login with any of these (password: ' + DEMO_PASSWORD + '):');
  seededUsers.forEach((u) => console.log(`   ${u.role.padEnd(20)} ${u.email}`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
