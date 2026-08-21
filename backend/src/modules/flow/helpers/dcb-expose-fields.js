export const pickDcbExposeRequestId = (input = {}) =>
  String(input.requestId || input.request_id || input.id || '').trim();
