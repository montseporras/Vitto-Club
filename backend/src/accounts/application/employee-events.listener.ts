import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AccountsService } from './accounts.service.js';
import {
  EMPLOYEE_DEACTIVATED,
  EMPLOYEE_ROLE_CHANGED,
  type EmployeeDeactivatedEvent,
  type EmployeeRoleChangedEvent,
} from '../../shared/events/domain-events.js';

// Reacciona a lo que pasa en employees sin que employees conozca a accounts (ver
// docs/ARCHITECTURE.md, "Eventos de dominio"). suppressErrors: false es obligatorio: sin
// eso, un error acá no se propaga y la transacción de quien publicó sigue como si nada.
@Injectable()
export class EmployeeEventsListener {
  constructor(private readonly accountsService: AccountsService) {}

  @OnEvent(EMPLOYEE_DEACTIVATED, { suppressErrors: false })
  async onEmployeeDeactivated(event: EmployeeDeactivatedEvent): Promise<void> {
    await this.accountsService.handleEmployeeDeactivated(event.employeeId);
  }

  @OnEvent(EMPLOYEE_ROLE_CHANGED, { suppressErrors: false })
  async onEmployeeRoleChanged(event: EmployeeRoleChangedEvent): Promise<void> {
    await this.accountsService.handleEmployeeRoleChanged(event);
  }
}
