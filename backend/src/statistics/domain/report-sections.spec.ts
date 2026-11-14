import { StatisticsInputError } from './errors/statistics-input.error.js';
import { parseReportSections, reportSectionsError } from './report-sections.js';

describe('reportSectionsError — S5 §3.9.5', () => {
  it.each([undefined, '', null])('falta o vacía (%p) → "Elegí al menos una sección."', (raw) => {
    expect(reportSectionsError(raw)).toBe('Elegí al menos una sección.');
  });

  it.each(['CLIENTS', 'CUSTOMERS,', 'CUSTOMERS,POINTS,CUSTOMERS', 'customers', 'CUSTOMERS,,POINTS'])(
    'valor que no existe o repetido (%s) → 400 con el mensaje de secciones válidas',
    (raw) => {
      expect(reportSectionsError(raw)).toBe('Elegí secciones válidas: Clientes, Consumos, Puntos o Programa.');
    },
  );

  it('una o más secciones válidas', () => {
    expect(reportSectionsError('POINTS')).toBeNull();
    expect(reportSectionsError('CUSTOMERS,CONSUMPTIONS,POINTS,PROGRAM')).toBeNull();
  });
});

describe('parseReportSections', () => {
  it('las devuelve siempre en el orden del contrato: Clientes · Consumos · Puntos · Programa', () => {
    expect(parseReportSections('PROGRAM,CUSTOMERS')).toEqual(['CUSTOMERS', 'PROGRAM']);
  });

  it('sin secciones lanza StatisticsInputError', () => {
    expect(() => parseReportSections(undefined)).toThrow(
      new StatisticsInputError('Elegí al menos una sección.', 'sections'),
    );
  });
});
