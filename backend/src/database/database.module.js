import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Template } from '../modules/templates/entities/template.entity';
import { TemplatesSeedService } from './seed/templates-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([Template])],
  providers: [TemplatesSeedService],
})
export class DatabaseModule {}
