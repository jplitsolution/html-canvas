import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Template } from '../../modules/templates/entities/template.entity';
import prebuiltTemplates from './prebuilt-templates.json';

interface PrebuiltTemplateSeed {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  layout: unknown[];
}

@Injectable()
export class TemplatesSeedService implements OnModuleInit {
  private readonly logger = new Logger(TemplatesSeedService.name);

  constructor(
    @InjectRepository(Template)
    private readonly templateRepository: Repository<Template>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedPrebuiltTemplates();
  }

  private async seedPrebuiltTemplates(): Promise<void> {
    const existing = await this.templateRepository.count({
      where: { isPrebuilt: true },
    });

    if (existing > 0) {
      this.logger.log(`Skipping seed — ${existing} prebuilt template(s) already exist`);
      return;
    }

    const seeds = prebuiltTemplates as PrebuiltTemplateSeed[];

    for (const seed of seeds) {
      const template = this.templateRepository.create({
        name: seed.name,
        isPrebuilt: true,
        userId: undefined,
        data: {
          slug: seed.id,
          description: seed.description,
          thumbnail: seed.thumbnail,
          layout: seed.layout,
        },
      });
      await this.templateRepository.save(template);
    }

    this.logger.log(`Seeded ${seeds.length} prebuilt templates`);
  }
}
