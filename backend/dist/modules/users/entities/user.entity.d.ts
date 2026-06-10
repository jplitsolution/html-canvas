import { Project } from '../../projects/entities/project.entity';
export declare class User {
    id: number;
    email: string;
    password?: string;
    name: string;
    avatar?: string;
    createdAt: Date;
    updatedAt: Date;
    projects: Project[];
}
