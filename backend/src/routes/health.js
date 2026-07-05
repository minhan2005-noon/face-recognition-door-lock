const express = require('express');
const { databasePath } = require('../database');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    service: 'backend-api',
    database: databasePath
  });
});

module.exports = router;
