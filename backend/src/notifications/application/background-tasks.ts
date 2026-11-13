import { Injectable, Logger } from '@nestjs/common';

// Trabajos que siguen después de haber respondido el pedido HTTP (el reenvío de un correo, contrato S5 §3.8.5).
// Un error acá no tiene a quién avisarle: queda en el log. `idle()` espera a que todos terminen; lo usan los
// tests para no depender de tiempos.
@Injectable()
export class BackgroundTasks {
  private readonly logger = new Logger(BackgroundTasks.name);
  private readonly pending = new Set<Promise<void>>();

  run(task: () => Promise<void>): void {
    const promise: Promise<void> = task()
      .catch((error: unknown) => {
        this.logger.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
      })
      .finally(() => {
        this.pending.delete(promise);
      });
    this.pending.add(promise);
  }

  async idle(): Promise<void> {
    while (this.pending.size > 0) {
      await Promise.allSettled(this.pending);
    }
  }
}
