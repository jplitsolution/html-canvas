import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { partnersService } from './partners.service.js';
import { postbackService } from './postback.service.js';
import { writeDayReportFile } from './helpers/postback-day-report-file.js';

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
    let file = null;
    let fileError = null;
    try {
      file = await writeDayReportFile(data.text, {
        from: data.from || data.date,
        to: data.to || data.date,
      });
    } catch (err) {
      fileError = err?.message || 'Failed to write log file on server';
    }
    const rest = { ...data };
    delete rest.text;
    res.json({ ...rest, file, fileError });
  }),
};
