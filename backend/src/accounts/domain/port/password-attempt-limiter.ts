// Límite de intentos con la contraseña actual incorrecta (contrato §3.10.4 y §3.11.1): más de 5 en
// 15 minutos, por cuenta, y el contador es el mismo para el cambio de correo y el de contraseña.
// "Ahora" llega por parámetro: ninguna operación lee el reloj por su cuenta.
export abstract class PasswordAttemptLimiter {
  // Tira 429 TOO_MANY_ATTEMPTS si la cuenta ya tuvo 5 intentos incorrectos en los últimos 15 minutos.
  // Se llama ANTES de verificar la contraseña: con la cuenta bloqueada, ni una correcta pasa.
  abstract assertNotBlocked(accountId: number, now: Date): void;

  // Anota un intento incorrecto. Los correctos no se anotan ni reinician el contador.
  abstract recordFailure(accountId: number, now: Date): void;
}
