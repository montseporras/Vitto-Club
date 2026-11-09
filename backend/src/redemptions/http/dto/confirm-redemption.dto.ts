import { IsDefined, ValidateBy } from 'class-validator';

const MISSING_MESSAGE = 'Completá este campo.';
const NOT_POSITIVE_INTEGER_MESSAGE = 'Ingresá un número entero mayor a 0.';

// Un solo validador para "entero ≥ 1": con IsInt + Min separados, un valor como 0.5 o "a" falla los
// dos y el mensaje del contrato saldría repetido. Si el valor falta lo deja pasar: de ese caso se
// ocupa IsDefined, para que no salgan los dos mensajes juntos.
const IsPositiveInteger = () =>
  ValidateBy({
    name: 'isPositiveInteger',
    validator: {
      validate: (value: unknown) =>
        value === undefined ||
        value === null ||
        (typeof value === 'number' && Number.isInteger(value) && value >= 1),
      defaultMessage: () => NOT_POSITIVE_INTEGER_MESSAGE,
    },
  });

// §3.7.1, paso 1. Solo viaja `rewardId`: el cliente sale del token (/me) o de la ruta (/:id), así
// que `customerId` en el body lo rechaza el ValidationPipe global con 400 (CA-40.10,
// forbidNonWhitelisted).
//   Falta               -> 400 "Completá este campo."
//   No entero o < 1     -> 400 "Ingresá un número entero mayor a 0."
export class ConfirmRedemptionDto {
  @IsDefined({ message: MISSING_MESSAGE })
  @IsPositiveInteger()
  rewardId!: number;
}
