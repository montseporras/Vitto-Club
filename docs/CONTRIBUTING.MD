# Contribuir a Vitto Club

Este documento define las convenciones que sigue el equipo al trabajar en este monorepositorio. El objetivo es mantener un historial claro, evitar conflictos y asegurarnos de que los cambios en contratos compartidos (OpenAPI, variables de entorno) no afecten silenciosamente el trabajo de otros integrantes.


## Ramas

Los nombres de las ramas siguen el siguiente formato:

```text
<tipo>/<historia>-<descripción-corta>
```

Desde el Sprint 3 no se usa Jira: la historia es la de `docs/sprint-N/HISTORIAS_SPRINT_N.md` (`US-40`,
`BASE-4`, `CLI-DOC`…). Las ramas de los Sprints 1 y 2 usan el ticket de Jira (`SCRUM-xxx`). Se suele
terminar con `-back` o `-front` según la capa.

Donde `<tipo>` puede ser uno de los siguientes:

- `feature`
- `fix`
- `chore`
- `docs`
- `ci`

Ejemplos:

```text
feature/US-40-confirmar-canje-back
fix/US-40-disponibles-sin-confirmedcount-back
chore/US-35-39-integrar-recompensas-back
docs/actualizacion-docu-pasada
```

La descripción debe ser corta, de **3 a 5 palabras**, estar escrita en minúsculas y utilizar guiones (`-`) en lugar de espacios.

## Mensajes de commit

Utilizamos **Conventional Commits**:

```text
<tipo>(<alcance>): <resumen-corto>
```

Los tipos permitidos son:

- `feat`
- `fix`
- `chore`
- `docs`
- `ci`
- `refactor`
- `test`

Ejemplos:

```text
feat(backend): add redemption expiration sweep (US-44)
fix(backend): return available rewards without confirmedCount (US-40)
docs(sprint-4): add missing prompts and cierre
```

El alcance es la capa (`backend`, `frontend`) o la carpeta de docs. La historia va entre paréntesis al
final. Los commits **no** llevan `Co-Authored-By` ni otra firma (`CLAUDE.md` §5.13).

Esto no es solamente una cuestión de estilo: permite generar changelogs automáticamente en el futuro y hace que `git log` sea realmente útil al momento de investigar y solucionar problemas.

## Pull Requests

Todo Pull Request (PR) debe:

- Hacer referencia a su historia (o a su ticket de Jira, en los Sprints 1 y 2).
- Ir a `develop`. `main` recibe `develop` cuando lo decide el equipo (D-35).
- Ser revisado y aprobado por al menos otro integrante del equipo antes de realizar el merge.
- Mantenerse enfocado en un único objetivo. Si durante el trabajo encontrás algo no relacionado que necesita corregirse, se debe abrir un PR separado.


## Expectativas durante la revisión de código

- No apruebes un PR que no hayas leído realmente.
- Si no estás seguro de que algo es correcto, preguntá. Una pregunta durante la revisión cuesta menos que un error en producción.
- Se prefieren PR pequeños y frecuentes antes que PR grandes que sean difíciles de revisar correctamente.


## Preguntas

Si alguna de las convenciones de este documento no se adapta a la situación que estás enfrentando, plantealo con el equipo en lugar de buscar una solución por tu cuenta y simplemente ignorar la convención.

Las convenciones deben evolucionar cuando dejan de tener sentido, no ser ignoradas.