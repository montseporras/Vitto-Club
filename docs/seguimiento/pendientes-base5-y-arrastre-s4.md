# Pendientes de BASE-5 y del ARRASTRE-S4

> **Armado el 14/11/2026**, a pedido de Maga, después de cerrar lo que se pudo de BASE-5 y del ARRASTRE-S4 (backend y
> frontend). Dice qué está hecho, qué quedó abierto, de quién es cada cosa y qué hace falta para dar las dos
> historias por terminadas.
>
> **No es fuente de verdad.** Si algo choca con el contrato del Sprint 5, manda el contrato.

---

## 1. Estado en una línea

| Historia | Capa | Estado |
|---|---|---|
| **BASE-5** | Backend | **Hecha.** CA-B5.1 a CA-B5.8 cumplidos. Quedan solo documentación y dos verificaciones con servicios reales (sección 3) |
| **ARRASTRE-S4** | Backend | **Hecha en lo que le toca a esta historia.** Quedan ítems que son de otras historias o del equipo (sección 2) |
| **ARRASTRE-S4** | Frontend | **Hecha en lo de código.** Quedan una revisión visual y una pregunta de alcance (sección 2) |

Verificado el 14/11: backend, `npm run lint`, `npm test` (1597) y `npm run test:e2e` (38 suites, 882 tests, 0 saltados),
y `npm run build`; frontend, `npm run lint` y `npm run build`.

---

## 2. ARRASTRE-S4: lo que queda abierto

| # | Qué falta | De quién es | Por qué no se hizo acá |
|---|---|---|---|
| A4-03 | Scripts `missions:expire`, `notifications:send` y `promotions:send` en `package.json`, y las variables `MISSIONS_EXPIRATION_CRON_ENABLED`, `NOTIFICATIONS_CRON_ENABLED` y `PROMOTIONS_CRON_ENABLED` en `.env.example` y `test/setup-e2e-env.ts` | US-32 (misiones), US-47/US-48 (notificaciones) y US-15 (promociones programadas): cada una es dueña de su proceso | Los procesos no existen todavía. `rewards:expire` y `redemptions:expire` ya están |
| A4-10 | Completar la tabla "Fila de `CIERRE_SPRINT_4.md` · Responsable · Rama · Estado" de ARRASTRE-S4 en `HISTORIAS_SPRINT_5.md`, y las tablas de asignaciones de las historias del Sprint 3 y el Sprint 4 | El equipo | Son fuentes de verdad: no se modifican sin decisión del equipo |
| — | **CI**: no existe `.github/workflows/`. Tiene que correr `npm ci`, lint, tests unitarios y build del backend, y lint y build del frontend (contrato S5 §3.12) | Ítem **CI** (sin dependencias) | Es una historia aparte; conviene hacerla primero para que todas las ramas del sprint pasen por ahí |
| — | **Recorrido a mano de Escape en los modales** (Configuración → Empleados → "Crear empleado", y consumo → "Anular consumo") | Quien haga el merge | No se pudo probar en un navegador; el código compila y pasa lint |
| — | **Revisión visual de los ajustes de pantalla** (CA-AJ.1 a CA-AJ.6): medidas del recuadro, "hasta abajo" en 1440×900 y 1366×768, paginado que no oscila al achicar la ventana, y tarjetas compactas de Configuración → Puntos | Quien haga el recorrido con el prototipo al lado | El código existe (`AdminPanel`, `useRowsThatFit`), pero la medida real solo se confirma viendo la pantalla |
| — | Pantalla de **Misiones** sin recuadro ni paginado | US-28 y US-29 | La pantalla todavía no existe |
| — | Filtro de módulo de Auditoría: dice **"Recompensas (Próximamente)"** y está deshabilitado, aunque las recompensas se auditan desde el Sprint 4. El contrato S5 §2.8 solo habla de `MISSIONS` | Hay que preguntar a quién le toca | Es un resto del Sprint 4 que no está en ninguna fuente de verdad |
| — | "Próximamente" en el menú (Misiones, Estadísticas y reportes, Notificaciones; en el Cliente, Misiones) | US-28, US-33, US-51 y US-14 | Cada historia construye su pantalla. La regla S5-33 pide que no quede ninguno al cierre |

### Limpieza opcional (no bloquea nada)

- `CustomerAccountRepository.replaceInitialPasswordHash` (puerto, repositorio y dos fakes de test, todo en `accounts`) quedó **sin uso**
  al borrar el evento `customer.document-changed`.
- Hay **dos hooks de Escape**: `useEscapeKey` (en `features/redemptions/lib/`, usado en unos 9 modales) y
  `shared/hooks/useModalEscape`. Unificarlos toca archivos de otros sprints.
