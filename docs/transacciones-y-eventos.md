# Transacciones y eventos entre módulos: cómo funciona

Guía para entender qué se construyó, por qué, en qué archivos está y cómo se
usa. No hace falta saber nada de transacciones para leerla.

- **Estado:** el mecanismo está construido y probado. Todavía ningún
  repositorio de `customers`, `employees` ni `accounts` lo usa (ver la sección
  "Qué falta").
- **Documentos relacionados:** `docs/ARCHITECTURE.md` (las reglas, en corto) y
  `docs/spike-transacciones.md` (la prueba que se hizo antes de adoptar la
  librería).

---

## 1. El problema

Hay operaciones que escriben en más de una tabla y solo tienen sentido si se
hacen **todas o ninguna**. Tres ejemplos de este proyecto:

| Operación | Escribe en | Qué pasa si queda a medias |
|---|---|---|
| Registrar un cliente con su cuenta | `customers` y `accounts` | Un cliente que existe pero no puede entrar |
| Dar de baja un empleado | `employees` y `accounts` | Un empleado inactivo cuya cuenta sigue activa: puede seguir iniciando sesión |
| Cambiar el rol de un empleado | `employees` y `accounts` | El empleado es cajero pero su cuenta dice administrador |

Además, cada tabla pertenece a un módulo distinto, y la arquitectura dice que
los módulos no se meten en los datos de otro. Entonces hay dos preguntas:

1. ¿Cómo hago que dos escrituras sean "todo o nada"? → **transacciones**.
2. ¿Cómo hago que un módulo reaccione a lo que hizo otro sin que dependan
   mutuamente? → **eventos de dominio**.

---

## 2. Qué es una transacción

Una transacción es un grupo de operaciones que la base de datos trata como
**una sola**. Tiene tres momentos:

- **BEGIN**: "empiezo un grupo de cambios".
- **COMMIT**: "terminé bien, guardá todo de forma definitiva".
- **ROLLBACK**: "algo falló, deshacé todo lo que hice desde el BEGIN".

En SQL se ve así:

```sql
BEGIN;
UPDATE employees SET is_active = false WHERE id = 5;
UPDATE accounts  SET is_active = false WHERE employee_id = 5;
COMMIT;
```

Si entre el primer `UPDATE` y el `COMMIT` algo sale mal, en vez de `COMMIT` se
ejecuta `ROLLBACK` y la base queda **exactamente** como estaba antes del
`BEGIN`. El empleado 5 sigue activo, como si nunca se hubiera intentado nada.

Dos propiedades que importan acá:

- **Atomicidad:** todo o nada. No existe el "quedó a medias".
- **Aislamiento:** mientras la transacción no hizo `COMMIT`, **nadie más ve
  sus cambios**. Otra consulta, por otra conexión, sigue viendo los datos
  viejos. Recién con el `COMMIT` los cambios aparecen para todos, de golpe.

Una comparación: es como armar un pedido en un carrito. Mientras agregás y
sacás cosas, el local no descuenta stock ni te cobra. "Confirmar compra" es el
`COMMIT`. "Vaciar carrito" es el `ROLLBACK`.

---

## 3. Por qué no alcanzaba con lo que Prisma trae

Prisma ya sabe hacer transacciones. La forma habitual es esta:

```ts
await prisma.$transaction(async (tx) => {
  await tx.employee.update({ ... });
  await tx.account.update({ ... });
});
```

Prisma te entrega un cliente especial, `tx`. Todo lo que se haga **con ese
`tx`** va dentro de la transacción. Lo que se haga con el `prisma` normal va
por fuera.

El problema aparece con nuestra arquitectura:

- La escritura de `employees` está en el repositorio de `employees`.
- La escritura de `accounts` está en el repositorio de `accounts`.
- Para que las dos usen el mismo `tx`, habría que **pasar el `tx` por
  parámetro** desde el caso de uso, a través de los services, hasta los dos
  repositorios.

Eso rompe la arquitectura: la capa `application/` (los casos de uso) tendría
que conocer un objeto de Prisma, cuando la regla es que solo depende de
puertos. Y los services que un módulo exporta tendrían que aceptar un `tx` en
todas sus firmas.

---

## 4. La solución: transacción "ambiente"

La idea es que el `tx` **no se pase por parámetro, sino que esté "en el
ambiente"**: guardado en un lugar donde cualquier código que se ejecute dentro
de esa operación lo pueda encontrar.

