import { EventEmitter2 } from '@nestjs/event-emitter';
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Customer, DocumentType, normalizeDocumentNumber } from '../domain/customer.js';
import { CustomerStatusChange } from '../domain/customer-status-change.js';
import { CustomerRepository, CustomerListParams, CustomerListResult } from '../domain/port/customer.repository.js';
import { CreateCustomerDto } from '../http/dto/create-customer.dto.js';
import { UpdateCustomerDto } from '../http/dto/update-customer.dto.js';
import { UpdateMyProfileDto } from '../http/dto/update-my-profile.dto.js';
import { DomainError } from '../domain/errors/domain.error.js';
import { checkBirthDate } from '../domain/profile-birth-date.js';
import { CustomerAlreadyExists } from '../domain/errors/customer-already-exists.error.js';
import { Mail } from '../domain/mail.js';
import { EmployeesService } from '../../employees/application/employees.service.js';
import { TransactionRunner } from '../domain/port/transaction-runner.js';
import { emailInUse, profileEmailInUse } from '../domain/errors/email-in-use.error.js';
import { customerInactive } from '../domain/errors/customer-inactive.error.js';
import { forbiddenField } from '../domain/errors/forbidden-field.error.js';
import { reasonRequired } from '../domain/errors/reason-required.error.js';
import { searchConflict } from '../domain/errors/search-conflict.error.js';
import type { UserRole } from '../../shared/security/current-user-data.js';
import {
  CUSTOMER_CREATED,
  CUSTOMER_DEACTIVATED,
  CUSTOMER_DOCUMENT_CHANGED,
  CUSTOMER_EMAIL_CHANGED,
  CUSTOMER_EMAIL_CHANGE_REQUESTED,
  type CustomerCreatedEvent,
  type CustomerDeactivatedEvent,
  type CustomerDocumentChangedEvent,
  type CustomerEmailChangedEvent,
  type CustomerEmailChangeRequestedEvent,
} from '../../shared/events/domain-events.js';

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

    // 2. Verificar que el documento no esté ya registrado por un cliente activo
    await this.assertDocumentAvailable(
      customer.getDocumentType(),
      customer.getDocumentNumber(),
    );

    // 3. El email no puede usarlo otro cliente activo ni un empleado (contrato §5: EMAIL_IN_USE)
    if (
      (await this.customersRepository.existsByEmail(customer.getEmail(), { onlyActive: true })) ||
      (await this.employeesService.existsByEmail(customer.getEmail()))
    ) {
      throw emailInUse();
    }

    // 4. Persistir
    return await this.customersRepository.save(customer);
  }

  // --- ALTA POR EL CAJERO O EL ADMINISTRADOR (US-17-AJ) ---
  // Crea el cliente y publica customer.created en la misma transacción: accounts escucha el
  // evento y crea la cuenta (contraseña inicial = documento, mustChangePassword = true). Si la
  // cuenta no se puede crear (email en uso por otra cuenta activa), accounts tira 409
  // EMAIL_IN_USE y se deshace también el cliente. El autorregistro NO pasa por acá: sigue
  // usando create(), porque ahí el cliente elige su contraseña.
  async createWithAccount(dto: CreateCustomerDto): Promise<Customer> {
    return await this.transactionRunner.run(async () => {
      const customer = await this.create(dto);

      await this.eventEmitter.emitAsync(CUSTOMER_CREATED, {
        customerId: customer.getId() as number,
        email: customer.getEmail(),
        documentNumber: customer.getDocumentNumber(),
      } satisfies CustomerCreatedEvent);

      return customer;
    });
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
    // q busca en nombre, apellido y documento: junto con name es ambiguo (contrato §3.8.1)
    if (params.search && params.nameContains) {
      throw searchConflict();
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
  // role: quien edita. Las reglas por rol se validan acá y no solo en la pantalla (contrato §3.8.2).
  async update(id: number, dto: UpdateCustomerDto, role: UserRole): Promise<Customer> {
    // 0a. Solo el Administrador corrige el documento (CA-CLI.5)
    if (role !== 'ADMIN' && (dto.documentType !== undefined || dto.documentNumber !== undefined)) {
      throw forbiddenField();
    }

    // 0b. El motivo es obligatorio para el Administrador y opcional para el Cajero (CA-CLI.4)
    if (role === 'ADMIN' && !dto.reason?.trim()) {
      throw reasonRequired();
    }

    // 0c. Tiene que venir al menos un campo para modificar (el motivo no cuenta: no es un dato del cliente)
    if (!Object.entries(dto).some(([key, value]) => key !== 'reason' && value !== undefined)) {
      throw new BadRequestException('At least one field must be provided');
    }

    // La lectura, la escritura y el evento van en una sola transacción: si accounts rechaza el
    // email nuevo (ya lo usa otra cuenta), se deshace también el cambio en Customer.
    return await this.transactionRunner.run(async () => {
      // 1. Buscar si el cliente existe
      const customer = await this.findById(id);
      const previousEmail = customer.getEmail();
      const previousDocumentNumber = customer.getDocumentNumber();

      // Un cliente dado de baja es de solo lectura: no hay reactivación (CA-CLI.6)
      if (!customer.isActive()) {
        throw customerInactive();
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

      // 6. Si el documento cambió, avisar a accounts: si el cliente todavía tiene la contraseña inicial,
      // pasa a ser el documento nuevo (CA-CLI.7). Misma transacción que el cambio.
      if (customer.getDocumentNumber() !== previousDocumentNumber) {
        await this.eventEmitter.emitAsync(CUSTOMER_DOCUMENT_CHANGED, {
          customerId: id,
          documentNumber: customer.getDocumentNumber(),
        } satisfies CustomerDocumentChangedEvent);
      }

      return customer;
    });
  }

  // --- MI PERFIL (PERFIL, contrato §3.10.4) ---
  // El cliente edita su teléfono, su correo y su fecha de nacimiento. customerId sale del token.
  // Si cambia el correo, primero se confirma la contraseña actual (accounts, por evento): si falla,
  // todavía no se escribió nada, así que tampoco se guardan el teléfono ni la fecha. No se audita
  // (el actor es el cliente).
  async updateOwnProfile(customerId: number, dto: UpdateMyProfileDto): Promise<Customer> {
    // Tiene que venir al menos un dato; currentPassword solo confirma, no es un dato del cliente
    if (dto.email === undefined && dto.phone === undefined && dto.dateOfBirth === undefined) {
      throw new BadRequestException('At least one field must be provided');
    }

    let dateOfBirth: Date | null | undefined;
    if (dto.dateOfBirth === undefined) {
      dateOfBirth = undefined;
    } else if (dto.dateOfBirth === null) {
      dateOfBirth = null;
    } else {
      const checked = checkBirthDate(dto.dateOfBirth, new Date());
      if ('message' in checked) throw new BadRequestException(checked.message);
      dateOfBirth = checked.date;
    }

    return await this.transactionRunner.run(async () => {
      const customer = await this.findById(customerId);
      const previousEmail = customer.getEmail();

      // Mismo valor con otras mayúsculas o espacios no es un cambio: no pide contraseña y se ignora
      const newEmail = dto.email === undefined ? undefined : Mail.create(dto.email).getValue();
      const emailChanged = newEmail !== undefined && newEmail !== previousEmail;

      if (emailChanged) {
        if (!dto.currentPassword) {
          throw new BadRequestException('Ingresá tu contraseña actual para cambiar el correo');
        }
        // accounts verifica la contraseña (con el límite de intentos) y que ninguna otra cuenta
        // activa use el correo. Tira 400 CURRENT_PASSWORD_INCORRECT, 429 o 409 EMAIL_IN_USE.
        await this.eventEmitter.emitAsync(CUSTOMER_EMAIL_CHANGE_REQUESTED, {
          customerId,
          email: newEmail,
          currentPassword: dto.currentPassword,
        } satisfies CustomerEmailChangeRequestedEvent);

        if (
          (await this.customersRepository.existsByEmail(newEmail, { onlyActive: true })) ||
          (await this.employeesService.existsByEmail(newEmail))
        ) {
          throw profileEmailInUse();
        }
      }

      try {
        customer.update({
          email: emailChanged ? newEmail : undefined,
          phone: dto.phone,
          dateOfBirth,
        });
      } catch (error) {
        if (error instanceof DomainError && error.field === 'phone') {
          throw new BadRequestException('El teléfono tiene que tener entre 8 y 15 números');
        }
        throw error;
      }
      await this.customersRepository.update(customer);

      // accounts copia el correo nuevo en el email de acceso, en esta misma transacción
      if (emailChanged) {
        await this.eventEmitter.emitAsync(CUSTOMER_EMAIL_CHANGED, {
          customerId,
          email: customer.getEmail(),
        } satisfies CustomerEmailChangedEvent);
      }

      return customer;
    });
  }

  // --- DESACTIVAR (BAJA LÓGICA) ---
  // Devuelve el saldo que el cliente pierde con la baja (para la auditoría, "Saldo perdido").
  // Publica customer.deactivated en la misma transacción: accounts deja inactiva la cuenta y se
  // cierran sus sesiones; si eso falla, el cliente sigue activo (contrato §3.8.3).
  async deactivate(id: number): Promise<number> {
    return await this.transactionRunner.run(async () => {
      const customer = await this.findById(id);
      if (!customer.isActive()) {
        throw new ConflictException(`Customer with ID ${id} is already inactive`);
      }
      const lostBalance = await this.customersRepository.findBalance(id);
      customer.deactivate();
      await this.customersRepository.updateStatus(customer, 'DEACTIVATED');
      await this.eventEmitter.emitAsync(CUSTOMER_DEACTIVATED, {
        customerId: id,
      } satisfies CustomerDeactivatedEvent);
      return lostBalance;
    });
  }

  // --- HISTORIAL DE BAJAS Y REACTIVACIONES ---
  async getStatusHistory(id: number): Promise<CustomerStatusChange[]> {
    await this.findById(id);
    return await this.customersRepository.findStatusHistory(id);
  }

  // Expuesto para el registro de clientes (accounts): ¿hay un cliente ACTIVO con ese
  // documento? El número se normaliza igual que al guardar.
  async existsByDocument(documentType: DocumentType, documentNumber: string): Promise<boolean> {
    return await this.customersRepository.existsByDocument(
      documentType,
      normalizeDocumentNumber(documentNumber),
    );
  }

  // Expuesto para que otros módulos (ej. accounts) validen unicidad de email cruzada
  // entre customers y employees sin acceder al repositorio directamente.
  async existsByEmail(email: string): Promise<boolean> {
    return await this.customersRepository.existsByEmail(email);
  }

  // Expuesto para el registro de clientes (accounts): ¿hay un cliente ACTIVO con ese email?
  async existsActiveByEmail(email: string): Promise<boolean> {
    return await this.customersRepository.existsByEmail(email, { onlyActive: true });
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
    if (await this.customersRepository.existsByEmail(email, { onlyActive: true })) {
      throw new ConflictException(CustomerAlreadyExists.withEmail(email).message);
    }
  }
}
