// Puerto para abrir una transacción desde un caso de uso sin conocer Prisma.
// Si fn termina se confirma todo; si tira, se deshace todo.
export abstract class TransactionRunner {
  abstract run<T>(fn: () => Promise<T>): Promise<T>;
}
