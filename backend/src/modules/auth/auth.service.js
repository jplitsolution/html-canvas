import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @Inject(UsersService) usersService,
    @Inject(JwtService) jwtService,
  ) {
    this.usersService = usersService;
    this.jwtService = jwtService;
  }

  async register(registerDto) {
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

  async validateUser(loginDto) {
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

  async changePassword(userId, oldPassword, newPassword) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const userWithPassword = await this.usersService.findByEmailWithPassword(user.email);
    if (!userWithPassword || !userWithPassword.password) {
      throw new UnauthorizedException('Invalid current password');
    }
    const isMatch = await bcrypt.compare(oldPassword, userWithPassword.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid current password');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await this.usersService.updatePassword(userId, hashedPassword);
  }

  login(user) {
    const payload = { email: user.email, sub: user.id };
    return {
      user,
      accessToken: this.jwtService.sign(payload),
    };
  }
}
