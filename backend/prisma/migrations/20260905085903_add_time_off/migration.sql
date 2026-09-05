-- CreateTable
CREATE TABLE "time_off_types" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'days',
    "requiresAllocation" BOOLEAN NOT NULL DEFAULT true,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "affectsPayroll" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_off_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_off_allocations" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "timeOffTypeId" INTEGER NOT NULL,
    "allocatedAmount" DECIMAL(8,2) NOT NULL,
    "remainingAmount" DECIMAL(8,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "approvedById" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_off_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_off_requests" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "timeOffTypeId" INTEGER NOT NULL,
    "allocationId" INTEGER,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "requestedAmount" DECIMAL(8,2) NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "decidedById" INTEGER,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_off_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "time_off_types_name_key" ON "time_off_types"("name");

-- CreateIndex
CREATE INDEX "time_off_allocations_employeeId_timeOffTypeId_status_idx" ON "time_off_allocations"("employeeId", "timeOffTypeId", "status");

-- CreateIndex
CREATE INDEX "time_off_requests_employeeId_status_idx" ON "time_off_requests"("employeeId", "status");

-- AddForeignKey
ALTER TABLE "time_off_allocations" ADD CONSTRAINT "time_off_allocations_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_off_allocations" ADD CONSTRAINT "time_off_allocations_timeOffTypeId_fkey" FOREIGN KEY ("timeOffTypeId") REFERENCES "time_off_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_off_allocations" ADD CONSTRAINT "time_off_allocations_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_off_requests" ADD CONSTRAINT "time_off_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_off_requests" ADD CONSTRAINT "time_off_requests_timeOffTypeId_fkey" FOREIGN KEY ("timeOffTypeId") REFERENCES "time_off_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_off_requests" ADD CONSTRAINT "time_off_requests_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "time_off_allocations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_off_requests" ADD CONSTRAINT "time_off_requests_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
