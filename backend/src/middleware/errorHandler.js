function errorHandler(error, req, res, next) {
  const status = error.status || 500;

  if (status >= 500) {
    console.error(error);
  }

  res.status(status).json({
    success: false,
    message: error.message || 'Lỗi hệ thống.',
    errorCode: error.errorCode || 'INTERNAL_ERROR',
    remainingMs: error.remainingMs
  });
}

module.exports = errorHandler;
