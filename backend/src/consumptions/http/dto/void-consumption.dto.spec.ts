import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { VoidConsumptionDto } from './void-consumption.dto.js';

const errorsOf = (plain: object) =>
  validateSync(plainToInstance(VoidConsumptionDto, plain), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

const messagesOf = (plain: object) =>
  errorsOf(plain).flatMap((e) => Object.values(e.constraints ?? {}));

describe('VoidConsumptionDto', () => {
  it('acepta un motivo válido', () => {
    expect(errorsOf({ reason: 'monto cargado incorrectamente' })).toEqual([]);
  });

  it('rechaza el motivo vacío con el mensaje exacto del contrato', () => {
    expect(messagesOf({ reason: '' })).toContain('El motivo de anulación es obligatorio.');
  });

  it('rechaza el motivo ausente con el mismo mensaje', () => {
    expect(messagesOf({})).toContain('El motivo de anulación es obligatorio.');
  });

  it('rechaza un motivo de solo espacios como vacío (se recorta antes de validar)', () => {
    expect(messagesOf({ reason: '     ' })).toContain('El motivo de anulación es obligatorio.');
  });

  it('rechaza un motivo de menos de 5 caracteres con el mensaje exacto del contrato', () => {
    expect(messagesOf({ reason: 'ab' })).toContain('Indicá un motivo de al menos 5 caracteres.');
  });

  it('acepta exactamente 5 caracteres tras recortar espacios', () => {
    expect(errorsOf({ reason: '  abcde  ' })).toEqual([]);
  });

  it('rechaza campos que no existen', () => {
    expect(errorsOf({ reason: 'motivo válido', code: 'C-000131' })[0]?.property).toBe('code');
  });
});
