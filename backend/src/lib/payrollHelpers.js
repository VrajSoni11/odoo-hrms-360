const prisma = require('./prisma');

function overlaps(start, end, otherStart, otherEnd) {
  return new Date(start) <= new Date(otherEnd) && new Date(otherStart) <= new Date(end);
}

async function resolveContract(employeeId, periodStart, periodEnd) {
  const contracts = await prisma.contract.findMany({
    where: { employeeId, state: 'active', startDate: { lte: new Date(periodEnd) }, OR: [{ endDate: null }, { endDate: { gte: new Date(periodStart) } }] },
    include: { salaryStructure: { include: { rules: true } } },
  });
  if (!contracts.length) return { contract: null, warning: { type: 'no_active_contract', severity: 'high', message: `No active contract found for employee ${employeeId} in the selected period` } };
  if (contracts.length > 1) return { contract: null, warning: { type: 'multiple_active_contracts', severity: 'high', message: `Multiple active contracts found for employee ${employeeId} in the selected period` } };
  return { contract: contracts[0], warning: null };
}

async function approvedLeaveDays(employeeId, periodStart, periodEnd) {
  const requests = await prisma.timeOffRequest.findMany({ where: { employeeId, status: 'approved', startDate: { lte: new Date(periodEnd) }, endDate: { gte: new Date(periodStart) } } });
  let days = 0;
  for (const request of requests) {
    const start = new Date(request.startDate) > new Date(periodStart) ? request.startDate : periodStart;
    const end = new Date(request.endDate) < new Date(periodEnd) ? request.endDate : periodEnd;
    days += Math.floor((new Date(`${new Date(end).toISOString().slice(0, 10)}T00:00:00Z`) - new Date(`${new Date(start).toISOString().slice(0, 10)}T00:00:00Z`)) / 86400000) + 1;
  }
  return days;
}

async function workedDays(employeeId, periodStart, periodEnd) {
  const attendance = await prisma.attendance.findMany({ where: { employeeId, checkIn: { gte: new Date(`${periodStart}T00:00:00Z`), lte: new Date(`${periodEnd}T23:59:59Z`) } }, select: { checkIn: true } });
  const dates = new Set(attendance.map((row) => row.checkIn.toISOString().slice(0, 10)));
  if (dates.size) return dates.size;
  const employee = await prisma.employee.findUnique({ where: { id: employeeId }, include: { schedule: { include: { lines: true } } } });
  const activeDays = new Set((employee?.schedule?.lines || []).map((line) => line.dayOfWeek));
  let expected = 0;
  for (let date = new Date(`${periodStart}T00:00:00Z`); date <= new Date(`${periodEnd}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + 1)) {
    const mondayIndex = (date.getUTCDay() + 6) % 7;
    if (activeDays.has(mondayIndex)) expected += 1;
  }
  return Math.max(0, expected - await approvedLeaveDays(employeeId, periodStart, periodEnd));
}

async function eligibleEmployees(periodStart, periodEnd) {
  const employees = await prisma.employee.findMany({ include: { contracts: { where: { state: 'active', startDate: { lte: new Date(periodEnd) }, OR: [{ endDate: null }, { endDate: { gte: new Date(periodStart) } }] } }, department: true } });
  return employees.filter((employee) => employee.contracts.length > 0);
}

module.exports = { overlaps, resolveContract, approvedLeaveDays, workedDays, eligibleEmployees };
