"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("../users/users.service");
const jwt_1 = require("@nestjs/jwt");
const crypto = require("crypto");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const store_entity_1 = require("../payments/entities/store.entity");
let AuthService = class AuthService {
    constructor(usersService, jwtService, configService, storeRepository) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.configService = configService;
        this.storeRepository = storeRepository;
    }
    hashPassword(password, salt) {
        return crypto.createHmac('sha256', salt).update(password).digest('hex');
    }
    generateSalt() {
        return crypto.randomBytes(16).toString('hex');
    }
    async validateUserByStore(storeId, pass) {
        const store = await this.storeRepository.findOneBy({ id: storeId });
        if (!store) {
            throw new common_1.NotFoundException(`Store with ID ${storeId} not found`);
        }
        const user = await this.usersService.findByStoreId(storeId);
        if (!user) {
            throw new common_1.NotFoundException(`No admin user found for store with ID ${storeId}`);
        }
        const hashedPassword = this.hashPassword(pass, user.salt);
        if (hashedPassword === user.password) {
            const { password, salt, refreshToken, ...result } = user;
            return result;
        }
        return null;
    }
    async login(loginUserDto) {
        const user = await this.validateUserByStore(loginUserDto.storeId, loginUserDto.password);
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const tokens = await this._generateTokens(user, loginUserDto.storeId);
        await this.usersService.setCurrentRefreshToken(tokens.refreshToken, user.id);
        return {
            message: 'Login successful',
            user,
            storeId: loginUserDto.storeId,
            ...tokens,
        };
    }
    async _generateTokens(user, storeId) {
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
                secret: this.configService.get('JWT_SECRET'),
                expiresIn: this.configService.get('JWT_EXPIRATION_TIME'),
            }),
            this.jwtService.signAsync(refreshTokenPayload, {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
                expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION_TIME'),
            }),
        ]);
        return {
            accessToken,
            refreshToken,
        };
    }
    async refreshTokens(userId, refreshToken) {
        const user = await this.usersService.getUserIfRefreshTokenMatches(refreshToken, userId);
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid refresh token or user mismatch');
        }
        if (!user.storeId) {
            throw new common_1.BadRequestException('User is not associated with any store');
        }
        const tokens = await this._generateTokens(user, user.storeId);
        await this.usersService.setCurrentRefreshToken(tokens.refreshToken, user.id);
        return tokens;
    }
    async logout(userId) {
        await this.usersService.removeRefreshToken(userId);
        return { message: 'Logout successful' };
    }
    async validateTokenAndStore(token, storeId) {
        try {
            const payload = this.jwtService.verify(token, {
                secret: this.configService.get('JWT_SECRET'),
            });
            return payload.storeId === storeId;
        }
        catch (error) {
            return false;
        }
    }
    async registerOwner(createUserDto) {
        const store = await this.storeRepository.findOneBy({ id: createUserDto.storeId });
        if (!store) {
            throw new common_1.NotFoundException(`Store with ID ${createUserDto.storeId} not found`);
        }
        const existingAdmin = await this.usersService.findByStoreId(createUserDto.storeId);
        if (existingAdmin) {
            throw new common_1.BadRequestException(`Store with ID ${createUserDto.storeId} already has an admin user`);
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
        const { password, salt: _, refreshToken, ...result } = newUser;
        return result;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, typeorm_1.InjectRepository)(store_entity_1.Store)),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        config_1.ConfigService,
        typeorm_2.Repository])
], AuthService);
//# sourceMappingURL=auth.service.js.map