---
description: Arranca una historia del Sprint 3 siguiendo CLAUDE.md (uso /historia US-21 backend Tomás)
argument-hint: US-XX backend|frontend Nombre
---

Pedido: $ARGUMENTS

Con ese pedido, hacé esto en orden y no te saltees ningún paso.

1. **Revisá el pedido.** Separá la historia (US-XX), la capa (backend o frontend) y el nombre de quien pide.
   Si falta alguno, preguntalo y frená.
2. **Leé las instrucciones.** Leé `CLAUDE.md` de la raíz y el `CLAUDE.md` de la capa (`backend/CLAUDE.md` o
   `frontend/CLAUDE.md`). Seguilos al pie de la letra.
3. **Buscá la historia.** Abrí `docs/sprint-3/HISTORIAS_SPRINT_3.md`. Buscá la historia en la tabla de
   asignaciones (sección 0) y en su sección propia. Hay que frenar y preguntar en cualquiera de estos casos:
   - en esa capa figura otro responsable;
   - la capa no tiene responsable;
   - la historia dice PENDIENTE;
   - falta un dato que necesitás (rama, carpeta del feature).
4. **Revisá las dependencias.** Mirá la sección "Depende de" de la historia. Si es backend y alguna
   dependencia no está hecha en el código, preguntá cómo seguir. Si es frontend, simulala con MSW según el
   contrato.
5. **Leé las fuentes de la historia:**
   - las secciones del contrato (`docs/sprint-3/API_CONTRACT_SPRINT_3.md`) que la historia indica;
   - la §8.1 y la §8.3 del contrato;
   - si es frontend, las pantallas del prototipo (`docs/prototipo/v2/`) que la historia indica, buscando
     con grep;
   - el código existente que vas a tocar o reutilizar.
6. **Mandá el PLAN PREVIO** con el formato de la sección 3 de `CLAUDE.md`. Tiene que incluir cada criterio
   CA-XX.n de la historia y cómo lo vas a verificar.
7. **No escribas código** hasta que la persona responda las dudas y te diga que sigas.
8. **Programá** con el paso a paso de la capa.
9. **Verificá** con los comandos de la capa.
10. **Terminá con el RESUMEN** de la sección 7 de `CLAUDE.md`.

En todo momento: no asumas nada. Lo que no esté en el contrato (o en el prototipo, si es frontend) se
pregunta.
