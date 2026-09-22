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
} from "@nestjs/common";
import { CreateCustomerDto } from "./dto/create-customer.dto.js";
import { UpdateCustomerDto } from "./dto/update-customer.dto.js";
import { ListCustomersQueryDto } from "./dto/list-customers-query.dto.js";
import { FindCustomerByDocumentQueryDto } from "./dto/find-customer-by-document-query.dto.js";
import { CustomersService } from "../application/customers.service.js";
import { CustomerResponseDto } from "./dto/customer-response.dto.js";
import { CustomerExceptionFilter } from "./filters/customers-exception.filter.js";





@Controller('customers')
@UseFilters(CustomerExceptionFilter)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
  }),
)
export class CustomersController{

        constructor(
            private readonly customersService: CustomersService
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
