import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';

if (process.env.APP_ENV !== 'develop') {
  throw new Error('Audit migration is develop-only. Set APP_ENV=develop to run it.');
}
if (process.env.NODE_ENV === 'production') {
  throw new Error('Audit migration cannot run when NODE_ENV=production.');
}
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be configured before running the audit migration.');
}

const migration = await readFile(resolve('prisma/develop-only/audit.sql'), 'utf8');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query('BEGIN');
  await client.query(migration);
  await client.query('COMMIT');
  console.log('Develop-only audit migration applied.');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}
