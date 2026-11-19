import { missionPhase } from './mission.js';

describe('missionPhase (§2.2)', () => {
  it('empieza más adelante → UPCOMING', () => {
    expect(missionPhase('2026-12', null, '2026-11')).toBe('UPCOMING');
  });

  it('empieza este mes, sin fin → RUNNING', () => {
    expect(missionPhase('2026-11', null, '2026-11')).toBe('RUNNING');
  });

  it('empezó antes y termina este mes → RUNNING', () => {
    expect(missionPhase('2026-09', '2026-11', '2026-11')).toBe('RUNNING');
  });

  it('su último mes ya pasó → FINISHED', () => {
    expect(missionPhase('2026-09', '2026-10', '2026-11')).toBe('FINISHED');
  });

  it('compara bien de un año al otro', () => {
    expect(missionPhase('2027-01', null, '2026-12')).toBe('UPCOMING');
    expect(missionPhase('2026-01', '2026-12', '2027-01')).toBe('FINISHED');
  });
});
