// Etiquetas de caché de TanStack Query para el feature empleados.
export const empleadosKeys = {
  all: ['empleados'] as const,
  lists: () => [...empleadosKeys.all, 'list'] as const,
};
