import type { PrismaService } from '../src/prisma/prisma.service.js';

// notifications es solo inserción (trigger notifications_immutable, BASE-5): la base rechaza DELETE. Los
// e2e necesitan dejarla vacía entre tests, así que este helper apaga el trigger SOLO dentro de una
// transacción, borra y lo vuelve a prender. Si algo falla, la transacción se deshace y el trigger queda
// prendido. Es solo para tests: la aplicación nunca borra notificaciones. Mismo patrón que
// delete-points-movements.ts.
export async function deleteNotifications(prisma: PrismaService): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('ALTER TABLE notifications DISABLE TRIGGER notifications_immutable');
    await tx.notification.deleteMany();
    await tx.$executeRawUnsafe('ALTER TABLE notifications ENABLE TRIGGER notifications_immutable');
  });
}
