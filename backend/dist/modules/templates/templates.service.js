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
exports.TemplatesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const template_entity_1 = require("./entities/template.entity");
let TemplatesService = class TemplatesService {
    templateRepository;
    constructor(templateRepository) {
        this.templateRepository = templateRepository;
    }
    async findAllPrebuilt() {
        return this.templateRepository.find({
            where: { isPrebuilt: true },
            order: { createdAt: 'DESC' },
        });
    }
    async findUserTemplates(userId) {
        return this.templateRepository.find({
            where: { userId, isPrebuilt: false },
            order: { updatedAt: 'DESC' },
        });
    }
    async findOne(id, userId) {
        const template = await this.templateRepository.findOne({ where: { id } });
        if (!template) {
            throw new common_1.NotFoundException(`Template with ID ${id} not found`);
        }
        if (!template.isPrebuilt && template.userId !== userId) {
            throw new common_1.ForbiddenException('You do not have permission to access this template');
        }
        return template;
    }
    async create(createTemplateDto, userId) {
        const template = this.templateRepository.create({
            ...createTemplateDto,
            userId,
            isPrebuilt: userId ? (createTemplateDto.isPrebuilt ?? false) : true,
        });
        return this.templateRepository.save(template);
    }
    async remove(id, userId) {
        const template = await this.findOne(id, userId);
        if (template.isPrebuilt) {
            throw new common_1.ForbiddenException('Cannot delete prebuilt system templates');
        }
        await this.templateRepository.remove(template);
    }
};
exports.TemplatesService = TemplatesService;
exports.TemplatesService = TemplatesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(template_entity_1.Template)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], TemplatesService);
//# sourceMappingURL=templates.service.js.map