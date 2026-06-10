import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<Omit<User, 'password'>> {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(registerDto.password, salt);

    const user = await this.usersService.create({
      email: registerDto.email,
      name: registerDto.name,
      password: hashedPassword,
    });

    const result = { ...user };
    delete result.password;
    return result;
  }

  async validateUser(loginDto: LoginDto): Promise<Omit<User, 'password'>> {
    const user = await this.usersService.findByEmailWithPassword(
      loginDto.email,
    );
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const result = { ...user };
    delete result.password;
    return result;
  }

  login(user: Omit<User, 'password'>) {
    const payload = { email: user.email, sub: user.id };
    return {
      user,
      accessToken: this.jwtService.sign(payload),
    };
  }
}
