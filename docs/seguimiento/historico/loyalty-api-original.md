# API de configuración de puntos

Esta API administra la configuración global del programa de puntos: la
equivalencia de compra/puntos, la vigencia y la bonificación de primera compra.
La configuración es consumible por futuros casos de uso de compras (RF-020);
este módulo no calcula ni acredita puntos.

El módulo ofrece endpoints independientes para la equivalencia monto/puntos,
la vigencia de puntos y la bonificación por primera compra, además de un
recurso agregado para consultar y versionar la configuración completa.

## Estado de disponibilidad

El módulo REST, la persistencia y la autorización por rol están implementados.
El backend todavía no cuenta con la historia de autenticación que establece el
usuario autenticado en `request.user`. Por diseño seguro, estos endpoints
responden `401 Unauthorized` a todas las solicitudes hasta que el módulo de
autenticación se integre y establezca ese principal confiable.

La historia de autenticación deberá garantizar lo siguiente:

1. Identificar al usuario a partir de credenciales o sesión verificadas por el
   backend (no a partir de un rol enviado por el cliente).
2. Establecer `request.user` en la solicitud, con un campo `role`.
3. Usar el valor exacto `ADMIN` para el rol Administrador. La comparación es
   literal y sensible a mayúsculas/minúsculas.
4. Dejar el principal sin definir cuando la solicitud no esté autenticada.

El guard de este módulo no autentica credenciales ni valida tokens por sí
mismo: comprueba el principal que debe proporcionar el middleware/guard global
de autenticación. Sin una capa que establezca esa identidad, ningún cliente
puede invocar los endpoints, incluso si envía un header o un campo `role`.
Para una solicitud autenticada como otro rol, la respuesta será `403
Forbidden`.

La configuración no guarda `updatedBy`: el principal actual del guard solo
define `role` y no existe todavía un identificador de usuario autenticado
confiable disponible para esta feature. La auditoría de actor queda pendiente
de la integración de autenticación.

## Alcance de las cuatro historias

Este contrato cubre estas cuatro historias de configuración:

1. Definir la equivalencia de monto de compra por puntos otorgados.
2. Definir la vigencia de los puntos, con default RF-010 de 12 meses.
3. Definir la bonificación de primera compra (porcentaje o puntos fijos).
4. Modificar la configuración sin reescribir versiones anteriores (RF-014).

La API almacena reglas; no calcula ni acredita puntos, aplica bonificaciones a
compras, ni procesa vencimientos. El prototipo representa tres secciones
independientes con su propio botón Guardar. Esas secciones se corresponden con
las tres rutas seccionales de abajo.

`/api` es el prefijo REST global de Nest. Las rutas de lectura y escritura
requieren un principal autenticado con rol `ADMIN`.

## Recurso y regla de vigencia

El recurso agregado `/api/loyalty/configuration/current` devuelve la última
versión activa del conjunto completo de ajustes. Los endpoints seccionales
generan cada uno una versión completa nueva y copian sin cambios todos los
demás valores vigentes. La vigencia se mide en meses desde que los puntos se
acreditan. RF-010 fija el default en 12 meses.

## Campos y validaciones

Los nombres del contrato son los nombres de propiedades JSON y se envían en
camelCase.

| Campo           | Tipo JSON                | Obligatorio | Regla                                                              | Persistencia    |
| --------------- | ------------------------ | ----------: | ------------------------------------------------------------------ | --------------- |
| `baseAmount`    | número                   |          Sí | Mayor que cero; como máximo 2 decimales; máximo `9.999.999.999,99` | `DECIMAL(12,2)` |
| `pointsAwarded` | entero                   |          Sí | Entero mayor que cero; máximo `2.147.483.647`                      | `INTEGER`       |
| `updatedAt`     | cadena ISO 8601 (salida) |           — | Fecha de creación de la versión que contiene esta equivalencia.     | `TIMESTAMP(3)`  |

Para el endpoint de vigencia, el contrato usa:

| Campo                    | Tipo JSON                         | Obligatorio | Regla                                                                                                 | Persistencia   |
| ------------------------ | --------------------------------- | ----------: | ----------------------------------------------------------------------------------------------------- | -------------- |
| `pointsExpirationMonths` | entero                            |         No* | Entero entre `1` y `2.147.483.647`; omitido, `null` o vacío se normaliza explícitamente a `12` meses. | `INTEGER`      |
| `updatedAt`              | cadena ISO 8601 (salida)          |           — | Fecha de creación de la versión que contiene la vigencia activa.                                       | `TIMESTAMP(3)` |

