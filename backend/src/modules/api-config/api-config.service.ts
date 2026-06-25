import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiConfig } from './entities/api-config.entity';
import { CreateApiConfigDto } from './dto/create-api-config.dto';
import { UpdateApiConfigDto } from './dto/update-api-config.dto';
import { ProjectsService } from '../projects/projects.service';

@Injectable()
export class ApiConfigService {
  constructor(
    @InjectRepository(ApiConfig)
    private readonly apiConfigRepository: Repository<ApiConfig>,
    private readonly projectsService: ProjectsService,
  ) {}

  async findByProject(projectId: number, userId: number): Promise<ApiConfig> {
    // Verify user owns the project
    await this.projectsService.findOne(projectId, userId);

    const config = await this.apiConfigRepository.findOne({
      where: { projectId },
    });
    if (!config) {
      throw new NotFoundException(`API Config for project ID ${projectId} not found`);
    }
    return config;
  }

  async findOne(id: number, userId: number): Promise<ApiConfig> {
    const config = await this.apiConfigRepository.findOne({ where: { id } });
    if (!config) {
      throw new NotFoundException(`API Config with ID ${id} not found`);
    }

    // Verify ownership of the project
    await this.projectsService.findOne(config.projectId, userId);
    return config;
  }

  async create(createDto: CreateApiConfigDto, userId: number): Promise<ApiConfig> {
    // Verify project ownership
    await this.projectsService.findOne(createDto.projectId, userId);

    // If config already exists for this project, update it instead
    const existing = await this.apiConfigRepository.findOne({
      where: { projectId: createDto.projectId },
    });

    if (existing) {
      existing.userApi = createDto.userApi;
      existing.blocklistApi = createDto.blocklistApi;
      existing.subscriptionApi = createDto.subscriptionApi;
      existing.subscribeApi = createDto.subscribeApi;
      existing.headersJson = createDto.headersJson;
      return this.apiConfigRepository.save(existing);
    }

    const config = this.apiConfigRepository.create(createDto);
    return this.apiConfigRepository.save(config);
  }

  async update(id: number, updateDto: UpdateApiConfigDto, userId: number): Promise<ApiConfig> {
    const config = await this.findOne(id, userId);

    if (updateDto.userApi !== undefined) config.userApi = updateDto.userApi;
    if (updateDto.blocklistApi !== undefined) config.blocklistApi = updateDto.blocklistApi;
    if (updateDto.subscriptionApi !== undefined) config.subscriptionApi = updateDto.subscriptionApi;
    if (updateDto.subscribeApi !== undefined) config.subscribeApi = updateDto.subscribeApi;
    if (updateDto.headersJson !== undefined) config.headersJson = updateDto.headersJson;

    return this.apiConfigRepository.save(config);
  }

  async remove(id: number, userId: number): Promise<void> {
    const config = await this.findOne(id, userId);
    await this.apiConfigRepository.remove(config);
  }

  // Internal helper for non-auth flows (like publish or subscribe engines)
  async getInternalConfig(projectId: number): Promise<ApiConfig | null> {
    return this.apiConfigRepository.findOne({
      where: { projectId },
    });
  }
}
