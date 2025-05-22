import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as crypto from 'crypto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // AuthService에서 비밀번호 해싱/검증을 하므로 UsersService는 순수 CRUD에 집중할 수 있으나,
  // 리프레시 토큰 해싱 등은 여기서 처리할 수 있음.
  private hashRefreshToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async createUser(userData: Partial<User>): Promise<User> {
    // id는 User 엔티티 생성자에서 자동 생성됨
    const user = this.userRepository.create(userData);
    try {
      return await this.userRepository.save(user);
    } catch (error) {
      // 타입 정의
      const pgError = error as { code?: string; message?: string };
      
      // 코드 '23505'는 PostgreSQL에서 unique constraint violation을 의미합니다.
      if (pgError && pgError.code === '23505') {
        throw new BadRequestException(
          'User with this identifier (e.g., businessRegistrationNumber) already exists.',
        );
      }
      throw error; // 다른 종류의 데이터베이스 오류
    }
  }

  async findOneById(id: string): Promise<User | null> {
    return this.userRepository.findOneBy({ id });
  }

  async findByLoginIdentifier(identifier: string): Promise<User | null> {
    // id 또는 businessRegistrationNumber로 사용자를 찾습니다.
    // 실제로는 어떤 필드로 로그인할지에 따라 쿼리 변경 (예: email, username 등)
    // 여기서는 username을 id 또는 businessRegistrationNumber로 간주한다고 가정합니다.
    return this.userRepository.findOne({
      where: [
        { id: identifier }, // UUID 형태일 경우
        { businessRegistrationNumber: identifier },
        // { email: identifier } // 이메일로도 로그인 허용 시
      ],
    });
  }

  // 스토어 ID로 관리자 사용자 찾기
  async findByStoreId(storeId: string): Promise<User | null> {
    return this.userRepository.findOneBy({ storeId });
  }

  async setCurrentRefreshToken(refreshToken: string, userId: string): Promise<void> {
    const hashedRefreshToken = this.hashRefreshToken(refreshToken);
    await this.userRepository.update(userId, { refreshToken: hashedRefreshToken });
  }

  async getUserIfRefreshTokenMatches(refreshToken: string, userId: string): Promise<User | null> {
    const user = await this.findOneById(userId);
    if (!user || !user.refreshToken) {
      return null;
    }
    const hashedRefreshToken = this.hashRefreshToken(refreshToken);
    if (hashedRefreshToken === user.refreshToken) {
      return user;
    }
    return null;
  }

  async removeRefreshToken(userId: string): Promise<void> {
    await this.userRepository.update(userId, { refreshToken: null });
  }

  // 관리자 정보 업데이트
  async updateUser(userId: string, updateData: Partial<User>): Promise<User | null> {
    const user = await this.findOneById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    
    // 비밀번호가 있으면 해싱하지 않음 (AuthService에서 해싱 처리)
    if (updateData.password) {
      delete updateData.password;
    }
    
    await this.userRepository.update(userId, updateData);
    return this.findOneById(userId);
  }

  // 관리자 삭제
  async deleteUser(userId: string): Promise<void> {
    const user = await this.findOneById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    
    await this.userRepository.delete(userId);
  }

  // 기타 필요한 사용자 관련 메소드 추가 가능
  // 예: updateUser, deleteUser 등
}
