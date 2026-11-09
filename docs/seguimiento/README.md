# Seguimiento

Documentos que cambian con el tiempo: estado, decisiones, pendientes y pedidos entre equipos.

| Documento | Para qué |
|---|---|
| [estado-actual](./estado-actual.md) | Qué hay en `develop`, la última verificación y lo que falta o no coincide con los contratos |
| [decisiones-de-implementacion](./decisiones-de-implementacion.md) | Todas las decisiones y aclaraciones que se tomaron al programar cada historia (Sprints 3 y 4), juntas, y las preguntas que siguen abiertas |
| [deuda-tecnica](./deuda-tecnica.md) | Deuda, limitaciones aceptadas (para la entrega) y riesgos |
| [verificaciones-pendientes-recompensas](./verificaciones-pendientes-recompensas.md) | Criterios de US-35, US-36 y US-38 que prueba la historia que construye cada endpoint |
| [actualizacion-docs-base4](./actualizacion-docs-base4.md) | Lista de cambios de documentación por BASE-4. **Aplicada el 09/11/2026** |
| [actualizacion-docs-base5](./actualizacion-docs-base5.md) | Lista de cambios de documentación por BASE-5. **Aplicarla en la rama de BASE-5** |
| [estado-puntos-y-consumos](./estado-puntos-y-consumos.md) | Foto del 18/10: BASE, US-21 y US-22 (backend). Superada por `estado-actual` |
| [avisos-cambios-2026-10-20](./avisos-cambios-2026-10-20.md) | Avisos al equipo del 20/10: "Compra" → "Consumo" en el código y lote `VOIDED` |
| [diferencias-prototipo-frontend](./diferencias-prototipo-frontend.md) | Diferencias entre el prototipo v2 y el frontend tras la alineación visual del 19/10 |
| [emp-pass-frontend](./emp-pass-frontend.md) | EMP-PASS (frontend): contraseña y reactivación de usuarios |
| [pedidos/](./pedidos/) | Pedidos entre equipos (ver [plantilla](../plantillas/pedido-entre-equipos.md)) |
| [historico/](./historico/) | Documentos de traspaso, comparación de ramas y pendientes ya superados |

## Qué hay en `historico/`

| Archivo | Qué es | Por qué quedó acá |
|---|---|---|
| `contexto-proximo-chat.md` | Traspaso a un asistente: ramas, decisiones, criterios de aceptación, pendientes | Foto del 05–06/10; lo vigente se llevó a `decisions/`, `roles-y-permisos`, `deuda-tecnica`. Los criterios de aceptación (sección 9) se extrajeron a `funcionalidades/criterios-de-aceptacion-sesion.md` |
| `cambios-en-accounts.md` | Qué se cambió en `accounts` al integrar el login, y cómo traerlo sin conflictos | Guía de merge; después del merge deja de servir. Las decisiones están en ADR 007 |
| `accounts-vs-rama-scrum-160.md` | Comparación de dos ramas | Obsoleto; contiene la regla de unicidad que ya no rige |
| `accounts-abmc-status.md` | Estado interno del módulo `accounts` | Encabezado desactualizado; las reglas están en `domain/cuentas-y-empleados.md` |
| `spike-transacciones.md` | Informe del spike de transacciones | Resumido en el ADR 002 |
| `autenticacion-original.md`, `transacciones-y-eventos-original.md`, `loyalty-api-original.md` | Copias completas de los documentos antes de partirlos | Respaldo. **Se pueden borrar tras revisar** que el contenido partido esté completo |
| `autenticacion-que-falta.md` | Sección "Qué falta" de autenticación | Foto del 06/10 |
| `pendientes-frontend.md` | Pendientes del frontend de clientes de Caja (Sprint 1) | Movido el 09/11: el botón "Reactivar cuenta" que describe ya no existe (no hay reactivación de clientes) y la pantalla de Clientes del Administrador ya está hecha (CLI-ADM) |