`*` El request `PUT` puede omitirlo para activar el default de RF-010; se envía
cuando se desea guardar un período personalizado.

Para la bonificación por primera compra, el contrato usa:

| Campo        | Tipo JSON | Obligatorio | Regla                                                                                    |
| ------------ | --------- | ----------: | ---------------------------------------------------------------------------------------- |
| `bonusType`  | enum      |          Sí | `PERCENTAGE` o `FIXED_AMOUNT`.                                                           |
| `bonusValue` | número    |          Sí | Porcentaje: `1` a `100`, con hasta 2 decimales. Fijo: entero de `1` a `10.000` puntos. |

El monto se expresa en la moneda de compra que maneja el negocio (el prototipo
usa `$`); la API no almacena un código de moneda ni aplica conversión
cambiaria. La unidad monetaria debe ser consistente en todas las compras que
consuman esta equivalencia.

El cuerpo debe ser un objeto JSON con `baseAmount` y `pointsAwarded`. No se
admiten campos adicionales: el `ValidationPipe` global está configurado con
`whitelist` y `forbidNonWhitelisted`. La transformación global convierte
valores compatibles según cada DTO; por interoperabilidad, el frontend debe
enviar números JSON y no cadenas numéricas. La ruta de equivalencia no declara
conversión de cadena a número.

Las validaciones se aplican en más de una capa:

- El DTO HTTP valida los tipos, la positividad, la precisión de dos decimales
  y los máximos antes de ejecutar el caso de uso.
- La entidad de dominio vuelve a comprobar monto finito, positivo, precisión,
  límites e integralidad/positividad de puntos.
- La base de datos protege positividad y la restricción de fila única, además
  de los límites de tipo `DECIMAL(12,2)` e `INTEGER`.

## Consultar la equivalencia vigente

```http
GET /api/loyalty/configuration/points-equivalence
```

No recibe query parameters ni body. Requiere autenticación y rol `ADMIN`.

Respuesta `200 OK`:

```json
{
  "baseAmount": 996,
  "pointsAwarded": 10,
  "updatedAt": "2026-10-07T15:30:00.000Z"
}
```

`updatedAt` es ilustrativo; la respuesta contiene la marca temporal almacenada
por PostgreSQL. Si todavía no se guardó una equivalencia, devuelve `404 Not
Found` con el mensaje `Points equivalence has not been configured`.

## Crear o reemplazar la equivalencia vigente

```http
PUT /api/loyalty/configuration/points-equivalence
Content-Type: application/json
```

Request:

```json
{
  "baseAmount": 996,
  "pointsAwarded": 10
}
```

El ejemplo representa la regla “por cada `$996` de compra, se otorgan 10
puntos”. Este endpoint guarda la equivalencia tal cual: no interpreta
redondeos, compras acumuladas ni el cálculo final de RF-020.

Respuesta `200 OK`:

```json
{
  "baseAmount": 996,
  "pointsAwarded": 10,
  "updatedAt": "2026-10-07T15:30:00.000Z"
}
```

La respuesta informa los datos persistidos y no devuelve `id`, porque el
recurso es una configuración global singleton, no un recurso de colección.

### Ejemplos de solicitud

Con `curl` (el mecanismo concreto para transportar la sesión/credencial deberá
coincidir con la historia de autenticación):

```sh
curl --request PUT \
  --url http://localhost:3000/api/loyalty/configuration/points-equivalence \
  --header 'Content-Type: application/json' \
  --data '{"baseAmount":996,"pointsAwarded":10}'
```

Consulta:

```sh
curl --request GET \
  --url http://localhost:3000/api/loyalty/configuration/points-equivalence
```

Hasta que la autenticación esté integrada, ambos ejemplos responden `401`
porque no hay ningún componente que establezca `request.user`. Cuando se
complete esa historia, estos ejemplos requerirán además el mecanismo de sesión
o credencial que ella defina.

## Consultar la vigencia de puntos

```http
GET /api/loyalty/configuration/points-validity
```

No recibe query parameters ni body. Requiere autenticación y rol `ADMIN`, bajo
las mismas condiciones descritas en “Estado de disponibilidad”.

Respuesta `200 OK`, cuando ya existe una configuración guardada:

```json
{
  "pointsExpirationMonths": 18,
  "updatedAt": "2026-10-07T15:30:00.000Z"
}
```

Después de aplicar la migración de versionado, siempre existe una versión
inicial con una vigencia de 12 meses si no había un valor anterior. El GET
devuelve el default importado/creado y la fecha de esa versión:

