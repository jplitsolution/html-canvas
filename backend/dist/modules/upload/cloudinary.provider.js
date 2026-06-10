"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudinaryProvider = exports.CLOUDINARY = void 0;
const cloudinary_1 = require("cloudinary");
const config_1 = require("@nestjs/config");
exports.CLOUDINARY = 'Cloudinary';
exports.CloudinaryProvider = {
    provide: exports.CLOUDINARY,
    inject: [config_1.ConfigService],
    useFactory: (configService) => {
        return cloudinary_1.v2.config({
            cloud_name: configService.get('cloudinary.cloudName'),
            api_key: configService.get('cloudinary.apiKey'),
            api_secret: configService.get('cloudinary.apiSecret'),
        });
    },
};
//# sourceMappingURL=cloudinary.provider.js.map