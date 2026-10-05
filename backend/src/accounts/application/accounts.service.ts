import { BadRequestException, ConflictException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Employee, EmployeeRole, EmployeeUpdateData } from '../../employees/domain/employee.js';
import type { EmployeeListFilters } from '../../employees/domain/port/employee.repository.js';
import { EmployeesService } from '../../employees/application/employees.service.js';
import { CustomersService } from '../../customers/application/customers.service.js';
import { Account } from '../domain/account.js';
import { Password } from '../domain/password.js';
import { AccountRepository } from '../domain/port/account.repository.js';
import { PasswordHasher } from '../domain/port/password-hasher.js';
import { SessionRevoker } from '../domain/port/session-revoker.js';
import { AccountAlreadyExists } from '../domain/errors/account-already-exists.error.js';

// El token de inyección real sigue siendo EmployeesService (ver @Inject(forwardRef(...))
// más abajo); esta interfaz solo evita que el parámetro use EmployeesService como TIPO
// estático. Mismo motivo documentado en employees.service.ts: ahora que EmployeesService
// importa AccountsService en sentido inverso (para delegar la baja de Account en la baja
// de Employee), este es un ciclo real de módulos ES — bajo "type": "module" +
// emitDecoratorMetadata, tipar el parámetro con la clase concreta revienta con
// "ReferenceError: Cannot access before initialization".
interface EmployeeDirectory {
  findById(id: number): Promise<Employee>;
  findAll(filters?: EmployeeListFilters): Promise<Employee[]>;
  update(id: number, data: EmployeeUpdateData): Promise<Employee>;
}

// Mismo motivo que EmployeeDirectory arriba, pero por una razón más sutil: CustomersService
// no importa AccountsService directamente, pero sí importa EmployeesService (unicidad de
// email), que ahora importa AccountsService (este archivo). Eso cierra un ciclo de TRES
// módulos (Accounts -> Customers -> Employees -> Accounts), así que esta referencia
// también necesita evitar el tipo concreto en el metadata del decorador.
interface CustomerEmailLookup {
  existsByEmail(email: string): Promise<boolean>;
}

// Entrada de cada caso de uso. No son DTOs HTTP (esa capa todavía no existe para este
// módulo): son el contrato que el futuro controller deberá armar a partir del body.
export type RegisterAccountInput = {
  employeeId: number;
  email: string;
  password: string;
};

// Vista de consulta (US-08). El rol y el email se leen de Employee (fuente de verdad
// única: no existe un "AccountRole" separado, para no terminar con dos definiciones de
// la misma regla de negocio que puedan divergir). passwordHash nunca aparece acá ni en
// ningún otro lugar fuera de Account/AccountRepository.
export type AccountProfile = {
  accountId: number;
  employeeId: number;
  email: string;
  role: EmployeeRole;
  active: boolean;
};

@Injectable()
export class AccountsService {
  constructor(
    private readonly accountsRepository: AccountRepository,
    // Dependencia cruzada con employees (vía su Service exportado). Requiere forwardRef
    // porque EmployeesService depende de AccountsService en sentido inverso (deactivate()
    // delega la baja de Account en deactivateByEmployeeId, ver employees.service.ts).
    @Inject(forwardRef(() => EmployeesService))
    private readonly employeesService: EmployeeDirectory,
    // Dependencia con customers (unicidad global de email en register()). No es un ciclo
    // directo, pero sí lo es a través de Employees (ver CustomerEmailLookup arriba).
    @Inject(forwardRef(() => CustomersService))
    private readonly customersService: CustomerEmailLookup,
    private readonly passwordHasher: PasswordHasher,
    private readonly sessionRevoker: SessionRevoker,
  ) {}

  // --- US-05: REGISTRAR USUARIO ---
  async register(input: RegisterAccountInput): Promise<Account> {
    // 1. El empleado debe existir (404 si no) y estar activo
    const employee = await this.employeesService.findById(input.employeeId);
    if (!employee.isActive()) {
      throw new ConflictException(
        `Employee with ID ${input.employeeId} is inactive and cannot have an account`,
      );
    }

    // 2. Como mucho una cuenta por empleado
    if (await this.accountsRepository.existsByEmployeeId(input.employeeId)) {
      throw new ConflictException(new AccountAlreadyExists(input.employeeId).message);
    }

    // 3. Account no tiene columna propia de email (decisión provisional): el email de
    // acceso es el de Employee. Si el request manda uno distinto, se rechaza (400: dato
    // de entrada incorrecto, no un conflicto de recursos).
    const normalizedEmail = input.email.trim().toLowerCase();
    if (normalizedEmail !== employee.getEmail()) {
      throw new BadRequestException("The email must match the associated employee's email");
    }

    // 4. Unicidad global de email: contra otros empleados ya está garantizada (se valida
    // al crear el Employee). Falta la verificación cruzada contra customers.
    if (await this.customersService.existsByEmail(employee.getEmail())) {
      throw new ConflictException(`Email "${employee.getEmail()}" is already registered as a customer`);
    }

    // 5. Password: se valida longitud en texto plano y se delega el hash a PasswordHasher
    // (implementación concreta pendiente de la rama de auth)
    const password = Password.create(input.password);
    const passwordHash = await this.passwordHasher.hash(password.getValue());

    // 6. Crear y persistir
    const account = Account.create({ employeeId: input.employeeId, passwordHash });
    return await this.accountsRepository.save(account);
  }

