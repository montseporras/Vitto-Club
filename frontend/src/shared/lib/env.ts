/** En desarrollo, MSW simula la API salvo que se apague con VITE_API_MOCKS=false. */
export const MOCKS_ENABLED =
  import.meta.env.DEV && import.meta.env.VITE_API_MOCKS !== 'false'
