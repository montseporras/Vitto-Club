import { PartialType } from '@nestjs/mapped-types';
import { CreateCustomerDto } from './create-cliente.dto';

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}