  // --- US-08: CONSULTAR USUARIO ---
  async findProfileByEmployeeId(employeeId: number): Promise<AccountProfile> {
    const account = await this.accountsRepository.findByEmployeeId(employeeId);
    if (!account) {
      throw new NotFoundException(`Employee with ID ${employeeId} has no account`);
    }
    const employee = await this.employeesService.findById(employeeId);
    return this.toProfile(account, employee);
  }

  async findProfileById(accountId: number): Promise<AccountProfile> {
    const account = await this.findAccountOrFail(accountId);
    const employee = await this.employeesService.findById(account.getEmployeeId());
    return this.toProfile(account, employee);
  }

  // --- US-06: EDITAR USUARIO (cambio de rol) ---
  // El rol vive en Employee (fuente de verdad, decisión del equipo); esta operación
  // orquesta el cambio ahí, porque es el ABMC de cuentas quien la expone y quien debe
  // aplicar la protección del último ADMIN antes de aplicarlo.
  async updateRole(accountId: number, newRole: EmployeeRole): Promise<AccountProfile> {
    const account = await this.findAccountOrFail(accountId);
    if (!account.isActive()) {
      throw new ConflictException(`Account with ID ${accountId} is inactive and cannot be modified`);
    }

    const employee = await this.employeesService.findById(account.getEmployeeId());

    if (employee.getRole() === 'ADMIN' && newRole !== 'ADMIN') {
      await this.assertNotLastAvailableAdmin(employee);
    }

    const updatedEmployee = await this.employeesService.update(employee.getId() as number, {
      firstName: employee.getFirstName(),
      lastName: employee.getLastName(),
      phone: employee.getPhone(),
      role: newRole,
    });

    // Account.role es una copia derivada de Employee.role (columna real en Prisma, ver
    // AccountRepository.syncRoleFromEmployee). Se sincroniza acá, inmediatamente después
    // de que el cambio en Employee se confirmó, para que nunca quede un Account.role
    // desactualizado respecto de la fuente de verdad.
    await this.accountsRepository.syncRoleFromEmployee(accountId, updatedEmployee.getRole());

    return this.toProfile(account, updatedEmployee);
  }

  // --- US-06: EDITAR USUARIO (resetear contraseña) ---
  async resetPassword(accountId: number, newPassword: string): Promise<Account> {
    const account = await this.findAccountOrFail(accountId);
    if (!account.isActive()) {
      throw new ConflictException(`Account with ID ${accountId} is inactive and cannot be modified`);
    }

    const password = Password.create(newPassword);
    const passwordHash = await this.passwordHasher.hash(password.getValue());
    account.changePasswordHash(passwordHash);
    await this.accountsRepository.updatePasswordHash(account);
    return account;
  }

  // --- US-07: DAR DE BAJA USUARIO ---
  async deactivate(accountId: number): Promise<void> {
    const account = await this.findAccountOrFail(accountId);
    if (!account.isActive()) {
      throw new ConflictException(`Account with ID ${accountId} is already inactive`);
    }

    const employee = await this.employeesService.findById(account.getEmployeeId());
    if (employee.getRole() === 'ADMIN') {
      await this.assertNotLastAvailableAdmin(employee);
    }

    account.deactivate();
    await this.accountsRepository.updateStatus(account);

    // Punto de integración con auth: revocar sesiones/refresh tokens existentes.
    // SessionRevoker es un puerto sin implementación real todavía (ver domain/port).
    await this.sessionRevoker.revokeAllForAccount(account.getId() as number);
  }

  // --- Baja de Employee -> baja de su Account, si tiene una ---
  // Se expone como operación explícita (no se engancha sola a employees.deactivate())
  // para no introducir una dependencia oculta ni un mecanismo de eventos/hooks que el
  // proyecto no usa todavía en ningún otro lado. Quien orqueste la baja del empleado
  // decide cuándo invocarla.
  async deactivateByEmployeeId(employeeId: number): Promise<void> {
    const account = await this.accountsRepository.findByEmployeeId(employeeId);
    if (!account || !account.isActive()) return; // sin cuenta, o ya inactiva: nada que hacer
    await this.deactivate(account.getId() as number);
  }

  // --- Protección del último ADMIN disponible ---
  // "Disponible" = Employee.active && Employee.role === 'ADMIN' && Account.active.
  // Un ADMIN sin cuenta, o con cuenta inactiva, NO cuenta como administrador disponible.
  // No se puede resolver contando solo Employees (ver countActiveByEmployeeIds, provisional).
  private async assertNotLastAvailableAdmin(employee: Employee): Promise<void> {
    const isCurrentlyAvailableAdmin = employee.isActive() && employee.getRole() === 'ADMIN';
    if (!isCurrentlyAvailableAdmin) return;

    const availableAdmins = await this.countAvailableAdmins();
    if (availableAdmins <= 1) {
      throw new ConflictException(
        'This operation would leave the system without an available administrator',
      );
    }
  }

  private async countAvailableAdmins(): Promise<number> {
    const activeEmployees = await this.employeesService.findAll({ active: true });
    const adminIds = activeEmployees
      .filter((employee) => employee.getRole() === 'ADMIN')
      .map((employee) => employee.getId() as number);

    if (adminIds.length === 0) return 0;
    return await this.accountsRepository.countActiveByEmployeeIds(adminIds);
  }

  private async findAccountOrFail(accountId: number): Promise<Account> {
    const account = await this.accountsRepository.findById(accountId);
    if (!account) {
      throw new NotFoundException(`Account with ID ${accountId} not found`);
    }
    return account;
  }

  private toProfile(account: Account, employee: Employee): AccountProfile {
    return {
      accountId: account.getId() as number,
      employeeId: employee.getId() as number,
      email: employee.getEmail(),
      role: employee.getRole(),
      active: account.isActive(),
    };
  }
}
