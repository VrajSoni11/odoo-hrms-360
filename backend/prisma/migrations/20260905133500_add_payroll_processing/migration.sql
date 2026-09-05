-- CreateTable
CREATE TABLE "payruns" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "salaryStructureId" INTEGER NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payruns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payrun_employees" (
    "payrunId" INTEGER NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "included" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "payrun_employees_pkey" PRIMARY KEY ("payrunId","employeeId")
);

-- CreateTable
CREATE TABLE "payslips" (
    "id" SERIAL NOT NULL,
    "payrunId" INTEGER NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "contractId" INTEGER NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "workedDays" DECIMAL(8,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "grossAmount" DECIMAL(12,2) NOT NULL,
    "netAmount" DECIMAL(12,2) NOT NULL,
    "pdfUrl" TEXT,
    "approvedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payslips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payslip_lines" (
    "id" SERIAL NOT NULL,
    "payslipId" INTEGER NOT NULL,
    "salaryRuleId" INTEGER NOT NULL,
    "ruleName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "sequence" INTEGER NOT NULL,

    CONSTRAINT "payslip_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_warnings" (
    "id" SERIAL NOT NULL,
    "payrunId" INTEGER NOT NULL,
    "employeeId" INTEGER,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'high',
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_warnings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payslips_employeeId_periodStart_periodEnd_idx" ON "payslips"("employeeId", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "payslips_payrunId_employeeId_key" ON "payslips"("payrunId", "employeeId");

-- CreateIndex
CREATE INDEX "payslip_lines_payslipId_sequence_idx" ON "payslip_lines"("payslipId", "sequence");

-- CreateIndex
CREATE INDEX "payroll_warnings_payrunId_resolved_severity_idx" ON "payroll_warnings"("payrunId", "resolved", "severity");

-- AddForeignKey
ALTER TABLE "payruns" ADD CONSTRAINT "payruns_salaryStructureId_fkey" FOREIGN KEY ("salaryStructureId") REFERENCES "salary_structures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payruns" ADD CONSTRAINT "payruns_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payrun_employees" ADD CONSTRAINT "payrun_employees_payrunId_fkey" FOREIGN KEY ("payrunId") REFERENCES "payruns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payrun_employees" ADD CONSTRAINT "payrun_employees_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_payrunId_fkey" FOREIGN KEY ("payrunId") REFERENCES "payruns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslip_lines" ADD CONSTRAINT "payslip_lines_payslipId_fkey" FOREIGN KEY ("payslipId") REFERENCES "payslips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslip_lines" ADD CONSTRAINT "payslip_lines_salaryRuleId_fkey" FOREIGN KEY ("salaryRuleId") REFERENCES "salary_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_warnings" ADD CONSTRAINT "payroll_warnings_payrunId_fkey" FOREIGN KEY ("payrunId") REFERENCES "payruns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_warnings" ADD CONSTRAINT "payroll_warnings_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
