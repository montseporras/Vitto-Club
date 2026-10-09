-- Decisión final del PO (2026-10-08): un cliente dado de baja perdió sus puntos y su cuenta
-- anterior, así que puede volver a inscribirse como un cliente nuevo. Documento y email pasan
-- a ser únicos solo entre clientes ACTIVOS. Reemplaza los índices únicos globales de
-- 20261007120000_customers_unique_email_all.
--
-- No hace falta un chequeo previo de duplicados: los índices de antes eran más estrictos
-- (únicos entre todos los clientes), así que los datos ya cumplen la regla nueva.

-- DropIndex
DROP INDEX "customers_email_key";

-- DropIndex
DROP INDEX "customers_document_type_document_number_key";

-- CreateIndex
CREATE INDEX "customers_document_type_document_number_idx" ON "customers"("document_type", "document_number");

-- CreateIndex
CREATE UNIQUE INDEX "customers_active_document_key" ON "customers"("document_type", "document_number") WHERE ("is_active" = true);

-- CreateIndex
CREATE UNIQUE INDEX "customers_active_email_key" ON "customers"("email") WHERE ("is_active" = true);
