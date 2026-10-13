-- Decisión del PO (2026-10-07): un cliente dado de baja que vuelve se reactiva, no se crea uno
-- nuevo. Documento y email pasan a ser únicos entre TODOS los clientes, activos o no. Se
-- deshacen los índices parciales de 20261006120000_customers_unique_among_active.

-- Antes de crear los índices: si hay clientes repetidos (por documento, o por email sin
-- distinguir mayúsculas), la migración se corta con un mensaje claro en vez de borrar o
-- modificar datos. Hay que resolverlos a mano y volver a correrla.
DO $$
DECLARE
  repeated_documents TEXT;
  repeated_emails TEXT;
BEGIN
  SELECT string_agg(document, ', ') INTO repeated_documents
  FROM (
    SELECT "document_type" || ' ' || "document_number" AS document
    FROM "customers"
    GROUP BY "document_type", "document_number"
    HAVING COUNT(*) > 1
  ) duplicated;

  SELECT string_agg(email, ', ') INTO repeated_emails
  FROM (
    SELECT lower("email") AS email
    FROM "customers"
    GROUP BY lower("email")
    HAVING COUNT(*) > 1
  ) duplicated;

  IF repeated_documents IS NOT NULL OR repeated_emails IS NOT NULL THEN
    RAISE EXCEPTION 'Customers share a document or an email, fix them before migrating. Documents: %. Emails: %',
      COALESCE(repeated_documents, '-'), COALESCE(repeated_emails, '-');
  END IF;
END $$;

-- DropIndex
DROP INDEX "customers_document_type_document_number_idx";

-- DropIndex
DROP INDEX "customers_active_document_key";

-- DropIndex
DROP INDEX "customers_active_email_key";

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_document_type_document_number_key" ON "customers"("document_type", "document_number");
