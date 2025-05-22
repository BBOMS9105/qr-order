import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

interface JwtPayload {
  sub: string; // Standard JWT subject claim (user ID)
  username?: string; // Optional: other claims like username
  storeId?: string; // Store ID
  // iat, exp는 자동으로 관리됨
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findOneById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found or token invalid');
    }
    // JwtAuthGuard를 통해 req.user에 주입될 값
    return { 
      id: user.id, 
      username: payload.username, 
      name: user.name,
      storeId: payload.storeId || user.storeId
    };
  }
}
