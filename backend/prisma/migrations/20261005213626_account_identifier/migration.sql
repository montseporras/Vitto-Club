-- Los empleados inician sesión con su email (no con un nombre de usuario): la columna pasa a
-- llamarse "identifier" y se agranda al largo de employees.email. Se renombra en vez de
-- recrearla para conservar los datos.
ALTER TABLE "accounts" RENAME COLUMN "username" TO "identifier";
ALTER TABLE "accounts" ALTER COLUMN "identifier" SET DATA TYPE VARCHAR(150);
ALTER INDEX "accounts_username_key" RENAME TO "accounts_identifier_key";

-- Las cuentas de empleados que ya existan pasan a identificarse con el email del empleado
UPDATE "accounts" a
SET "identifier" = e."email"
FROM "employees" e
WHERE a."employee_id" = e."id";
