const express = require('express');
const { get, run } = require('../database');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const { createId } = require('../utils/ids');
const {
  formatLockCommand,
  formatRecognitionEvent
} = require('../utils/rowFormatters');
const {
  publishLockCommand,
  publishRecognitionDecision
} = require('../services/mqttService');
const { broadcast } = require('../services/webSocketService');

const router = express.Router();

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const {
      deviceId,
      recognized = false,
      userId = null,
      confidence = null,
      capturedAt = new Date().toISOString()
    } = req.body;

    if (!deviceId) {
      throw httpError(400, 'deviceId là bắt buộc.', 'INVALID_DEVICE_ID');
    }

    const device = await get('SELECT * FROM devices WHERE id = ?', [deviceId]);
    if (!device) {
      throw httpError(404, 'Không tìm thấy thiết bị.', 'DEVICE_NOT_FOUND');
    }

    const user = userId
      ? await get('SELECT * FROM users WHERE id = ?', [userId])
      : null;
    const accessDecision = await evaluateAccess({ recognized, user, deviceId });
    const isAllowedUser = accessDecision.allowed;
    const decision = isAllowedUser ? 'unlock' : 'deny';
    const result = isAllowedUser ? 'allowed' : 'denied';

    const eventId = createId('event');
    await run(
      `INSERT INTO recognition_events
       (id, user_id, device_id, recognized, confidence, decision, captured_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        eventId,
        user ? user.id : null,
        deviceId,
        recognized ? 1 : 0,
        confidence,
        decision,
        capturedAt
      ]
    );

    await run(
      `INSERT INTO access_logs
       (id, user_id, device_id, action, result, reason, confidence)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        createId('log'),
        user ? user.id : null,
        deviceId,
        decision,
        result,
        accessDecision.reason,
        confidence
      ]
    );

    let command = null;

    if (isAllowedUser) {
      const commandId = createId('cmd');
      await run(
        `INSERT INTO lock_commands (id, device_id, user_id, action, reason, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          commandId,
          deviceId,
          user.id,
          'unlock',
          'recognized_user',
          'queued'
        ]
      );

      command = await get('SELECT * FROM lock_commands WHERE id = ?', [
        commandId
      ]);

      await updateDoorState({
        deviceId,
        powerState: 'unlock',
        reason: accessDecision.reason,
        commandId
      });
    }

    const event = await get('SELECT * FROM recognition_events WHERE id = ?', [
      eventId
    ]);
    const formattedEvent = formatRecognitionEvent(event);
    const formattedCommand = formatLockCommand(command);

    publishRecognitionDecision(formattedEvent);
    if (formattedCommand) {
      publishLockCommand(formattedCommand);
    }

    broadcast('recognition.event', {
      event: formattedEvent,
      command: formattedCommand
    });

    res.status(201).json({
      success: true,
      decision,
      message: isAllowedUser ? 'Người dùng hợp lệ.' : 'Từ chối truy cập.',
      data: {
        event: formattedEvent,
        command: formattedCommand
      }
    });
  })
);

module.exports = router;

async function evaluateAccess({ recognized, user, deviceId }) {
  if (!recognized || !user) {
    return { allowed: false, reason: 'unknown_user' };
  }

  if (user.status !== 'active') {
    return { allowed: false, reason: 'inactive_or_blocked_user' };
  }

  if (['owner', 'admin', 'family', 'resident'].includes(user.role)) {
    return { allowed: true, reason: `recognized_${user.role}` };
  }

  if (user.role === 'guest') {
    const now = Date.now();
    const access = await get(
      `SELECT * FROM guest_access
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [user.id]
    );

    if (!access) {
      return { allowed: false, reason: 'guest_missing_schedule' };
    }

    const startsAt = access.starts_at ? Date.parse(access.starts_at) : null;
    const expiresAt = access.expires_at ? Date.parse(access.expires_at) : null;
    const allowedDevices = parseJson(access.allowed_devices, []);

    if (startsAt && now < startsAt) {
      return { allowed: false, reason: 'guest_not_started' };
    }

    if (expiresAt && now > expiresAt) {
      return { allowed: false, reason: 'guest_expired' };
    }

    if (allowedDevices.length && !allowedDevices.includes(deviceId)) {
      return { allowed: false, reason: 'guest_device_not_allowed' };
    }

    return { allowed: true, reason: 'guest_within_schedule' };
  }

  return { allowed: false, reason: 'role_not_allowed' };
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value || JSON.stringify(fallback));
  } catch (error) {
    return fallback;
  }
}

async function updateDoorState({ deviceId, powerState, reason, commandId }) {
  await run(
    `INSERT INTO device_states
     (device_id, power_state, mode, metadata, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(device_id) DO UPDATE SET
       power_state = excluded.power_state,
       mode = excluded.mode,
       metadata = excluded.metadata,
       updated_at = datetime('now')`,
    [
      deviceId,
      powerState,
      powerState === 'unlock' ? 'access_granted' : null,
      JSON.stringify({
        source: 'face_recognition',
        reason,
        commandId
      })
    ]
  );
}
