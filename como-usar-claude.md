-- BACKEND --

Me toca la US-21, capa backend.
Seguí CLAUDE.md y backend/CLAUDE.md.
Leé la US-21 en docs/sprint-3/HISTORIAS_SPRINT_3.md y las secciones del
contrato que indica (§3.1.2, §3.1.3, §3.3.3, §3.9.3).
No asumas nada: si algo no está en el contrato, preguntame.
Antes de codear, mandame el Plan previo y esperá mi OK.



-- FRONTEND --
por ejemplo...

Me toca la US-22, capa frontend.
Seguí CLAUDE.md y frontend/CLAUDE.md.
Leé la US-22 en docs/sprint-3/HISTORIAS_SPRINT_3.md, las secciones del
contrato que indica (§3.2.1, §3.2.2) y las pantallas del prototipo:
RegistrarConsumo.dc.html (panel de 24 hs) y Consumos.dc.html (modal).
Si el prototipo y el contrato chocan, mandá lo que dice CLAUDE.md y avisame.
Si algo no está en ninguno de los dos, preguntame.
Antes de codear, mandame el Plan previo y esperá mi OK.



--- QUE HACER CON LAS RTAS ---

Claude te devuelve el Plan previo. Antes de decirle “dale”, fijate que:

- liste todos los criterios CA de la historia (CA-21.1 a CA-21.13);
- cite datos concretos del contrato, por ejemplo “§3.2.2: el Cajero recibe 403 VOID_NOT_ALLOWED”, y no un simple “leí el contrato”;
- no tenga dudas sin responder.

Si el plan está bien, contestás “OK, seguí”. Si tiene dudas, las respondés una por una.

Si quieren agregar algo puntual
Lo ponés AL FINAL, PERO SIN PISAR LAS REGLAS:

por ejemplo:

" Extra: esta tarea es solo la parte de la vista previa (GET /consumos/preview).
No hagas POST /consumos todavía. "