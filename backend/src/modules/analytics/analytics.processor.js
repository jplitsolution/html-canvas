import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { VisitEvent } from './entities/visit-event.entity';

@Processor('analytics-events', {
  concurrency: 5,
})
@Injectable()
export class AnalyticsProcessor extends WorkerHost {
  logger = new Logger(AnalyticsProcessor.name);

  constructor(
    @InjectRepository(VisitEvent)
    visitEventRepository,
  ) {
    super();
    this.visitEventRepository = visitEventRepository;
  }

  async process(job) {
    switch (job.name) {
      case 'process-event':
        return this.handleProcessEvent(job.data);
      case 'process-event-batch':
        return this.handleProcessEventBatch(job.data);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  async handleProcessEvent(data) {
    try {
      const eventEntity = this.visitEventRepository.create(data);
      await this.visitEventRepository.insert(eventEntity);
      this.logger.debug(`Successfully processed event for visit: ${data.visitId}`);
    } catch (error) {
      this.logger.error(
        `Failed to process event for visit: ${data.visitId}`,
        error.stack,
      );
      throw error;
    }
  }

  async handleProcessEventBatch(data) {
    try {
      const events = data.map((d) => this.visitEventRepository.create(d));
      if (events.length > 0) {
        await this.visitEventRepository
          .createQueryBuilder()
          .insert()
          .into(VisitEvent)
          .values(events)
          .execute();
        this.logger.debug(`Successfully processed batch of ${events.length} events`);
      }
    } catch (error) {
      this.logger.error(`Failed to process event batch`, error.stack);
      throw error;
    }
  }
}
