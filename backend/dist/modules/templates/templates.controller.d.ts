import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { User } from '../users/entities/user.entity';
import type { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
export declare class TemplatesController {
    private readonly templatesService;
    private readonly jwtService;
    constructor(templatesService: TemplatesService, jwtService: JwtService);
    getPrebuilt(): Promise<import("./entities/template.entity").Template[]>;
    getUserTemplates(user: User): Promise<import("./entities/template.entity").Template[]>;
    findOne(id: number, req: Request): Promise<import("./entities/template.entity").Template>;
    create(createTemplateDto: CreateTemplateDto, user: User): Promise<import("./entities/template.entity").Template>;
    remove(id: number, user: User): Promise<{
        message: string;
    }>;
}
