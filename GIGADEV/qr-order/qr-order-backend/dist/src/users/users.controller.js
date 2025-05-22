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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("./users.service");
const create_user_dto_1 = require("./dto/create-user.dto");
const crypto = require("crypto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const store_entity_1 = require("../payments/entities/store.entity");
let UsersController = class UsersController {
    constructor(usersService, storeRepository) {
        this.usersService = usersService;
        this.storeRepository = storeRepository;
    }
    async registerUser(createUserDto) {
        const store = await this.storeRepository.findOneBy({ id: createUserDto.storeId });
        if (!store) {
            throw new Error(`스토어 ID ${createUserDto.storeId}를 찾을 수 없습니다.`);
        }
        const existingAdmin = await this.usersService.findByStoreId(createUserDto.storeId);
        if (existingAdmin) {
            throw new Error(`스토어 ID ${createUserDto.storeId}에는 이미 관리자가 등록되어 있습니다.`);
        }
        const salt = crypto.randomBytes(16).toString('hex');
        const hashedPassword = crypto
            .createHmac('sha256', salt)
            .update(createUserDto.password)
            .digest('hex');
        const newUser = await this.usersService.createUser({
            businessRegistrationNumber: createUserDto.businessRegistrationNumber,
            name: createUserDto.name,
            phoneNumber: createUserDto.phoneNumber,
            password: hashedPassword,
            salt,
            storeId: createUserDto.storeId,
        });
        const { password, salt: _, refreshToken, ...result } = newUser;
        return {
            message: '사용자가 성공적으로 등록되었습니다.',
            user: result,
        };
    }
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
    async getStoreById(storeId) {
        const store = await this.storeRepository.findOneBy({ id: storeId });
        if (!store) {
            throw new Error(`스토어 ID ${storeId}를 찾을 수 없습니다.`);
        }
        return store;
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Post)('register'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)(common_1.ValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_user_dto_1.CreateUserDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "registerUser", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('stores'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getAllStores", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('stores/:storeId'),
    __param(0, (0, common_1.Param)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getStoreById", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('admin/users'),
    __param(1, (0, typeorm_1.InjectRepository)(store_entity_1.Store)),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        typeorm_2.Repository])
], UsersController);
//# sourceMappingURL=users.controller.js.map