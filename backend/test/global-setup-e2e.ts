import { execSync } from 'node:child_process';
// Sin ".js": Jest carga el globalSetup fuera del runtime de los tests, donde no aplica el
// moduleNameMapper que resuelve los imports ESM con extensión.
import { resolveTestDatabaseUrl } from './e2e-database';

// Corre una vez antes de todos los e2e: deja la base de tests con las migraciones al día.
// Aplica la misma protección que el setup de los specs antes de tocar la base.
export default function globalSetup(): void {
  const url = resolveTestDatabaseUrl();

  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'pipe',
  });
  execSync('node scripts/migrate-audit-test.mjs', {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'pipe',
  });
}
