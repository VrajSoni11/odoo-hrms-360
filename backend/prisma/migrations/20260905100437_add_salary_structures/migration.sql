-- CreateTable
CREATE TABLE "salary_structures" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_structures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_rules" (
    "id" SERIAL NOT NULL,
    "structureId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 10,
    "computationMethod" TEXT NOT NULL,
    "amount" DECIMAL(12,2),
    "percentageOf" TEXT,
    "percentageRate" DECIMAL(7,4),
    "formula" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "salary_structures_name_key" ON "salary_structures"("name");

-- CreateIndex
CREATE INDEX "salary_rules_structureId_sequence_idx" ON "salary_rules"("structureId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "salary_rules_structureId_code_key" ON "salary_rules"("structureId", "code");

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_salaryStructureId_fkey" FOREIGN KEY ("salaryStructureId") REFERENCES "salary_structures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_rules" ADD CONSTRAINT "salary_rules_structureId_fkey" FOREIGN KEY ("structureId") REFERENCES "salary_structures"("id") ON DELETE CASCADE ON UPDATE CASCADE;
