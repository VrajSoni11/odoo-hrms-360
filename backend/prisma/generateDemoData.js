/**
 * generateDemoData.js
 * -------------------
 * Fills in realistic HISTORY (attendance, time-off, contracts, payroll) for
 * whatever employees / departments / users ALREADY exist in your database,
 * so the dashboards have enough data to produce meaningful charts.
 *
 * This is NOT the seed.js script. It never deletes anything, and it never
 * touches a record that already exists — it only adds what's missing. Safe
 * to run multiple times (it checks before creating, so re-running just fills
 * in any new gaps, e.g. a new month that has rolled around).
 *
 * Usage:
 *   node prisma/generateDemoData.js                # last 6 months (default)
 *   node prisma/generateDemoData.js --months=12     # last 12 months
 *   npm run generate:demo-data -- --months=12
 *
 * What it does, per employee:
 *   1. Attendance   — one record per scheduled workday, with a realistic mix
 *                     of Present / Late / Overtime / Absent, some manual
 *                     corrections, some missing checkouts.
 *   2. Time off     — makes sure Annual/Sick/Casual Leave types + a yearly
 *                     allocation exist, then scatters a handful of approved/
 *                     pending/refused requests across the period.
 *   3. Contracts    — if an employee has ZERO contracts, gives them one
 *                     simple active contract so payroll can run for them.
 *                     Employees who already have contracts are left alone.
 *   4. Payroll      — one payrun per calendar month, computed + paid for
 *                     past months (using the SAME salary engine and
 *                     worked-days logic the app itself uses), with the most
 *                     recent month left as an in-progress "draft" payrun.
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const { computeSalary } = require('../src/lib/salaryEngine');
const { resolveContract, workedDays, eligibleEmployees } = require('../src/lib/payrollHelpers');

// ---------- small utils ----------
const DAY_MS = 24 * 60 * 60 * 1000;
const rand = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rand(arr.length)];
function weighted(pairs) {
  // pairs: [[value, weight], ...]
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [value, w] of pairs) {
    if ((r -= w) <= 0) return value;
  }
  return pairs[pairs.length - 1][0];
}
function ymd(date) {
  return date.toISOString().slice(0, 10);
}
function monthsBack(n) {
  // returns array of {start:Date, end:Date, label} for the last n months,
  // oldest first, in UTC, using the 1st..last-day of each calendar month.
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i -= 1) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
    out.push({ start, end, label: start.toISOString().slice(0, 7) });
  }
  return out;
}
function monthName(date) {
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v === undefined ? true : v];
  })
);
const MONTHS = Math.min(24, Math.max(1, Number(args.months || 6)));

// ---------- schedule helpers ----------
const DEFAULT_WORKDAYS = [0, 1, 2, 3, 4]; // Mon-Fri (0=Mon per schema convention)
const DEFAULT_START = '09:00';
const DEFAULT_END = '18:00';

function scheduleFor(employee) {
  const lines = employee.schedule?.lines || [];
  if (!lines.length) {
    return DEFAULT_WORKDAYS.map((d) => ({ dayOfWeek: d, startTime: DEFAULT_START, endTime: DEFAULT_END }));
  }
  return lines;
}
function isoWeekdayToSchemaDay(jsDay) {
  // JS getUTCDay(): 0=Sun..6=Sat  ->  schema: 0=Mon..6=Sun
  return (jsDay + 6) % 7;
}
function parseHM(str, onDate) {
  const [h, m] = str.split(':').map(Number);
  const d = new Date(onDate);
  d.setUTCHours(h, m, 0, 0);
  return d;
}

async function main() {
  console.log(`\nGenerating ${MONTHS} month(s) of demo history (non-destructive)...\n`);

  const employees = await prisma.employee.findMany({
    include: { schedule: { include: { lines: true } }, contracts: true, department: true },
  });
  if (!employees.length) {
    console.log('No employees found — nothing to do. Add employees first.');
    return;
  }

  const users = await prisma.user.findMany({ include: { role: true } });
  const hrUser =
    users.find((u) => ['Admin', 'HR Manager'].includes(u.role?.name)) || users[0];
  const payrollUser =
    users.find((u) => ['Admin', 'HR Payroll Manager', 'HR Payroll User'].includes(u.role?.name)) || users[0];
  if (!hrUser || !payrollUser) {
    throw new Error('No users found in the database — create at least one login user first.');
  }

  const range = monthsBack(MONTHS);
  const historyStart = range[0].start;
  const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));

  // ---------- 1. Salary structure (only create if none exists at all) ----------
  let structure = await prisma.salaryStructure.findFirst({ where: { isActive: true }, include: { rules: true } });
  if (!structure) {
    console.log('No salary structure found — creating a default "Standard Salary" structure...');
    structure = await prisma.salaryStructure.create({
      data: {
        name: 'Standard Salary',
        rules: {
          create: [
            // BASIC reads BASE_WAGE (= each contract's own wage), so pay
            // naturally varies per employee instead of being one flat number.
            { name: 'Basic Salary', code: 'BASIC', category: 'basic', sequence: 10, computationMethod: 'formula', formula: 'BASE_WAGE' },
            { name: 'House Rent Allowance', code: 'HRA', category: 'allowance', sequence: 20, computationMethod: 'percentage', percentageOf: 'BASIC', percentageRate: 40 },
            { name: 'Gross Salary', code: 'GROSS', category: 'gross', sequence: 30, computationMethod: 'formula', formula: 'BASIC + HRA' },
            { name: 'Provident Fund', code: 'PF', category: 'deduction', sequence: 40, computationMethod: 'percentage', percentageOf: 'BASIC', percentageRate: 12 },
            { name: 'Net Salary', code: 'NET', category: 'net', sequence: 50, computationMethod: 'formula', formula: 'GROSS - PF' },
          ],
        },
      },
      include: { rules: true },
    });
  }

  // ---------- 2. Contracts (only for employees with zero contracts) ----------
  let contractsCreated = 0;
  for (const emp of employees) {
    if (emp.contracts.length > 0) continue;
    const wage = 45000 + rand(12) * 5000; // 45k .. 100k spread
    await prisma.contract.create({
      data: {
        employeeId: emp.id,
        departmentId: emp.departmentId,
        jobPosition: emp.jobPosition || 'Staff',
        scheduleId: emp.scheduleId,
        startDate: historyStart,
        endDate: null,
        wage,
        state: 'active',
        salaryStructureId: structure.id,
      },
    });
    contractsCreated += 1;
  }
  if (contractsCreated) console.log(`Created ${contractsCreated} starter contract(s) for employees that had none.`);

  // ---------- 3. Time-off types + allocations ----------
  const TYPE_DEFAULTS = [
    { name: 'Annual Leave', unit: 'days', allocation: 18, requiresAllocation: true, requiresApproval: true, affectsPayroll: false },
    { name: 'Sick Leave', unit: 'days', allocation: 10, requiresAllocation: true, requiresApproval: true, affectsPayroll: false },
    { name: 'Casual Leave', unit: 'days', allocation: 6, requiresAllocation: true, requiresApproval: true, affectsPayroll: false },
  ];
  const timeOffTypes = [];
  for (const t of TYPE_DEFAULTS) {
    let type = await prisma.timeOffType.findUnique({ where: { name: t.name } });
    if (!type) {
      type = await prisma.timeOffType.create({
        data: { name: t.name, unit: t.unit, requiresAllocation: t.requiresAllocation, requiresApproval: t.requiresApproval, affectsPayroll: t.affectsPayroll },
      });
    }
    timeOffTypes.push({ ...t, record: type });
  }

  let allocationsCreated = 0;
  const allocationByEmpType = new Map(); // key `${empId}-${typeId}` -> allocation row
  for (const emp of employees) {
    for (const t of timeOffTypes) {
      let allocation = await prisma.timeOffAllocation.findFirst({ where: { employeeId: emp.id, timeOffTypeId: t.record.id } });
      if (!allocation) {
        allocation = await prisma.timeOffAllocation.create({
          data: {
            employeeId: emp.id,
            timeOffTypeId: t.record.id,
            allocatedAmount: t.allocation,
            remainingAmount: t.allocation,
            status: 'approved',
            approvedById: hrUser.id,
            approvedAt: new Date(),
          },
        });
        allocationsCreated += 1;
      }
      allocationByEmpType.set(`${emp.id}-${t.record.id}`, allocation);
    }
  }
  if (allocationsCreated) console.log(`Created ${allocationsCreated} leave allocation(s).`);

  // ---------- 4. Attendance ----------
  console.log('Generating attendance history (this can take a moment)...');
  let attendanceCreated = 0;
  const takenLeaveRanges = new Map(); // employeeId -> [{start,end}]

  for (const emp of employees) {
    const firstContractStart = emp.contracts.length
      ? emp.contracts.reduce((min, c) => (c.startDate < min ? c.startDate : min), emp.contracts[0].startDate)
      : historyStart;
    const genStart = firstContractStart > historyStart ? firstContractStart : historyStart;

    const existingDates = new Set(
      (
        await prisma.attendance.findMany({
          where: { employeeId: emp.id, checkIn: { gte: genStart, lt: today } },
          select: { checkIn: true },
        })
      ).map((r) => ymd(r.checkIn))
    );

    const schedule = scheduleFor(emp);
    const scheduleByDay = new Map(schedule.map((l) => [l.dayOfWeek, l]));

    for (let d = new Date(genStart); d < today; d = new Date(d.getTime() + DAY_MS)) {
      const schemaDay = isoWeekdayToSchemaDay(d.getUTCDay());
      const line = scheduleByDay.get(schemaDay);
      if (!line) continue; // not a scheduled workday
      const dateKey = ymd(d);
      if (existingDates.has(dateKey)) continue;

      const status = weighted([
        ['Present', 78],
        ['Late', 9],
        ['Overtime', 7],
        ['Absent', 6],
      ]);

      if (status === 'Absent') {
        await prisma.attendance.create({
          data: {
            employeeId: emp.id,
            checkIn: parseHM(line.startTime, d),
            checkOut: null,
            status: 'Absent',
            source: 'system',
            note: 'Auto-generated: no check-in recorded',
          },
        });
        attendanceCreated += 1;
        continue;
      }

      const lateMinutes = status === 'Late' ? 15 + rand(46) : 0;
      const checkIn = new Date(parseHM(line.startTime, d).getTime() + lateMinutes * 60000);
      const baseEnd = parseHM(line.endTime, d);
      const overtimeMinutes = status === 'Overtime' ? 60 + rand(120) : 0;
      const missingCheckout = Math.random() < 0.03;
      const checkOut = missingCheckout ? null : new Date(baseEnd.getTime() + overtimeMinutes * 60000);
      const workedHours = checkOut ? Math.round(((checkOut - checkIn) / 3600000) * 100) / 100 : null;
      const manual = Math.random() < 0.08;

      await prisma.attendance.create({
        data: {
          employeeId: emp.id,
          checkIn,
          checkOut,
          workedHours,
          status,
          source: manual ? 'manual' : 'self',
          correctedById: manual ? hrUser.id : null,
        },
      });
      attendanceCreated += 1;
    }
  }
  console.log(`Created ${attendanceCreated} attendance record(s).`);

  // ---------- 5. Time-off requests ----------
  console.log('Generating time-off requests...');
  let requestsCreated = 0;
  for (const emp of employees) {
    const existingRequests = await prisma.timeOffRequest.findMany({
      where: { employeeId: emp.id },
      select: { startDate: true, endDate: true },
    });
    if (existingRequests.length >= 2) continue; // already has demo history from a previous run
    const empRanges = existingRequests.map((r) => ({ start: r.startDate, end: r.endDate }));
    const requestCount = 2 + rand(4); // 2-5 requests over the period
    for (let i = 0; i < requestCount; i += 1) {
      const t = pick(timeOffTypes);
      const allocation = allocationByEmpType.get(`${emp.id}-${t.record.id}`);
      const length = t.record.name === 'Annual Leave' ? 2 + rand(4) : 1 + rand(2);
      const offsetDays = rand(MONTHS * 28);
      const start = new Date(historyStart.getTime() + offsetDays * DAY_MS);
      const end = new Date(start.getTime() + (length - 1) * DAY_MS);
      if (end >= today) continue;

      const overlapsExisting = empRanges.some((r) => start <= r.end && r.start <= end);
      if (overlapsExisting) continue;

      const status = weighted([
        ['approved', 70],
        ['pending', 20],
        ['refused', 10],
      ]);

      if (status === 'approved' && Number(allocation.remainingAmount) < length) continue; // don't overdraw

      const request = await prisma.timeOffRequest.create({
        data: {
          employeeId: emp.id,
          timeOffTypeId: t.record.id,
          allocationId: allocation.id,
          startDate: start,
          endDate: end,
          requestedAmount: length,
          reason: pick(['Family commitment', 'Personal time', 'Not feeling well', 'Planned trip', 'Rest day']),
          status,
          decidedById: status === 'pending' ? null : hrUser.id,
          decidedAt: status === 'pending' ? null : end,
        },
      });
      if (status === 'approved') {
        await prisma.timeOffAllocation.update({
          where: { id: allocation.id },
          data: { remainingAmount: { decrement: length } },
        });
        allocation.remainingAmount = Number(allocation.remainingAmount) - length; // keep local copy in sync
      }
      empRanges.push({ start, end });
      requestsCreated += 1;
    }
  }
  console.log(`Created ${requestsCreated} time-off request(s).`);

  // ---------- 6. Payroll ----------
  console.log('Generating payroll history...');
  let payrunsCreated = 0;
  let payslipsCreated = 0;

  for (let i = 0; i < range.length; i += 1) {
    const { start, end, label } = range[i];
    const isCurrentMonth = i === range.length - 1;
    const periodStartStr = ymd(start);
    const periodEndStr = ymd(end);
    const name = `${monthName(start)} Payroll`;

    let payrun = await prisma.payrun.findFirst({ where: { periodStart: start, periodEnd: end } });
    const eligible = await eligibleEmployees(periodStartStr, periodEndStr);
    if (!eligible.length) continue;

    if (!payrun) {
      payrun = await prisma.payrun.create({
        data: {
          name,
          salaryStructureId: structure.id,
          periodStart: start,
          periodEnd: end,
          createdById: payrollUser.id,
          employees: { create: eligible.map((e) => ({ employeeId: e.id })) },
        },
      });
      payrunsCreated += 1;
    } else {
      // make sure every eligible employee is attached (in case new hires appeared)
      const attached = await prisma.payrunEmployee.findMany({ where: { payrunId: payrun.id }, select: { employeeId: true } });
      const attachedIds = new Set(attached.map((a) => a.employeeId));
      const missing = eligible.filter((e) => !attachedIds.has(e.id));
      if (missing.length) {
        await prisma.payrunEmployee.createMany({ data: missing.map((e) => ({ payrunId: payrun.id, employeeId: e.id })) });
      }
    }

    if (isCurrentMonth) {
      // Leave the current, still-running month as a draft — mirrors a real
      // in-progress payroll cycle instead of backdating it as already paid.
      continue;
    }

    for (const emp of eligible) {
      const existingSlip = await prisma.payslip.findUnique({ where: { payrunId_employeeId: { payrunId: payrun.id, employeeId: emp.id } } });
      if (existingSlip) continue;

      const { contract, warning } = await resolveContract(emp.id, periodStartStr, periodEndStr);
      if (warning) {
        await prisma.payrollWarning.create({ data: { payrunId: payrun.id, employeeId: emp.id, ...warning } });
        continue;
      }
      const struct = contract.salaryStructure || structure;
      const calc = computeSalary(struct.rules?.length ? struct.rules : structure.rules, contract.wage);
      const errors = calc.lines.filter((l) => l.error);
      if (errors.length) {
        await prisma.payrollWarning.create({
          data: { payrunId: payrun.id, employeeId: emp.id, type: 'salary_rule_error', severity: 'high', message: errors.map((l) => `${l.code}: ${l.error}`).join('; ') },
        });
        continue;
      }
      const gross = calc.totals.GROSS ?? 0;
      const net = calc.totals.NET ?? gross;
      const days = await workedDays(emp.id, periodStartStr, periodEndStr);
      const lines = calc.lines.map((l) => ({
        salaryRuleId: (struct.rules?.length ? struct.rules : structure.rules).find((r) => r.code === l.code).id,
        ruleName: l.name,
        category: l.category,
        amount: l.amount,
        sequence: l.sequence,
      }));

      await prisma.payslip.create({
        data: {
          payrunId: payrun.id,
          employeeId: emp.id,
          contractId: contract.id,
          periodStart: start,
          periodEnd: end,
          workedDays: days,
          status: 'paid',
          grossAmount: gross,
          netAmount: net,
          approvedById: payrollUser.id,
          lines: { create: lines },
        },
      });
      payslipsCreated += 1;
    }

    await prisma.payrun.update({ where: { id: payrun.id }, data: { status: 'paid' } });
    console.log(`  ${label}: payrun ready (${eligible.length} employee(s))`);
  }

  console.log(`Created ${payrunsCreated} payrun(s) and ${payslipsCreated} payslip(s).`);
  console.log('\nDone. Reload the dashboard — charts should now be populated.\n');
}

main()
  .catch((e) => {
    console.error('\nGenerator failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
