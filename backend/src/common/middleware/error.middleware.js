/**
 * Express error middleware — maps err.statusCode / err.status to HTTP status.
 */
export function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';
  if (statusCode >= 500) {
    console.error('[API Error]', err);
  }
  res.status(statusCode).json({
    statusCode,
    error: err.name || 'Error',
    message,
  });
}
