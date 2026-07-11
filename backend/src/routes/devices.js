const express = require('express');
const { all, get, run } = require('../database');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const { formatDevice } = require('../utils/rowFormatters');

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const devices = await all(
      `SELECT * FROM devices
       ORDER BY created_at DESC`
    );

    res.json({ success: true, data: devices.map(formatDevice) });
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const {
      id,
      name,
      type = 'door_lock',
      status = 'offline',
      batteryLevel = null,
      lastSeenAt = null
    } = req.body;

    if (!id || !name) {
      throw httpError(400, 'id và name của thiết bị là bắt buộc.', 'INVALID_DEVICE');
    }

    await run(
      `INSERT INTO devices (id, name, type, status, battery_level, last_seen_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name, type, status, batteryLevel, lastSeenAt]
    );

    const device = await get('SELECT * FROM devices WHERE id = ?', [id]);

    res.status(201).json({ success: true, data: formatDevice(device) });
  })
);

router.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const device = await get('SELECT * FROM devices WHERE id = ?', [
      req.params.id
    ]);

    if (!device) {
      throw httpError(404, 'Không tìm thấy thiết bị.', 'DEVICE_NOT_FOUND');
    }

    const status = req.body.status ?? device.status;
    const batteryLevel = req.body.batteryLevel ?? device.battery_level;
    const lastSeenAt = req.body.lastSeenAt ?? new Date().toISOString();

    await run(
      `UPDATE devices
       SET status = ?, battery_level = ?, last_seen_at = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [status, batteryLevel, lastSeenAt, req.params.id]
    );

    const updatedDevice = await get('SELECT * FROM devices WHERE id = ?', [
      req.params.id
    ]);

    res.json({ success: true, data: formatDevice(updatedDevice) });
  })
);

module.exports = router;
