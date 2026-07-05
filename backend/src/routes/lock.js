const express = require('express');
const { get, run } = require('../database');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const { createId } = require('../utils/ids');
const { formatAccessLog, formatLockCommand } = require('../utils/rowFormatters');

const router = express.Router();

router.post(
  '/unlock',
  asyncHandler(async (req, res) => {
    const result = await createLockCommand({
      action: 'unlock',
      deviceId: req.body.deviceId,
      reason: req.body.reason || 'manual',
      userId: req.body.userId || null
    });

    res.status(201).json({
      success: true,
      message: 'Đã tạo lệnh mở khóa.',
      data: result
    });
  })
);

router.post(
  '/lock',
  asyncHandler(async (req, res) => {
    const result = await createLockCommand({
      action: 'lock',
      deviceId: req.body.deviceId,
      reason: req.body.reason || 'manual',
      userId: req.body.userId || null
    });

    res.status(201).json({
      success: true,
      message: 'Đã tạo lệnh khóa cửa.',
      data: result
    });
  })
);

async function createLockCommand({ action, deviceId, reason, userId }) {
  if (!deviceId) {
    throw httpError(400, 'deviceId là bắt buộc.', 'INVALID_DEVICE_ID');
  }

  const device = await get('SELECT * FROM devices WHERE id = ?', [deviceId]);
  if (!device) {
    throw httpError(404, 'Không tìm thấy thiết bị.', 'DEVICE_NOT_FOUND');
  }

  if (userId) {
    const user = await get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      throw httpError(404, 'Không tìm thấy người dùng.', 'USER_NOT_FOUND');
    }
  }

  const commandId = createId('cmd');
  const logId = createId('log');

  await run(
    `INSERT INTO lock_commands (id, device_id, user_id, action, reason, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [commandId, deviceId, userId, action, reason, 'queued']
  );

  await run(
    `INSERT INTO access_logs (id, user_id, device_id, action, result, reason)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [logId, userId, deviceId, action, 'queued', reason]
  );

  const command = await get('SELECT * FROM lock_commands WHERE id = ?', [
    commandId
  ]);
  const log = await get('SELECT * FROM access_logs WHERE id = ?', [logId]);

  return {
    command: formatLockCommand(command),
    accessLog: formatAccessLog(log)
  };
}

module.exports = router;
