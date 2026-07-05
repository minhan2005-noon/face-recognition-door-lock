const express = require('express');
const { get, run, all } = require('../database');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const { createId } = require('../utils/ids');
const { formatFaceData, formatUser } = require('../utils/rowFormatters');

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const users = await all(
      `SELECT * FROM users
       ORDER BY created_at DESC`
    );

    res.json({ success: true, data: users.map(formatUser) });
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, role = 'resident', status = 'active' } = req.body;

    if (!name || typeof name !== 'string') {
      throw httpError(400, 'Tên người dùng là bắt buộc.', 'INVALID_USER_NAME');
    }

    const id = createId('user');
    await run(
      `INSERT INTO users (id, name, role, status)
       VALUES (?, ?, ?, ?)`,
      [id, name.trim(), role, status]
    );

    const user = await get('SELECT * FROM users WHERE id = ?', [id]);

    res.status(201).json({ success: true, data: formatUser(user) });
  })
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const currentUser = await get('SELECT * FROM users WHERE id = ?', [
      req.params.id
    ]);

    if (!currentUser) {
      throw httpError(404, 'Không tìm thấy người dùng.', 'USER_NOT_FOUND');
    }

    const name = req.body.name ?? currentUser.name;
    const role = req.body.role ?? currentUser.role;
    const status = req.body.status ?? currentUser.status;

    await run(
      `UPDATE users
       SET name = ?, role = ?, status = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [name, role, status, req.params.id]
    );

    const user = await get('SELECT * FROM users WHERE id = ?', [req.params.id]);

    res.json({ success: true, data: formatUser(user) });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const result = await run(
      `UPDATE users
       SET status = 'inactive', updated_at = datetime('now')
       WHERE id = ?`,
      [req.params.id]
    );

    if (result.changes === 0) {
      throw httpError(404, 'Không tìm thấy người dùng.', 'USER_NOT_FOUND');
    }

    res.json({
      success: true,
      message: 'Đã vô hiệu hóa người dùng.'
    });
  })
);

router.post(
  '/:id/face-data',
  asyncHandler(async (req, res) => {
    const user = await get('SELECT * FROM users WHERE id = ?', [req.params.id]);

    if (!user) {
      throw httpError(404, 'Không tìm thấy người dùng.', 'USER_NOT_FOUND');
    }

    const { embeddingId, modelVersion = 'v1', metadata = {} } = req.body;

    if (!embeddingId) {
      throw httpError(400, 'embeddingId là bắt buộc.', 'INVALID_EMBEDDING_ID');
    }

    const id = createId('face');
    await run(
      `INSERT INTO face_data (id, user_id, embedding_id, model_version, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      [id, req.params.id, embeddingId, modelVersion, JSON.stringify(metadata)]
    );

    const faceData = await get('SELECT * FROM face_data WHERE id = ?', [id]);

    res.status(201).json({ success: true, data: formatFaceData(faceData) });
  })
);

module.exports = router;
