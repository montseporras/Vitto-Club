import 'dotenv/config';

const LOCAL_HOSTS = ['localhost', '127.0.0.1'];

// Devuelve la URL de la base de tests. Corta si no es local o si el nombre de la base no
// contiene "test": así los e2e nunca corren contra desarrollo ni contra Neon por un .env
// mal configurado. Se exigen las dos condiciones a la vez.
export function resolveTestDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL_TEST;
  if (!raw) {
    throw new Error('Missing environment variable DATABASE_URL_TEST (see .env.example)');
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('DATABASE_URL_TEST is not a valid URL');
  }

  const database = url.pathname.replace(/^\//, '');
  if (!LOCAL_HOSTS.includes(url.hostname) || !database.toLowerCase().includes('test')) {
    throw new Error(
      `Refusing to run e2e tests: DATABASE_URL_TEST must point to a local database whose name contains "test" (got host "${url.hostname}", database "${database}")`,
    );
  }

  return raw;
}
