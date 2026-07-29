import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Template } from '../../modules/templates/entities/template.entity';
import prebuiltTemplates from './prebuilt-templates.json';

@Injectable()
export class TemplatesSeedService {
  logger = new Logger(TemplatesSeedService.name);

  constructor(
    @InjectRepository(Template)
    templateRepository,
  ) {
    this.templateRepository = templateRepository;
  }

  async onModuleInit() {
    await this.seedPrebuiltTemplates();
  }

  async seedPrebuiltTemplates() {
    const existing = await this.templateRepository.count({
      where: { isPrebuilt: true },
    });

    if (existing > 0) {
      this.logger.log(
        `Skipping seed — ${existing} prebuilt template(s) already exist`,
      );
      return;
    }

    const seeds = prebuiltTemplates;

    for (const seed of seeds) {
      const template = this.templateRepository.create({
        name: seed.name,
        isPrebuilt: true,
        userId: undefined,
        data: {
          slug: seed.id,
          description: seed.description,
          thumbnail: seed.thumbnail,
          editor: seed.editor || 'grapesjs',
          projectData: seed.projectData || {},
          html: seed.html || '',
          css: seed.css || '',
        },
      });
      await this.templateRepository.save(template);
    }

    this.logger.log(`Seeded ${seeds.length} prebuilt templates`);
  }
}
