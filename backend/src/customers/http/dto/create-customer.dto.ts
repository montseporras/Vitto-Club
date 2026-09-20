import { IsNotEmpty, IsString, IsEmail } from 'class-validator';

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
}
