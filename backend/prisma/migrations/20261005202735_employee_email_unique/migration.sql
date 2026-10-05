-- Dedupe: el seed anterior duplicaba empleados en cada corrida.
-- Se conserva el de id más bajo por email. Ninguna tabla referencia a employees todavía.
DELETE FROM "employees" a
USING "employees" b
WHERE a."email" = b."email"
  AND a."id" > b."id";

-- CreateIndex
CREATE UNIQUE INDEX "employees_email_key" ON "employees"("email");
