import { EventEmitter2 } from '@nestjs/event-emitter';
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Customer, DocumentType, normalizeDocumentNumber } from '../domain/customer.js';
import { CustomerStatusChange } from '../domain/customer-status-change.js';
import { CustomerRepository, CustomerListParams, CustomerListResult } from '../domain/port/customer.repository.js';
import { CreateCustomerDto } from '../http/dto/create-customer.dto.js';
import { UpdateCustomerDto } from '../http/dto/update-customer.dto.js';
import { CustomerAlreadyExists } from '../domain/errors/customer-already-exists.error.js';
import { Mail } from '../domain/mail.js';
import { EmployeesService } from '../../employees/application/employees.service.js';
import { TransactionRunner } from '../domain/port/transaction-runner.js';
import { CUSTOMER_EMAIL_CHANGED, type CustomerEmailChangedEvent } from '../../shared/events/domain-events.js';

// Dirección única de la unicidad global de email: Customers -> Employees. Employees ya NO
// consulta a Customers (ver employees.service.ts) — por eso esta dependencia ya no forma
// un ciclo y puede tipar la clase concreta de EmployeesService sin forwardRef.
//
// Riesgo aceptado: si se crea un Employee con el email de un Customer ya existente,
// EmployeesService.create() no lo detecta (esa dirección se eliminó). El conflicto recién
// aparece al intentar crear la Account de ese Employee, por Account.email @unique.
@Injectable()
export class CustomersService {
  constructor(
    private readonly customersRepository: CustomerRepository,
    private readonly employeesService: EmployeesService,
    private readonly transactionRunner: TransactionRunner,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // --- CREAR ---
  async create(dto: CreateCustomerDto): Promise<Customer> {
    // 1. Instanciar el Customer (valida y normaliza)
    const customer = Customer.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      documentType: dto.documentType,
      documentNumber: dto.documentNumber,
      email: dto.email,
      phone: dto.phone,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
    });

    // 2. Verificar que el documento y el email no estén ya registrados (por un cliente activo o no)
    await this.assertDocumentAvailable(
      customer.getDocumentType(),
      customer.getDocumentNumber(),
    );
    await this.assertEmailAvailable(customer.getEmail());

    // 3. El email debe ser único en todo el sistema, no solo entre customers.
    if (await this.employeesService.existsByEmail(customer.getEmail())) {
      throw new ConflictException(
        `Email "${customer.getEmail()}" is already registered as an employee`,
      );
    }

