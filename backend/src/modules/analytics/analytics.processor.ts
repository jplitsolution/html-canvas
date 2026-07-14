import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VisitEvent } from './entities/visit-event.entity';

@Processor('analytics-events', {
  concurrency: 5, // Process up to 5 jobs concurrently
})
@Injectable()
export class AnalyticsProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalyticsProcessor.name);

  constructor(
    @InjectRepository(VisitEvent)
    private readonly visitEventRepository: Repository<VisitEvent>,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case 'process-event':
        return this.handleProcessEvent(job.data);
      case 'process-event-batch':
        return this.handleProcessEventBatch(job.data);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async handleProcessEvent(data: any) {
    try {
      const eventEntity = this.visitEventRepository.create(data as object);
      await this.visitEventRepository.insert(eventEntity);
      this.logger.debug(`Successfully processed event for visit: ${data.visitId}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to process event for visit: ${data.visitId}`,
        error.stack,
      );
      throw error;
    }
  }

  private async handleProcessEventBatch(data: any[]) {
    try {
      const events = data.map(d => this.visitEventRepository.create(d as object));
      if (events.length > 0) {
        // Use TypeORM's query builder for bulk insert for performance
        await this.visitEventRepository
          .createQueryBuilder()
          .insert()
          .into(VisitEvent)
          .values(events)
          .execute();
        this.logger.debug(`Successfully processed batch of ${events.length} events`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to process event batch`, error.stack);
      throw error;
    }
  }
}
