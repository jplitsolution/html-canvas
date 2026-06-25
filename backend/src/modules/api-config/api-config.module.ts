import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiConfig } from './entities/api-config.entity';
import { ApiConfigService } from './api-config.service';
import { ApiConfigController } from './api-config.controller';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ApiConfig]),
    ProjectsModule,
  ],
  controllers: [ApiConfigController],
  providers: [ApiConfigService],
  exports: [ApiConfigService],
})
export class ApiConfigModule {}
