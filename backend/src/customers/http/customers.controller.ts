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
  DefaultValuePipe,
} from "@nestjs/common";
import { CreateCustomerDto } from "./dto/create-customer.dto.js";
import { UpdateCustomerDto } from "./dto/update-customer.dto.js";
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


    @Get()
        async findAll(
            @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
            @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
        ){
            const { items, total } = await this.customersService.list({ page, limit });
            return {
                items: items.map((customer) => CustomerResponseDto.fromDomain(customer)),
                total,
                page,
                limit,
            };
        }



    @Get(":id")
        async findById(@Param('id', ParseIntPipe) id: number){
            const customer = await this.customersService.findById(id);
            return CustomerResponseDto.fromDomain(customer);
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
