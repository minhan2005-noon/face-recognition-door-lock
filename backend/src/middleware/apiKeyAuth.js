const crypto = require('crypto');

const apiKey = process.env.API_KEY;
let didWarnDisabledApiKey = false;

function apiKeyAuth(req, res, next) {
  if (!apiKey) {
    if (process.env.NODE_ENV !== 'test' && !didWarnDisabledApiKey) {
      console.warn('API key protection is disabled. Set API_KEY to protect private routes.');
      didWarnDisabledApiKey = true;
    }
    next();
    return;
  }

  const providedKey = getProvidedApiKey(req);
  if (!isValidApiKey(providedKey)) {
    res.status(401).json({
      success: false,
      message: 'Mã truy cập không đúng.',
      errorCode: 'UNAUTHORIZED'
    });
    return;
  }

  next();
}

function getProvidedApiKey(req) {
  const headerKey = req.get('X-API-Key');
  if (headerKey) {
    return headerKey;
  }

  const authorization = req.get('Authorization');
  if (authorization && authorization.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length).trim();
  }

  return null;
}

function getApiKeyFromHeaders(headers = {}) {
  const headerKey = headers['x-api-key'];
  if (Array.isArray(headerKey)) {
    return headerKey[0];
  }

  if (headerKey) {
    return headerKey;
  }

  const authorization = headers.authorization;
  if (authorization && authorization.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length).trim();
  }

  return null;
}

function isApiKeyProtectionEnabled() {
  return Boolean(apiKey);
}

function isValidApiKey(value) {
  if (!apiKey || !value) {
    return false;
  }

  return safeCompare(value, apiKey);
}

function safeCompare(value, expected) {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);

  if (valueBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(valueBuffer, expectedBuffer);
}

module.exports = apiKeyAuth;
module.exports.getApiKeyFromHeaders = getApiKeyFromHeaders;
module.exports.isApiKeyProtectionEnabled = isApiKeyProtectionEnabled;
module.exports.isValidApiKey = isValidApiKey;
