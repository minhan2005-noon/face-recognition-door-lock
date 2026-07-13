const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const databasePath =
  process.env.DATABASE_PATH ||
  path.join(__dirname, '..', 'database', 'door-lock.sqlite');
const schemaPath =
  process.env.SCHEMA_PATH ||
  (fs.existsSync(path.join(__dirname, '..', 'schema.sql'))
    ? path.join(__dirname, '..', 'schema.sql')
    : path.join(__dirname, '..', 'database', 'schema.sql'));

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const db = new sqlite3.Database(databasePath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function handleRun(error) {
      if (error) {
        reject(error);
        return;
      }

      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(rows);
    });
  });
}

function exec(sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function initDatabase() {
  await exec('PRAGMA foreign_keys = ON;');
  await exec(fs.readFileSync(schemaPath, 'utf8'));
  await ensureAppAccountColumns();
  await seedDefaultDevice();
}

async function ensureAppAccountColumns() {
  const columns = await all('PRAGMA table_info(app_accounts)');
  const columnNames = new Set(columns.map((column) => column.name));
  const missingColumns = [
    ['lock_penalty_count', 'INTEGER NOT NULL DEFAULT 0'],
    ['locked_login_attempt_count', 'INTEGER NOT NULL DEFAULT 0'],
    ['api_key_blocked_until', 'TEXT'],
    ['api_key_block_attempt_count', 'INTEGER NOT NULL DEFAULT 0']
  ].filter(([name]) => !columnNames.has(name));

  for (const [name, definition] of missingColumns) {
    await run(`ALTER TABLE app_accounts ADD COLUMN ${name} ${definition}`);
  }
}

async function seedDefaultDevice() {
  await run(
    `INSERT OR IGNORE INTO devices (id, name, type, status)
     VALUES (?, ?, ?, ?)`,
    ['door_lock_001', 'Main Door Lock', 'door_lock', 'offline']
  );
}

module.exports = {
  all,
  databasePath,
  get,
  initDatabase,
  run
};
