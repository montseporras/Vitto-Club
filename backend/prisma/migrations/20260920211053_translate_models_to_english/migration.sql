/*
  Warnings:

  - You are about to drop the `clientes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `empleados` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "EmployeeRole" AS ENUM ('ADMIN', 'CASHIER');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('DNI', 'PASSPORT');

-- DropTable
DROP TABLE "clientes";

-- DropTable
DROP TABLE "empleados";

-- DropEnum
DROP TYPE "RolEmpleado";

-- DropEnum
DROP TYPE "TipoDocumento";

-- CreateTable
CREATE TABLE "employees" (
    "id" SERIAL NOT NULL,
    "first_name" VARCHAR(80) NOT NULL,
    "last_name" VARCHAR(80) NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "role" "EmployeeRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deactivated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "first_name" VARCHAR(80) NOT NULL,
    "last_name" VARCHAR(80) NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "document_number" VARCHAR(20) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(30),
    "date_of_birth" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deactivated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employees_is_active_idx" ON "employees"("is_active");

-- CreateIndex
CREATE INDEX "customers_last_name_first_name_idx" ON "customers"("last_name", "first_name");

-- CreateIndex
CREATE INDEX "customers_is_active_idx" ON "customers"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "customers_document_type_document_number_key" ON "customers"("document_type", "document_number");
