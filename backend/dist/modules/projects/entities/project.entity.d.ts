import { User } from '../../users/entities/user.entity';
export declare class Project {
    id: number;
    name: string;
    data: any;
    userId: number;
    user: User;
    createdAt: Date;
    updatedAt: Date;
}
