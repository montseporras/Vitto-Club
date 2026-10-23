import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// US-17-AJ, CA-17AJ.7 (contrato §3.11.3, "Clientes que ya existen sin cuenta").
//
// Script de UNA SOLA VEZ: crea la cuenta de los clientes cargados en caja antes de este cambio.
// Mismo criterio que el alta nueva: contraseña inicial = número de documento normalizado y
// mustChangePassword = true.
//
//   - Solo clientes ACTIVOS que no tienen cuenta.
//   - Solo si su email no lo usa otra cuenta ACTIVA. Los que chocan NO se tocan: se listan por
//     consola para resolverlos a mano.
//
// Se puede correr más de una vez: un cliente que ya tiene cuenta no se vuelve a procesar.
// Con --dry-run no escribe nada: solo muestra qué haría.
//
// Se corre desde backend/, con DATABASE_URL en el entorno (o en el .env):
//
//   npx ts-node prisma/create-missing-customer-accounts.ts --dry-run   (simulacro)
//   npx ts-node prisma/create-missing-customer-accounts.ts
//
// Corre fuera de Nest, así que (igual que seed.ts) hashea con bcryptjs directamente. El documento
// en claro nunca se guarda ni se imprime: solo su hash.

const DEFAULT_BCRYPT_COST = 10;

function bcryptCost(): number {
  const raw = process.env.BCRYPT_COST;
  if (!raw) return DEFAULT_BCRYPT_COST;
  const cost = Number(raw);
  if (!Number.isInteger(cost) || cost < 4 || cost > 15) {
    throw new Error('BCRYPT_COST must be an integer between 4 and 15');
  }
  return cost;
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL!),
});

type Skipped = { customerId: number; name: string; email: string; reason: string };

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const cost = bcryptCost();

  const customers = await prisma.customer.findMany({
    where: { isActive: true, account: null },
    orderBy: { id: 'asc' },
  });

  const created: { customerId: number; name: string; email: string }[] = [];
  const skipped: Skipped[] = [];

  for (const customer of customers) {
    const name = `${customer.firstName} ${customer.lastName}`;

    // El email puede repetirse entre cuentas inactivas; solo cuenta una activa
    const taken = await prisma.account.findFirst({
      where: { email: customer.email, isActive: true },
      select: { id: true, role: true },
    });
    if (taken) {
      skipped.push({
        customerId: customer.id,
        name,
        email: customer.email,
        reason: `el email ya lo usa una cuenta activa (cuenta ${taken.id}, ${taken.role})`,
      });
      continue;
    }

    if (!dryRun) {
      // documentNumber ya está normalizado en la base (sin puntos ni guiones, pasaporte en mayúsculas)
      const passwordHash = await bcrypt.hash(customer.documentNumber, cost);
      await prisma.account.create({
        data: {
          customerId: customer.id,
          email: customer.email,
          passwordHash,
          role: 'CUSTOMER',
          isActive: true,
          mustChangePassword: true,
        },
      });
    }
    created.push({ customerId: customer.id, name, email: customer.email });
  }

  console.log(dryRun ? '--- SIMULACRO (--dry-run): no se escribió nada ---' : '--- Resultado ---');
  console.log(`Clientes activos sin cuenta: ${customers.length}`);
  console.log(`${dryRun ? 'Se les crearía cuenta' : 'Cuentas creadas'}: ${created.length}`);
  for (const row of created) {
    console.log(`  [OK]   cliente ${row.customerId} · ${row.name} · ${row.email}`);
  }
  console.log(`Sin cuenta, para resolver a mano: ${skipped.length}`);
  for (const row of skipped) {
    console.log(`  [CHOCA] cliente ${row.customerId} · ${row.name} · ${row.email} → ${row.reason}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