Ese lugar lo da Node con `AsyncLocalStorage`. Funciona como una mochila que
viaja con una operación asíncrona:

1. Al empezar la operación, se pone algo en la mochila (el `tx`).
2. Todo el código que se ejecute como parte de esa operación, por más
   funciones y `await` que haya en el medio, puede abrir la mochila y sacarlo.
3. Otra operación que corra al mismo tiempo (otro request) tiene **su propia
   mochila**. No se mezclan.

Entonces el flujo queda así:

```
Caso de uso:      "abro una transacción"        → se guarda el tx en la mochila
  Repositorio A:  "dame el cliente actual"      → recibe el tx
  Repositorio B:  "dame el cliente actual"      → recibe el mismo tx
Caso de uso:      termina sin errores           → COMMIT
                  (o tira un error)             → ROLLBACK
```

Nadie le pasó nada a nadie por parámetro. La librería que hace esto por
nosotros se llama `nestjs-cls` ("CLS" es *continuation-local storage*, el
nombre genérico de la mochila; no tiene nada que ver con CI). Sobre ella,
`@nestjs-cls/transactional` agrega el manejo de transacciones.

---

## 5. Los archivos

| Archivo | Qué es |
|---|---|
| `backend/src/prisma/prisma-transaction-runner.ts` | **La pieza central.** Abre transacciones y entrega el cliente actual |
| `backend/src/prisma/prisma.module.ts` | Lo registra y lo exporta para toda la aplicación |
| `backend/src/app.module.ts` | Enciende las dos librerías (transacciones y eventos) |
| `backend/src/shared/events/domain-events.ts` | El contrato de los eventos: nombres y datos |
| `backend/test/transactions.e2e-spec.ts` | Los tests que prueban que todo esto funciona |
| `backend/package.json` | Cuatro dependencias nuevas |
| `docs/ARCHITECTURE.md` | Sección "Operaciones que cruzan módulos" con las reglas |

Dependencias agregadas: `nestjs-cls`, `@nestjs-cls/transactional`,
`@nestjs-cls/transactional-adapter-prisma` y `@nestjs/event-emitter`.

---

## 6. El código, pieza por pieza

### 6.1 El adaptador: `PrismaTransactionRunner`

```ts
@Injectable()
export class PrismaTransactionRunner {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaService>>,
  ) {}

  run<T>(fn: () => Promise<T>): Promise<T> {
    return this.txHost.withTransaction(fn);
  }

  get client() {
    return this.txHost.tx;
  }
}
```

Tiene solo dos cosas:

- **`run(fn)`**: abre una transacción y ejecuta `fn` adentro.
  - Si `fn` termina normalmente → `COMMIT`.
  - Si `fn` tira un error → `ROLLBACK`, y el error sigue subiendo.
  - Si ya había una transacción abierta (un `run` dentro de otro), **no abre
    otra**: se suma a la que existe.
- **`client`**: devuelve "el cliente que corresponde ahora".
  - Si hay una transacción en curso, es el `tx` de esa transacción.
  - Si no hay ninguna, es el `PrismaService` de siempre.

Esa segunda propiedad es la clave para los repositorios: un repositorio que
usa `client` funciona igual dentro y fuera de una transacción, sin saber en
cuál de los dos casos está.

**Por qué existe esta clase en vez de usar la librería directo:** para que la
librería quede encerrada en un solo lugar. Si un día se cambia por otra, o se
hace a mano, se toca este archivo y nada más.

### 6.2 El encendido en `app.module.ts`

```ts
ClsModule.forRoot({
  global: true,
  middleware: { mount: true },
  plugins: [
    new ClsPluginTransactional({
      imports: [PrismaModule],
      adapter: new TransactionalAdapterPrisma({ prismaInjectionToken: PrismaService }),
    }),
  ],
}),
EventEmitterModule.forRoot(),
```

- `global: true`: disponible en todos los módulos.
- `middleware: { mount: true }`: prepara "la mochila" al entrar cada request.
- `prismaInjectionToken: PrismaService`: le dice a la librería que use nuestro
  cliente de Prisma, tal como está. No hubo que modificar `PrismaService`.
- `EventEmitterModule.forRoot()` va **sin opciones a propósito** (ver 7.4).

### 6.3 Cómo lo usa un caso de uso (ejemplo ilustrativo)

> Este código todavía no existe en el repo. Muestra la forma que va a tener.

El caso de uso no importa `PrismaTransactionRunner` directamente. Importa un
**puerto** de su propio módulo, que es una clase abstracta mínima:

