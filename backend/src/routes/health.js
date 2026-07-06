const express = require('express');
const { databasePath } = require('../database');
const { getMqttStatus } = require('../services/mqttService');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    service: 'backend-api',
    database: databasePath,
    mqtt: getMqttStatus()
  });
});

module.exports = router;
