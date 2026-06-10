import { Repository } from 'typeorm';
import { Template } from './entities/template.entity';
import { CreateTemplateDto } from './dto/create-template.dto';
export declare class TemplatesService {
    private readonly templateRepository;
    constructor(templateRepository: Repository<Template>);
    findAllPrebuilt(): Promise<Template[]>;
    findUserTemplates(userId: number): Promise<Template[]>;
    findOne(id: number, userId?: number): Promise<Template>;
    create(createTemplateDto: CreateTemplateDto, userId?: number): Promise<Template>;
    remove(id: number, userId: number): Promise<void>;
}