```ts
// <modulo>/domain/port/transaction-runner.ts
export abstract class TransactionRunner {
  abstract run<T>(fn: () => Promise<T>): Promise<T>;
}
```

En el `*.module.ts` se conecta ese puerto con la implementación real:

```ts
{ provide: TransactionRunner, useExisting: PrismaTransactionRunner }
```

Y el caso de uso lo usa así:

```ts
async deactivate(id: number): Promise<Employee> {
  return this.transactions.run(async () => {
    const employee = await this.findById(id);
    employee.deactivate();
    await this.employeesRepository.updateStatus(employee);
    // ...lo que siga también queda dentro de la transacción
    return employee;
  });
}
```

Así `application/` sigue dependiendo solo de puertos, como pide la
arquitectura.

### 6.4 Cómo lo usa un repositorio (ejemplo ilustrativo)

> Tampoco existe todavía. Hoy los repositorios usan `this.prisma` directo.

El único cambio es de dónde sale el cliente:

```ts
// Antes
constructor(private readonly prisma: PrismaService) {}
await this.prisma.employee.update({ ... });

// Después
constructor(private readonly tx: PrismaTransactionRunner) {}
await this.tx.client.employee.update({ ... });
```

Los repositorios están en `infrastructure/`, que ya depende de Prisma, así que
pueden usar el adaptador directamente sin pasar por un puerto.

---

## 7. Eventos de dominio

### 7.1 El problema que resuelven

Dar de baja un empleado tiene que dar de baja su cuenta. Lo más directo sería
que `employees` llame a `accounts`. Pero `accounts` también necesita a
`employees` (para saber si el empleado existe, si está activo, qué rol tiene).

Si cada uno llama al otro, hay una **dependencia circular**. Nest la puede
resolver con `forwardRef`, pero es una señal de mal diseño y en este proyecto
se decidió no usarlo.

### 7.2 La idea

En vez de llamar, **avisar**.

- `employees` no llama a `accounts`. Publica un aviso: *"di de baja al
  empleado 5"*. No sabe quién escucha, ni si escucha alguien.
- `accounts` está suscripto a ese aviso y reacciona: da de baja la cuenta.

Resultado: `accounts` conoce a `employees`, pero `employees` no conoce a
`accounts`. La dependencia va en un solo sentido y el ciclo desaparece.

### 7.3 El contrato: `domain-events.ts`

```ts
export const EMPLOYEE_DEACTIVATED = 'employee.deactivated';
export type EmployeeDeactivatedEvent = { employeeId: number };

export const EMPLOYEE_ROLE_CHANGED = 'employee.role-changed';
export type EmployeeRoleChangedEvent = {
  employeeId: number;
  previousRole: 'ADMIN' | 'CASHIER';
  newRole: 'ADMIN' | 'CASHIER';
};

export const ACCOUNT_DEACTIVATED = 'account.deactivated';
export type AccountDeactivatedEvent = { accountId: number };
```

Es la lista de avisos que existen y qué datos lleva cada uno.

| Evento | Quién lo publica | Quién lo escucha | Para qué |
|---|---|---|---|
| `employee.deactivated` | `employees` | `accounts` | Dar de baja la cuenta del empleado |
| `employee.role-changed` | `employees` | `accounts` | Actualizar la copia del rol en la cuenta |
| `account.deactivated` | `accounts` | `auth` | Revocar las sesiones abiertas de esa cuenta |

**Por qué está en una carpeta compartida (`shared/events/`) y no dentro de un
módulo:** si `accounts` importara el evento desde `employees/domain`, se
rompería la regla de que ningún módulo importa el dominio de otro. Y si cada
módulo tuviera su propia copia, un error de tipeo en el nombre haría que el
aviso nunca llegue, **sin ningún error**. Un contrato entre dos partes tiene
que tener una sola definición.

Los datos son siempre primitivos (números, strings): nunca viaja una entidad.

### 7.4 Las reglas, y por qué cada una

**Regla 1 — Se publica con `await emitAsync`, dentro de la transacción y
después de escribir lo propio.**

```ts
await this.eventEmitter.emitAsync(EMPLOYEE_DEACTIVATED, { employeeId: id });
```

El `await` es lo que hace que quien publica **espere** a que terminen los que
escuchan. Sin `await`, el caso de uso seguiría de largo y haría `COMMIT` antes
de saber si el que escucha falló.

