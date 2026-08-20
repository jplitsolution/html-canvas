import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { partnersService } from './partners.service.js';
import { postbackService } from './postback.service.js';
import { writeDayReportFile } from './helpers/postback-day-report-file.js';
import { formatDayReportCsv } from './helpers/postback-day-report.js';
import { dailyStatsService } from '../analytics/daily-stats.service.js';

export const partnersController = {
  listVendors: asyncHandler(async (req, res) => {
    const data = await partnersService.listVendors(req.user.id);
    res.json(data);
  }),

  createVendor: asyncHandler(async (req, res) => {
    const data = await partnersService.createVendor(req.body || {}, req.user.id);
    res.status(201).json(data);
  }),

  getVendor: asyncHandler(async (req, res) => {
    const data = await partnersService.getVendor(req.params.id, req.user.id);
    res.json(data);
  }),

  updateVendor: asyncHandler(async (req, res) => {
    const data = await partnersService.updateVendor(
      req.params.id,
      req.body || {},
      req.user.id,
    );
    res.json(data);
  }),

  removeVendor: asyncHandler(async (req, res) => {
    await partnersService.removeVendor(req.params.id, req.user.id);
    res.json({ message: 'Vendor deleted' });
  }),

  postbacksSummary: asyncHandler(async (req, res) => {
    const data = await postbackService.getSummary(req.user.id, req.query || {});
    res.json(data);
  }),

  postbacksStats: asyncHandler(async (req, res) => {
    const data = await dailyStatsService.getReport(req.user.id, req.query || {});
    res.json(data);
  }),

  listPostbacks: asyncHandler(async (req, res) => {
    const data = await postbackService.listPostbacks(req.user.id, req.query || {});
    res.json(data);
  }),

  getPostback: asyncHandler(async (req, res) => {
    const data = await postbackService.getPostbackById(
      req.params.id,
      req.user.id,
    );
    res.json(data);
  }),

  postbacksDayReport: asyncHandler(async (req, res) => {
    const data = await postbackService.getDayReport(req.user.id, req.query || {});
    const format = String(req.query.format || 'json').toLowerCase();
    const range = { from: data.from || data.date, to: data.to || data.date };
    const writeFile =
      format !== 'json' ||
      String(req.query.writeFile || '') === '1';
    let file = null;
    let csvFile = null;
    let fileError = null;
    const csv = format === 'csv' || writeFile ? formatDayReportCsv(data, data.timezone) : '';
    if (writeFile) {
      try {
        file = await writeDayReportFile(data.text, range);
        if (format === 'csv') {
          csvFile = await writeDayReportFile(csv, range, undefined, 'csv');
        }
      } catch (err) {
        fileError = err?.message || 'Failed to write log file on server';
      }
    }

    if (format === 'csv') {
      const name = csvFile?.filename || `postback-logs-${range.from}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
      return res.send(csv);
    }
    if (format === 'txt' || format === 'text') {
      const name = file?.filename || `postback-logs-${range.from}.txt`;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
      return res.send(data.text || '');
    }

    const rest = { ...data };
    delete rest.text;
    res.json({ ...rest, file, csvFile, fileError });
  }),
};
