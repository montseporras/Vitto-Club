-- ARRASTRE-S4 (A4-06; A-09 del cierre del Sprint 3): el teléfono del empleado es opcional y "sin
-- teléfono" se guardaba como ''. La columna ya admite NULL (20261017200928_sprint3_schema); el
-- repositorio ahora escribe NULL, y acá se convierten las filas viejas. No toca ningún teléfono real.
-- Es idempotente: si no queda ninguna fila con '', no hace nada.
UPDATE "employees" SET "phone" = NULL WHERE "phone" = '';
