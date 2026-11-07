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
      expect(values).toEqual([
        'CONSUMPTION_CREDIT',
        'VOID_REVERSAL',
        'MANUAL_ADJUSTMENT',
        'EXPIRATION',
        'REDEMPTION',
      ]);
    });
  });
});
