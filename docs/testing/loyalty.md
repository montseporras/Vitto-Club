# Pruebas y verificación del programa de puntos

> Extraído de `funcionalidades/configuracion-de-puntos.md`.

Las pruebas unitarias del módulo están junto al código (`*.spec.ts`) y cubren
entidades/reglas de dominio, validación DTO, servicio, controladores,
autorización del guard y persistencia/versionado del repositorio. La prueba e2e
`backend/test/loyalty.e2e-spec.ts` recorre HTTP, DTO, autorización, servicio,
repositorio Prisma y PostgreSQL. Comprueba el default de 12 meses, equivalencia
y vigencia, bonificaciones fijas y porcentuales, actualizaciones, autorización,
rangos por tipo y rechazo de payloads inválidos sin persistirlos.

Comandos desde `backend/`:

```sh
npm run test -- --runInBand src/loyalty
npm run build
npm run lint -- src/loyalty/
npx prisma validate
npm run test:e2e -- --runInBand
```

La prueba e2e requiere Docker/PostgreSQL local, `DATABASE_URL_TEST` apuntando a
una base local cuyo nombre contenga `test` y que dicha base exista. El setup
global aplica allí las migraciones antes de correr; se niega a usar un host
remoto o una base que no incluya `test`. En las pruebas e2e, un middleware
**definido únicamente por el test** simula el principal que la futura historia
de autenticación deberá proveer. No es una ruta de autenticación ni está
registrado en la aplicación de producción. La base de tests es separada de la
base de desarrollo y no debe apuntar a datos reales.

