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
    const isAllowedUser = Boolean(
      recognized && user && user.status === 'active'
    );
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
        isAllowedUser ? 'recognized_user' : 'unknown_or_inactive_user',
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
