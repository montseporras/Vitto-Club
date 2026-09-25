// Worker de MSW para mocks de API en el navegador.
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
