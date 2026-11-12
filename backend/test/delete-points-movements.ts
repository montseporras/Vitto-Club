import type { PrismaService } from '../src/prisma/prisma.service.js';

// points_movements es solo inserción (trigger points_movements_immutable, ARRASTRE-S4 / A4-05): la
// base rechaza DELETE. Los e2e necesitan dejarla vacía entre tests, así que este helper apaga el
// trigger SOLO dentro de una transacción, borra y lo vuelve a prender. Si algo falla, la transacción
// se deshace y el trigger queda prendido. Es solo para tests: la aplicación nunca borra movimientos.
export async function deletePointsMovements(prisma: PrismaService): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('ALTER TABLE points_movements DISABLE TRIGGER points_movements_immutable');
    await tx.pointsMovement.deleteMany();
    await tx.$executeRawUnsafe('ALTER TABLE points_movements ENABLE TRIGGER points_movements_immutable');
  });
}
