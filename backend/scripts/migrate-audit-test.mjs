import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be configured before the e2e audit setup.');
}

const databaseUrl = new URL(process.env.DATABASE_URL);
const databaseName = decodeURIComponent(databaseUrl.pathname.slice(1));
if (
  !['localhost', '127.0.0.1', '::1'].includes(databaseUrl.hostname) ||
  !databaseName.toLowerCase().includes('test')
) {
  throw new Error(
    'Refusing e2e audit setup: DATABASE_URL must point to a local database whose name contains "test".',
  );
}

const migration = await readFile(resolve('prisma/develop-only/audit.sql'), 'utf8');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query('BEGIN');
  await client.query(migration);
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}
