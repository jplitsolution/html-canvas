import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  async findAll(userId: number): Promise<Project[]> {
    const projects = await this.projectRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
    return projects.map((project) => {
      if (project.data) {
        project.data = { ...project.data };
        delete project.data.projectData;
        delete project.data.html;
        delete project.data.css;
      }
      return project;
    });
  }

  async findOne(id: number, userId: number): Promise<Project> {
    const project = await this.projectRepository.findOne({ where: { id } });
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    if (project.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this project',
      );
    }
    return project;
  }

  async create(
    createProjectDto: CreateProjectDto,
    userId: number,
  ): Promise<Project> {
    const project = this.projectRepository.create({
      ...createProjectDto,
      userId,
    });
    return this.projectRepository.save(project);
  }

  async update(
    id: number,
    updateProjectDto: UpdateProjectDto,
    userId: number,
  ): Promise<Project> {
    const project = await this.findOne(id, userId);

    if (updateProjectDto.name !== undefined) {
      project.name = updateProjectDto.name;
    }
    if (updateProjectDto.data !== undefined) {
      project.data = updateProjectDto.data as Record<string, unknown>;
    }

    return this.projectRepository.save(project);
  }

  async remove(id: number, userId: number): Promise<void> {
    const project = await this.findOne(id, userId);
    await this.projectRepository.remove(project);
  }
}
