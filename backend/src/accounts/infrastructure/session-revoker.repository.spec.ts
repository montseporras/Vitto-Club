import { PrismaSessionRevoker } from './session-revoker.repository.js';
import { PrismaService } from '../../prisma/prisma.service.js';

function fakePrisma() {
  return {
    session: { updateMany: jest.fn() },
  } as unknown as PrismaService;
}

describe('PrismaSessionRevoker', () => {
  it('marca revokedAt en todas las sesiones activas de la cuenta', async () => {
    const prisma = fakePrisma();
    const revoker = new PrismaSessionRevoker(prisma);

    await revoker.revokeAllForAccount(7);

    expect(prisma.session.updateMany).toHaveBeenCalledTimes(1);
    const call = (prisma.session.updateMany as jest.Mock).mock.calls[0][0];
    expect(call.where).toEqual({ accountId: 7, revokedAt: null });
    expect(call.data.revokedAt).toBeInstanceOf(Date);
  });
});
