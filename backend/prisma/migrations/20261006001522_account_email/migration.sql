-- Todos los usuarios inician sesión con email (empleados y clientes): la columna pasa a
-- llamarse "email". Se renombra en vez de recrearla para conservar los datos.
ALTER TABLE "accounts" RENAME COLUMN "identifier" TO "email";
ALTER INDEX "accounts_identifier_key" RENAME TO "accounts_email_key";

-- Las cuentas de clientes que ya existan guardaban el documento: pasan al email del cliente
UPDATE "accounts" a
SET "email" = c."email"
FROM "customers" c
WHERE a."customer_id" = c."id";
