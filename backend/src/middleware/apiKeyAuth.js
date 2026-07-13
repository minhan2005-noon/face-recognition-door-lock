const crypto = require('crypto');
const { getSessionToken } = require('./sessionAuth');
const {
  blockApiKeyBySessionToken,
  forceLogoutForApiKeySpam,
  getApiKeyBlockBySessionToken
} = require('../services/authService');

const apiKey = process.env.API_KEY;
let didWarnDisabledApiKey = false;

async function apiKeyAuth(req, res, next) {
  if (!apiKey) {
    if (process.env.NODE_ENV !== 'test' && !didWarnDisabledApiKey) {
      console.warn('API key protection is disabled. Set API_KEY to protect private routes.');
      didWarnDisabledApiKey = true;
    }
    next();
    return;
  }

  try {
    const sessionToken = getSessionToken(req);
    const blockInfo = await getApiKeyBlockBySessionToken(sessionToken);

    if (blockInfo.blocked) {
      await forceLogoutForApiKeySpam(sessionToken);
      res.status(440).json({
        success: false,
        message: 'Bạn đã thao tác API key khi đang bị chặn. Phiên đăng nhập đã bị đăng xuất.',
        errorCode: 'API_KEY_SPAM_LOGOUT',
        remainingMs: blockInfo.remainingMs
      });
      return;
    }

    const providedKey = getProvidedApiKey(req);

    if (!isValidApiKey(providedKey)) {
      const result = await blockApiKeyBySessionToken(sessionToken);
      res.status(423).json({
        success: false,
        message: 'Mã truy cập không đúng. Phần cấu hình bị chặn trong 5 phút.',
        errorCode: 'API_KEY_BLOCKED',
        remainingMs: result.remainingMs
      });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
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
