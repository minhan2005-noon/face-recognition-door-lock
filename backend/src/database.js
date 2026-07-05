const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const databasePath =
  process.env.DATABASE_PATH ||
  path.join(__dirname, '..', 'database', 'door-lock.sqlite');
const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');

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
  await seedDefaultDevice();
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
