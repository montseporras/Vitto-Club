-- CreateEnum
CREATE TYPE "RolEmpleado" AS ENUM ('ADMINISTRADOR', 'CAJERO');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('DNI', 'PASAPORTE');

-- CreateTable
CREATE TABLE "empleados" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "apellido" VARCHAR(80) NOT NULL,
    "telefono" VARCHAR(30) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "rol" "RolEmpleado" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_baja" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empleados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "apellido" VARCHAR(80) NOT NULL,
    "tipo_documento" "TipoDocumento" NOT NULL,
    "numero_documento" VARCHAR(20) NOT NULL,
    "telefono" VARCHAR(30) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "fecha_nacimiento" DATE,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_baja" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "empleados_activo_idx" ON "empleados"("activo");

-- CreateIndex
CREATE INDEX "clientes_apellido_nombre_idx" ON "clientes"("apellido", "nombre");

-- CreateIndex
CREATE INDEX "clientes_activo_idx" ON "clientes"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_tipo_documento_numero_documento_key" ON "clientes"("tipo_documento", "numero_documento");
