import { missionsExpiredEntry } from './audit-entries.js';
import { assertValidAuditEntry } from './audit-entry.js';

describe('missionsExpiredEntry() — US-32', () => {
  it('Sistema, sin cliente: Período · Misiones vencidas · Recompensas reclamadas automáticamente', () => {
    const entry = missionsExpiredEntry({ periods: ['2026-11', '2026-11'], expired: 1200, claimed: 0 });

    expect(entry).toEqual({
      actor: { type: 'SYSTEM' },
      module: 'MISSIONS',
      action: 'MISSIONS_EXPIRED',
      description: 'Venció las misiones del mes',
      details: [
        { label: 'Período', value: 'Noviembre 2026' },
        { label: 'Misiones vencidas', value: '1.200' },
        // Siempre las tres filas, también en 0 (decisión de Jazmín)
        { label: 'Recompensas reclamadas automáticamente', value: '0' },
      ],
    });
    expect(() => assertValidAuditEntry(entry)).not.toThrow();
  });

  it('más de un mes en la misma corrida: los nombra a todos, en orden', () => {
    const entry = missionsExpiredEntry({ periods: ['2026-11', '2026-10', '2026-11'], expired: 2, claimed: 1 });
    expect(entry.details[0]).toEqual({ label: 'Período', value: 'Octubre 2026, Noviembre 2026' });
  });
});
