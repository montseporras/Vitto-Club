import 'dotenv/config';
import { PrismaClient, EmployeeRole, DocumentType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL!),
});

async function main() {
  await prisma.employee.createMany({
    data: [
      { firstName: 'Ana',   lastName: 'Gómez',    phone: '3510000001', email: 'ana.gomez@vitto.club',    role: EmployeeRole.ADMIN },
      { firstName: 'Bruno', lastName: 'Pérez',    phone: '3510000002', email: 'bruno.perez@vitto.club',  role: EmployeeRole.CASHIER },
      { firstName: 'Carla', lastName: 'Martínez', phone: '3510000003', email: 'carla.martinez@vitto.club', role: EmployeeRole.CASHIER },
    ],
    skipDuplicates: true,
  });

  await prisma.customer.createMany({
    data: [
      {
        firstName: 'Lucía', lastName: 'Fernández',
        documentType: DocumentType.DNI, documentNumber: '40123456',
        phone: '3511111111', email: 'lucia@example.com',
        dateOfBirth: new Date('1998-05-14'),
      },
      {
        firstName: 'Martín', lastName: 'Suárez',
        documentType: DocumentType.DNI, documentNumber: '38987654',
        phone: '3512222222', email: 'martin@example.com',
      },
    ],
    skipDuplicates: true,
  });

  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
