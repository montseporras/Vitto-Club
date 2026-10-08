import { AccountsService } from '../../accounts/application/accounts.service.js';
import { AccountsCredentialsVerifier } from './accounts-credentials-verifier.js';

// Un AccountsService de mentira: solo importa lo que responde
const verifierWith = (stub: { verifyCredentials?: unknown; findActiveById?: unknown }) =>
  new AccountsCredentialsVerifier(stub as unknown as AccountsService);

describe('AccountsCredentialsVerifier', () => {
  describe('verify', () => {
    it('una cuenta de empleado pasa a la forma de auth, con employeeId', async () => {
      const verifier = verifierWith({
        verifyCredentials: jest.fn().mockResolvedValue({
          accountId: 7,
          role: 'CASHIER',
          owner: { employeeId: 3 },
          email: 'bruno@vitto.club',
        }),
      });

      expect(await verifier.verify('Bruno@Vitto.club', 'clave')).toEqual({
        account: { accountId: 7, role: 'CASHIER', employeeId: 3 },
        email: 'bruno@vitto.club',
      });
    });

    it('una cuenta de cliente pasa con customerId y sin employeeId', async () => {
      const verifier = verifierWith({
        verifyCredentials: jest.fn().mockResolvedValue({
          accountId: 9,
          role: 'CUSTOMER',
          owner: { customerId: 4 },
          email: 'lucia@example.com',
        }),
      });

      const result = await verifier.verify('lucia@example.com', 'clave');

      expect(result?.account).toEqual({ accountId: 9, role: 'CUSTOMER', customerId: 4 });
      expect(result?.account).not.toHaveProperty('employeeId');
    });

    it('si accounts entrega nombre y apellido, pasan; si no, no aparecen', async () => {
      const withNames = verifierWith({
        verifyCredentials: jest.fn().mockResolvedValue({
          accountId: 1,
          role: 'ADMIN',
          owner: { employeeId: 1 },
          email: 'ana@vitto.club',
          firstName: 'Ana',
          lastName: 'Gómez',
        }),
      });
      const withoutNames = verifierWith({
        verifyCredentials: jest.fn().mockResolvedValue({
          accountId: 1,
          role: 'ADMIN',
          owner: { employeeId: 1 },
          email: 'ana@vitto.club',
        }),
      });

      expect(await withNames.verify('ana@vitto.club', 'clave')).toMatchObject({ firstName: 'Ana', lastName: 'Gómez' });
      expect(await withoutNames.verify('ana@vitto.club', 'clave')).not.toHaveProperty('firstName');
    });

    it('"sin resultado" de accounts (undefined) pasa a null', async () => {
      const verifier = verifierWith({ verifyCredentials: jest.fn().mockResolvedValue(undefined) });

      expect(await verifier.verify('nadie@vitto.club', 'clave')).toBeNull();
    });

    it('le pasa a accounts el email y la contraseña tal como llegaron, sin tocarlos', async () => {
      const verifyCredentials = jest.fn().mockResolvedValue(undefined);

      await verifierWith({ verifyCredentials }).verify('  Ana@Vitto.Club ', ' clave con espacios ');

      expect(verifyCredentials).toHaveBeenCalledWith('  Ana@Vitto.Club ', ' clave con espacios ');
    });
  });

  describe('findActiveById', () => {
    it('traduce igual que verify', async () => {
      const verifier = verifierWith({
        findActiveById: jest.fn().mockResolvedValue({
          accountId: 7,
          role: 'ADMIN',
          owner: { employeeId: 3 },
          email: 'ana@vitto.club',
        }),
      });

      expect(await verifier.findActiveById(7)).toEqual({
        account: { accountId: 7, role: 'ADMIN', employeeId: 3 },
        email: 'ana@vitto.club',
      });
    });

    it('una cuenta inexistente o inactiva (undefined) pasa a null', async () => {
      const verifier = verifierWith({ findActiveById: jest.fn().mockResolvedValue(undefined) });

      expect(await verifier.findActiveById(99)).toBeNull();
    });
  });
});
