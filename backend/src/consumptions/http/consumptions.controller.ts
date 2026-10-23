import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseFilters } from '@nestjs/common';
import { ConsumptionsService } from '../application/consumptions.service.js';
import { CreateConsumptionDto } from './dto/create-consumption.dto.js';
import { VoidConsumptionDto } from './dto/void-consumption.dto.js';
import { PreviewConsumptionQueryDto } from './dto/preview-consumption-query.dto.js';
import { ConsumptionResponseDto } from './dto/consumption-response.dto.js';
import { ConsumptionsExceptionFilter } from './filters/consumptions-exception.filter.js';
import { CustomersService } from '../../customers/application/customers.service.js';
import { CurrentUser } from '../../shared/security/current-user.decorator.js';
import type { CurrentUserData } from '../../shared/security/current-user-data.js';
import { Roles } from '../../shared/security/roles.decorator.js';

// §1: /consumos/preview, POST /consumos y PATCH /consumos/:code/anular son A,C
// (Administrador y Cajero). La ruta en español ("consumos") sigue el mismo criterio que
// accounts/employees.
@Controller('consumos')
@Roles('ADMIN', 'CASHIER')
@UseFilters(ConsumptionsExceptionFilter)
export class ConsumptionsController {
  constructor(
    private readonly consumptionsService: ConsumptionsService,
    private readonly customersService: CustomersService,
  ) {}

  // GET /api/consumos/preview -> CA-21.1
  @Get('preview')
  async preview(@Query() query: PreviewConsumptionQueryDto) {
    return await this.consumptionsService.preview({
      customerId: query.customerId,
      amount: query.amount,
    });
  }

  // POST /api/consumos -> CA-21.5
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: CreateConsumptionDto, @CurrentUser() user: CurrentUserData) {
    const result = await this.consumptionsService.register({
      customerId: dto.customerId,
      amount: dto.amount,
      notes: dto.notes,
      registeredBy: { accountId: user.accountId, employeeId: user.employeeId as number },
    });

    const customer = await this.customersService.findById(dto.customerId);
    return {
      consumption: ConsumptionResponseDto.fromDomain(
        result.consumption,
        {
          id: customer.getId() as number,
          firstName: customer.getFirstName(),
          lastName: customer.getLastName(),
          documentType: customer.getDocumentType(),
          documentNumber: customer.getDocumentNumber(),
        },
        { role: user.role as 'ADMIN' | 'CASHIER', accountId: user.accountId },
      ),
      balanceBefore: result.balanceBefore,
      balanceAfter: result.balanceAfter,
      levelBefore: result.levelBefore,
      levelAfter: result.levelAfter,
      levelUp: result.levelUp,
    };
  }

  // PATCH /api/consumos/:code/anular -> CA-22.4 a CA-22.9
  @Patch(':code/anular')
  async anular(
    @Param('code') code: string,
    @Body() dto: VoidConsumptionDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    const result = await this.consumptionsService.anular({
      code,
      reason: dto.reason,
      actor: {
        accountId: user.accountId,
        role: user.role as 'ADMIN' | 'CASHIER',
        employeeId: user.employeeId as number,
      },
    });

    const customer = await this.customersService.findById(result.consumption.getCustomerId());
    return {
      consumption: ConsumptionResponseDto.fromDomain(
        result.consumption,
        {
          id: customer.getId() as number,
          firstName: customer.getFirstName(),
          lastName: customer.getLastName(),
          documentType: customer.getDocumentType(),
          documentNumber: customer.getDocumentNumber(),
        },
        { role: user.role as 'ADMIN' | 'CASHIER', accountId: user.accountId },
      ),
      balanceBefore: result.balanceBefore,
      balanceAfter: result.balanceAfter,
      negativeBalance: result.negativeBalance,
    };
  }
}
