const crypto = require('crypto');
const { get, run } = require('../database');
const { createId } = require('../utils/ids');

const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS || 24 * 60 * 60 * 1000);
const BASE_LOCK_MS = Number(process.env.LOGIN_LOCK_BASE_MS || 2 * 60 * 1000);
const MAX_LOCK_MS = Number(process.env.LOGIN_LOCK_MAX_MS || 60 * 60 * 1000);
const LOGIN_FAILURES_BEFORE_LOCK = Number(process.env.LOGIN_FAILURES_BEFORE_LOCK || 3);
const LOCKED_LOGIN_DELETE_THRESHOLD = Number(process.env.LOCKED_LOGIN_DELETE_THRESHOLD || 3);
const API_KEY_BLOCK_MS = Number(process.env.API_KEY_BLOCK_MS || 5 * 60 * 1000);

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

function getApiKeyBlockInfo(account) {
  if (!account?.api_key_blocked_until) {
    return { blocked: false, remainingMs: 0 };
  }

  const remainingMs = new Date(account.api_key_blocked_until).getTime() - Date.now();
  return {
    blocked: remainingMs > 0,
    remainingMs: Math.max(0, remainingMs)
  };
}

function nextLockUntil(lockPenaltyCount) {
  const duration = Math.min(BASE_LOCK_MS * (2 ** Math.max(0, lockPenaltyCount - 1)), MAX_LOCK_MS);
  return new Date(Date.now() + duration).toISOString();
}

function createAuthError(status, message, extra = {}) {
  const error = new Error(message);
  error.status = status;
  Object.assign(error, extra);
  return error;
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
    throw createAuthError(401, 'Tên đăng nhập hoặc mật khẩu không đúng.');
  }

  const lockInfo = getLockInfo(account);
  if (lockInfo.locked) {
    const lockedLoginAttemptCount = account.locked_login_attempt_count + 1;

    if (lockedLoginAttemptCount >= LOCKED_LOGIN_DELETE_THRESHOLD) {
      await deleteAccount(account.id);
      throw createAuthError(
        410,
        'Tài khoản đã bị xóa vì cố đăng nhập quá nhiều lần trong lúc đang bị khóa.',
        { errorCode: 'ACCOUNT_DELETED' }
      );
    }

    await run(
      `UPDATE app_accounts
       SET locked_login_attempt_count = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [lockedLoginAttemptCount, account.id]
    );

    throw createAuthError(
      423,
      `Tài khoản đang bị khóa. Thử lại sau ${Math.ceil(lockInfo.remainingMs / 1000)} giây.`,
      {
        errorCode: 'ACCOUNT_LOCKED',
        remainingMs: lockInfo.remainingMs,
        lockedLoginAttemptsRemaining: LOCKED_LOGIN_DELETE_THRESHOLD - lockedLoginAttemptCount
      }
    );
  }

  if (!verifyPassword(password, account)) {
    const failedLoginCount = account.failed_login_count + 1;
    if (failedLoginCount < LOGIN_FAILURES_BEFORE_LOCK) {
      await run(
        `UPDATE app_accounts
         SET failed_login_count = ?, locked_login_attempt_count = 0, updated_at = datetime('now')
         WHERE id = ?`,
        [failedLoginCount, account.id]
      );

      throw createAuthError(401, 'Sai mật khẩu.', {
        errorCode: 'BAD_CREDENTIALS',
        attemptsRemaining: LOGIN_FAILURES_BEFORE_LOCK - failedLoginCount
      });
    }

    const lockPenaltyCount = account.lock_penalty_count + 1;
    const lockedUntil = nextLockUntil(lockPenaltyCount);
    await run(
      `UPDATE app_accounts
       SET failed_login_count = ?,
           lock_penalty_count = ?,
           locked_login_attempt_count = 0,
           locked_until = ?,
           updated_at = datetime('now')
       WHERE id = ?`,
      [LOGIN_FAILURES_BEFORE_LOCK - 1, lockPenaltyCount, lockedUntil, account.id]
    );

    const remainingMs = new Date(lockedUntil).getTime() - Date.now();
    throw createAuthError(423, `Sai mật khẩu. Tài khoản bị khóa ${Math.ceil(remainingMs / 1000)} giây.`, {
      errorCode: 'ACCOUNT_LOCKED',
      remainingMs
    });
  }

  await run(
    `UPDATE app_accounts
     SET failed_login_count = 0,
         lock_penalty_count = 0,
         locked_login_attempt_count = 0,
         locked_until = NULL,
         api_key_blocked_until = NULL,
         api_key_block_attempt_count = 0,
         updated_at = datetime('now')
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
  const row = await getAccountRowBySessionToken(token);
  return row ? serializeAccount(row) : null;
}

async function getAccountRowBySessionToken(token) {
  if (!token) {
    return null;
  }

  return get(
    `SELECT app_accounts.*
     FROM auth_sessions
     JOIN app_accounts ON app_accounts.id = auth_sessions.account_id
     WHERE auth_sessions.token_hash = ?
       AND auth_sessions.expires_at > datetime('now')`,
    [hashToken(token)]
  );
}

async function logoutSession(token) {
  if (!token) return;
  await run('DELETE FROM auth_sessions WHERE token_hash = ?', [hashToken(token)]);
}

async function logoutAllAccountSessions(accountId) {
  if (!accountId) return;
  await run('DELETE FROM auth_sessions WHERE account_id = ?', [accountId]);
}

async function deleteAccount(accountId) {
  await run('DELETE FROM app_accounts WHERE id = ?', [accountId]);
}

async function getApiKeyBlockBySessionToken(token) {
  const account = await getAccountRowBySessionToken(token);
  if (!account) {
    return { account: null, blocked: false, remainingMs: 0 };
  }

  const blockInfo = getApiKeyBlockInfo(account);
  if (!blockInfo.blocked && account.api_key_blocked_until) {
    await clearApiKeyBlock(account.id);
  }

  return {
    account,
    ...blockInfo
  };
}

async function blockApiKeyBySessionToken(token) {
  const account = await getAccountRowBySessionToken(token);
  if (!account) {
    return { account: null, remainingMs: API_KEY_BLOCK_MS };
  }

  const blockedUntil = new Date(Date.now() + API_KEY_BLOCK_MS).toISOString();
  await run(
    `UPDATE app_accounts
     SET api_key_blocked_until = ?, api_key_block_attempt_count = 0, updated_at = datetime('now')
     WHERE id = ?`,
    [blockedUntil, account.id]
  );

  return {
    account,
    remainingMs: API_KEY_BLOCK_MS
  };
}

async function forceLogoutForApiKeySpam(token) {
  const account = await getAccountRowBySessionToken(token);
  if (!account) {
    return null;
  }

  await logoutAllAccountSessions(account.id);
  return account;
}

async function clearApiKeyBlock(accountId) {
  await run(
    `UPDATE app_accounts
     SET api_key_blocked_until = NULL, api_key_block_attempt_count = 0, updated_at = datetime('now')
     WHERE id = ?`,
    [accountId]
  );
}

module.exports = {
  blockApiKeyBySessionToken,
  forceLogoutForApiKeySpam,
  getAccountBySessionToken,
  getApiKeyBlockBySessionToken,
  loginAccount,
  logoutSession,
  registerAccount
};
