import { sortCustomerMissions } from './customer-missions-order.js';

const item = (status: 'IN_PROGRESS' | 'COMPLETED' | 'CLAIMED' | 'EXPIRED', name: string) => ({ status, mission: { name } });

describe('sortCustomerMissions (§3.3.2)', () => {
  it('En progreso, Completada, Reclamada, Vencida; dentro de cada estado, por nombre', () => {
    const sorted = sortCustomerMissions([
      item('EXPIRED', 'A'),
      item('CLAIMED', 'B'),
      item('IN_PROGRESS', 'Zeta'),
      item('COMPLETED', 'C'),
      item('IN_PROGRESS', 'Álamo'),
      item('IN_PROGRESS', 'beta'),
    ]);

    expect(sorted.map((entry) => `${entry.status}:${entry.mission.name}`)).toEqual([
      'IN_PROGRESS:Álamo',
      'IN_PROGRESS:beta',
      'IN_PROGRESS:Zeta',
      'COMPLETED:C',
      'CLAIMED:B',
      'EXPIRED:A',
    ]);
  });

  it('no modifica la lista original', () => {
    const items = [item('CLAIMED', 'B'), item('IN_PROGRESS', 'A')];
    sortCustomerMissions(items);
    expect(items.map((entry) => entry.mission.name)).toEqual(['B', 'A']);
  });
});
