-- ARRASTRE-S4 (A4-05; A-02 y A-03 del cierre del Sprint 3): integridad de points_movements según el
-- contrato S3 §3.12. Va ANTES de BASE-5, que suma MISSION_REWARD y otro CHECK a esta misma tabla.
-- Escrito a mano (Prisma no modela triggers ni CHECK).
--
-- 1. Antes de agregar los CHECK se revisan las filas existentes (A-03: "verificar que no haya filas
--    que los violen"):
--    - points = 0: eran los movimientos de los consumos que dan 0 puntos (decisión D-07, opción a:
--      ahora no se guarda movimiento en ese caso). No cambian ningún saldo: el consumo, su lote y el
--      saldo no dependen de ellos, así que se borran acá, ANTES de crear el trigger de solo inserción.
--    - MANUAL_ADJUSTMENT sin motivo: la aplicación nunca lo permitió; si aparece alguno, la migración
--      se detiene con un mensaje claro en vez de inventar un motivo.
-- 2. CHECK de §3.12 para points_movements: `points <> 0` y `reason` obligatorio en MANUAL_ADJUSTMENT.
-- 3. Trigger de solo inserción, igual que el de audit_logs (20261019120000_sprint3_us57_audit_triggers):
--    rechaza UPDATE, DELETE y TRUNCATE.

-- 1. Verificación previa
DO $$
DECLARE
  zero_points integer;
BEGIN
  IF EXISTS (
    SELECT 1 FROM "points_movements" WHERE "type" = 'MANUAL_ADJUSTMENT' AND "reason" IS NULL
  ) THEN
    RAISE EXCEPTION 'points_movements tiene ajustes manuales sin motivo (reason NULL): corregirlos antes de aplicar esta migración'
      USING ERRCODE = '23514';
  END IF;

  SELECT count(*) INTO zero_points FROM "points_movements" WHERE "points" = 0;
  IF zero_points > 0 THEN
    DELETE FROM "points_movements" WHERE "points" = 0;
    RAISE NOTICE 'points_movements: se borraron % movimientos con points = 0 (consumos de 0 puntos, D-07)', zero_points;
  END IF;
END
$$;

-- 2. CHECK (§3.12)
ALTER TABLE "points_movements" ADD CONSTRAINT "points_movements_points_check"
  CHECK ("points" <> 0);
ALTER TABLE "points_movements" ADD CONSTRAINT "points_movements_manual_adjustment_reason_check"
  CHECK ("type" <> 'MANUAL_ADJUSTMENT' OR "reason" IS NOT NULL);

-- 3. Solo inserción (mismo trigger que auditoría; contrato S3 §3.12 y §3.9.1)
CREATE OR REPLACE FUNCTION reject_points_movement_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'points_movements is append-only'
    USING ERRCODE = '55000';
END
$$;

DROP TRIGGER IF EXISTS points_movements_immutable ON "points_movements";
CREATE TRIGGER points_movements_immutable
  BEFORE UPDATE OR DELETE ON "points_movements"
  FOR EACH ROW EXECUTE FUNCTION reject_points_movement_mutation();

DROP TRIGGER IF EXISTS points_movements_no_truncate ON "points_movements";
CREATE TRIGGER points_movements_no_truncate
  BEFORE TRUNCATE ON "points_movements"
  FOR EACH STATEMENT EXECUTE FUNCTION reject_points_movement_mutation();