- `backend/src/rewards/documentation-updates-us37.md` sigue en el código. Tiene un dato que no está en ningún
  documento: una recompensa `DISABLED` por stock que además vence **no cambia de motivo** con el proceso diario
  (solo toma las `ACTIVE`); pasa a `EXPIRED` la próxima vez que se reevalúa, por ejemplo al editarla. Para borrar la
  nota, primero hay que llevar ese dato a `docs/`. Además cita a la nota de US-44, que ya no existe.
- Datos del cierre que el equipo todavía tiene que llevar a los documentos fuera del repo: ver el contrato S5, §10.

---

## 3. BASE-5: lo que queda abierto

### 3.1 Verificaciones que necesitan servicios reales

| Qué | Por qué no se pudo |
|---|---|
| La **URL firmada de las fotos de perfil vence a la hora** de verdad en Cloudinary (se usa `private_download_url` con `expires_at`) | Los tests usan el SDK simulado y el adaptador falso; nunca se llamó a Cloudinary. Probarlo con una cuenta real y `IMAGES_STORAGE_ENABLED=true` en un entorno de prueba |
| El adaptador de **Resend** manda de verdad un correo | Solo hay un test con el cliente simulado. Probarlo con una clave real y `NOTIFICATIONS_EMAIL_ENABLED=true` **solo en un entorno de prueba** (manda correos reales) |

Mientras tanto, ninguna historia depende de que esto esté probado para empezar: los e2e usan los adaptadores falsos.

### 3.2 Documentación de la lista `actualizacion-docs-base5.md` que sigue sin aplicar

Lo de las tablas, módulos, procesos y variables ya está. Falta lo que depende de endpoints y procesos que todavía no existen,
más lo que revisé hoy:

| Documento | Qué falta |
|---|---|
| `conceptos-transversales/roles-y-permisos.md` | Revisar que estén todas las filas de la matriz del contrato S5 §4 (misiones, notificaciones, estadísticas, fotos, cuenta del cliente) |
| `conceptos-transversales/transacciones-y-eventos.md` | El evento `mission.completed` (después del commit), el avance de misiones dentro de la transacción del consumo y el orden de bloqueos del reclamo (asignación → `customer_points`). No aparece ninguna de las tres |
| `glosario.md` | Misión, asignación, reclamo, notificación, promoción y beneficio del nivel (no hay ninguno) |
| `README.md` (raíz) y `vision-general.md` | La fila del Sprint 5 (`vision-general.md` ya menciona el Sprint 5; el `README.md` no) |
| `architecture/estructura-frontend.md` | Rutas y pantallas nuevas, y que `missions`, `notifications` y `statistics` dejan de estar vacías. Se completa cuando cada pantalla exista |

### 3.3 Documentos del repo que quedaron desactualizados por lo de hoy (no los revisé a fondo)

- Cualquier mención suelta de `GET /movimientos-de-puntos` (se eliminó en el ARRASTRE-S4, S5-13).
- Cualquier mención de `FORBIDDEN_FIELD` o de `customer.document-changed` fuera de los archivos que ya actualicé.

---

## 4. ¿Con esto BASE-5 y el ARRASTRE-S4 quedan completos?

**BASE-5: sí, en lo que pide su ficha.** Los ocho criterios están cumplidos y verificados con los e2e. Lo que sigue
abierto no es de la historia: son dos pruebas con servicios reales (Cloudinary y Resend) y la documentación que depende
de endpoints que todavía no existen.

**ARRASTRE-S4: sí en el código, con tres salvedades.**
1. **A4-03** y **A4-10** no se pueden cerrar acá: son de otras historias y del equipo.
2. Falta el **recorrido visual** (CA-AJ y Escape) con la app abierta.
3. El **CI** es una historia aparte; conviene hacerla antes de abrir más ramas, pero no es parte del arrastre.

**Para dar las dos por cerradas, alcanza con:**
- [ ] Hacer el recorrido a mano del frontend (Escape y ajustes de pantalla).
- [ ] Que el equipo complete la tabla de asignaciones de ARRASTRE-S4 (A4-10) y decida lo de "Recompensas (Próximamente)".
- [ ] Probar Cloudinary y Resend en un entorno de prueba (3.1).
- [ ] Completar los documentos de 3.2 que no dependen de pantallas (`glosario.md`, `README.md`, `transacciones-y-eventos.md`, `roles-y-permisos.md`).

Después de eso, lo que sigue es CI y las historias del sprint (US-28 en adelante).
