-- Documento y email pasan a ser únicos solo entre clientes ACTIVOS: un cliente dado de baja
-- libera los dos, y la misma persona puede volver a inscribirse como un cliente nuevo.

-- Antes del índice de email: si ya hay clientes activos con el mismo email, la migración se
-- corta con un mensaje claro en vez de borrar o modificar datos. Hay que resolverlos a mano
-- (dar de baja o corregir el email de los repetidos) y volver a correrla.
DO $$
DECLARE
  repeated TEXT;
BEGIN
  SELECT string_agg(email, ', ') INTO repeated
  FROM (
    SELECT "email" AS email
    FROM "customers"
    WHERE "is_active" = true
    GROUP BY "email"
    HAVING COUNT(*) > 1
  ) duplicated;

  IF repeated IS NOT NULL THEN
    RAISE EXCEPTION 'Active customers share an email, fix them before migrating: %', repeated;
  END IF;
END $$;

-- DropIndex
DROP INDEX "customers_document_type_document_number_key";

-- CreateIndex
CREATE INDEX "customers_document_type_document_number_idx" ON "customers"("document_type", "document_number");

-- CreateIndex
CREATE UNIQUE INDEX "customers_active_document_key" ON "customers"("document_type", "document_number") WHERE ("is_active" = true);

-- CreateIndex
CREATE UNIQUE INDEX "customers_active_email_key" ON "customers"("email") WHERE ("is_active" = true);