```json
{
  "pointsExpirationMonths": 12,
  "updatedAt": "2026-10-07T15:30:00.000Z"
}
```

Los lectores, incluyendo un futuro caso de uso de acreditación, siempre pueden
utilizar el valor retornado sin implementar otro fallback.

## Configurar la vigencia de puntos

```http
PUT /api/loyalty/configuration/points-validity
Content-Type: application/json
```

Payload personalizado:

```json
{
  "pointsExpirationMonths": 18
}
```

`pointsExpirationMonths` debe ser un entero positivo entre `1` y
`2.147.483.647` (rango de PostgreSQL `INTEGER`). La respuesta es `200 OK` y
devuelve el valor persistido junto con su `updatedAt`:

```json
{
  "pointsExpirationMonths": 18,
  "updatedAt": "2026-10-07T15:30:00.000Z"
}
```

Si se omite el campo, se envía como `null` o como cadena vacía, el servicio
asigna y persiste explícitamente el default de 12 meses:

```json
{}
```

```json
{
  "pointsExpirationMonths": null
}
```

Ambas solicitudes exitosas responden con `pointsExpirationMonths: 12` y la
fecha `updatedAt` de la versión nueva que almacena el default.
Cadenas no vacías (incluidos números enviados como texto),
decimales, cero, negativos, valores mayores al máximo y campos adicionales
responden `400 Bad Request`.

Ejemplo:

```sh
curl --request PUT \
  --url http://localhost:3000/api/loyalty/configuration/points-validity \
  --header 'Content-Type: application/json' \
  --data '{"pointsExpirationMonths":18}'
```

Aplicar el default sin personalización:

```sh
curl --request PUT \
  --url http://localhost:3000/api/loyalty/configuration/points-validity \
  --header 'Content-Type: application/json' \
  --data '{}'
```

Un `PUT` sin body o con body JSON `null` también crea/reemplaza el valor por
defecto de 12 meses.

## Consultar bonificación de primera compra

```http
GET /api/loyalty/configuration/first-purchase-bonus
```

No recibe query parameters ni body y, como el resto de la configuración, exige
un usuario autenticado con rol `ADMIN`.

Respuesta `200 OK`:

```json
{
  "bonusType": "FIXED_AMOUNT",
  "bonusValue": 30,
  "updatedAt": "2026-10-07T20:00:00.000Z"
}
```

Si aún no se configuró la bonificación, responde `404 Not Found` con el mensaje
`First purchase bonus has not been configured`. No se inventa una bonificación
implícita cuando no existe un valor guardado.

## Configurar bonificación de primera compra

```http
PUT /api/loyalty/configuration/first-purchase-bonus
Content-Type: application/json
```

Bonificación fija, en puntos adicionales:

```json
{
  "bonusType": "FIXED_AMOUNT",
  "bonusValue": 30
}
```

Bonificación porcentual:

```json
{
  "bonusType": "PERCENTAGE",
  "bonusValue": 15
}
```

La respuesta es `200 OK` y devuelve la configuración persistida:

```json
{
  "bonusType": "PERCENTAGE",
  "bonusValue": 15,
  "updatedAt": "2026-10-07T20:00:00.000Z"
}
```

`PERCENTAGE` acepta desde `1` hasta `100`, inclusive, con máximo dos
decimales; por ejemplo, `15.5` significa un 15,5 % adicional de los puntos
base. El mínimo coincide con el texto auxiliar del prototipo (“Entre 1 y
100”). `FIXED_AMOUNT` sigue el límite indicado en el prototipo: entero desde 1
hasta 10.000 inclusive, expresado en puntos adicionales. Los dos campos son
obligatorios. Las cadenas numéricas no se convierten silenciosamente: el
payload debe llevar `bonusValue` como número JSON. Campos adicionales,
tipo desconocido, `null`, valores no numéricos, negativos, cero, fuera de
rango o decimales no admitidos responden `400 Bad Request`.

Para `FIXED_AMOUNT`, el límite `1..10.000` sigue el texto auxiliar del input
visible en el prototipo (“Entre 1 y 10.000”). Aunque la tabla de tipos enumera
el valor como `int`, se admite precisión decimal de hasta dos lugares para
`PERCENTAGE`.

Este endpoint guarda la regla como una nueva versión y deja las anteriores
intactas. No calcula ni acredita puntos. En particular, la aplicación de la
bonificación a una compra y el tratamiento de redondeos forman parte del caso
de uso que procese las compras, no de este recurso de configuración.

Ejemplo:

