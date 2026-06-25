import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Page } from './entities/page.entity';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { ProjectsService } from '../projects/projects.service';

@Injectable()
export class PagesService {
  constructor(
    @InjectRepository(Page)
    private readonly pageRepository: Repository<Page>,
    private readonly projectsService: ProjectsService,
  ) {}

  async findByProject(projectId: number, userId: number): Promise<Page[]> {
    // Verify user has access to the project
    await this.projectsService.findOne(projectId, userId);

    return this.pageRepository.find({
      where: { projectId },
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: number, userId: number): Promise<Page> {
    const page = await this.pageRepository.findOne({ where: { id } });
    if (!page) {
      throw new NotFoundException(`Page with ID ${id} not found`);
    }

    // Verify user owns the project associated with this page
    await this.projectsService.findOne(page.projectId, userId);

    return page;
  }

  async create(createPageDto: CreatePageDto, userId: number): Promise<Page> {
    // Verify user has access to the project
    await this.projectsService.findOne(createPageDto.projectId, userId);

    const page = this.pageRepository.create(createPageDto);
    return this.pageRepository.save(page);
  }

  async update(id: number, updatePageDto: UpdatePageDto, userId: number): Promise<Page> {
    const page = await this.findOne(id, userId);

    if (updatePageDto.name !== undefined) page.name = updatePageDto.name;
    if (updatePageDto.slug !== undefined) page.slug = updatePageDto.slug;
    if (updatePageDto.pageType !== undefined) page.pageType = updatePageDto.pageType;
    if (updatePageDto.templateId !== undefined) page.templateId = updatePageDto.templateId;

    return this.pageRepository.save(page);
  }

  async remove(id: number, userId: number): Promise<void> {
    const page = await this.findOne(id, userId);
    await this.pageRepository.remove(page);
  }
}
