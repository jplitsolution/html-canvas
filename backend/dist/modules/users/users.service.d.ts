import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
export declare class UsersService {
    private readonly userRepository;
    constructor(userRepository: Repository<User>);
    findByEmail(email: string): Promise<User | null>;
    findByEmailWithPassword(email: string): Promise<User | null>;
    findById(id: number): Promise<User | null>;
    create(userData: Partial<User>): Promise<User>;
    updateAvatar(id: number, avatarUrl: string): Promise<User>;
}
