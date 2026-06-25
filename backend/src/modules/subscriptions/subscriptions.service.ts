import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription, SubscriptionStatus } from './entities/subscription.entity';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
  ) {}

  async findByPhone(phone: string): Promise<Subscription[]> {
    return this.subscriptionRepository.find({
      where: { phone },
      order: { createdAt: 'DESC' },
    });
  }

  async isSubscribed(phone: string, serviceId: string): Promise<boolean> {
    if (!phone || !serviceId) return false;
    const subscription = await this.subscriptionRepository.findOne({
      where: { phone, serviceId, status: SubscriptionStatus.ACTIVE },
    });
    return !!subscription;
  }

  async createSubscription(
    phone: string,
    serviceId: string,
    status: SubscriptionStatus = SubscriptionStatus.ACTIVE,
  ): Promise<Subscription> {
    // Check if subscription already exists
    const existing = await this.subscriptionRepository.findOne({
      where: { phone, serviceId },
    });

    if (existing) {
      existing.status = status;
      return this.subscriptionRepository.save(existing);
    }

    const sub = this.subscriptionRepository.create({
      phone,
      serviceId,
      status,
    });
    return this.subscriptionRepository.save(sub);
  }

  async findAll(): Promise<Subscription[]> {
    return this.subscriptionRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Subscription> {
    const sub = await this.subscriptionRepository.findOne({ where: { id } });
    if (!sub) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }
    return sub;
  }

  async create(createDto: CreateSubscriptionDto): Promise<Subscription> {
    return this.createSubscription(
      createDto.phone,
      createDto.serviceId,
      createDto.status,
    );
  }
}
