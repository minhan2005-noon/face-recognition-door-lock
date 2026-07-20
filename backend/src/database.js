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
  await seedDefaultUsers();
  await seedDefaultDevices();
  await seedDefaultTemperatures();
}

async function ensureAppAccountColumns() {
  const table = await get("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'app_accounts'");
  if (!table) return;

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

async function seedDefaultUsers() {
  const users = [
    ['user_owner_demo', 'Chủ nhà Demo', 'owner', 'active'],
    ['user_family_demo', 'Người thân Demo', 'family', 'active'],
    ['user_guest_no_schedule', 'Khách chưa cấp lịch', 'guest', 'active']
  ];

  for (const user of users) {
    await run(
      `INSERT OR IGNORE INTO users (id, name, role, status)
       VALUES (?, ?, ?, ?)`,
      user
    );
  }
}

async function seedDefaultDevices() {
  const devices = [
    ['door_lock_001', 'Main Door Lock', 'door_lock', 'offline'],
    ['socket_light_001', 'Đèn phòng khách', 'smart_socket', 'offline'],
    ['socket_fan_001', 'Quạt phòng khách', 'smart_socket', 'offline'],
    ['socket_tv_001', 'TV mô hình', 'smart_socket', 'offline'],
    ['elevator_001', 'Thang máy 2 tầng', 'elevator', 'offline'],
    ['env_node_001', 'Node môi trường', 'environment', 'offline']
  ];

  for (const device of devices) {
    await run(
      `INSERT OR IGNORE INTO devices (id, name, type, status)
       VALUES (?, ?, ?, ?)`,
      device
    );

    await run(
      `INSERT OR IGNORE INTO device_states (device_id, power_state, mode, metadata)
       VALUES (?, ?, ?, ?)`,
      [
        device[0],
        device[2] === 'door_lock' ? 'locked' : 'off',
        device[2] === 'elevator' ? 'floor_1' : null,
        '{}'
      ]
    );
  }
}

async function seedDefaultTemperatures() {
  const existing = await get(
    `SELECT id FROM sensor_readings
     WHERE sensor_type IN ('temperature_indoor', 'temperature_outdoor')
     LIMIT 1`
  );
  if (existing) return;

  const readings = [
    ['sensor_temp_indoor_seed', 'temperature_indoor', 28, { zone: 'indoor', label: 'Trong phòng' }],
    ['sensor_temp_outdoor_seed', 'temperature_outdoor', 31, { zone: 'outdoor', label: 'Ngoài phòng' }]
  ];

  for (const [id, sensorType, value, metadata] of readings) {
    await run(
      `INSERT OR IGNORE INTO sensor_readings
       (id, device_id, sensor_type, value, unit, metadata, captured_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [id, 'env_node_001', sensorType, value, 'C', JSON.stringify(metadata)]
    );
  }
}

module.exports = {
  all,
  databasePath,
  get,
  initDatabase,
  run
};
