import { Body, Controller, HttpCode, HttpStatus, Post, UseFilters } from '@nestjs/common';
import { CustomerRegistrationService } from '../application/customer-registration.service.js';
import { RegisterCustomerDto } from './dto/register-customer.dto.js';
import { RegisteredCustomerResponseDto } from './dto/registered-customer-response.dto.js';
import { RegistrationExceptionFilter } from './filters/registration-exception.filter.js';
import { Public } from '../../shared/security/public.decorator.js';

// SCRUM-160: autorregistro de clientes. Es público (una persona sin cuenta todavía no puede
// iniciar sesión) y vive aparte de AccountsController, que está cerrado con @Roles('ADMIN').
@Controller('registro')
@Public()
@UseFilters(RegistrationExceptionFilter)
export class CustomerRegistrationController {
  constructor(private readonly registrationService: CustomerRegistrationService) {}

  // POST /api/registro -> crea el cliente y su cuenta. 201 sin tokens: después el cliente
  // inicia sesión por /api/auth/login con su email y contraseña.
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterCustomerDto): Promise<RegisteredCustomerResponseDto> {
    const registered = await this.registrationService.register({
      firstName: dto.firstName,
      lastName: dto.lastName,
      documentType: dto.documentType,
      documentNumber: dto.documentNumber,
      email: dto.email,
      phone: dto.phone,
      dateOfBirth: dto.dateOfBirth,
      password: dto.password,
    });
    return RegisteredCustomerResponseDto.from(registered);
  }
}
