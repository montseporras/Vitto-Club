import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { StatisticsQueryDto, StatisticsReportQueryDto } from './statistics-query.dto.js';

async function messages(dtoClass: new () => object, payload: object): Promise<Record<string, string[]>> {
  const errors = await validate(plainToInstance(dtoClass, payload));
  return Object.fromEntries(errors.map((error) => [error.property, Object.values(error.constraints ?? {})]));
}

const currentMonth = () => {
  const now = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
};

describe('StatisticsQueryDto — S5 §3.9', () => {
  it('acepta el mes en curso y el primero que se puede elegir (enero del año pasado)', async () => {
    await expect(messages(StatisticsQueryDto, { month: currentMonth() })).resolves.toEqual({});
    const lastYear = new Date().getUTCFullYear() - 1;
    await expect(messages(StatisticsQueryDto, { month: `${lastYear}-01` })).resolves.toEqual({});
  });

  it.each([
    [{}, 'Elegí un mes.'],
    [{ month: '' }, 'Elegí un mes.'],
    [{ month: '2026-1' }, 'El mes tiene que tener el formato AAAA-MM.'],
    [{ month: '2026-13' }, 'El mes tiene que tener el formato AAAA-MM.'],
    [{ month: '2999-01' }, 'No se puede elegir un mes que todavía no empezó.'],
  ])('%j → un solo mensaje del contrato', async (payload, message) => {
    await expect(messages(StatisticsQueryDto, payload)).resolves.toEqual({ month: [message] });
  });

  it('un mes anterior a enero del año pasado → "Elegí un mes desde enero de {año pasado}."', async () => {
    const lastYear = new Date().getUTCFullYear() - 1;
    await expect(messages(StatisticsQueryDto, { month: `${lastYear - 1}-12` })).resolves.toEqual({
      month: [`Elegí un mes desde enero de ${lastYear}.`],
    });
  });
});

describe('StatisticsReportQueryDto — S5 §3.9.5', () => {
  it('acepta una o más secciones', async () => {
    await expect(
      messages(StatisticsReportQueryDto, { month: currentMonth(), sections: 'CUSTOMERS,PROGRAM' }),
    ).resolves.toEqual({});
  });

  it('sin secciones → "Elegí al menos una sección."', async () => {
    await expect(messages(StatisticsReportQueryDto, { month: currentMonth() })).resolves.toEqual({
      sections: ['Elegí al menos una sección.'],
    });
    await expect(messages(StatisticsReportQueryDto, { month: currentMonth(), sections: '' })).resolves.toEqual({
      sections: ['Elegí al menos una sección.'],
    });
  });

  it('una sección que no existe → 400 con el mensaje de secciones válidas', async () => {
    await expect(messages(StatisticsReportQueryDto, { month: currentMonth(), sections: 'FOO' })).resolves.toEqual({
      sections: ['Elegí secciones válidas: Clientes, Consumos, Puntos o Programa.'],
    });
  });
});
