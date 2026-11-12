import { resolveTestDatabaseUrl } from './e2e-database.js';

// PrismaService lee process.env.DATABASE_URL al construirse, y ni dotenv ni ConfigModule pisan
// una variable ya definida: con esto la app de cada spec nace apuntando a la base de tests.
process.env.DATABASE_URL = resolveTestDatabaseUrl();

// Costo mínimo de bcrypt: los e2e crean y verifican contraseñas de verdad, y con el costo de
// producción (10) cada hash tarda ~100 ms. Mismo motivo: ConfigModule no pisa lo ya definido.
process.env.BCRYPT_COST = '4';

// US-25: el cron del vencimiento de puntos no corre durante los e2e; los tests llaman al proceso
// directamente. Mismo motivo: ConfigModule no pisa lo ya definido.
process.env.POINTS_EXPIRATION_CRON_ENABLED = 'false';

// US-37 y US-44: lo mismo para el vencimiento de recompensas y el barrido de canjes. Sin esto
// corrían al iniciar la app de cada spec; los tests que los prueban llaman al servicio directamente.
process.env.REWARDS_EXPIRATION_CRON_ENABLED = 'false';
process.env.REDEMPTIONS_EXPIRATION_CRON_ENABLED = 'false';

// BASE-5 (contrato S5 §3.5.1 y §3.8.3): los e2e nunca llaman a Cloudinary ni a Resend. Con estas dos en
// false se usan los adaptadores falsos (el de imágenes valida el archivo pero no sube nada; el de correo
// solo deja el envío en el log). Mismo motivo: ConfigModule no pisa lo ya definido.
process.env.IMAGES_STORAGE_ENABLED = 'false';
process.env.NOTIFICATIONS_EMAIL_ENABLED = 'false';
