import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseFilters,
} from '@nestjs/common';
import { CustomerRegistrationService } from '../application/customer-registration.service.js';
import { RegisterCustomerDto } from './dto/register-customer.dto.js';
import { RegisteredCustomerResponseDto } from './dto/registered-customer-response.dto.js';
import { RegistrationExceptionFilter } from './filters/registration-exception.filter.js';
import { Public } from '../../shared/security/public.decorator.js';
import { AuditService } from '../../audit/application/audit.service.js';
import { AuditCategory } from '../../audit/domain/audit.repository.js';
import { normalizeDocumentNumber } from '../../customers/domain/customer.js';

// SCRUM-160: autorregistro de clientes. Es público (una persona sin cuenta todavía no puede
// iniciar sesión) y vive aparte de AccountsController, que está cerrado con @Roles('ADMIN').
// La ruta es /api/auth/register, la que usa la pantalla de registro del frontend; el resto de
// /api/auth (login, refresh, logout) es de AuthController.
@Controller('auth')
@Public()
@UseFilters(RegistrationExceptionFilter)
export class CustomerRegistrationController {
  constructor(
    private readonly registrationService: CustomerRegistrationService,
    private readonly auditService: AuditService,
  ) {}

  // POST /api/auth/register -> crea el cliente y su cuenta. 201 sin tokens: después el
  // cliente inicia sesión por /api/auth/login con su email y contraseña.
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterCustomerDto,
  ): Promise<RegisteredCustomerResponseDto> {
    const registered = await this.auditService.capture(
      () =>
        this.registrationService.register({
          firstName: dto.firstName,
          lastName: dto.lastName,
          documentType: dto.documentType,
          documentNumber: normalizeDocumentNumber(dto.documentNumber),
          email: dto.email,
          phone: dto.phone,
          dateOfBirth: dto.dateOfBirth,
          password: dto.password,
        }),
      (result) => ({
        performedBy: `${result.firstName} ${result.lastName}`,
        category: AuditCategory.CUSTOMERS,
        action: 'Autorregistro de cliente',
        documentType: dto.documentType,
        documentNumber: dto.documentNumber,
        details: { customerId: result.customerId },
      }),
    );
    return RegisteredCustomerResponseDto.from(registered);
  }
}
