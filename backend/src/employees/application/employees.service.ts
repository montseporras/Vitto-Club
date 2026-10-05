import { ConflictException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Employee, EmployeeData, EmployeeUpdateData } from '../domain/employee.js';
import { EmployeeListFilters, EmployeeRepository } from '../domain/port/employee.repository.js';
import { TransactionRunner } from '../domain/port/transaction-runner.js';
import { EmployeeAlreadyExists } from '../domain/errors/employee-already-exists.error.js';
import { CustomersService } from '../../customers/application/customers.service.js';
import {
  EMPLOYEE_DEACTIVATED,
  EMPLOYEE_ROLE_CHANGED,
  type EmployeeDeactivatedEvent,
  type EmployeeRoleChangedEvent,
} from '../../shared/events/domain-events.js';

// El token de inyección real sigue siendo CustomersService (ver @Inject(forwardRef(...))
// más abajo); esta interfaz solo evita que el parámetro use CustomersService como TIPO
// estático. Con "emitDecoratorMetadata" (tsconfig) y módulos ESM nativos ("type": "module"
// en package.json), tipar el parámetro con la clase concreta hace que TypeScript emita una
// referencia de VALOR a CustomersService en el metadata del decorador, evaluada en el
// momento en que se define esta clase — como customers.service.ts importa a su vez a
// EmployeesService (misma razón, en sentido inverso), eso es un ciclo real entre dos
// módulos ES que se referencian mutuamente, y revienta con
// "ReferenceError: Cannot access 'CustomersService' before initialization".
// forwardRef() resuelve el ciclo para la inyección de Nest en tiempo de ejecución, pero no
// evita esta referencia eager de TypeScript — por eso además hace falta este tipo acotado.
//
// Employees NO tiene (ni importa) ningún equivalente para Accounts: la integración
// Employee -> Account se hace exclusivamente vía los eventos de dominio de abajo
// (employee.deactivated / employee.role-changed, ver shared/events/domain-events.ts).
// Este módulo no conoce a accounts, ni en código ni en imports.
interface EmailUniquenessChecker {
  existsByEmail(email: string): Promise<boolean>;
}

@Injectable()
export class EmployeesService {
  constructor(
    private readonly employeesRepository: EmployeeRepository,
    // Dependencia cruzada con customers (vía su Service exportado, no su repository) para
    // la unicidad global de email. Requiere forwardRef porque CustomersService depende de
    // EmployeesService en sentido inverso por la misma razón.
    @Inject(forwardRef(() => CustomersService))
    private readonly customersService: EmailUniquenessChecker,
    private readonly transactionRunner: TransactionRunner,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // --- REGISTRAR (US-01) ---
  async create(data: EmployeeData): Promise<Employee> {
    // 1. Instanciar el Employee (valida, normaliza y nace activo)
    const employee = Employee.create(data);

    // 2. Verificar que el email no esté registrado. El schema no tiene @unique en email,
    //    así que la unicidad se controla acá.
    if (await this.employeesRepository.existsByEmail(employee.getEmail())) {
      throw new ConflictException(new EmployeeAlreadyExists(employee.getEmail()).message);
    }

    // 3. El email debe ser único en todo el sistema, no solo entre empleados.
    if (await this.customersService.existsByEmail(employee.getEmail())) {
      throw new ConflictException(
        `Email "${employee.getEmail()}" is already registered as a customer`,
      );
    }

    // 4. Persistir
    return await this.employeesRepository.save(employee);
  }

  // Expuesto para que otros módulos (customers, accounts) validen unicidad de email
  // cruzada sin acceder al repositorio directamente.
  async existsByEmail(email: string): Promise<boolean> {
    return await this.employeesRepository.existsByEmail(email);
  }

  // --- CONSULTAR (US-03): sin filtros devuelve activos e inactivos ---
  async findAll(filters: EmployeeListFilters = {}): Promise<Employee[]> {
    return await this.employeesRepository.findAll(filters);
  }

  // --- BUSCAR POR ID (US-03) ---
  async findById(id: number): Promise<Employee> {
    const employee = await this.employeesRepository.findById(id);
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }
    return employee;
  }

  // --- EDITAR (US-02) ---
  async update(id: number, data: EmployeeUpdateData): Promise<Employee> {
    return await this.transactionRunner.run(async () => {
      // 1. Buscar el empleado (404 si no existe)
      const employee = await this.findById(id);

      // 2. Un empleado dado de baja no se modifica
      if (!employee.isActive()) {
        throw new ConflictException(`Employee with ID ${id} is inactive and cannot be modified`);
      }

      const previousRole = employee.getRole();

      // 3. Aplicar los cambios (valida todo antes de modificar la entidad)
      employee.update(data);

      // 4. Persistir
      await this.employeesRepository.update(employee);

      // 5. Si el rol realmente cambió, publicar el evento DENTRO de la misma transacción,
      // después de persistir. accounts escucha esto para sincronizar Account.role y aplicar
      // la protección del último ADMIN — si el listener tira, esta transacción entera
      // (incluido el cambio de rol en Employee) se deshace.
      const newRole = employee.getRole();
      if (newRole !== previousRole) {
        await this.eventEmitter.emitAsync(EMPLOYEE_ROLE_CHANGED, {
          employeeId: id,
          previousRole,
          newRole,
        } satisfies EmployeeRoleChangedEvent);
      }

      return employee;
    });
  }

  // --- DAR DE BAJA (US-04): baja lógica, el registro se conserva ---
  async deactivate(id: number): Promise<Employee> {
    return await this.transactionRunner.run(async () => {
      const employee = await this.findById(id);
      if (!employee.isActive()) {
        throw new ConflictException(`Employee with ID ${id} is already inactive`);
      }

      employee.deactivate();
      await this.employeesRepository.updateStatus(employee);

      // Publicado DENTRO de la misma transacción, después de persistir. accounts escucha
      // esto para dar de baja la Account asociada (si tiene) y aplicar la protección del
      // último ADMIN — si el listener tira, esta transacción entera (incluida la baja del
      // Employee) se deshace, sin dejar Employee inactivo con su Account todavía activa.
      await this.eventEmitter.emitAsync(EMPLOYEE_DEACTIVATED, {
        employeeId: id,
      } satisfies EmployeeDeactivatedEvent);

      return employee;
    });
  }
}
