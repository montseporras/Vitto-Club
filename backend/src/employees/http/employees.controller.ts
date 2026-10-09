import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseFilters,
} from '@nestjs/common';
import { EmployeesService } from '../application/employees.service.js';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';
import { UpdateEmployeeDto } from './dto/update-employee.dto.js';
import { ListEmployeesQueryDto } from './dto/list-employees-query.dto.js';
import { EmployeeResponseDto } from './dto/employee-response.dto.js';
import { EmployeesExceptionFilter } from './filters/employees-exception.filter.js';
import { Roles } from '../../shared/security/roles.decorator.js';
import { CurrentUser } from '../../shared/security/current-user.decorator.js';
import type { CurrentUserData } from '../../shared/security/current-user-data.js';
import { AuditService } from '../../audit/application/audit.service.js';
import { AuditCategory } from '../../audit/domain/audit.repository.js';

// La ruta en español respeta el contrato actual del frontend (features/empleados).
// La validación del body la hace el ValidationPipe global de main.ts.
@Controller('empleados')
@Roles('ADMIN') // solo el Administrador gestiona empleados
@UseFilters(EmployeesExceptionFilter)
export class EmployeesController {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly auditService: AuditService,
  ) {}

  // GET /api/empleados?name=ana&active=true -> US-03 Consultar empleados (siempre un array)
  @Get()
  async findAll(
    @Query() query: ListEmployeesQueryDto,
  ): Promise<EmployeeResponseDto[]> {
    const employees = await this.employeesService.findAll({
      nameContains: query.name?.trim() || undefined,
      active: query.active === undefined ? undefined : query.active === 'true',
    });
    return employees.map((employee) =>
      EmployeeResponseDto.fromDomain(employee),
    );
  }

  // GET /api/empleados/:id -> US-03 Consultar un empleado
  @Get(':id')
  async findById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<EmployeeResponseDto> {
    const employee = await this.employeesService.findById(id);
    return EmployeeResponseDto.fromDomain(employee);
  }

  // POST /api/empleados -> US-01 Registrar empleado
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateEmployeeDto,
    @CurrentUser() actor: CurrentUserData,
  ): Promise<EmployeeResponseDto> {
    const employee = await this.auditService.capture(
      () =>
        this.employeesService.create({
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          role: dto.role,
          phone: dto.phone,
        }),
      (created) => ({
        actorAccountId: actor.accountId,
        category: AuditCategory.EMPLOYEES,
        action: 'Registro de empleado',
        details: { employeeId: created.getId()!, role: created.getRole() },
      }),
    );
    return EmployeeResponseDto.fromDomain(employee);
  }

  // PATCH /api/empleados/:id -> US-02 Editar empleado
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() actor: CurrentUserData,
  ): Promise<EmployeeResponseDto> {
    const employee = await this.auditService.capture(
      () =>
        this.employeesService.update(id, {
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: dto.role,
          phone: dto.phone,
        }),
      () => ({
        actorAccountId: actor.accountId,
        category: AuditCategory.EMPLOYEES,
        action: 'Modificación de empleado',
        details: { employeeId: id, fields: Object.keys(dto) },
      }),
    );
    return EmployeeResponseDto.fromDomain(employee);
  }

  // DELETE /api/empleados/:id -> US-04 Dar de baja (lógica: no borra el registro)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deactivate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: CurrentUserData,
  ): Promise<EmployeeResponseDto> {
    const employee = await this.auditService.capture(
      () => this.employeesService.deactivate(id),
      () => ({
        actorAccountId: actor.accountId,
        category: AuditCategory.EMPLOYEES,
        action: 'Baja lógica de empleado',
        details: { employeeId: id },
      }),
    );
    return EmployeeResponseDto.fromDomain(employee);
  }
}
