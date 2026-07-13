const crypto = require('crypto');
const { get, run } = require('../database');
const { createId } = require('../utils/ids');

const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS || 24 * 60 * 60 * 1000);
const BASE_LOCK_MS = Number(process.env.LOGIN_LOCK_BASE_MS || 2 * 60 * 1000);
const MAX_LOCK_MS = Number(process.env.LOGIN_LOCK_MAX_MS || 60 * 60 * 1000);

function normalizeUsername(username = '') {
  return String(username).trim().toLowerCase();
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(String(password), salt, 120000, 64, 'sha512').toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createPasswordRecord(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return {
    salt,
    hash: hashPassword(password, salt)
  };
}

function verifyPassword(password, account) {
  const attemptedHash = hashPassword(password, account.password_salt);
  const attempted = Buffer.from(attemptedHash, 'hex');
  const expected = Buffer.from(account.password_hash, 'hex');

  return attempted.length === expected.length && crypto.timingSafeEqual(attempted, expected);
}

function serializeAccount(account) {
  return {
    id: account.id,
    username: account.username,
    displayName: account.display_name,
    lockedUntil: account.locked_until || null,
    createdAt: account.created_at
  };
}

function getLockInfo(account) {
  if (!account.locked_until) {
    return { locked: false, remainingMs: 0 };
  }

  const remainingMs = new Date(account.locked_until).getTime() - Date.now();
  return {
    locked: remainingMs > 0,
    remainingMs: Math.max(0, remainingMs)
  };
}

function nextLockUntil(failedLoginCount) {
  const duration = Math.min(BASE_LOCK_MS * (2 ** Math.max(0, failedLoginCount - 1)), MAX_LOCK_MS);
  return new Date(Date.now() + duration).toISOString();
}

async function registerAccount({ username, displayName, password }) {
  const normalizedUsername = normalizeUsername(username);

  if (!normalizedUsername || normalizedUsername.length < 3) {
    const error = new Error('Tên đăng nhập cần ít nhất 3 ký tự.');
    error.status = 400;
    throw error;
  }

  if (!password || String(password).length < 6) {
    const error = new Error('Mật khẩu cần ít nhất 6 ký tự.');
    error.status = 400;
    throw error;
  }

  const existing = await get('SELECT id FROM app_accounts WHERE username = ?', [normalizedUsername]);
  if (existing) {
    const error = new Error('Tên đăng nhập đã tồn tại.');
    error.status = 409;
    throw error;
  }

  const passwordRecord = createPasswordRecord(password);
  const id = createId('account');
  await run(
    `INSERT INTO app_accounts (id, username, display_name, password_hash, password_salt)
     VALUES (?, ?, ?, ?, ?)`,
    [id, normalizedUsername, String(displayName || username).trim(), passwordRecord.hash, passwordRecord.salt]
  );

  const account = await get('SELECT * FROM app_accounts WHERE id = ?', [id]);
  const session = await createSession(account.id);

  return {
    account: serializeAccount(account),
    session
  };
}

async function loginAccount({ username, password }) {
  const normalizedUsername = normalizeUsername(username);
  const account = await get('SELECT * FROM app_accounts WHERE username = ?', [normalizedUsername]);

  if (!account) {
    const error = new Error('Tên đăng nhập hoặc mật khẩu không đúng.');
    error.status = 401;
    throw error;
  }

  const lockInfo = getLockInfo(account);
  if (lockInfo.locked) {
    const error = new Error(`Tài khoản đang bị khóa. Thử lại sau ${Math.ceil(lockInfo.remainingMs / 1000)} giây.`);
    error.status = 423;
    error.remainingMs = lockInfo.remainingMs;
    throw error;
  }

  if (!verifyPassword(password, account)) {
    const failedLoginCount = account.failed_login_count + 1;
    const lockedUntil = nextLockUntil(failedLoginCount);
    await run(
      `UPDATE app_accounts
       SET failed_login_count = ?, locked_until = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [failedLoginCount, lockedUntil, account.id]
    );

    const remainingMs = new Date(lockedUntil).getTime() - Date.now();
    const error = new Error(`Sai mật khẩu. Tài khoản bị khóa ${Math.ceil(remainingMs / 1000)} giây.`);
    error.status = 423;
    error.remainingMs = remainingMs;
    throw error;
  }

  await run(
    `UPDATE app_accounts
     SET failed_login_count = 0, locked_until = NULL, updated_at = datetime('now')
     WHERE id = ?`,
    [account.id]
  );

  const session = await createSession(account.id);
  const freshAccount = await get('SELECT * FROM app_accounts WHERE id = ?', [account.id]);

  return {
    account: serializeAccount(freshAccount),
    session
  };
}

async function createSession(accountId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await run(
    `INSERT INTO auth_sessions (id, account_id, token_hash, expires_at)
     VALUES (?, ?, ?, ?)`,
    [createId('session'), accountId, hashToken(token), expiresAt]
  );

  return {
    token,
    expiresAt
  };
}

async function getAccountBySessionToken(token) {
  if (!token) {
    return null;
  }

  const row = await get(
    `SELECT app_accounts.*
     FROM auth_sessions
     JOIN app_accounts ON app_accounts.id = auth_sessions.account_id
     WHERE auth_sessions.token_hash = ?
       AND auth_sessions.expires_at > datetime('now')`,
    [hashToken(token)]
  );

  return row ? serializeAccount(row) : null;
}

async function logoutSession(token) {
  if (!token) return;
  await run('DELETE FROM auth_sessions WHERE token_hash = ?', [hashToken(token)]);
}

module.exports = {
  getAccountBySessionToken,
  loginAccount,
  logoutSession,
  registerAccount
};
