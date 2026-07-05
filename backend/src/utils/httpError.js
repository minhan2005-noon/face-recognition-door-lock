function httpError(status, message, errorCode = 'REQUEST_ERROR') {
  const error = new Error(message);
  error.status = status;
  error.errorCode = errorCode;
  return error;
}

module.exports = httpError;