**Regla 2 — Se escucha con `suppressErrors: false`.**

```ts
@OnEvent(EMPLOYEE_DEACTIVATED, { suppressErrors: false })
async onEmployeeDeactivated(event: EmployeeDeactivatedEvent) { ... }
```

Esta es la más fácil de olvidar y la más importante. Por defecto la librería
hace esto con los errores de quien escucha (está en su código fuente):

```js
catch (e) {
  if (options?.suppressErrors ?? true) {
    this.logger.error(error.message, error.stack);   // lo anota y sigue
  } else {
    throw e;                                          // lo deja subir
  }
}
```

O sea: sin `suppressErrors: false`, el error se escribe en el log y **se
traga**. La operación seguiría como si nada y se haría `COMMIT`.

**Regla 3 — No activar las opciones `async` ni `nextTick` del emisor.** Esas
opciones hacen que los que escuchan corran "más tarde", fuera del flujo de
quien publica. Perderían la mochila y, con ella, la transacción.

**Regla 4 — Los repositorios que participan usan `client` del adaptador.** Si
el que escucha lee con el `PrismaService` normal, va por otra conexión y, por
el aislamiento, **no ve** lo que se acaba de escribir en la transacción.

**Regla 5 — Los errores de quien escucha, si tienen que llegar al usuario, son
`HttpException`.** Por ejemplo `ConflictException`. El error viaja hasta el
controller del módulo que originó la operación, y el filtro de errores de ese
módulo no conoce los errores propios de otro módulo: los trataría como un
error desconocido (500).

### 7.5 El ejemplo completo: degradar al último administrador

Alguien hace `PATCH /api/empleados/1` para pasar al único administrador a
cajero. No se puede permitir: el sistema quedaría sin nadie que administre.

```
1. EmployeesService.update abre la transacción           BEGIN
2. Guarda el rol nuevo en employees                      (solo visible adentro)
3. Publica employee.role-changed y ESPERA
4.   accounts escucha:
       actualiza Account.role
       cuenta administradores disponibles → 0
       tira ConflictException
5. El error sube por el await hasta el paso 3
6. Sale de run() con error                               ROLLBACK
7. El controller responde 409 con el mensaje
```

Después del paso 6, el empleado sigue siendo administrador en las dos tablas.
`employees` nunca supo que existía una regla sobre administradores: solo
avisó, y alguien dijo que no.

---

## 8. Los tests: qué prueba cada uno

Están en `backend/test/transactions.e2e-spec.ts` y corren contra la base de
tests real (`vitto_club_test`). Con una base falsa no se puede probar un
rollback.

### Transacciones

| Test | Qué demuestra |
|---|---|
| commit | Si la función termina, quedan todas las escrituras |
| rollback | Si la función tira un error, no queda ninguna |
| anidado | Un `run` dentro de otro se suma al de afuera y se deshace con él |
| aislamiento | Dos transacciones al mismo tiempo no se mezclan |
| sin transacción | Fuera de un `run`, `client` escribe directo |
| visibilidad | Lo escrito adentro no se ve desde afuera hasta el commit |

El de **rollback** es el más simple de leer:

```ts
await expect(
  tx.run(async () => {
    await tx.client.employee.create({ data: employee('a@test.com') });
    throw new Error('boom');
  }),
).rejects.toThrow('boom');

expect(await emails()).toEqual([]);
```

Crea un empleado, tira un error, y después verifica que el empleado no existe.

El de **visibilidad** es el que prueba que hay una transacción de verdad:

```ts
await tx.run(async () => {
  await tx.client.employee.create({ data: employee('a@test.com') });

  // `prisma` va por otra conexión, fuera de la transacción
  expect(await emails()).toEqual([]);
});

expect(await emails()).toEqual(['a@test.com']);
```

Adentro del `run` el empleado ya fue creado, pero consultando por fuera
todavía no aparece. Después del `run` (o sea, después del `COMMIT`), sí.

### Eventos

| Test | Qué demuestra |
|---|---|
| el listener termina bien | Queda lo del publicador y lo del listener |
| el listener tira | El error llega al publicador y se deshace **todo** |
| el listener ve lo del publicador | El listener está dentro de la misma transacción |

El segundo es la prueba de todo el diseño:

```ts
await expect(
  tx.run(async () => {
    await tx.client.employee.create({ data: employee('publisher@test.com') });
    await events.emitAsync(TEST_EVENT, { email: 'listener@test.com', fail: true });
  }),
).rejects.toThrow('listener boom');

expect(await emails()).toEqual([]);
```

