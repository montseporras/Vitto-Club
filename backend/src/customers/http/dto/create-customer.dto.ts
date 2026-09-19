import { IsNotEmpty, IsString, IsEmail, IsInt, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsNotEmpty()
  @IsEmail()
  mail!: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  factoryId!: number;

}
