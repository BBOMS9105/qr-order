import { IsNotEmpty, IsString, IsUUID, MinLength } from 'class-validator';

export class LoginUserDto {
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  storeId: string; // 스토어 ID로 로그인

  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  password: string;
}
