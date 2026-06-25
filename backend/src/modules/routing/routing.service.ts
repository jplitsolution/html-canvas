import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlocklistService } from '../blocklist/blocklist.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { Page, PageType } from '../pages/entities/page.entity';
import { Project } from '../projects/entities/project.entity';

@Injectable()
export class RoutingService {
  constructor(
    private readonly blocklistService: BlocklistService,
    private readonly subscriptionsService: SubscriptionsService,
    @InjectRepository(Page)
    private readonly pageRepository: Repository<Page>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  async resolvePage(input: {
    projectId: number;
    phone: string;
    country: string;
    operator: string;
  }): Promise<{
    pageType: PageType;
    pageId: number | null;
    templateId: number | null;
  }> {
    const { projectId, phone, country, operator } = input;

    // Load project to verify it exists and retrieve its serviceId
    const project = await this.projectRepository.findOne({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // 1. Check Blocklist
    const isBlocked = await this.blocklistService.isBlocked(phone);
    if (isBlocked) {
      const page = await this.findPage(projectId, PageType.BLOCKED);
      return {
        pageType: PageType.BLOCKED,
        pageId: page ? page.id : null,
        templateId: page && page.templateId ? page.templateId : null,
      };
    }

    // 2. Check Subscription
    const serviceId = project.serviceId || 'default_service';
    const isSubscribed = await this.subscriptionsService.isSubscribed(phone, serviceId);
    if (isSubscribed) {
      const page = await this.findPage(projectId, PageType.THANKYOU);
      return {
        pageType: PageType.THANKYOU,
        pageId: page ? page.id : null,
        templateId: page && page.templateId ? page.templateId : null,
      };
    }

    // 3. Else, return PLAN page
    const page = await this.findPage(projectId, PageType.PLAN);
    return {
      pageType: PageType.PLAN,
      pageId: page ? page.id : null,
      templateId: page && page.templateId ? page.templateId : null,
    };
  }

  private async findPage(projectId: number, pageType: PageType): Promise<Page | null> {
    return this.pageRepository.findOne({
      where: { projectId, pageType },
    });
  }
}
