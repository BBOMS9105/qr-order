import {
  IsString,
  IsNotEmpty,
  MinLength,
  IsOptional,
  IsPhoneNumber,
  Matches,
  IsUUID,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{10}$|^[0-9]{3}-?[0-9]{2}-?[0-9]{5}$/, {
    message: 'Invalid business registration number format',
  })
  businessRegistrationNumber: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  password: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsOptional()
  @IsPhoneNumber('KR')
  phoneNumber?: string;

  @IsUUID()
  @IsNotEmpty()
  storeId: string;
}
