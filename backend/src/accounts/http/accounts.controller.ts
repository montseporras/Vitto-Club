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
  constructor(private readonly accountsService: AccountsService) {}

  // POST /api/usuarios -> US-05 Registrar usuario
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterAccountDto): Promise<AccountResponseDto> {
    const account = await this.accountsService.register({
      employeeId: dto.employeeId,
      email: dto.email,
      password: dto.password,
    });
    const profile = await this.accountsService.findProfileById(account.getId() as number);
    return AccountResponseDto.fromProfile(profile);
  }

  // PATCH /api/usuarios/:id -> US-06 Editar usuario (rol y/o password)
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAccountDto,
  ): Promise<AccountResponseDto> {
    // No es una regla de negocio, es la traducción de "body sin ningún campo" a 400. Qué
    // constituye un cambio inválido (rol permitido, protección del último ADMIN, longitud
    // de password) sigue decidido entero por AccountsService.
    if (dto.role === undefined && dto.password === undefined) {
      throw new BadRequestException('At least one of role or password must be provided');
    }

    if (dto.role !== undefined) {
      await this.accountsService.updateRole(id, dto.role);
    }
    if (dto.password !== undefined) {
      await this.accountsService.resetPassword(id, dto.password);
    }

    const profile = await this.accountsService.findProfileById(id);
    return AccountResponseDto.fromProfile(profile);
  }

  // PATCH /api/usuarios/:id/deactivate -> US-07 Dar de baja usuario
  @Patch(':id/deactivate')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivate(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.accountsService.deactivate(id);
  }

  // PATCH /api/usuarios/:id/reactivate -> SCRUM-27 (reversible) Reactivar usuario
  @Patch(':id/reactivate')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reactivate(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.accountsService.reactivate(id);
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
