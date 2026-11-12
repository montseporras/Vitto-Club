import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

// BASE-4: reglas de arquitectura del Sprint 4 que se verifican leyendo el código fuente.
// Corre desde backend/ (rootDir de Jest), igual que el resto de los unitarios.
const SRC = join(process.cwd(), 'src');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts') ? [path] : [];
  });
}

// Rutas de los import/export ... from '...' de un archivo
function importsOf(file: string): string[] {
  const content = readFileSync(file, 'utf8');
  return [...content.matchAll(/(?:import|export)[^'"]*from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
}

// Archivos de un módulo que importan algo de alguno de los módulos prohibidos
function forbiddenImports(module: string, forbidden: string[]): string[] {
  return sourceFiles(join(SRC, module)).flatMap((file) =>
    importsOf(file)
      .filter((path) => forbidden.some((name) => new RegExp(`(^|/)${name}(/|$)`).test(path)))
      .map((path) => `${relative(SRC, file)} → ${path}`),
  );
}

describe('Arquitectura del Sprint 4 (BASE-4)', () => {
  // CA-B4.8 y contrato S4 §8.4: redemptions → rewards y redemptions → points, nunca al revés
  describe('módulos sin ciclos (CA-B4.8)', () => {
    it('points no importa rewards ni redemptions', () => {
      expect(forbiddenImports('points', ['rewards', 'redemptions'])).toEqual([]);
    });

    it('rewards no importa redemptions', () => {
      expect(forbiddenImports('rewards', ['redemptions'])).toEqual([]);
    });

    it('redemptions importa rewards y points', () => {
      const imports = sourceFiles(join(SRC, 'redemptions')).flatMap(importsOf);
      expect(imports.some((path) => /(^|\/)rewards\//.test(path))).toBe(true);
      expect(imports.some((path) => /(^|\/)points\//.test(path))).toBe(true);
    });
  });

  // CA-B4.7 y decisión S4-1: cancelar, rechazar y vencer no reintegran nada
  describe('sin reintegro (CA-B4.7)', () => {
    const modules = ['points', 'rewards', 'redemptions'];

    it('no existe ningún método ni función para devolver puntos de un canje', () => {
      // Declaraciones: "reintegrar(", "async reintegrarX(", "function refund(", "restore...(" etc.
      const declaration =
        /(?:^|\s)(?:async\s+|function\s+|private\s+|public\s+|protected\s+)*(reintegr\w*|refund\w*|restore\w*Points\w*|devolver\w*)\s*\(/gim;
      const found = modules.flatMap((module) =>
        sourceFiles(join(SRC, module)).flatMap((file) =>
          [...readFileSync(file, 'utf8').matchAll(declaration)].map(
            (m) => `${relative(SRC, file)}: ${m[1]}`,
          ),
        ),
      );
      expect(found).toEqual([]);
    });

    it('no existe un tipo de movimiento de reintegro: REDEMPTION es el único del canje', () => {
      const schema = readFileSync(join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8');
      const enumBody = /enum PointsMovementType \{([^}]*)\}/.exec(schema)?.[1] ?? '';
      const values = enumBody
        // El schema puede tener CRLF (Windows)
        .split(/\r?\n/)
        .map((line) => line.replace(/\/\/.*$/, '').trim())
        .filter(Boolean);
      // Sprint 5 (BASE-5, contrato S5 §2.7): los dos únicos tipos nuevos son los puntos de regalo; siguen
      // sin existir tipos de reintegro
      expect(values).toEqual([
        'CONSUMPTION_CREDIT',
        'VOID_REVERSAL',
        'MANUAL_ADJUSTMENT',
        'EXPIRATION',
        'REDEMPTION',
        'MISSION_REWARD',
        'BIRTHDAY_BONUS',
      ]);
    });
  });
});

describe('Arquitectura del Sprint 5 (BASE-5)', () => {
  // CA-B5.8 y contrato S5 §8.4: las dependencias van en un solo sentido, sin ciclos
  describe('módulos sin ciclos (CA-B5.8)', () => {
    it('missions no importa consumptions: recibe { customerId, consumptionId, amount, createdAt }', () => {
      expect(forbiddenImports('missions', ['consumptions'])).toEqual([]);
    });

    it('points no importa missions ni notifications', () => {
      expect(forbiddenImports('points', ['missions', 'notifications'])).toEqual([]);
    });

    it('statistics no importa ningún módulo de negocio: lee las tablas por Prisma', () => {
      expect(
        forbiddenImports('statistics', [
          'accounts',
          'audit',
          'auth',
          'consumptions',
          'customers',
          'employees',
          'loyalty',
          'missions',
          'notifications',
          'points',
          'redemptions',
          'rewards',
        ]),
      ).toEqual([]);
    });

    it('rewards y customers pueden usar images, pero images no importa ningún módulo de negocio', () => {
      expect(
        forbiddenImports('images', [
          'accounts',
          'audit',
          'auth',
          'consumptions',
          'customers',
          'employees',
          'loyalty',
          'missions',
          'notifications',
          'points',
          'redemptions',
          'rewards',
          'statistics',
        ]),
      ).toEqual([]);
    });
  });

  // Contrato S5 §3.5.1 y §3.8.3: Cloudinary y Resend solo a través de su puerto
  describe('servicios externos detrás de un puerto', () => {
    const importsOutside = (sdk: string, allowedModule: string) =>
      readdirSync(SRC, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && entry.name !== allowedModule)
        .flatMap((entry) => sourceFiles(join(SRC, entry.name)))
        .filter((file) => importsOf(file).some((path) => path === sdk || path.startsWith(`${sdk}/`)))
        .map((file) => relative(SRC, file));

    it('el SDK de Cloudinary solo se importa desde images', () => {
      expect(importsOutside('cloudinary', 'images')).toEqual([]);
    });

    it('el SDK de Resend solo se importa desde notifications', () => {
      expect(importsOutside('resend', 'notifications')).toEqual([]);
    });
  });
});
