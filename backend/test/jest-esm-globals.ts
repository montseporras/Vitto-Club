import { jest } from '@jest/globals';

// En modo ESM Jest no inyecta el objeto `jest` como global (sí `describe`,
// `it`, `expect`). Se expone acá para que los specs sigan usando `jest.fn()`
// con los tipos de @types/jest, sin importarlo en cada archivo.
Object.assign(globalThis, { jest });
