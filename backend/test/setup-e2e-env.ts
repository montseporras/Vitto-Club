import { resolveTestDatabaseUrl } from './e2e-database.js';

// PrismaService lee process.env.DATABASE_URL al construirse, y ni dotenv ni ConfigModule pisan
// una variable ya definida: con esto la app de cada spec nace apuntando a la base de tests.
process.env.DATABASE_URL = resolveTestDatabaseUrl();

// Costo mínimo de bcrypt: los e2e crean y verifican contraseñas de verdad, y con el costo de
// producción (10) cada hash tarda ~100 ms. Mismo motivo: ConfigModule no pisa lo ya definido.
process.env.BCRYPT_COST = '4';
