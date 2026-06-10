import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
export declare class ProjectsService {
    private readonly projectRepository;
    constructor(projectRepository: Repository<Project>);
    findAll(userId: number): Promise<Project[]>;
    findOne(id: number, userId: number): Promise<Project>;
    create(createProjectDto: CreateProjectDto, userId: number): Promise<Project>;
    update(id: number, updateProjectDto: UpdateProjectDto, userId: number): Promise<Project>;
    remove(id: number, userId: number): Promise<void>;
}
