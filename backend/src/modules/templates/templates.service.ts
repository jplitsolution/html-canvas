import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Template } from './entities/template.entity';
import { CreateTemplateDto } from './dto/create-template.dto';

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(Template)
    private readonly templateRepository: Repository<Template>,
  ) {}

  async findAllPrebuilt(): Promise<Template[]> {
    const templates = await this.templateRepository.find({
      where: { isPrebuilt: true },
      order: { createdAt: 'DESC' },
    });
    return templates.map((template) => {
      if (template.data) {
        template.data = { ...template.data };
        delete template.data.projectData;
        delete template.data.html;
        delete template.data.css;
      }
      return template;
    });
  }

  async findUserTemplates(userId: number): Promise<Template[]> {
    const templates = await this.templateRepository.find({
      where: { userId, isPrebuilt: false },
      order: { updatedAt: 'DESC' },
    });
    return templates.map((template) => {
      if (template.data) {
        template.data = { ...template.data };
        delete template.data.projectData;
        delete template.data.html;
        delete template.data.css;
      }
      return template;
    });
  }

  async findOne(id: number, userId?: number): Promise<Template> {
    const template = await this.templateRepository.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    // If it's not prebuilt and doesn't match the userId, throw forbidden
    if (!template.isPrebuilt && template.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this template',
      );
    }

    return template;
  }

  async create(
    createTemplateDto: CreateTemplateDto,
    userId?: number,
  ): Promise<Template> {
    const template = this.templateRepository.create({
      ...createTemplateDto,
      userId,
      isPrebuilt: userId ? (createTemplateDto.isPrebuilt ?? false) : true,
    });
    return this.templateRepository.save(template);
  }

  async remove(id: number, userId: number): Promise<void> {
    const template = await this.findOne(id, userId);
    if (template.isPrebuilt) {
      throw new ForbiddenException('Cannot delete prebuilt system templates');
    }
    await this.templateRepository.remove(template);
  }
}
