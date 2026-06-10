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
exports.TemplatesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const templates_service_1 = require("./templates.service");
const create_template_dto_1 = require("./dto/create-template.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const user_entity_1 = require("../users/entities/user.entity");
const jwt_1 = require("@nestjs/jwt");
let TemplatesController = class TemplatesController {
    templatesService;
    jwtService;
    constructor(templatesService, jwtService) {
        this.templatesService = templatesService;
        this.jwtService = jwtService;
    }
    async getPrebuilt() {
        return this.templatesService.findAllPrebuilt();
    }
    async getUserTemplates(user) {
        return this.templatesService.findUserTemplates(user.id);
    }
    async findOne(id, req) {
        let userId;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            try {
                const payload = this.jwtService.decode(token);
                if (payload && typeof payload.sub === 'number') {
                    userId = payload.sub;
                }
            }
            catch {
            }
        }
        return this.templatesService.findOne(id, userId);
    }
    async create(createTemplateDto, user) {
        return this.templatesService.create(createTemplateDto, user.id);
    }
    async remove(id, user) {
        await this.templatesService.remove(id, user.id);
        return { message: 'Template deleted successfully' };
    }
};
exports.TemplatesController = TemplatesController;
__decorate([
    (0, common_1.Get)('prebuilt'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all prebuilt system templates' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of prebuilt templates' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TemplatesController.prototype, "getPrebuilt", null);
__decorate([
    (0, common_1.Get)('user'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all custom templates of the logged-in user' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of user custom templates' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", Promise)
], TemplatesController.prototype, "getUserTemplates", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get details of a specific template (supports optional auth)',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Template details' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], TemplatesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Save a custom template' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Template successfully saved' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_template_dto_1.CreateTemplateDto,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], TemplatesController.prototype, "create", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a user template' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Template deleted successfully' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], TemplatesController.prototype, "remove", null);
exports.TemplatesController = TemplatesController = __decorate([
    (0, swagger_1.ApiTags)('Templates'),
    (0, common_1.Controller)('templates'),
    __metadata("design:paramtypes", [templates_service_1.TemplatesService,
        jwt_1.JwtService])
], TemplatesController);
//# sourceMappingURL=templates.controller.js.map