```sh
curl --request PUT \
  --url http://localhost:3000/api/loyalty/configuration/first-purchase-bonus \
  --header 'Content-Type: application/json' \
  --data '{"bonusType":"FIXED_AMOUNT","bonusValue":30}'
```

## Errores HTTP

Las respuestas de error del controlador siguen el formato común del módulo de
lealtad:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": ["baseAmount must be a positive number"],
  "path": "/api/loyalty/configuration/points-equivalence",
  "timestamp": "2026-10-07T15:30:00.000Z"
}
```

`timestamp` y los mensajes concretos pueden variar. Según la capa que detecte
el problema, `message` puede ser una cadena o una lista de mensajes. Una
validación de dominio puede incluir `details`:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Base amount must be greater than 0, have no more than 2 decimal places, and be no greater than 9999999999.99",
  "path": "/api/loyalty/configuration/points-equivalence",
  "timestamp": "2026-10-07T15:30:00.000Z",
  "details": [
    {
      "field": "baseAmount",
      "message": "Base amount must be greater than 0, have no more than 2 decimal places, and be no greater than 9999999999.99"
    }
  ]
}
```

|                      Estado | Situación                                                                                                                                                                                                                                                                                                |
| --------------------------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|                    `200 OK` | Equivalencia consultada o creada/actualizada correctamente.                                                                                                                                                                                                                                              |
|           `400 Bad Request` | JSON inválido, campo requerido ausente (equivalencia/bonificación), campo extra, tipo incorrecto o valor fuera de rango. En vigencia se acepta omitir/null/vacío como 12; se rechazan fracciones y valores no positivos. En bonificación se validan el enum y los rangos/tipos específicos de cada tipo. |
|          `401 Unauthorized` | No existe `request.user`; actualmente es la respuesta esperada hasta integrar autenticación.                                                                                                                                                                                                             |
|             `403 Forbidden` | Existe un principal autenticado, pero su `role` no es exactamente `ADMIN`.                                                                                                                                                                                                                               |
|             `404 Not Found` | Equivalencia o bonificación de primera compra aún no configurada. La consulta de vigencia devuelve el default de 12 meses.                                                                                                                                                                               |
| `500 Internal Server Error` | Error no previsto, por ejemplo una falla de persistencia; se registra en el log del backend sin exponer detalles internos al cliente.                                                                                                                                                                    |

## Persistencia y migraciones

Los modelos Prisma previos `LoyaltyPointsConfiguration`,
`LoyaltyPointsValidityConfiguration` y `FirstPurchaseBonusConfiguration` están
en `backend/prisma/schema.prisma`. Las tablas PostgreSQL son
`loyalty_points_configuration`, `loyalty_points_validity_configuration` y
`first_purchase_bonus_configuration`. Estas tablas singleton se conservan
como datos legacy y fuente de importación de la versión inicial; la
persistencia activa pasa a ser `LoyaltyProgramConfiguration`, un snapshot
completo descrito en la sección RF-014 al final de este documento.

| Columna          | Tipo            | Regla                                               |
| ---------------- | --------------- | --------------------------------------------------- |
| `id`             | `INTEGER`       | PK; por defecto `1`; CHECK obliga a que sea `1`.    |
| `base_amount`    | `DECIMAL(12,2)` | Obligatorio; CHECK `> 0`.                           |
| `points_awarded` | `INTEGER`       | Obligatorio; CHECK `> 0`.                           |
| `created_at`     | `TIMESTAMP(3)`  | Obligatorio; por defecto hora actual.               |
| `updated_at`     | `TIMESTAMP(3)`  | Obligatorio; actualizado por Prisma en cada upsert. |

La PK más el CHECK `id = 1` impiden que haya dos configuraciones activas a la
vez. Los CHECK positivos mantienen las invariantes incluso si otro proceso
escribe directamente en la tabla. La migración inicial está en
`backend/prisma/migrations/20261007150000_add_loyalty_points_configuration/`.
Como en el resto del proyecto, aplicar migraciones es una tarea explícita de
despliegue; la API no ejecuta migraciones automáticamente al iniciar.

Desde `backend/`, en desarrollo:

```sh
npx prisma migrate dev
```

En un ambiente de despliegue:

```sh
npx prisma migrate deploy
```

La vigencia se crea en
`backend/prisma/migrations/20261007170000_add_points_validity_configuration/`;
su columna `points_expiration_months` tiene default SQL `12` y un CHECK
positivo, además de una PK singleton. La migración de equivalencia previa no
se modifica.

