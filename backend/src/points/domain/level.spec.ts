import { calculateLevel } from './level.js';

describe('calculateLevel', () => {
  const silverMinPoints = 300;
  const goldMinPoints = 800;

  it('0 puntos -> Bronce', () => {
    const level = calculateLevel(0, silverMinPoints, goldMinPoints);
    expect(level.current).toBe('BRONZE');
    expect(level.next).toBe('SILVER');
    expect(level.currentMinPoints).toBe(0);
    expect(level.nextMinPoints).toBe(300);
    expect(level.pointsToNext).toBe(300);
  });

  it('299 puntos -> Bronce (borde exacto, CA-BASE "caso de prueba")', () => {
    expect(calculateLevel(299, silverMinPoints, goldMinPoints).current).toBe('BRONZE');
  });

  it('300 puntos -> Plata (borde exacto)', () => {
    const level = calculateLevel(300, silverMinPoints, goldMinPoints);
    expect(level.current).toBe('SILVER');
    expect(level.currentMinPoints).toBe(300);
    expect(level.nextMinPoints).toBe(800);
    expect(level.pointsToNext).toBe(500);
  });

  it('799 puntos -> Plata', () => {
    expect(calculateLevel(799, silverMinPoints, goldMinPoints).current).toBe('SILVER');
  });

  it('800 puntos -> Oro (borde exacto)', () => {
    const level = calculateLevel(800, silverMinPoints, goldMinPoints);
    expect(level.current).toBe('GOLD');
    expect(level.next).toBeNull();
    expect(level.nextMinPoints).toBeNull();
    expect(level.pointsToNext).toBe(0);
    expect(level.progressPercent).toBe(100);
  });

  it('en Oro, progressPercent siempre es 100 (progreso en Oro, caso de prueba)', () => {
    expect(calculateLevel(5000, silverMinPoints, goldMinPoints).progressPercent).toBe(100);
  });

  it('progressPercent a mitad de camino entre Plata y Oro', () => {
    const level = calculateLevel(550, silverMinPoints, goldMinPoints); // (550-300)/(800-300)=50%
    expect(level.progressPercent).toBe(50);
  });

  it('progressPercent a mitad de camino entre Bronce y Plata', () => {
    const level = calculateLevel(150, silverMinPoints, goldMinPoints); // (150-0)/(300-0)=50%
    expect(level.progressPercent).toBe(50);
  });
});
