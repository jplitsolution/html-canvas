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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const cloudinary_1 = require("cloudinary");
const stream_1 = require("stream");
const s3_upload_service_1 = require("./s3-upload.service");
const local_upload_service_1 = require("./local-upload.service");
let UploadService = class UploadService {
    configService;
    s3UploadService;
    localUploadService;
    constructor(configService, s3UploadService, localUploadService) {
        this.configService = configService;
        this.s3UploadService = s3UploadService;
        this.localUploadService = localUploadService;
    }
    async uploadImage(file, folder = 'templatecraft') {
        if (!file) {
            throw new common_1.BadRequestException('No file provided');
        }
        if (this.s3UploadService.isConfigured()) {
            return this.s3UploadService.uploadImage(file);
        }
        if (this.isCloudinaryConfigured()) {
            try {
                const result = await this.uploadToCloudinary(file, folder);
                return {
                    url: result.secure_url,
                    key: result.public_id,
                    format: result.format,
                    bytes: result.bytes,
                };
            }
            catch (error) {
                if (!this.allowLocalFallback()) {
                    throw error;
                }
                return this.localUploadService.uploadImage(file);
            }
        }
        if (this.allowLocalFallback()) {
            return this.localUploadService.uploadImage(file);
        }
        throw new common_1.BadRequestException('Image upload is not configured. Set AWS S3/CloudFront credentials, Cloudinary credentials, or run in development mode for local uploads.');
    }
    isCloudinaryConfigured() {
        const cloudName = this.configService.get('cloudinary.cloudName');
        const apiKey = this.configService.get('cloudinary.apiKey');
        const apiSecret = this.configService.get('cloudinary.apiSecret');
        return !!(cloudName && apiKey && apiSecret);
    }
    allowLocalFallback() {
        return this.configService.get('environment') !== 'production';
    }
    uploadToCloudinary(file, folder) {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary_1.v2.uploader.upload_stream({
                folder,
                resource_type: 'auto',
            }, (error, result) => {
                if (error) {
                    const detail = error.message ||
                        (typeof error === 'object' ? JSON.stringify(error) : String(error));
                    return reject(new common_1.BadRequestException(`Cloudinary upload failed: ${detail}`));
                }
                if (!result) {
                    return reject(new common_1.BadRequestException('Cloudinary upload returned empty result'));
                }
                resolve(result);
            });
            uploadStream.on('error', (streamError) => {
                reject(new common_1.BadRequestException(`Cloudinary upload failed: ${streamError.message || 'network error'}`));
            });
            stream_1.Readable.from(file.buffer).pipe(uploadStream);
        });
    }
};
exports.UploadService = UploadService;
exports.UploadService = UploadService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        s3_upload_service_1.S3UploadService,
        local_upload_service_1.LocalUploadService])
], UploadService);
//# sourceMappingURL=upload.service.js.map