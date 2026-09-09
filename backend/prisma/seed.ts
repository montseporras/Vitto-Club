import 'dotenv/config';
import { PrismaClient, RolEmpleado, TipoDocumento } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL!),
});

async function main() {
  await prisma.empleado.createMany({
    data: [
      { nombre: 'Ana',   apellido: 'Gómez',    telefono: '3510000001', email: 'ana.gomez@vitto.club',    rol: RolEmpleado.ADMINISTRADOR },
      { nombre: 'Bruno', apellido: 'Pérez',    telefono: '3510000002', email: 'bruno.perez@vitto.club',  rol: RolEmpleado.CAJERO },
      { nombre: 'Carla', apellido: 'Martínez', telefono: '3510000003', email: 'carla.martinez@vitto.club', rol: RolEmpleado.CAJERO },
    ],
    skipDuplicates: true,
  });

  await prisma.cliente.createMany({
    data: [
      {
        nombre: 'Lucía', apellido: 'Fernández',
        tipoDocumento: TipoDocumento.DNI, numeroDocumento: '40123456',
        telefono: '3511111111', email: 'lucia@example.com',
        fechaNacimiento: new Date('1998-05-14'),
      },
      {
        nombre: 'Martín', apellido: 'Suárez',
        tipoDocumento: TipoDocumento.DNI, numeroDocumento: '38987654',
        telefono: '3512222222', email: 'martin@example.com',
      },
    ],
    skipDuplicates: true,
  });

  console.log('Seed completado.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());