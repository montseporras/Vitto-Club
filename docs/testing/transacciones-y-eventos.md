# Tests de transacciones y eventos

> Extraído de la sección 8 de `transacciones-y-eventos.md` (ver [transacciones y eventos](../conceptos-transversales/transacciones-y-eventos.md)).

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

