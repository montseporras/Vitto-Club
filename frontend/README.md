# Frontend de Vitto Club

SPA en React + Vite + TypeScript, con Tailwind CSS y shadcn/ui, React Router, TanStack Query, React Hook
Form con Zod, Axios y MSW para los mocks.

## Levantar

Desde `frontend/`:

```bash
npm install
npm run dev       # con mocks (VITE_API_MOCKS distinto de 'false')
npm run lint      # ESLint (incluye boundaries)
npm run build     # tsc -b + vite build
```

Para usar el backend real, crear `frontend/.env.local` con `VITE_API_MOCKS=false` y reiniciar. El paso a
paso, el proxy de Vite y los problemas frecuentes están en [`docs/SETUP.md`](../docs/SETUP.md) §3.

No hay framework de tests instalado: la verificación es lint, build y un recorrido manual con mocks
([`docs/testing/estrategia.md`](../docs/testing/estrategia.md#frontend)).

## Documentación

| Documento | Para qué |
|---|---|
| [`CLAUDE.md`](./CLAUDE.md) | Reglas del frontend (y el de la raíz) |
| [`docs/architecture/estructura-frontend.md`](../docs/architecture/estructura-frontend.md) | Carpetas, rutas, pantallas, componentes compartidos y estilos |
| [`docs/prototipo/v2/`](../docs/prototipo/v2/LEEME.md) | Prototipo: cómo se ve cada pantalla |
| `docs/sprint-3/API_CONTRACT_SPRINT_3.md`, `docs/sprint-4/API_CONTRACT_SPRINT_4.md` | Qué endpoint llamar, qué campos llegan y qué `code` puede volver |
| [`docs/seguimiento/decisiones-de-implementacion.md`](../docs/seguimiento/decisiones-de-implementacion.md) | Decisiones que se tomaron en cada pantalla |
