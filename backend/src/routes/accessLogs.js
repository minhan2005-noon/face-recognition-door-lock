const express = require('express');
const { all, run } = require('../database');
const asyncHandler = require('../utils/asyncHandler');
const { formatAccessLog } = require('../utils/rowFormatters');

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filters = [];
    const params = [];

    if (req.query.userId) {
      filters.push('user_id = ?');
      params.push(req.query.userId);
    }

    if (req.query.deviceId) {
      filters.push('device_id = ?');
      params.push(req.query.deviceId);
    }

    if (req.query.from) {
      filters.push('created_at >= ?');
      params.push(req.query.from);
    }

    if (req.query.to) {
      filters.push('created_at <= ?');
      params.push(req.query.to);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const logs = await all(
      `SELECT * FROM access_logs
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT 200`,
      params
    );

    res.json({ success: true, data: logs.map(formatAccessLog) });
  })
);

router.delete(
  '/',
  asyncHandler(async (req, res) => {
    const result = await run('DELETE FROM access_logs');

    res.json({
      success: true,
      message: 'Đã xóa lịch sử ra vào.',
      data: {
        deleted: result.changes
      }
    });
  })
);

module.exports = router;