    // 4. Persistir
    return await this.customersRepository.save(customer);
  }

  // --- LISTAR TODOS ---
  async findAll(): Promise<Customer[]> {
    return await this.customersRepository.findAll();
  }

  // --- LISTADO PAGINADO ---
  async list(params: CustomerListParams): Promise<CustomerListResult> {
    if (params.page < 1 || params.limit < 1) {
      throw new BadRequestException('page and limit must be positive integers');
    }
    return await this.customersRepository.list(params);
  }

  // --- BUSCAR POR ID ---
  async findById(id: number): Promise<Customer> {
    const customer = await this.customersRepository.findById(id);
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    return customer;
  }

  // --- BUSCAR POR DOCUMENTO (identificación en la caja) ---
  async findByDocument(documentType: DocumentType, documentNumber: string): Promise<Customer> {
    const normalizedNumber = normalizeDocumentNumber(documentNumber);
    const customer = await this.customersRepository.findByDocument(documentType, normalizedNumber);
    if (!customer) {
      throw new NotFoundException(`Customer with ${documentType} "${normalizedNumber}" not found`);
    }
    return customer;
  }

  // --- ACTUALIZAR ---
  async update(id: number, dto: UpdateCustomerDto): Promise<Customer> {
    // 0. Tiene que venir al menos un campo para modificar
    if (Object.values(dto).every((value) => value === undefined)) {
      throw new BadRequestException('At least one field must be provided');
    }

    // La lectura, la escritura y el evento van en una sola transacción: si accounts rechaza el
    // email nuevo (ya lo usa otra cuenta), se deshace también el cambio en Customer.
    return await this.transactionRunner.run(async () => {
      // 1. Buscar si el cliente existe
      const customer = await this.findById(id);
      const previousEmail = customer.getEmail();

      // Un cliente dado de baja no se modifica: primero hay que reactivarlo
      if (!customer.isActive()) {
        throw new ConflictException(`Customer with ID ${id} is inactive: reactivate it before modifying`);
      }

      // 2. Si cambia el documento, verificar que no esté en uso (antes de mutar la entidad)
      if (dto.documentType !== undefined || dto.documentNumber !== undefined) {
        const documentType = dto.documentType ?? customer.getDocumentType();
        const documentNumber =
          dto.documentNumber !== undefined
            ? normalizeDocumentNumber(dto.documentNumber)
            : customer.getDocumentNumber();

        await this.assertDocumentAvailable(documentType, documentNumber, customer.getId() ?? undefined);
      }

      // 2b. Si cambia el email (normalizado igual que al guardar), tampoco puede estar registrado
      // por otro cliente. Además debe ser único frente a employees (misma regla que al crear;
      // Customers -> Employees es la única dirección de este chequeo).
      if (dto.email !== undefined) {
        const normalizedEmail = Mail.create(dto.email).getValue();
        if (normalizedEmail !== customer.getEmail()) {
          await this.assertEmailAvailable(normalizedEmail);
        }
        if (await this.employeesService.existsByEmail(normalizedEmail)) {
          throw new ConflictException(`Email "${normalizedEmail}" is already registered as an employee`);
        }
      }

      // 3. Aplicar los cambios sobre la entidad recuperada
      customer.update({
        firstName: dto.firstName,
        lastName: dto.lastName,
        documentType: dto.documentType,
        documentNumber: dto.documentNumber,
        email: dto.email,
        phone: dto.phone,
        dateOfBirth:
          dto.dateOfBirth === undefined
            ? undefined
            : dto.dateOfBirth === null
              ? null
              : new Date(dto.dateOfBirth),
      });

      // 4. Re-persistir los cambios en el repositorio
      await this.customersRepository.update(customer);

      // 5. Si el email realmente cambió, avisar DESPUÉS de persistir y dentro de la misma
      // transacción: accounts actualiza el email de acceso de la cuenta del cliente.
      if (customer.getEmail() !== previousEmail) {
        await this.eventEmitter.emitAsync(CUSTOMER_EMAIL_CHANGED, {
          customerId: id,
          email: customer.getEmail(),
        } satisfies CustomerEmailChangedEvent);
      }

      return customer;
    });
  }

  // --- DESACTIVAR (BAJA LÓGICA) ---
  async deactivate(id: number): Promise<void> {
    const customer = await this.findById(id);
    if (!customer.isActive()) {
      throw new ConflictException(`Customer with ID ${id} is already inactive`);
    }
    customer.deactivate();
    await this.customersRepository.updateStatus(customer, 'DEACTIVATED');
  }

  // --- ACTIVAR ---
  async activate(id: number): Promise<void> {
    const customer = await this.findById(id);
    if (customer.isActive()) {
      throw new ConflictException(`Customer with ID ${id} is already active`);
    }
    customer.activate();
    await this.customersRepository.updateStatus(customer, 'ACTIVATED');
  }

  // --- HISTORIAL DE BAJAS Y REACTIVACIONES ---
  async getStatusHistory(id: number): Promise<CustomerStatusChange[]> {
    await this.findById(id);
    return await this.customersRepository.findStatusHistory(id);
  }

  // Expuesto para que otros módulos (ej. accounts) validen unicidad de email cruzada
  // entre customers y employees sin acceder al repositorio directamente.
  async existsByEmail(email: string): Promise<boolean> {
    return await this.customersRepository.existsByEmail(email);
  }

  private async assertDocumentAvailable(
    documentType: DocumentType,
    documentNumber: string,
    excludeId?: number,
  ): Promise<void> {
    const taken = await this.customersRepository.existsByDocument(documentType, documentNumber, excludeId);
    if (taken) {
      throw new ConflictException(CustomerAlreadyExists.withDocument(documentType, documentNumber).message);
    }
  }

  private async assertEmailAvailable(email: string): Promise<void> {
    if (await this.customersRepository.existsByEmail(email)) {
      throw new ConflictException(CustomerAlreadyExists.withEmail(email).message);
    }
  }
}
