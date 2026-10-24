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
import { UpdateMyProfileDto } from "./dto/update-my-profile.dto.js";
import { MyProfileResponseDto } from "./dto/my-profile-response.dto.js";
import { ListCustomersQueryDto } from "./dto/list-customers-query.dto.js";
import { FindCustomerByDocumentQueryDto } from "./dto/find-customer-by-document-query.dto.js";
import { CustomersService } from "../application/customers.service.js";
import { CustomerResponseDto } from "./dto/customer-response.dto.js";
import { CustomerListItemResponseDto } from "./dto/customer-list-item-response.dto.js";
import { CustomerExceptionFilter } from "./filters/customers-exception.filter.js";
import { Roles } from "../../shared/security/roles.decorator.js";
import { CurrentUser } from "../../shared/security/current-user.decorator.js";
import type { CurrentUserData } from "../../shared/security/current-user-data.js";
import { CustomerPointsService } from "../application/customer-points.service.js";
import { CustomerPointsResponseDto } from "./dto/customer-points-response.dto.js";
import { AuditService } from "../../audit/application/audit.service.js";
import { actorOf } from "../../audit/domain/audit-entry.js";
import {
  customerCreatedEntry,
  customerDeactivatedEntry,
  customerUpdatedEntry,
} from "../../audit/domain/audit-entries.js";
import { toCustomerSnapshot } from "./customer-audit-snapshot.js";





@Controller('customers')
@Roles('ADMIN', 'CASHIER') // el Cajero gestiona clientes, incluida la baja y el historial (con sus restricciones)
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
            private readonly auditService: AuditService,
            private readonly customerPointsService: CustomerPointsService,
        ){}


    // GET /customers?page=1&limit=20&active=true&name=juan
    // Pantalla del Administrador: ?active=true&sort=lastName&q=...&level=...&page=1&limit=20
    @Get()
        async findAll(@Query() query: ListCustomersQueryDto){
            const { items, total } = await this.customersService.list({
                page: query.page,
                limit: query.limit,
                nameContains: query.name?.trim() || undefined,
                search: query.q?.trim() || undefined,
                level: query.level,
                sort: query.sort,
                active: query.active === undefined ? undefined : query.active === 'true',
            });
            return {
                items: items.map((item) => CustomerListItemResponseDto.fromListItem(item)),
                total,
                page: query.page,
                limit: query.limit,
            };
        }


    // --- Vista del Cliente (PERFIL, contrato §3.10) ---
    // Son solo para el rol CUSTOMER y el cliente sale del token, nunca de la URL ni del body.
    // Tienen que ir ANTES que @Get(':id') y @Patch(':id'), si no "me" se interpretaría como un id.
    @Get('me')
    @Roles('CUSTOMER')
        async getMyProfile(@CurrentUser() user: CurrentUserData){
            const customer = await this.customersService.findById(user.customerId as number);
            return MyProfileResponseDto.fromDomain(customer);
        }

    // PATCH /customers/me -> teléfono, correo y fecha de nacimiento. No se audita: el actor es el cliente.
    @Patch('me')
    @Roles('CUSTOMER')
        async updateMyProfile(@Body() dto: UpdateMyProfileDto, @CurrentUser() user: CurrentUserData){
            const customer = await this.customersService.updateOwnProfile(user.customerId as number, dto);
            return MyProfileResponseDto.fromDomain(customer);
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
    async create(@Body() createDto: CreateCustomerDto, @CurrentUser() user: CurrentUserData){
        // Crea también la cuenta del cliente (contraseña inicial = documento).
        // La auditoría se escribe en la misma transacción (ver AuditService.capture).
        const customer = await this.auditService.capture(
            () => this.customersService.createWithAccount(createDto),
            (created) =>
                customerCreatedEntry(
                    actorOf(user),
                    toCustomerSnapshot(created),
                    user.role === 'ADMIN' ? 'ADMIN' : 'CASHIER',
                ),
        );
        return CustomerResponseDto.fromDomain(customer);
    }

    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateDto: UpdateCustomerDto,
        @CurrentUser() user: CurrentUserData,
    ){
        const { customer } = await this.auditService.capture(
            async () => {
                // La foto de "antes" se toma dentro de la transacción, para comparar con el resultado
                const before = toCustomerSnapshot(await this.customersService.findById(id));
                const updated = await this.customersService.update(id, updateDto, user.role);
                return { before, customer: updated };
            },
            ({ before, customer: updated }) =>
                customerUpdatedEntry(
                    actorOf(user),
                    before,
                    toCustomerSnapshot(updated),
                    updateDto.reason || undefined,
                ),
        );
        return CustomerResponseDto.fromDomain(customer);
    }


    @Patch(':id/deactivate')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deactivate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserData) {
        await this.auditService.capture(
            async () => {
                const customer = await this.customersService.findById(id);
                const lostBalance = await this.customersService.deactivate(id);
                return { customer, lostBalance };
            },
            ({ customer, lostBalance }) =>
                customerDeactivatedEntry(actorOf(user), toCustomerSnapshot(customer), lostBalance),
        );
        }


}
