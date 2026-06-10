import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { User } from '../users/entities/user.entity';
export declare class ProjectsController {
    private readonly projectsService;
    constructor(projectsService: ProjectsService);
    create(createProjectDto: CreateProjectDto, user: User): Promise<import("./entities/project.entity").Project>;
    findAll(user: User): Promise<import("./entities/project.entity").Project[]>;
    findOne(id: number, user: User): Promise<import("./entities/project.entity").Project>;
    update(id: number, updateProjectDto: UpdateProjectDto, user: User): Promise<import("./entities/project.entity").Project>;
    remove(id: number, user: User): Promise<{
        message: string;
    }>;
}
