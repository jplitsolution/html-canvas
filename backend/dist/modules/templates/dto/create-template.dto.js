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
exports.CreateTemplateDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateTemplateDto {
    name;
    data;
    isPrebuilt;
}
exports.CreateTemplateDto = CreateTemplateDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'My Custom Template',
        description: 'Name of the template',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Template name is required' }),
    __metadata("design:type", String)
], CreateTemplateDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: { version: '1.0', objects: [] },
        description: 'JSON template layout representation',
    }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Template data is required' }),
    __metadata("design:type", Object)
], CreateTemplateDto.prototype, "data", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: false,
        description: 'Whether it is a prebuilt system template',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateTemplateDto.prototype, "isPrebuilt", void 0);
//# sourceMappingURL=create-template.dto.js.map