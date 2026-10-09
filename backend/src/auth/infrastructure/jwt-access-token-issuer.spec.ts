import { JwtService } from '@nestjs/jwt';
import { JwtAccessTokenIssuer } from './jwt-access-token-issuer.js';

const SECRET = 'a'.repeat(32);

const serviceWith = (secret: string, expiresIn: number) =>
  new JwtService({
    secret,
    signOptions: { expiresIn, algorithm: 'HS256' },
    verifyOptions: { algorithms: ['HS256'] },
  });

describe('JwtAccessTokenIssuer', () => {
  const jwt = serviceWith(SECRET, 900);
  const issuer = new JwtAccessTokenIssuer(jwt);

  it('lo que se emite para un empleado se lee igual al verificar', async () => {
    const account = { accountId: 7, role: 'CASHIER' as const, employeeId: 3 };

    const token = await issuer.issue(account);

    expect(await issuer.verify(token)).toEqual(account);
  });

  it('lo que se emite para un cliente se lee igual al verificar', async () => {
    const account = { accountId: 9, role: 'CUSTOMER' as const, customerId: 4 };

    const token = await issuer.issue(account);

    expect(await issuer.verify(token)).toEqual(account);
  });

  it('el token no contiene nada más que la identidad y las fechas', async () => {
    const token = await issuer.issue({ accountId: 7, role: 'ADMIN', employeeId: 3 });

    const payload = jwt.decode<Record<string, unknown>>(token);

    expect(Object.keys(payload).sort()).toEqual(['employeeId', 'exp', 'iat', 'role', 'sub']);
  });

  it('rechaza un token vencido', async () => {
    const expired = new JwtAccessTokenIssuer(serviceWith(SECRET, -10));

    const token = await expired.issue({ accountId: 7, role: 'ADMIN', employeeId: 3 });

    expect(await issuer.verify(token)).toBeNull();
  });

  it('rechaza un token firmado con otro secreto', async () => {
    const other = new JwtAccessTokenIssuer(serviceWith('b'.repeat(32), 900));

    const token = await other.issue({ accountId: 7, role: 'ADMIN', employeeId: 3 });

    expect(await issuer.verify(token)).toBeNull();
  });

  it('rechaza un token modificado', async () => {
    const token = await issuer.issue({ accountId: 7, role: 'CASHIER', employeeId: 3 });
    const [header, , signature] = token.split('.');
    const forgedPayload = Buffer.from(JSON.stringify({ sub: '7', role: 'ADMIN' })).toString('base64url');

    expect(await issuer.verify(`${header}.${forgedPayload}.${signature}`)).toBeNull();
  });

  it('rechaza un texto que no es un token', async () => {
    expect(await issuer.verify('no-es-un-token')).toBeNull();
    expect(await issuer.verify('')).toBeNull();
  });

  it('rechaza un token bien firmado pero con un rol desconocido', async () => {
    const token = await jwt.signAsync({ sub: '7', role: 'SUPERADMIN' });

    expect(await issuer.verify(token)).toBeNull();
  });

  it('rechaza un token bien firmado pero sin cuenta', async () => {
    const token = await jwt.signAsync({ role: 'ADMIN' });

    expect(await issuer.verify(token)).toBeNull();
  });
});
