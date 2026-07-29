import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    userRepository,
  ) {
    this.userRepository = userRepository;
  }

  async findByEmail(email) {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByEmailWithPassword(email) {
    return this.userRepository.findOne({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findById(id) {
    return this.userRepository.findOne({ where: { id } });
  }

  async create(userData) {
    const existing = await this.findByEmail(userData.email || '');
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }
    const user = this.userRepository.create(userData);
    return this.userRepository.save(user);
  }

  async updateAvatar(id, avatarUrl) {
    await this.userRepository.update(id, { avatar: avatarUrl });
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('User not found');
    }
    return updated;
  }

  async updatePassword(id, hashedPassword) {
    await this.userRepository.update(id, { password: hashedPassword });
  }
}
