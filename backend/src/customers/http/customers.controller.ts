import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  UsePipes,
  ValidationPipe,
  UseFilters,
  Query,
  ForbiddenException,
} from "@nestjs/common";
import { CreateCustomerDto } from "./dto/create-customer.dto.js";
import { UpdateCustomerDto } from "./dto/update-customer.dto.js";
import { ListCustomersQueryDto } from "./dto/list-customers-query.dto.js";
import { FindCustomerByDocumentQueryDto } from "./dto/find-customer-by-document-query.dto.js";
import { CustomersService } from "../application/customers.service.js";
import { CustomerResponseDto } from "./dto/customer-response.dto.js";
import { CustomerExceptionFilter } from "./filters/customers-exception.filter.js";
import { Roles } from "../../shared/security/roles.decorator.js";
import { CurrentUser } from "../../shared/security/current-user.decorator.js";
import type { CurrentUserData } from "../../shared/security/current-user-data.js";
import { CustomerPointsService } from "../application/customer-points.service.js";
import { CustomerPointsResponseDto } from "./dto/customer-points-response.dto.js";





@Controller('customers')
@Roles('ADMIN', 'CASHIER') // el Cajero gestiona clientes, incluida la baja, la reactivación y el historial
@UseFilters(CustomerExceptionFilter)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
  }),
)
export class CustomersController{

        constructor(
            private readonly customersService: CustomersService,
            private readonly customerPointsService: CustomerPointsService,
        ){}


    // GET /customers?page=1&limit=20&active=true&name=juan
    @Get()
        async findAll(@Query() query: ListCustomersQueryDto){
            const { items, total } = await this.customersService.list({
                page: query.page,
                limit: query.limit,
                nameContains: query.name?.trim() || undefined,
                active: query.active === undefined ? undefined : query.active === 'true',
            });
            return {
                items: items.map((customer) => CustomerResponseDto.fromDomain(customer)),
                total,
                page: query.page,
                limit: query.limit,
            };
        }


    // GET /customers/me/puntos -> CA-19.7 (§3.10.1): solo el Cliente, con el cliente del token.
    // Tiene que ir ANTES que @Get(':id/puntos'), si no "me" se interpretaría como un id.
    @Get('me/puntos')
    @Roles('CUSTOMER')
        async myPoints(@CurrentUser() user: CurrentUserData){
            // Un token de Cliente siempre trae customerId; si no lo trae, se rechaza igual que el RolesGuard
            if (user.customerId === undefined) {
                throw new ForbiddenException({
                    statusCode: 403,
                    error: 'Forbidden',
                    message: 'You do not have permission to perform this operation',
                    code: 'FORBIDDEN',
                });
            }
            const summary = await this.customerPointsService.getSummary(user.customerId);
            return CustomerPointsResponseDto.fromSummary(summary);
        }


    // GET /customers/by-document?documentType=DNI&documentNumber=40123456
    // Tiene que ir ANTES que @Get(':id'), si no "by-document" se interpretaría como un id.
    @Get('by-document')
        async findByDocument(@Query() query: FindCustomerByDocumentQueryDto){
            const customer = await this.customersService.findByDocument(
                query.documentType,
                query.documentNumber,
            );
            return CustomerResponseDto.fromDomain(customer);
        }


    @Get(":id")
        async findById(@Param('id', ParseIntPipe) id: number){
            const customer = await this.customersService.findById(id);
            return CustomerResponseDto.fromDomain(customer);
        }


    // GET /customers/:id/puntos -> CA-46.6 (§3.4.1): Administrador y Cajero (roles de la clase)
    @Get(':id/puntos')
        async points(@Param('id', ParseIntPipe) id: number){
            const summary = await this.customerPointsService.getSummary(id);
            return CustomerPointsResponseDto.fromSummary(summary);
        }


    // GET /customers/:id/status-history -> bajas y reactivaciones, la más reciente primero
    @Get(':id/status-history')
        async statusHistory(@Param('id', ParseIntPipe) id: number){
            const history = await this.customersService.getStatusHistory(id);
            return history.map((change) => ({
                id: change.id,
                action: change.action,
                createdAt: change.createdAt.toISOString(),
            }));
        }


    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() createDto: CreateCustomerDto){
        const customer = await this.customersService.create(createDto);
        return CustomerResponseDto.fromDomain(customer);
    }

    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateDto: UpdateCustomerDto,
    ){
        const customer = await this.customersService.update(id, updateDto);
        return CustomerResponseDto.fromDomain(customer);
    }


    @Patch(':id/deactivate')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deactivate(@Param('id', ParseIntPipe) id: number) {
        await this.customersService.deactivate(id);
        }

    @Patch(':id/activate')
        @HttpCode(HttpStatus.NO_CONTENT)
        async activate(@Param('id', ParseIntPipe) id: number) {
            await this.customersService.activate(id);
        }


}
