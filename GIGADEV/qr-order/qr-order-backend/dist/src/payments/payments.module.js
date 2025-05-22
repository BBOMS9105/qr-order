"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsModule = void 0;
const common_1 = require("@nestjs/common");
const payments_service_1 = require("./payments.service");
const payments_controller_1 = require("./payments.controller");
const products_controller_1 = require("./products.controller");
const typeorm_1 = require("@nestjs/typeorm");
const order_entity_1 = require("./entities/order.entity");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const product_entity_1 = require("./entities/product.entity");
const order_item_entity_1 = require("./entities/order-item.entity");
const auth_module_1 = require("../auth/auth.module");
const store_entity_1 = require("./entities/store.entity");
let PaymentsModule = class PaymentsModule {
};
exports.PaymentsModule = PaymentsModule;
exports.PaymentsModule = PaymentsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([order_entity_1.Order, product_entity_1.Product, order_item_entity_1.OrderItem, store_entity_1.Store]),
            axios_1.HttpModule,
            config_1.ConfigModule,
            auth_module_1.AuthModule,
        ],
        providers: [payments_service_1.PaymentsService],
        controllers: [payments_controller_1.PaymentsController, products_controller_1.ProductsController],
        exports: [payments_service_1.PaymentsService, typeorm_1.TypeOrmModule],
    })
], PaymentsModule);
//# sourceMappingURL=payments.module.js.map