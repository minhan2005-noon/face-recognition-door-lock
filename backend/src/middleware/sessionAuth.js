const { getAccountBySessionToken } = require('../services/authService');

async function sessionAuth(req, res, next) {
  try {
    const token = getSessionToken(req);
    const account = await getAccountBySessionToken(token);

    if (!account) {
      res.status(401).json({
        success: false,
        message: 'Bạn cần đăng nhập để tiếp tục.',
        errorCode: 'LOGIN_REQUIRED'
      });
      return;
    }

    req.account = account;
    next();
  } catch (error) {
    next(error);
  }
}

function getSessionToken(req) {
  const headerToken = req.get('X-Session-Token');
  if (headerToken) {
    return headerToken;
  }

  const authorization = req.get('Authorization');
  if (authorization && authorization.startsWith('Session ')) {
    return authorization.slice('Session '.length).trim();
  }

  return null;
}

module.exports = sessionAuth;
module.exports.getSessionToken = getSessionToken;
