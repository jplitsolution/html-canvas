import { CronJob } from 'cron';
import { analyticsService } from './analytics.service.js';

let jobs = [];

export const startAnalyticsScheduler = () => {
  if (jobs.length > 0) return jobs;

  const midnightArchive = CronJob.from({
    cronTime: '5 0 * * *',
    timeZone: 'Asia/Kolkata',
    start: true,
    onTick: async () => {
      console.log('Running midnight IST analytics archive job');
      try {
        await analyticsService.archiveOldData();
      } catch (err) {
        console.error(`Database archiving failed: ${err.message}`);
      }
    },
  });

  jobs = [midnightArchive];
  console.log('Analytics scheduler started (daily archive at 00:05 IST)');
  return jobs;
};

export const stopAnalyticsScheduler = () => {
  for (const job of jobs) {
    job.stop();
  }
  jobs = [];
};
