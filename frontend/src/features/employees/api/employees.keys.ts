// Etiquetas de caché de TanStack Query para el feature empleados.
export const employeesKeys = {
  all: ['employees'] as const,
  lists: () => [...employeesKeys.all, 'list'] as const,
  list: (name: string) => [...employeesKeys.lists(), { name }] as const,
};
