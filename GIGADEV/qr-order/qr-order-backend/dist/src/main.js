"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const cookieParser = require("cookie-parser");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors({
        origin: [
            'http://192.168.0.72:3000',
            'http://localhost:3000',
            'http://192.168.0.78:3000',
            'https://qr-order-seven.vercel.app/',
            /^https:\/\/.*\.vercel\.app$/,
            /^https:\/\/.*\.ngrok-free\.app$/,
        ],
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true,
        allowedHeaders: 'Origin,X-Requested-With,Content-Type,Accept,Authorization',
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
    app.use(cookieParser());
    await app.listen(3002);
    console.log('Server is running on port 3002');
}
bootstrap();
//# sourceMappingURL=main.js.map