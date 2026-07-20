const express = require('express');
const { all, get, run } = require('../database');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const { createId } = require('../utils/ids');
const {
  formatAccessLog,
  formatAutomationRule,
  formatDevice,
  formatDeviceCommand,
  formatDeviceState,
  formatSensorReading,
  formatUser
} = require('../utils/rowFormatters');
const { publishDeviceCommand, publishLockCommand } = require('../services/mqttService');
const { broadcast } = require('../services/webSocketService');

const router = express.Router();

const DEVICE_PRESETS = {
  light: 'socket_light_001',
  fan: 'socket_fan_001',
  tv: 'socket_tv_001',
  elevator: 'elevator_001',
  door: 'door_lock_001'
};

router.get(
  '/overview',
  asyncHandler(async (req, res) => {
    const [devices, states, sensors, commands, rules, logs, users, temperatures, faceStatus] = await Promise.all([
      all('SELECT * FROM devices ORDER BY type, name'),
      all('SELECT * FROM device_states ORDER BY updated_at DESC'),
      all(
        `SELECT * FROM sensor_readings
         ORDER BY captured_at DESC
         LIMIT 30`
      ),
      all(
        `SELECT * FROM device_commands
         ORDER BY created_at DESC
         LIMIT 50`
      ),
      all('SELECT * FROM automation_rules ORDER BY created_at DESC'),
      all(
        `SELECT * FROM access_logs
         ORDER BY created_at DESC
         LIMIT 20`
      ),
      all('SELECT * FROM users ORDER BY created_at DESC'),
      getTemperatureStatus(),
      getLatestFaceStatus()
    ]);

    res.json({
      success: true,
      data: {
        devices: devices.map(formatDevice),
        states: states.map(formatDeviceState),
        sensors: sensors.map(formatSensorReading),
        commands: commands.map(formatDeviceCommand),
        rules: rules.map(formatAutomationRule),
        logs: logs.map(formatAccessLog),
        users: users.map(formatUser),
        temperatures,
        faceStatus
      }
    });
  })
);

router.get(
  '/face-status',
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await getLatestFaceStatus()
    });
  })
);

router.get(
  '/temperatures',
  asyncHandler(async (req, res) => {
    const temperatures = await getTemperatureStatus();
    res.json({
      success: true,
      data: temperatures
    });
  })
);

router.post(
  '/temperatures',
  asyncHandler(async (req, res) => {
    const {
      indoor,
      outdoor,
      room,
      outside,
      unit = 'C',
      deviceId = 'env_node_001',
      capturedAt = new Date().toISOString()
    } = req.body;

    await requireDevice(deviceId);

    const indoorValue = indoor ?? room;
    const outdoorValue = outdoor ?? outside;
    const readings = [];

    if (indoorValue !== undefined) {
      readings.push(
        await insertSensorReading({
          deviceId,
          sensorType: 'temperature_indoor',
          value: Number(indoorValue),
          unit,
          metadata: { zone: 'indoor', label: 'Trong phòng' },
          capturedAt
        })
      );
    }

    if (outdoorValue !== undefined) {
      readings.push(
        await insertSensorReading({
          deviceId,
          sensorType: 'temperature_outdoor',
          value: Number(outdoorValue),
          unit,
          metadata: { zone: 'outdoor', label: 'Ngoài phòng' },
          capturedAt
        })
      );
    }

    if (!readings.length) {
      throw httpError(400, 'Cần gửi indoor/outdoor hoặc room/outside.', 'INVALID_TEMPERATURE_PAYLOAD');
    }

    for (const reading of readings) {
      await runAutomationForSensor(reading);
      broadcast('sensor.reading', { reading });
    }

    res.status(201).json({
      success: true,
      data: {
        readings,
        temperatures: await getTemperatureStatus()
      }
    });
  })
);

