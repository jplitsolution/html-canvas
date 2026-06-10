import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/entities/user.entity';
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    constructor(usersService: UsersService, jwtService: JwtService);
    register(registerDto: RegisterDto): Promise<Omit<User, 'password'>>;
    validateUser(loginDto: LoginDto): Promise<Omit<User, 'password'>>;
    login(user: Omit<User, 'password'>): {
        user: Omit<User, "password">;
        accessToken: string;
    };
}
