import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  Param,
  Get,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginUserDto } from './dto/login-user.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard'; // Access token guard
import { JwtRefreshGuard } from './guards/jwt-refresh.guard'; // Refresh token guard
import type { Request } from 'express';
import { CreateUserDto } from '../users/dto/create-user.dto'; // CreateUserDto import

// User 객체 타입 (실제 User 엔티티나 필요한 필드만 포함하는 타입으로 정의 필요)
interface AuthenticatedUser {
  id: string;
  storeId?: string;
  // ... other user properties needed in the request object
}

interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async registerOwner(@Body(new ValidationPipe()) createUserDto: CreateUserDto) {
    // AuthService의 registerOwner가 CreateUserDto와 호환되도록 수정했거나,
    // CreateUserDto가 AuthService의 registerOwner 파라미터 타입과 일치해야 함.
    // 현재 AuthService.registerOwner는 Omit<LoginUserDto, 'username'> & { name?: string; businessRegistrationNumber: string; phoneNumber?: string; } 형태임
    // CreateUserDto는 businessRegistrationNumber, password, name, phoneNumber를 가지므로 호환 가능
    return this.authService.registerOwner(createUserDto);
  }

  @Post('login/:storeId')
  @HttpCode(HttpStatus.OK)
  async login(
    @Param('storeId') storeId: string,
    @Body(new ValidationPipe()) loginUserDto: LoginUserDto,
  ) {
    const loginData = {
      ...loginUserDto,
      storeId,
    };
    return this.authService.login(loginData);
  }

  @Get('verify/:storeId')
  @HttpCode(HttpStatus.OK)
  async verifyToken(
    @Param('storeId') storeId: string,
    @Req() req: Request,
  ) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid token');
    }
    
    const token = authHeader.split(' ')[1];
    const isValid = await this.authService.validateTokenAndStore(token, storeId);
    
    if (!isValid) {
      throw new UnauthorizedException('Invalid token or store mismatch');
    }
    
    return { valid: true, storeId };
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  async refreshTokens(
    @Req() req: RequestWithUser,
    @Body(new ValidationPipe()) refreshTokenDto: RefreshTokenDto,
  ) {
    // JwtRefreshGuard에서 user 객체에 토큰 payload 또는 사용자 정보를 담아 전달한다고 가정
    const userId = req.user.id; // Guard에서 주입된 사용자 ID
    const refreshToken = refreshTokenDto.refreshToken; // DTO에서 리프레시 토큰 가져오기 (Guard에서도 추출 가능)
    return this.authService.refreshTokens(userId, refreshToken);
  }

  // Logout (Access Token 필요)
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: RequestWithUser) {
    return this.authService.logout(req.user.id);
  }

  // 여기에 회원가입(사업자 등록) 엔드포인트도 추가할 수 있습니다.
  // 예: @Post('register') async register(@Body() createUserDto: CreateUserDto) { ... }
}