| Columna                    | Tipo           | Regla                                               |
| -------------------------- | -------------- | --------------------------------------------------- |
| `id`                       | `INTEGER`      | PK; por defecto `1`; CHECK obliga a que sea `1`.    |
| `points_expiration_months` | `INTEGER`      | Obligatorio; default SQL `12`; CHECK `> 0`.         |
| `created_at`               | `TIMESTAMP(3)` | Obligatorio; por defecto hora actual.               |
| `updated_at`               | `TIMESTAMP(3)` | Obligatorio; actualizado por Prisma en cada upsert. |

La bonificación está en
`backend/prisma/migrations/20261007173000_add_first_purchase_bonus_configuration/`.
La migración crea el enum PostgreSQL `FirstPurchaseBonusType` (`PERCENTAGE`,
`FIXED_AMOUNT`) y una tabla singleton con `bonus_type`,
`bonus_value DECIMAL(12,2)`, `created_at` y `updated_at`. La migración inicial
definía el porcentaje como `0.1..100`; la migración de ajuste indicada abajo
lo alinea al rango vigente `1..100`. El rango de puntos fijos es `1..10000`.

La migración
`backend/prisma/migrations/20261008180000_set_percentage_bonus_minimum_to_one/`
alinea a `1..100` el mínimo de porcentaje en las tablas legacy y versionada.
No modifica migraciones anteriores ni cambia valores guardados. Si encuentra
un porcentaje existente menor que `1`, aborta explícitamente: hay que revisar
ese dato antes de aplicar la migración, para no alterar silenciosamente una
configuración o un snapshot histórico.

| Columna       | Tipo                          | Regla                                               |
| ------------- | ----------------------------- | --------------------------------------------------- |
| `id`          | `INTEGER`                     | PK; por defecto `1`; CHECK obliga a que sea `1`.    |
| `bonus_type`  | `FirstPurchaseBonusType` enum | `PERCENTAGE` o `FIXED_AMOUNT`.                      |
| `bonus_value` | `DECIMAL(12,2)`               | Positivo; CHECK condicional según tipo.             |
| `created_at`  | `TIMESTAMP(3)`                | Obligatorio; por defecto hora actual.               |
| `updated_at`  | `TIMESTAMP(3)`                | Obligatorio; actualizado por Prisma en cada upsert. |

El servicio de aplicación recibe el puerto `LoyaltyConfigurationRepository`
por inyección de dependencias. `LoyaltyPrismaRepository` implementa el puerto
con Prisma. Después de aplicar la migración RF-014, cada ruta seccional
actualiza una propiedad mediante versionado y conserva las demás. El
`LoyaltyService` exportado por `LoyaltyModule` expone
`setPointsEquivalence`, `getCurrentPointsEquivalence`,
`setPointsValidity` y `getCurrentPointsValidity` para que un futuro módulo de
compras reutilice los ajustes. También ofrece `setFirstPurchaseBonus` y
`getCurrentFirstPurchaseBonus`; consumidores usan el servicio, no el
repositorio ni las tablas directamente.

## Estructura implementada

```text
backend/src/loyalty/
  domain/
    points-equivalence.ts                 # invariantes y entidad
    points-validity.ts                    # default RF-010 e invariantes de vigencia
    first-purchase-bonus.ts               # tipo, rangos y entidad de bonificación
    errors/domain.error.ts                # error de validación de dominio
    port/loyalty-configuration.repository.ts
  application/
    loyalty.service.ts                    # casos de uso
  infrastructure/
    loyalty-prisma.repository.ts           # adaptador PostgreSQL/Prisma
  http/
    loyalty.controller.ts                 # GET y PUT REST
    points-validity.controller.ts         # GET y PUT de vigencia
    first-purchase-bonus.controller.ts    # GET y PUT de bonificación
    validators/first-purchase-bonus-value.validator.ts
    dto/                                   # DTO de request y response
    guards/admin-role.guard.ts              # autorización ADMIN
    filters/loyalty-exception.filter.ts     # formato de errores HTTP
  loyalty.module.ts                        # composición e inyección
```

`AppModule` importa `LoyaltyModule`; el prefijo `/api` viene de `main.ts`.
La validación DTO usa el `ValidationPipe` global existente. No se agregó código
de frontend.

## Pruebas y verificación

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

## Configuración versionada del programa (RF-014)

RF-014 conserva el estado de cada regla que estuvo vigente. La configuración
actual se escribe en `loyalty_program_configurations`; las filas ya escritas
son históricas y no se actualizan ni eliminan. Solo se cambia en la fila
anterior `is_active` de `true` a `false` y se registra `valid_to`; la nueva
versión guarda una copia completa, tiene `is_active = true`, `valid_to = null`
y un `version` secuencial.

