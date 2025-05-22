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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("./entities/user.entity");
const crypto = require("crypto");
let UsersService = class UsersService {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    hashRefreshToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }
    async createUser(userData) {
        const user = this.userRepository.create(userData);
        try {
            return await this.userRepository.save(user);
        }
        catch (error) {
            const pgError = error;
            if (pgError && pgError.code === '23505') {
                throw new common_1.BadRequestException('User with this identifier (e.g., businessRegistrationNumber) already exists.');
            }
            throw error;
        }
    }
    async findOneById(id) {
        return this.userRepository.findOneBy({ id });
    }
    async findByLoginIdentifier(identifier) {
        return this.userRepository.findOne({
            where: [
                { id: identifier },
                { businessRegistrationNumber: identifier },
            ],
        });
    }
    async findByStoreId(storeId) {
        return this.userRepository.findOneBy({ storeId });
    }
    async setCurrentRefreshToken(refreshToken, userId) {
        const hashedRefreshToken = this.hashRefreshToken(refreshToken);
        await this.userRepository.update(userId, { refreshToken: hashedRefreshToken });
    }
    async getUserIfRefreshTokenMatches(refreshToken, userId) {
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
    async removeRefreshToken(userId) {
        await this.userRepository.update(userId, { refreshToken: null });
    }
    async updateUser(userId, updateData) {
        const user = await this.findOneById(userId);
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${userId} not found`);
        }
        if (updateData.password) {
            delete updateData.password;
        }
        await this.userRepository.update(userId, updateData);
        return this.findOneById(userId);
    }
    async deleteUser(userId) {
        const user = await this.findOneById(userId);
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${userId} not found`);
        }
        await this.userRepository.delete(userId);
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], UsersService);
//# sourceMappingURL=users.service.js.map