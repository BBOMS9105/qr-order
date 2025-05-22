import {
  Controller,
  Post,
  Body,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Param,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as crypto from 'crypto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store } from '../payments/entities/store.entity';

@Controller('admin/users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
  ) {}

  // 관리자용 회원가입 API
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async registerUser(@Body(ValidationPipe) createUserDto: CreateUserDto) {
    // 1. 스토어 존재 여부 확인
    const store = await this.storeRepository.findOneBy({ id: createUserDto.storeId });
    if (!store) {
      throw new Error(`스토어 ID ${createUserDto.storeId}를 찾을 수 없습니다.`);
    }

    // 2. 해당 스토어에 이미 관리자가 있는지 확인
    const existingAdmin = await this.usersService.findByStoreId(createUserDto.storeId);
    if (existingAdmin) {
      throw new Error(`스토어 ID ${createUserDto.storeId}에는 이미 관리자가 등록되어 있습니다.`);
    }

    // 3. 비밀번호 해싱
    const salt = crypto.randomBytes(16).toString('hex');
    const hashedPassword = crypto
      .createHmac('sha256', salt)
      .update(createUserDto.password)
      .digest('hex');

    // 4. 사용자 생성
    const newUser = await this.usersService.createUser({
      businessRegistrationNumber: createUserDto.businessRegistrationNumber,
      name: createUserDto.name,
      phoneNumber: createUserDto.phoneNumber,
      password: hashedPassword,
      salt,
      storeId: createUserDto.storeId,
    });

    // 5. 응답에서 비밀번호 및 민감 정보 제외
    const { password, salt: _, refreshToken, ...result } = newUser;
    return {
      message: '사용자가 성공적으로 등록되었습니다.',
      user: result,
    };
  }

  // 스토어 목록 조회 API (관리자용)
  @UseGuards(JwtAuthGuard)
  @Get('stores')
  async getAllStores() {
    const stores = await this.storeRepository.find({
      select: ['id', 'name', 'address', 'createdAt'],
      order: { createdAt: 'DESC' },
    });
    
    return {
      count: stores.length,
      stores,
    };
  }

  // 특정 스토어 조회 API (관리자용)
  @UseGuards(JwtAuthGuard)
  @Get('stores/:storeId')
  async getStoreById(@Param('storeId') storeId: string) {
    const store = await this.storeRepository.findOneBy({ id: storeId });
    if (!store) {
      throw new Error(`스토어 ID ${storeId}를 찾을 수 없습니다.`);
    }
    
    return store;
  }
} 