La migración
`backend/prisma/migrations/20261007180000_version_loyalty_program_configuration/migration.sql`
crea la tabla y conserva los valores de las tres tablas singleton previas como
versión `1`. Si no existían equivalencia o bonificación, sus dos columnas
quedan en `null`; la vigencia se importa o se inicializa en `12`. Las tablas
anteriores no se borran ni modifican y dejan de ser la fuente de lectura y
escritura de la API. Al desplegar, debe aplicarse la migración antes de
actualizar la aplicación.

La base de datos garantiza que como máximo exista una versión activa mediante
el índice único parcial
`loyalty_program_configurations_one_active_key`; restricciones `CHECK`
protegen las parejas de campos equivalencia/bonificación, la vigencia y los
rangos de bonificación. El índice parcial se define manualmente en SQL, ya que
Prisma no representa esa condición en el modelo declarativo.

### Obtener la configuración activa

```http
GET /api/loyalty/configuration/current
```

Requiere un usuario autenticado con rol `ADMIN`. No recibe body. Respuesta
`200 OK`:

```json
{
  "version": 4,
  "baseAmount": 996,
  "pointsAwarded": 10,
  "pointsExpirationMonths": 12,
  "bonusType": "PERCENTAGE",
  "bonusValue": 15,
  "isActive": true,
  "validFrom": "2026-10-07T15:30:00.000Z",
  "validTo": null,
  "createdAt": "2026-10-07T15:30:00.000Z"
}
```

`baseAmount` y `pointsAwarded` son ambos `null` antes de configurar la
equivalencia; `bonusType` y `bonusValue` son ambos `null` antes de configurar
la bonificación. `pointsExpirationMonths` siempre incluye el default de `12`.
La migración deja una versión activa inicial, incluso en una base sin valores
previos, por lo que este GET normalmente devuelve `200`.

### Guardar una configuración completa

```http
PUT /api/loyalty/configuration
Content-Type: application/json
```

Todos los parámetros configurables se mandan como un único snapshot:

```json
{
  "baseAmount": 996,
  "pointsAwarded": 10,
  "pointsExpirationMonths": 12,
  "bonusType": "PERCENTAGE",
  "bonusValue": 15
}
```

`baseAmount`, `pointsAwarded`, `bonusType` y `bonusValue` son obligatorios. Si
se omite `pointsExpirationMonths`, el DTO y el dominio guardan explícitamente
`12`, según RF-010. Los valores, reglas y límites por campo son los descritos
en las tablas de validación anteriores. El pipeline rechaza propiedades
desconocidas y el servicio vuelve a verificar las reglas de dominio antes de
persistir.

Respuesta `200 OK`: el mismo DTO de lectura con el nuevo `version`, fechas de
vigencia y `isActive: true`. Una actualización de la versión `N` crea la
versión `N + 1`. El proceso del repositorio está en una transacción Prisma:

1. Toma un advisory lock transaccional de PostgreSQL para serializar
   actualizaciones concurrentes.
2. Lee la versión activa y la desactiva con `valid_to` establecido.
3. Inserta el snapshot completo como la nueva versión activa.
4. Confirma ambos cambios juntos; cualquier error revierte ambas operaciones.

Las rutas seccionales previas (`PUT` de equivalencia, vigencia y bonificación)
siguen aceptando sus DTOs originales y crean una versión nueva aplicando un
patch sobre el snapshot actual. Así se evita que una actualización de un campo
restablezca o descarte accidentalmente los otros.

Los endpoints de lectura y escritura están protegidos por `AdminRoleGuard`.
Sin principal `request.user` responden `401`; con un rol distinto de `ADMIN`,
responden `403`. La integración de autenticación que establece ese principal
sigue siendo requisito operativo para consumo por clientes reales.

### Garantía y límite respecto a movimientos pasados

La nueva versión no ejecuta `UPDATE` sobre una versión anterior y ninguna
configuración se aplica retroactivamente desde este módulo. Sin embargo, el
esquema actual no contiene entidades de compra, movimiento ni acreditación de
puntos; por eso aún no existe un movimiento pasado que esta historia pueda
consultar o contrastar. Cuando RF-020 implemente esas operaciones, deberá
leer la versión activa y guardar en cada movimiento el número de versión y los
valores calculados (snapshot de puntos/bonificación/vencimiento). No deberá
recalcular movimientos históricos leyendo la configuración activa en ese
momento.

El modelo actual tampoco tiene una fuente autenticada de `accountId` expuesta
al feature; la nueva tabla no inventa un `updated_by` ni simula auditoría de
actor. La atribución de cambios puede agregarse cuando autenticación propague
un identificador confiable.

