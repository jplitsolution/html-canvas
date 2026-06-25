import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoutingService } from './routing.service';
import { VariableResolverService } from './variable-resolver.service';
import { BlocklistModule } from '../blocklist/blocklist.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { Page } from '../pages/entities/page.entity';
import { Project } from '../projects/entities/project.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Page, Project]),
    BlocklistModule,
    SubscriptionsModule,
  ],
  providers: [RoutingService, VariableResolverService],
  exports: [RoutingService, VariableResolverService],
})
export class RoutingModule {}
