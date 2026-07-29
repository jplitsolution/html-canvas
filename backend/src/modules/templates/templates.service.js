import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Template } from './entities/template.entity';

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(Template)
    templateRepository,
  ) {
    this.templateRepository = templateRepository;
  }

  async findAllPrebuilt() {
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

  async findUserTemplates(userId) {
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

  async findOne(id, userId) {
    const template = await this.templateRepository.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    if (!template.isPrebuilt && template.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this template',
      );
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
      throw new ForbiddenException('Cannot delete prebuilt system templates');
    }
    await this.templateRepository.remove(template);
  }
}
