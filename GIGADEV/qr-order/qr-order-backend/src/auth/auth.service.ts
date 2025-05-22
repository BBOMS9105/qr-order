import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { LoginUserDto } from './dto/login-user.dto';
import * as crypto from 'crypto';
import { User } from '../users/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store } from '../payments/entities/store.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
  ) {}

  // SHA-256 + Salt로 비밀번호 해싱 (동기 함수로 변경)
  private hashPassword(password: string, salt: string): string {
    return crypto.createHmac('sha256', salt).update(password).digest('hex');
  }

  // Salt 생성 (동기 함수로 변경)
  private generateSalt(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  // 스토어 ID로 사용자 검증 (로그인 시 사용)
  async validateUserByStore(
    storeId: string,
    pass: string,
  ): Promise<Omit<User, 'password' | 'salt' | 'refreshToken'> | null> {
    // 1. 스토어 존재 여부 확인
    const store = await this.storeRepository.findOneBy({ id: storeId });
    if (!store) {
      throw new NotFoundException(`Store with ID ${storeId} not found`);
    }

    // 2. 해당 스토어에 연결된 관리자 사용자 찾기
    const user = await this.usersService.findByStoreId(storeId);
    if (!user) {
      throw new NotFoundException(`No admin user found for store with ID ${storeId}`);
    }

    // 3. 비밀번호 검증
    const hashedPassword = this.hashPassword(pass, user.salt);
    if (hashedPassword === user.password) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, salt, refreshToken, ...result } = user;
      return result;
    }
    
    return null;
  }

  async login(loginUserDto: LoginUserDto) {
    const user = await this.validateUserByStore(loginUserDto.storeId, loginUserDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    const tokens = await this._generateTokens(user as User, loginUserDto.storeId);
    await this.usersService.setCurrentRefreshToken(tokens.refreshToken, user.id);
    
    return {
      message: 'Login successful',
      user,
      storeId: loginUserDto.storeId,
      ...tokens,
    };
  }

  private async _generateTokens(user: Pick<User, 'id' | 'name'>, storeId: string) {
    // 페이로드에 storeId 추가
    const accessTokenPayload = { 
      username: user.name, 
      sub: user.id,
      storeId: storeId
    };
    
    const refreshTokenPayload = { 
      sub: user.id,
      storeId: storeId
    };
    
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessTokenPayload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRATION_TIME'),
      }),
      this.jwtService.signAsync(refreshTokenPayload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION_TIME'),
      }),
    ]);
    
    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.usersService.getUserIfRefreshTokenMatches(refreshToken, userId);
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token or user mismatch');
    }
    
    if (!user.storeId) {
      throw new BadRequestException('User is not associated with any store');
    }
    
    const tokens = await this._generateTokens(user, user.storeId);
    await this.usersService.setCurrentRefreshToken(tokens.refreshToken, user.id);
    
    return tokens;
  }

  async logout(userId: string): Promise<{ message: string }> {
    await this.usersService.removeRefreshToken(userId);
    return { message: 'Logout successful' };
  }

  // 스토어 ID로 유효한 토큰인지 확인
  async validateTokenAndStore(token: string, storeId: string): Promise<boolean> {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      
      // 토큰에 있는 storeId와 요청한 storeId가 일치하는지 확인
      return payload.storeId === storeId;
    } catch (error) {
      return false;
    }
  }

  // Owner registration (can be moved to UsersService or a dedicated OwnerService)
  async registerOwner(
    createUserDto: Omit<LoginUserDto, 'storeId'> & {
      name?: string;
      businessRegistrationNumber: string;
      phoneNumber?: string;
      storeId: string;
    },
  ) {
    // 스토어 존재 여부 확인
    const store = await this.storeRepository.findOneBy({ id: createUserDto.storeId });
    if (!store) {
      throw new NotFoundException(`Store with ID ${createUserDto.storeId} not found`);
    }

    // 해당 스토어에 이미 관리자가 있는지 확인
    const existingAdmin = await this.usersService.findByStoreId(createUserDto.storeId);
    if (existingAdmin) {
      throw new BadRequestException(`Store with ID ${createUserDto.storeId} already has an admin user`);
    }

    const salt = this.generateSalt();
    const hashedPassword = this.hashPassword(createUserDto.password, salt);

    const newUser = await this.usersService.createUser({
      businessRegistrationNumber: createUserDto.businessRegistrationNumber,
      name: createUserDto.name,
      phoneNumber: createUserDto.phoneNumber,
      password: hashedPassword,
      salt,
      storeId: createUserDto.storeId,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, salt: _, refreshToken, ...result } = newUser;
    return result;
  }
}
