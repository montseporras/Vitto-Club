import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseFilters,
} from '@nestjs/common';
import { AccountsService } from '../application/accounts.service.js';
import { RegisterAccountDto } from './dto/register-account.dto.js';
import { UpdateAccountDto } from './dto/update-account.dto.js';
import { AccountResponseDto } from './dto/account-response.dto.js';
import { AccountsExceptionFilter } from './filters/accounts-exception.filter.js';
import { Roles } from '../../shared/security/roles.decorator.js';
import { CurrentUser } from '../../shared/security/current-user.decorator.js';
import type { CurrentUserData } from '../../shared/security/current-user-data.js';
import type { Employee } from '../../employees/domain/employee.js';
import { EmployeesService } from '../../employees/application/employees.service.js';
import { AuditService } from '../../audit/application/audit.service.js';
import { actorOf } from '../../audit/domain/audit-entry.js';
import {
  userAccountCreatedEntry,
  userAccountDeactivatedEntry,
  userAccountReactivatedEntry,
  userAccountUpdatedEntry,
} from '../../audit/domain/audit-entries.js';

// Nombre del empleado dueño de la cuenta, para el texto de la auditoría
const nameOf = (employee: Employee) => ({
  firstName: employee.getFirstName(),
  lastName: employee.getLastName(),
});

// Ruta en español ("usuarios"), consistente con el contrato HTTP ya diseñado para el ABMC
// de cuentas de empleados. La validación del body la hace el ValidationPipe global de
// main.ts (whitelist + forbidNonWhitelisted): no hay @UsePipes propio acá, igual que
// EmployeesController.
//
// Solo el Administrador gestiona las cuentas de usuario. Los guards (autenticación y roles)
// son globales: los registra AuthModule para toda la aplicación.
@Controller('usuarios')
@Roles('ADMIN')
@UseFilters(AccountsExceptionFilter)
export class AccountsController {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly employeesService: EmployeesService,
    private readonly auditService: AuditService,
  ) {}

  // GET /api/usuarios -> SCRUM-27: listar usuarios de empleados (activos e inactivos)
  @Get()
  async findAll(): Promise<AccountResponseDto[]> {
    const profiles = await this.accountsService.findAll();
    return profiles.map((profile) => AccountResponseDto.fromProfile(profile));
  }

  // POST /api/usuarios -> US-05 Registrar usuario
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterAccountDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<AccountResponseDto> {
    const { profile } = await this.auditService.capture(
      async () => {
        const account = await this.accountsService.register({
          employeeId: dto.employeeId,
          email: dto.email,
          password: dto.password,
        });
        const created = await this.accountsService.findProfileById(account.getId() as number);
        const employee = await this.employeesService.findById(created.employeeId);
        return { profile: created, employee };
      },
      ({ profile: created, employee }) =>
        userAccountCreatedEntry(actorOf(user), nameOf(employee), created.email),
    );
    return AccountResponseDto.fromProfile(profile);
  }

  // PATCH /api/usuarios/:id -> US-06 Editar usuario (rol y/o password)
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAccountDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<AccountResponseDto> {
    // No es una regla de negocio, es la traducción de "body sin ningún campo" a 400. Qué
    // constituye un cambio inválido (rol permitido, protección del último ADMIN, longitud
    // de password) sigue decidido entero por AccountsService.
    if (dto.role === undefined && dto.password === undefined) {
      throw new BadRequestException('At least one of role or password must be provided');
    }

    const { profile } = await this.auditService.capture(
      async () => {
        const before = await this.accountsService.findProfileById(id);
        if (dto.role !== undefined) {
          await this.accountsService.updateRole(id, dto.role);
        }
        if (dto.password !== undefined) {
          await this.accountsService.resetPassword(id, dto.password);
        }
        const updated = await this.accountsService.findProfileById(id);
        const employee = await this.employeesService.findById(updated.employeeId);
        return { before, profile: updated, employee };
      },
      ({ before, profile: updated, employee }) => {
        const passwordChanged = dto.password !== undefined;
        // Mandar el mismo rol que ya tenía no cambia nada: si tampoco hay contraseña, no se audita
        if (!passwordChanged && before.role === updated.role) return null;
        return userAccountUpdatedEntry(actorOf(user), nameOf(employee), {
          previousRole: before.role,
          newRole: updated.role,
          passwordChanged,
        });
      },
    );
    return AccountResponseDto.fromProfile(profile);
  }

  // PATCH /api/usuarios/:id/deactivate -> US-07 Dar de baja usuario
  @Patch(':id/deactivate')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserData,
  ): Promise<void> {
    await this.auditService.capture(
      async () => {
        const profile = await this.accountsService.findProfileById(id);
        await this.accountsService.deactivate(id);
        return await this.employeesService.findById(profile.employeeId);
      },
      (employee) => userAccountDeactivatedEntry(actorOf(user), nameOf(employee)),
    );
  }

  // PATCH /api/usuarios/:id/reactivate -> SCRUM-27 (reversible) Reactivar usuario
  @Patch(':id/reactivate')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reactivate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserData,
  ): Promise<void> {
    await this.auditService.capture(
      async () => {
        const profile = await this.accountsService.findProfileById(id);
        await this.accountsService.reactivate(id);
        return await this.employeesService.findById(profile.employeeId);
      },
      (employee) => userAccountReactivatedEntry(actorOf(user), nameOf(employee)),
    );
  }

  // GET /api/usuarios/empleado/:employeeId -> US-08 Consultar usuario (por empleado)
  @Get('empleado/:employeeId')
  async findByEmployeeId(
    @Param('employeeId', ParseIntPipe) employeeId: number,
  ): Promise<AccountResponseDto> {
    const profile = await this.accountsService.findProfileByEmployeeId(employeeId);
    return AccountResponseDto.fromProfile(profile);
  }
}