El publicador crea un empleado y publica un evento. El que escucha crea otro
empleado y tira un error. Al final no existe **ninguno de los dos**.

### Cómo correrlos

```bash
cd backend
npm run test:e2e
```

Resultado esperado: 11 tests (2 de health, 6 de transacciones, 3 de eventos).
Requisitos: Docker levantado, la base `vitto_club_test` creada y
`DATABASE_URL_TEST` en `backend/.env` (ver `backend/README.md`).

---

## 9. Cómo usarlo: lista de control

Al escribir una operación que toca más de un módulo:

- [ ] El caso de uso abre la transacción con `run`, a través del puerto
      `TransactionRunner` de su módulo.
- [ ] Lo lento (hashear una contraseña, llamar a un servicio externo) se hace
      **antes** de abrir la transacción. Prisma corta las transacciones que
      duran más de 5 segundos.
- [ ] Todos los repositorios que participan usan `client` del adaptador.
- [ ] Si otro módulo tiene que reaccionar, se publica un evento definido en
      `shared/events/domain-events.ts`.
- [ ] Se publica con `await emitAsync(...)`, después de escribir lo propio.
- [ ] Quien escucha usa `@OnEvent(NOMBRE, { suppressErrors: false })`.
- [ ] Si quien escucha rechaza la operación, tira una `HttpException`.
- [ ] Hay un test que prueba que, si la segunda parte falla, la primera se
      deshace.

### Errores comunes

| Síntoma | Causa probable |
|---|---|
| El listener falla pero la operación se guarda igual | Falta `suppressErrors: false` |
| El listener no ve lo que se acaba de escribir | El repositorio usa `PrismaService` en vez de `client` |
| Queda guardada la primera mitad de la operación | Falta el `await` en `emitAsync`, o no se abrió la transacción |
| El listener nunca se ejecuta | El nombre del evento no coincide: importarlo siempre del contrato |
| Responde 500 en vez de 409 | El listener tiró un error que no es `HttpException` |

---

## 10. Qué falta

- **Ningún repositorio existente usa `client` todavía.** Los de `customers` y
  `employees` siguen con `PrismaService`. Se adaptan cuando su flujo lo
  necesite.
- **`customers.repository.ts` usa `prisma.$transaction([...])`** (la forma de
  lista). El cliente de una transacción no tiene `$transaction`, así que esa
  línea hay que reescribirla cuando ese repositorio participe.
- **Los eventos reales todavía no se publican ni se escuchan.** El contrato
  está definido; la implementación es parte del refactor de la rama `users`.
- **Eventos de clientes:** van a hacer falta `customer.deactivated`,
  `customer.reactivated` y `customer.document-changed` para las cuentas de
  clientes. Se agregan al mismo archivo de contratos.
- **Test de la cadena completa por HTTP** (degradar al último administrador
  desde `PATCH /api/empleados/:id` tiene que responder 409 y no cambiar nada).
  Es el test de aceptación del refactor de `users`.
- **No se probó contra Neon**, solo contra el Postgres local.

---

## 11. Glosario

| Término | Significado |
|---|---|
| Transacción | Grupo de operaciones que la base trata como una sola |
| Commit | Confirmar la transacción: los cambios quedan guardados |
| Rollback | Cancelar la transacción: se deshace todo lo hecho en ella |
| Atomicidad | Propiedad de "todo o nada" |
| Aislamiento | Los cambios no confirmados no se ven desde afuera |
| Transacción ambiente | Transacción que no se pasa por parámetro: está disponible para todo el código de esa operación |
| `AsyncLocalStorage` | Mecanismo de Node que guarda datos asociados a una operación asíncrona |
| CLS | *Continuation-local storage*: el nombre genérico de ese mecanismo. No es CI |
| Evento de dominio | Aviso de que algo pasó en un módulo, para que otros reaccionen |
| Publicar / emitir | Mandar el aviso |
| Listener | El código que escucha un aviso y reacciona |
| Puerto | Clase abstracta que define qué se necesita, sin decir cómo se hace |
| Adaptador | La implementación concreta de un puerto |
| Dependencia circular | Dos módulos que se necesitan mutuamente |

---

## Historial de este documento

| Fecha | Cambio |
|---|---|
| 2026-10-05 | Versión inicial: transacción ambiente, eventos de dominio, contrato de tres eventos, 9 tests |