router.post(
  '/devices/:id/command',
  asyncHandler(async (req, res) => {
    const command = await createDeviceCommand({
      deviceId: req.params.id,
      action: req.body.action,
      channel: req.body.channel || null,
      value: req.body.value ?? null,
      source: req.body.source || 'dashboard',
      reason: req.body.reason || 'manual',
      userId: req.body.userId || null
    });

    await applyCommandState(command);
    publishDeviceCommand(command);
    broadcast('device.command', { command });

    res.status(201).json({
      success: true,
      message: 'Đã gửi lệnh điều khiển thiết bị.',
      data: { command }
    });
  })
);

router.patch(
  '/devices/:id/state',
  asyncHandler(async (req, res) => {
    const device = await requireDevice(req.params.id);
    const current = await get('SELECT * FROM device_states WHERE device_id = ?', [device.id]);
    const metadata = req.body.metadata ?? (current ? JSON.parse(current.metadata || '{}') : {});

    await run(
      `INSERT INTO device_states
       (device_id, power_state, mode, current_value, target_value, metadata, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(device_id) DO UPDATE SET
         power_state = excluded.power_state,
         mode = excluded.mode,
         current_value = excluded.current_value,
         target_value = excluded.target_value,
         metadata = excluded.metadata,
         updated_at = datetime('now')`,
      [
        device.id,
        req.body.powerState ?? current?.power_state ?? 'off',
        req.body.mode ?? current?.mode ?? null,
        req.body.currentValue ?? current?.current_value ?? null,
        req.body.targetValue ?? current?.target_value ?? null,
        JSON.stringify(metadata)
      ]
    );

    const state = formatDeviceState(
      await get('SELECT * FROM device_states WHERE device_id = ?', [device.id])
    );

    broadcast('device.state', { device, state });
    res.json({ success: true, data: state });
  })
);

router.post(
  '/sensors',
  asyncHandler(async (req, res) => {
    const {
      deviceId = 'env_node_001',
      sensorType,
      value,
      unit = null,
      metadata = {},
      capturedAt = new Date().toISOString()
    } = req.body;

    if (!sensorType || typeof value !== 'number') {
      throw httpError(400, 'sensorType và value dạng số là bắt buộc.', 'INVALID_SENSOR_READING');
    }

    const reading = await insertSensorReading({ deviceId, sensorType, value, unit, metadata, capturedAt });

    broadcast('sensor.reading', { reading });
    const automation = await runAutomationForSensor(reading);

    res.status(201).json({
      success: true,
      data: {
        reading,
        automation
      }
    });
  })
);

router.get(
  '/automation-rules',
  asyncHandler(async (req, res) => {
    const rules = await all('SELECT * FROM automation_rules ORDER BY created_at DESC');
    res.json({ success: true, data: rules.map(formatAutomationRule) });
  })
);

