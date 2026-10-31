Soy {nombre}. Me toca la US-XX, capa {backend | frontend}.
Seguí CLAUDE.md y {backend | frontend}/CLAUDE.md.
Leé la US-XX en docs/sprint-4/HISTORIAS_SPRINT_4.md y las secciones del contrato que indica.
No asumas nada: si algo no está en el contrato (o en el prototipo, si es frontend), preguntame.
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