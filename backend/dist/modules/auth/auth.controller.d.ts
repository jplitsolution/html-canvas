import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/entities/user.entity';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(registerDto: RegisterDto): Promise<Omit<User, "password">>;
    login(loginDto: LoginDto): Promise<{
        user: Omit<User, "password">;
        accessToken: string;
    }>;
    getProfile(user: User): User;
}
