-- CreateTable
CREATE TABLE "email_delivery_logs" (
    "id" SERIAL NOT NULL,
    "payslipId" INTEGER NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "payrunId" INTEGER NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "previewUrl" TEXT,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_delivery_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_delivery_logs_payrunId_status_idx" ON "email_delivery_logs"("payrunId", "status");

-- CreateIndex
CREATE INDEX "email_delivery_logs_payslipId_idx" ON "email_delivery_logs"("payslipId");

-- AddForeignKey
ALTER TABLE "email_delivery_logs" ADD CONSTRAINT "email_delivery_logs_payslipId_fkey" FOREIGN KEY ("payslipId") REFERENCES "payslips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_delivery_logs" ADD CONSTRAINT "email_delivery_logs_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_delivery_logs" ADD CONSTRAINT "email_delivery_logs_payrunId_fkey" FOREIGN KEY ("payrunId") REFERENCES "payruns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
