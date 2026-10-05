import { ConflictException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Employee, EmployeeData, EmployeeUpdateData } from '../domain/employee.js';
import { EmployeeListFilters, EmployeeRepository } from '../domain/port/employee.repository.js';
import { EmployeeAlreadyExists } from '../domain/errors/employee-already-exists.error.js';
import { CustomersService } from '../../customers/application/customers.service.js';
import { AccountsService } from '../../accounts/application/accounts.service.js';

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
interface EmailUniquenessChecker {
  existsByEmail(email: string): Promise<boolean>;
}

// Mismo motivo que EmailUniquenessChecker arriba: el token real sigue siendo
// AccountsService (@Inject(forwardRef(...)) más abajo), pero el parámetro no puede estar
// tipado con la clase concreta porque AccountsService importa EmployeesService en sentido
// inverso (para leer Employee.role/email/isActive) — mismo ciclo ESM.
interface EmployeeAccountDeactivator {
  deactivateByEmployeeId(employeeId: number): Promise<void>;
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
    // Dependencia cruzada con accounts: al dar de baja un Employee, hay que intentar dar
    // de baja su Account (si tiene). Toda la lógica (protección del último ADMIN,
    // revocación de sesiones, etc.) vive en AccountsService — acá solo se la invoca.
    @Inject(forwardRef(() => AccountsService))
    private readonly accountsService: EmployeeAccountDeactivator,
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
    // 1. Buscar el empleado (404 si no existe)
    const employee = await this.findById(id);

    // 2. Un empleado dado de baja no se modifica
    if (!employee.isActive()) {
      throw new ConflictException(`Employee with ID ${id} is inactive and cannot be modified`);
    }

    // 3. Aplicar los cambios (valida todo antes de modificar la entidad)
    employee.update(data);

    // 4. Persistir
    await this.employeesRepository.update(employee);

    return employee;
  }

  // --- DAR DE BAJA (US-04): baja lógica, el registro se conserva ---
  async deactivate(id: number): Promise<Employee> {
    const employee = await this.findById(id);
    if (!employee.isActive()) {
      throw new ConflictException(`Employee with ID ${id} is already inactive`);
    }

    // Orden deliberado: la Account (si existe y está activa) se da de baja PRIMERO, antes
    // de tocar el Employee. Si AccountsService rechaza la operación (ConflictException por
    // ser el último ADMIN disponible), ese error se propaga sin capturarlo acá y el
    // Employee queda sin modificar — nunca termina inactivo con su Account todavía activa.
    // Hacerlo en el orden inverso dejaría exactamente ese estado inconsistente si el paso
    // de Account fallara después de haber persistido ya la baja del Employee.
    // Si el Employee no tiene Account, deactivateByEmployeeId no hace nada (no-op).
    await this.accountsService.deactivateByEmployeeId(id);

    employee.deactivate();
    await this.employeesRepository.updateStatus(employee);
    return employee;
  }
}
