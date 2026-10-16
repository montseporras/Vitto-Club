# Seguimiento

Documentos que cambian con el tiempo: estado, pendientes y pedidos entre equipos.

| Documento | Para qué |
|---|---|
| [estado-actual](./estado-actual.md) | Qué hay, qué no pude verificar e inconsistencias de documentación |
| [deuda-tecnica](./deuda-tecnica.md) | Deuda, limitaciones aceptadas y riesgos |
| [pendientes-frontend](./pendientes-frontend.md) | Pendientes del frontend del módulo de clientes |
| [pedidos/](./pedidos/) | Pedidos entre equipos (ver [plantilla](../plantillas/pedido-entre-equipos.md)) |
| [historico/](./historico/) | Documentos de traspaso y comparación de ramas, ya superados |

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