router.post(
  '/automation-rules',
  asyncHandler(async (req, res) => {
    const {
      name,
      triggerType,
      condition = {},
      actions = [],
      enabled = true
    } = req.body;

    if (!name || !triggerType || !Array.isArray(actions)) {
      throw httpError(400, 'name, triggerType và actions là bắt buộc.', 'INVALID_AUTOMATION_RULE');
    }

    const id = createId('rule');
    await run(
      `INSERT INTO automation_rules
       (id, name, trigger_type, condition_json, actions_json, enabled)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name, triggerType, JSON.stringify(condition), JSON.stringify(actions), enabled ? 1 : 0]
    );

    const rule = formatAutomationRule(
      await get('SELECT * FROM automation_rules WHERE id = ?', [id])
    );

    broadcast('automation.rule.created', { rule });
    res.status(201).json({ success: true, data: rule });
  })
);

router.post(
  '/voice-command',
  asyncHandler(async (req, res) => {
    const phrase = String(req.body.phrase || '').trim().toLowerCase();
    const userId = req.body.userId || null;
    const commandIntent = parseVoiceCommand(phrase);

    if (!commandIntent) {
      throw httpError(400, 'Chưa hiểu lệnh giọng nói.', 'UNKNOWN_VOICE_COMMAND');
    }

    const command = await createDeviceCommand({
      ...commandIntent,
      userId,
      source: 'voice',
      reason: phrase
    });

    await applyCommandState(command);
    publishDeviceCommand(command);
    broadcast('voice.command', { phrase, command });

    res.status(201).json({
      success: true,
      message: `Đã xử lý lệnh: ${phrase}`,
      data: { phrase, command }
    });
  })
);

router.post(
  '/simulate',
  asyncHandler(async (req, res) => {
    const scenario = req.body.scenario || 'admin_home';
    const result = await runSimulation(scenario);

    broadcast('simulation.run', result);
    res.status(201).json({
      success: true,
      message: 'Đã chạy mô phỏng.',
      data: result
    });
  })
);

async function createDeviceCommand({ deviceId, action, channel, value, source, reason, userId }) {
  if (!action) {
    throw httpError(400, 'action là bắt buộc.', 'INVALID_DEVICE_ACTION');
  }

  await requireDevice(deviceId);

  if (userId) {
    const user = await get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      throw httpError(404, 'Không tìm thấy người dùng.', 'USER_NOT_FOUND');
    }
  }

  const id = createId('dcmd');
  await run(
    `INSERT INTO device_commands
     (id, device_id, user_id, action, channel, value, source, reason, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, deviceId, userId, action, channel, value == null ? null : String(value), source, reason, 'queued']
  );

  return formatDeviceCommand(await get('SELECT * FROM device_commands WHERE id = ?', [id]));
}

async function applyCommandState(command) {
  const powerActions = new Set(['on', 'off', 'toggle', 'lock', 'unlock']);
  let powerState = null;
  let mode = null;
  let currentValue = null;
  let targetValue = null;
  const metadata = {
    lastCommandId: command.id,
    channel: command.channel,
    source: command.source,
    reason: command.reason
  };

  if (powerActions.has(command.action)) {
    powerState = command.action;
  }

  if (command.action === 'goto_floor') {
    mode = `floor_${command.value}`;
    currentValue = Number(command.value);
    targetValue = Number(command.value);
    powerState = 'on';
  }

  if (command.action === 'set_level') {
    targetValue = Number(command.value);
    powerState = 'on';
  }

  if (!powerState && command.action === 'emergency_open') {
    powerState = 'unlock';
    mode = 'emergency';
  }

  const current = await get('SELECT * FROM device_states WHERE device_id = ?', [command.deviceId]);
  await run(
    `INSERT INTO device_states
     (device_id, power_state, mode, current_value, target_value, metadata, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(device_id) DO UPDATE SET
       power_state = excluded.power_state,
       mode = excluded.mode,
       current_value = excluded.current_value,
       target_value = excluded.target_value,
       metadata = excluded.metadata,
       updated_at = datetime('now')`,
    [
      command.deviceId,
      powerState || current?.power_state || 'off',
      mode || current?.mode || null,
      currentValue ?? current?.current_value ?? null,
      targetValue ?? current?.target_value ?? null,
      JSON.stringify(metadata)
    ]
  );
}

async function insertSensorReading({ deviceId, sensorType, value, unit = null, metadata = {}, capturedAt }) {
  if (!Number.isFinite(value)) {
    throw httpError(400, 'Giá trị cảm biến phải là số hợp lệ.', 'INVALID_SENSOR_VALUE');
  }

  await requireDevice(deviceId);
  const id = createId('sensor');
  await run(
    `INSERT INTO sensor_readings
     (id, device_id, sensor_type, value, unit, metadata, captured_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, deviceId, sensorType, value, unit, JSON.stringify(metadata), capturedAt || new Date().toISOString()]
  );

  return formatSensorReading(
    await get('SELECT * FROM sensor_readings WHERE id = ?', [id])
  );
}

async function getTemperatureStatus() {
  const rows = await all(
    `SELECT sr.*
     FROM sensor_readings sr
     JOIN (
       SELECT sensor_type, MAX(captured_at) AS latest_at
       FROM sensor_readings
       WHERE sensor_type IN ('temperature', 'temperature_indoor', 'temperature_outdoor')
       GROUP BY sensor_type
     ) latest
       ON latest.sensor_type = sr.sensor_type
      AND latest.latest_at = sr.captured_at
     WHERE sr.sensor_type IN ('temperature', 'temperature_indoor', 'temperature_outdoor')
     ORDER BY sr.captured_at DESC`
  );

  const readings = rows.map(formatSensorReading);
  const indoor =
    readings.find((reading) => reading.sensorType === 'temperature_indoor') ||
    readings.find((reading) => reading.sensorType === 'temperature') ||
    null;
  const outdoor = readings.find((reading) => reading.sensorType === 'temperature_outdoor') || null;

  return {
    indoor,
    outdoor,
    difference:
      indoor && outdoor
        ? Number((indoor.value - outdoor.value).toFixed(1))
        : null,
    unit: indoor?.unit || outdoor?.unit || 'C',
    updatedAt: indoor?.capturedAt || outdoor?.capturedAt || null
  };
}

async function getLatestFaceStatus() {
  const row = await get(
    `SELECT
       re.*,
       u.name AS user_name,
       u.role AS user_role,
       u.status AS user_status,
       d.name AS device_name
     FROM recognition_events re
     LEFT JOIN users u ON u.id = re.user_id
     LEFT JOIN devices d ON d.id = re.device_id
     ORDER BY re.captured_at DESC, re.created_at DESC
     LIMIT 1`
  );

  if (!row) {
    return {
      detected: false,
      personType: 'none',
      personLabel: 'Chưa có khuôn mặt',
      access: 'idle',
      message: 'Chưa có lần quét mặt nào.'
    };
  }

  const recognized = Boolean(row.recognized);
  const access = row.decision === 'unlock' ? 'allowed' : 'denied';
  const personType = classifyPersonType(row.user_role, recognized);
  const personLabel = buildPersonLabel({ role: row.user_role, name: row.user_name, recognized });

  return {
    detected: true,
    eventId: row.id,
    userId: row.user_id,
    userName: row.user_name,
    role: row.user_role,
    deviceId: row.device_id,
    deviceName: row.device_name,
    recognized,
    confidence: row.confidence,
    decision: row.decision,
    access,
    personType,
    personLabel,
    isFamily: ['owner', 'admin', 'family', 'resident'].includes(row.user_role) && recognized,
    capturedAt: row.captured_at,
    message: access === 'allowed'
      ? `${personLabel} được phép mở cửa.`
      : `${personLabel} bị từ chối mở cửa.`
  };
}

function classifyPersonType(role, recognized) {
  if (!recognized || !role) return 'stranger';
  if (role === 'owner') return 'owner';
  if (role === 'admin') return 'admin';
  if (role === 'family' || role === 'resident') return 'family';
  if (role === 'guest') return 'guest';
  return 'stranger';
}

function buildPersonLabel({ role, name, recognized }) {
  if (!recognized || !role) return 'Người lạ';
  if (role === 'owner') return 'Chủ nhà';
  if (role === 'admin') return 'Quản trị viên';
  if (role === 'family') return 'Người thân';
  if (role === 'resident') return 'Cư dân';
  if (role === 'guest') return name || 'Khách';
  return name || 'Người lạ';
}

async function runAutomationForSensor(reading) {
  const actions = [];

  if (reading.sensorType === 'light' && reading.value < 300) {
    actions.push(
      await createAndApplyPresetCommand('light', 'on', {
        source: 'automation',
        reason: 'low_light'
      })
    );
  }

  if (['temperature', 'temperature_indoor'].includes(reading.sensorType) && reading.value >= 30) {
    actions.push(
      await createAndApplyPresetCommand('fan', 'on', {
        source: 'automation',
        reason: 'high_temperature'
      })
    );
  }

  if (['gas', 'flame'].includes(reading.sensorType) && reading.value > 0) {
    actions.push(
      await createAndApplyPresetCommand('door', 'emergency_open', {
        source: 'automation',
        reason: 'emergency_sensor'
      })
    );
    actions.push(
      await createAndApplyPresetCommand('fan', 'on', {
        source: 'automation',
        reason: 'emergency_ventilation'
      })
    );
  }

  return actions;
}

async function createAndApplyPresetCommand(preset, action, options = {}) {
  const command = await createDeviceCommand({
    deviceId: DEVICE_PRESETS[preset],
    action,
    channel: preset,
    value: options.value ?? null,
    source: options.source || 'automation',
    reason: options.reason || 'automation',
    userId: options.userId || null
  });
  await applyCommandState(command);
  publishDeviceCommand(command);
  return command;
}

function parseVoiceCommand(phrase) {
  if (!phrase) return null;

  if (phrase.includes('bật đèn')) {
    return { deviceId: DEVICE_PRESETS.light, action: 'on', channel: 'light', value: null };
  }
  if (phrase.includes('tắt đèn')) {
    return { deviceId: DEVICE_PRESETS.light, action: 'off', channel: 'light', value: null };
  }
  if (phrase.includes('bật quạt')) {
    return { deviceId: DEVICE_PRESETS.fan, action: 'on', channel: 'fan', value: null };
  }
  if (phrase.includes('tắt quạt')) {
    return { deviceId: DEVICE_PRESETS.fan, action: 'off', channel: 'fan', value: null };
  }
  if (phrase.includes('bật tv') || phrase.includes('bật tivi')) {
    return { deviceId: DEVICE_PRESETS.tv, action: 'on', channel: 'tv', value: null };
  }
  if (phrase.includes('tắt tv') || phrase.includes('tắt tivi')) {
    return { deviceId: DEVICE_PRESETS.tv, action: 'off', channel: 'tv', value: null };
  }
  if (phrase.includes('mở cửa')) {
    return { deviceId: DEVICE_PRESETS.door, action: 'unlock', channel: 'door', value: null };
  }
  if (phrase.includes('khóa cửa') || phrase.includes('khoá cửa')) {
    return { deviceId: DEVICE_PRESETS.door, action: 'lock', channel: 'door', value: null };
  }
  if (phrase.includes('thang máy') || phrase.includes('thang may')) {
    const floor = phrase.match(/[12]/)?.[0] || '1';
    return { deviceId: DEVICE_PRESETS.elevator, action: 'goto_floor', channel: 'elevator', value: floor };
  }

  return null;
}

async function runSimulation(scenario) {
  if (scenario === 'guest_visit') {
    const guest = await ensureUser('Khách Demo', 'guest');
    await createGuestAccess(guest.id);
    await logRecognition({
      userId: guest.id,
      deviceId: DEVICE_PRESETS.door,
      recognized: true,
      confidence: 0.86,
      decision: 'unlock'
    });
    await logAccess({
      userId: guest.id,
      deviceId: DEVICE_PRESETS.door,
      action: 'unlock',
      result: 'allowed',
      reason: 'guest_within_schedule',
      confidence: 0.86
    });
    const door = await createAndApplyPresetCommand('door', 'unlock', {
      userId: guest.id,
      source: 'simulation',
      reason: 'guest_demo'
    });
    const light = await createAndApplyPresetCommand('light', 'on', {
      userId: guest.id,
      source: 'simulation',
      reason: 'guest_limited_access'
    });
    return { scenario, user: formatUser(guest), commands: [door, light] };
  }

  if (scenario === 'unknown_alert') {
    await logRecognition({
      userId: null,
      deviceId: DEVICE_PRESETS.door,
      recognized: false,
      confidence: 0.18,
      decision: 'deny'
    });
    await logAccess({
      userId: null,
      deviceId: DEVICE_PRESETS.door,
      action: 'deny',
      result: 'denied',
      reason: 'unknown_user_demo',
      confidence: 0.18
    });
    return {
      scenario,
      alert: 'Unknown denied, buzzer/dashboard alert should activate'
    };
  }

  const admin = await ensureUser('Admin Demo', 'owner');
  await logRecognition({
    userId: admin.id,
    deviceId: DEVICE_PRESETS.door,
    recognized: true,
    confidence: 0.94,
    decision: 'unlock'
  });
  await logAccess({
    userId: admin.id,
    deviceId: DEVICE_PRESETS.door,
    action: 'unlock',
    result: 'allowed',
    reason: 'owner_home_demo',
    confidence: 0.94
  });
  const commands = [
    await createAndApplyPresetCommand('door', 'unlock', {
      userId: admin.id,
      source: 'simulation',
      reason: 'owner_arrived'
    }),
    await createAndApplyPresetCommand('light', 'on', {
      userId: admin.id,
      source: 'simulation',
      reason: 'owner_arrived_low_light'
    }),
    await createAndApplyPresetCommand('fan', 'on', {
      userId: admin.id,
      source: 'simulation',
      reason: 'owner_arrived_hot_room'
    }),
    await createAndApplyPresetCommand('elevator', 'goto_floor', {
      userId: admin.id,
      source: 'simulation',
      reason: 'voice_elevator_demo',
      value: 2
    })
  ];

  return { scenario: 'admin_home', user: formatUser(admin), commands };
}

async function ensureUser(name, role) {
  let user = await get('SELECT * FROM users WHERE name = ? AND role = ?', [name, role]);
  if (user) return user;

  const id = createId('user');
  await run(
    `INSERT INTO users (id, name, role, status)
     VALUES (?, ?, ?, ?)`,
    [id, name, role, 'active']
  );
  return get('SELECT * FROM users WHERE id = ?', [id]);
}

async function createGuestAccess(userId) {
  const existing = await get('SELECT * FROM guest_access WHERE user_id = ?', [userId]);
  if (existing) return existing;

  const now = Date.now();
  await run(
    `INSERT INTO guest_access
     (id, user_id, starts_at, expires_at, allowed_devices, allowed_actions, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      createId('guest'),
      userId,
      new Date(now - 60 * 60 * 1000).toISOString(),
      new Date(now + 24 * 60 * 60 * 1000).toISOString(),
      JSON.stringify([DEVICE_PRESETS.door, DEVICE_PRESETS.light]),
      JSON.stringify(['unlock', 'on']),
      'Demo guest access'
    ]
  );
  return get('SELECT * FROM guest_access WHERE user_id = ?', [userId]);
}

async function logAccess({ userId, deviceId, action, result, reason, confidence }) {
  await run(
    `INSERT INTO access_logs (id, user_id, device_id, action, result, reason, confidence)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [createId('log'), userId, deviceId, action, result, reason, confidence]
  );
}

async function logRecognition({ userId, deviceId, recognized, confidence, decision }) {
  await run(
    `INSERT INTO recognition_events
     (id, user_id, device_id, recognized, confidence, decision, captured_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      createId('event'),
      userId,
      deviceId,
      recognized ? 1 : 0,
      confidence,
      decision,
      new Date().toISOString()
    ]
  );
}

async function requireDevice(deviceId) {
  if (!deviceId) {
    throw httpError(400, 'deviceId là bắt buộc.', 'INVALID_DEVICE_ID');
  }

  const device = await get('SELECT * FROM devices WHERE id = ?', [deviceId]);
  if (!device) {
    throw httpError(404, 'Không tìm thấy thiết bị.', 'DEVICE_NOT_FOUND');
  }

  return device;
}

module.exports = router;