## Guía de integración para frontend

### Rutas que corresponden a los controles del prototipo

El prototipo muestra tres formularios con guardado independiente. El flujo
recomendado para esa pantalla es:

1. Al abrir la sección, consultar `GET /api/loyalty/configuration/current`
   para obtener el snapshot completo en una llamada.
2. Mostrar equivalencia y bonificación vacías si sus valores vienen como
   `null`; mostrar vigencia `12` cuando corresponda.
3. Al pulsar el botón Guardar de una sección, enviar solo sus campos a la
   ruta `PUT` de esa sección descrita arriba. Ese `PUT` genera una nueva
   versión y preserva los datos de las otras dos secciones.
4. Si el frontend mantiene en pantalla la versión agregada, volver a consultar
   `GET /api/loyalty/configuration/current` después de guardar para refrescar
   `version`, fechas y el snapshot más reciente.

| Acción de interfaz               | Método y ruta                                               | Campos de request                                                                      |
| -------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Cargar snapshot completo         | `GET /api/loyalty/configuration/current`                    | Ninguno                                                                                |
| Guardar equivalencia             | `PUT /api/loyalty/configuration/points-equivalence`         | `baseAmount`, `pointsAwarded`                                                          |
| Guardar vigencia                 | `PUT /api/loyalty/configuration/points-validity`            | `pointsExpirationMonths` (opcional; ausente/null/vacío aplica 12)                      |
| Guardar bonificación             | `PUT /api/loyalty/configuration/first-purchase-bonus`       | `bonusType`, `bonusValue`                                                              |
| Guardar snapshot de todas las secciones | `PUT /api/loyalty/configuration`                    | Equivalencia y bonificación completas; vigencia opcional (recomendado incluirla)      |

También se puede usar `PUT /api/loyalty/configuration` si la interfaz ofrece
un único botón de guardar para todos los campos. Este endpoint exige enviar
`baseAmount`, `pointsAwarded`, `bonusType` y `bonusValue` completos. Aunque
`pointsExpirationMonths` puede omitirse técnicamente (el DTO asignará `12`),
se recomienda enviarlo siempre para no reemplazar inadvertidamente una
vigencia personalizada. Para una interfaz con guardados independientes, no
usar este `PUT` completo con una copia posiblemente desactualizada de los
otros campos.

### Ejemplo de carga del formulario

Request:

```http
GET /api/loyalty/configuration/current
```

Respuesta inicial posible después de la migración:

```json
{
  "version": 1,
  "baseAmount": null,
  "pointsAwarded": null,
  "pointsExpirationMonths": 12,
  "bonusType": null,
  "bonusValue": null,
  "isActive": true,
  "validFrom": "2026-10-07T15:30:00.000Z",
  "validTo": null,
  "createdAt": "2026-10-07T15:30:00.000Z"
}
```

Los ejemplos prellenados que aparezcan en un prototipo (por ejemplo, `$1000`,
10 puntos o 30 puntos fijos) no son valores por defecto del backend. Solo la
vigencia tiene un default funcional de 12 meses. La equivalencia y la
bonificación se consideran no configuradas cuando la respuesta agregada
contiene `null` en sus pares de campos.

### Ejemplos por control

Equivalencia, botón “Guardar” de esa sección:

```http
PUT /api/loyalty/configuration/points-equivalence
Content-Type: application/json
```

```json
{
  "baseAmount": 1000,
  "pointsAwarded": 10
}
```

Vigencia:

```http
PUT /api/loyalty/configuration/points-validity
Content-Type: application/json
```

```json
{
  "pointsExpirationMonths": 12
}
```

Bonificación porcentual (el botón de tipo “Porcentaje” equivale al enum
`PERCENTAGE`):

```http
PUT /api/loyalty/configuration/first-purchase-bonus
Content-Type: application/json
```

```json
{
  "bonusType": "PERCENTAGE",
  "bonusValue": 15.5
}
```

Bonificación fija (el botón “Puntos fijos” equivale al enum `FIXED_AMOUNT`):

```json
{
  "bonusType": "FIXED_AMOUNT",
  "bonusValue": 30
}
```

En todos los casos `Content-Type` es `application/json`. Enviar importes y
cantidades como números JSON, con punto decimal cuando corresponda; no enviar
separadores de miles, símbolos de moneda, sufijos como `%` o texto localizado.
La localización de presentación (por ejemplo, coma decimal) es responsabilidad
del frontend y debe convertirse a un valor numérico antes del request. Para
la equivalencia, la moneda del prototipo es `$`, pero no se envía ni persiste
un código ISO de moneda.

