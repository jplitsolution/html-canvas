"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadService = void 0;
const common_1 = require("@nestjs/common");
const cloudinary_1 = require("cloudinary");
const stream_1 = require("stream");
let UploadService = class UploadService {
    async uploadImage(file, folder = 'templatecraft') {
        if (!file) {
            throw new common_1.BadRequestException('No file provided');
        }
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary_1.v2.uploader.upload_stream({
                folder,
                resource_type: 'auto',
            }, (error, result) => {
                if (error) {
                    return reject(new common_1.BadRequestException(`Cloudinary upload failed: ${error.message}`));
                }
                if (!result) {
                    return reject(new common_1.BadRequestException('Cloudinary upload returned empty result'));
                }
                resolve(result);
            });
            stream_1.Readable.from(file.buffer).pipe(uploadStream);
        });
    }
};
exports.UploadService = UploadService;
exports.UploadService = UploadService = __decorate([
    (0, common_1.Injectable)()
], UploadService);
//# sourceMappingURL=upload.service.js.map