# ADR 007 — Hash con bcryptjs y contraseña limitada a 72 bytes

**Estado:** vigente.

## Decisión

- El hash de contraseñas usa `bcryptjs`, con costo `BCRYPT_COST` (4 a 15, 10 por defecto; se valida al
  arrancar; en los e2e se fija en 4).
- La contraseña mide 8 a 64 caracteres **y** como máximo 72 bytes en UTF-8, y debe ser distinta del
  email (comparación literal, sin normalizar la contraseña).
- El hasher (`BcryptPasswordHasher`) vive en `accounts`, implementando su puerto `PasswordHasher`.

## Por qué

- **72 bytes:** bcrypt solo mira los primeros 72 bytes y descarta el resto sin avisar. Una letra con
  tilde ocupa 2 bytes: 64 letras con tilde son 128 bytes, y verificarían igual que sus primeras 36. Dos
  contraseñas distintas serían la misma.
- **En `accounts` y no en `auth`:** `auth` importa `accounts` para el login; si el hasher estuviera en
  `auth`, `accounts` tendría que importar `auth` (ciclo).

## Consecuencias

- Cambiar de algoritmo (por ejemplo argon2) es escribir otro adaptador del puerto y cambiar una línea
  del módulo.
- Un hash guardado que no tiene forma de bcrypt devuelve `false`, no tira error.
- El login no valida largo mínimo ni formato (solo no vacío y largo máximo), para no revelar qué forma
  tienen las credenciales válidas.