### Respuestas, errores y estados de pantalla

- `200 OK`: actualización guardada. Las rutas seccionales responden su DTO
  (`baseAmount`, `pointsAwarded`, `pointsExpirationMonths` o
  `bonusType`/`bonusValue`, más `updatedAt`). La ruta agregada responde además
  `version`, `isActive`, `validFrom`, `validTo` y todos los campos.
- `400 Bad Request`: request inválido, campos requeridos faltantes, campos
  desconocidos, tipos incorrectos o valores fuera de rango. Mantener la
  edición y mostrar errores de validación; no informar éxito ni limpiar el
  formulario.
- `401 Unauthorized`: falta autenticación reconocida por el backend. Iniciar
  el flujo de autenticación cuando esté implementado, o mostrar el estado de
  sesión correspondiente; reintentar sin credenciales no resolverá el error.
- `403 Forbidden`: usuario autenticado sin rol `ADMIN`; informar falta de
  permisos y no reintentar automáticamente.
- `404 Not Found`: solo en las rutas seccionales de equivalencia o
  bonificación cuando ese ajuste aún no se configuró. Tratarlo como estado
  inicial vacío, no como fallo de servidor. La vigencia devuelve el default
  de 12 meses; la ruta agregada devuelve `200` después de aplicar la migración.
- `500 Internal Server Error`: error inesperado del backend; conservar los
  datos ingresados y permitir reintentar de forma explícita.

El objeto de error contiene `statusCode`, `error`, `message`, `path` y
`timestamp`; `message` puede ser una cadena o una lista. Algunas validaciones
de dominio agregan `details: [{ "field": "...", "message": "..." }]`. No
depender de una redacción literal del mensaje para decidir si guardar fue
exitoso: usar el código HTTP y, en caso de `400`, relacionar `details.field`
con el control cuando esté presente.

### Versiones e historial

Cada guardado exitoso, incluso por ruta seccional, genera una nueva versión.
La respuesta de `PUT /api/loyalty/configuration` informa la versión nueva; la
respuesta de un `PUT` seccional no incluye el número de versión. No existe por
ahora un endpoint para listar o consultar versiones históricas. No presentar
la versión como historial navegable ni permitir “restaurar versión” desde
frontend hasta que se implemente un contrato específico.

Los cambios concurrentes se serializan en base de datos, pero el API no exige
una versión esperada ni devuelve `409 Conflict` por edición obsoleta. Un
guardado completo basado en una copia antigua puede sobrescribir otros campos
con los valores antiguos. Por eso los botones independientes deben usar las
rutas seccionales y una operación de guardado total debe refrescar el snapshot
antes de escribir. Cada request exitoso crea una versión nueva incluso cuando
el valor enviado es igual al actual; deshabilitar el botón mientras la
solicitud está en curso y no reintentar automáticamente un timeout sin
consultar primero el snapshot vigente.

### Autenticación y configuración de ambiente

El guard exige que el backend de autenticación establezca `request.user.role`
igual exactamente a `ADMIN`. Actualmente la integración de autenticación aún
no está disponible: en ejecución normal, las solicitudes responden `401`
hasta que esa historia provea el principal. Coordinar con el equipo de backend
el mecanismo real (cookie/sesión o `Authorization: Bearer ...`) y el origen
base por ambiente antes de habilitar el consumo desde el navegador. El header
`x-test-auth-role` solo existe en pruebas e2e y no es una credencial válida
para frontend.

El frontend debe centralizar el prefijo `/api` y el mecanismo de credenciales
en su cliente HTTP, evitar duplicar `/api` en cada servicio y configurar
correctamente el manejo de cookies/token cuando autenticación quede definida.
No asumir que el endpoint está públicamente disponible solo porque está
documentado.

## Fuera del alcance de esta historia

- Autenticación, creación/validación de sesiones o tokens y middleware que
  popula `request.user`; depende de la historia de autenticación.
- Auditoría de qué usuario hizo el cambio o fechas futuras de activación.
- Interpretación de compras, acumulación, redondeo o acreditación de puntos
  (RF-020), incluida la aplicación del porcentaje o suma de puntos fijos a una
  compra concreta.
- Cálculo del vencimiento por lote de puntos, proceso periódico que los expire
  o notificaciones previas al vencimiento. Esta API almacena los meses de
  vigencia; RF-010 no implementa el proceso de expiración.
- Código frontend y traducción a una moneda distinta de la unidad `$` del
  negocio.
