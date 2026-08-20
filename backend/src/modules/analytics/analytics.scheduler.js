import { CronJob } from 'cron';
import { analyticsService } from './analytics.service.js';
import { dailyStatsService } from './daily-stats.service.js';

let jobs = [];

export const startAnalyticsScheduler = () => {
  if (jobs.length > 0) return jobs;

  const midnightArchive = CronJob.from({
    cronTime: '5 0 * * *',
    timeZone: 'Asia/Kolkata',
    start: true,
    onTick: async () => {
      console.log('Running midnight IST stats rollup + archive job');
      try {
        const rolled = await dailyStatsService.rollupRecent('Asia/Kolkata');
        console.log('Daily stats rollup', rolled);
      } catch (err) {
        console.error(`Daily stats rollup failed: ${err.message}`);
      }
      try {
        await analyticsService.archiveOldData();
      } catch (err) {
        console.error(`Database archiving failed: ${err.message}`);
      }
    },
  });

  jobs = [midnightArchive];
  console.log('Analytics scheduler started (rollup + archive at 00:05 IST)');
  return jobs;
};

export const stopAnalyticsScheduler = () => {
  for (const job of jobs) {
    job.stop();
  }
  jobs = [];
};
