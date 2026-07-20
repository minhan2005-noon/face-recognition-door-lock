const { run } = require('../database');
const { broadcast } = require('./webSocketService');

let mqtt;
let client = null;
let connected = false;

const mqttUrl = process.env.MQTT_URL;
const commandTopicPrefix =
  process.env.MQTT_COMMAND_TOPIC_PREFIX || 'doorlock/device';
const statusTopic = process.env.MQTT_STATUS_TOPIC || 'doorlock/device/+/status';

function isMqttEnabled() {
  return Boolean(mqttUrl);
}

function getMqttStatus() {
  return {
    enabled: isMqttEnabled(),
    connected,
    brokerUrl: mqttUrl || null,
    statusTopic,
    commandTopicPrefix
  };
}

function connectMqtt() {
  if (!isMqttEnabled()) {
    console.log('MQTT is disabled. Set MQTT_URL to enable device messaging.');
    return null;
  }

  mqtt = require('mqtt');
  const options = {
    clientId: process.env.MQTT_CLIENT_ID || `door-lock-api-${process.pid}`,
    clean: true,
    reconnectPeriod: Number(process.env.MQTT_RECONNECT_MS || 5000)
  };

  if (process.env.MQTT_USERNAME) {
    options.username = process.env.MQTT_USERNAME;
  }

  if (process.env.MQTT_PASSWORD) {
    options.password = process.env.MQTT_PASSWORD;
  }

  client = mqtt.connect(mqttUrl, options);

  client.on('connect', () => {
    connected = true;
    console.log(`MQTT connected: ${mqttUrl}`);
    client.subscribe(statusTopic, (error) => {
      if (error) {
        console.error('MQTT subscribe failed:', error.message);
      }
    });
  });

  client.on('reconnect', () => {
    connected = false;
  });

  client.on('close', () => {
    connected = false;
  });

  client.on('error', (error) => {
    connected = false;
    console.error('MQTT error:', error.message);
  });

  client.on('message', (topic, payload) => {
    handleDeviceMessage(topic, payload).catch((error) => {
      console.error('MQTT message handling failed:', error.message);
    });
  });

  return client;
}

async function handleDeviceMessage(topic, payload) {
  const match = topic.match(/^doorlock\/device\/([^/]+)\/status$/);
  if (!match) {
    return;
  }

  const deviceId = match[1];
  const message = parseJsonPayload(payload);
  const status = message.status || 'online';
  const batteryLevel = message.batteryLevel ?? null;
  const lastSeenAt = message.lastSeenAt || new Date().toISOString();

  await run(
    `UPDATE devices
     SET status = ?, battery_level = ?, last_seen_at = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [status, batteryLevel, lastSeenAt, deviceId]
  );

  broadcast('device.status', {
    deviceId,
    status,
    batteryLevel,
    lastSeenAt
  });
}

function parseJsonPayload(payload) {
  try {
    return JSON.parse(payload.toString());
  } catch (error) {
    return {};
  }
}

async function publishLockCommand(command) {
  return publishToDevice(command.deviceId, 'command', {
    commandId: command.id,
    action: command.action,
    reason: command.reason,
    userId: command.userId,
    createdAt: command.createdAt
  });
}

async function publishDeviceCommand(command) {
  return publishToDevice(command.deviceId, 'command', {
    commandId: command.id,
    action: command.action,
    channel: command.channel,
    value: command.value,
    source: command.source,
    reason: command.reason,
    userId: command.userId,
    createdAt: command.createdAt
  });
}

async function publishRecognitionDecision(event) {
  return publishToDevice(event.deviceId, 'decision', {
    eventId: event.id,
    decision: event.decision,
    userId: event.userId,
    confidence: event.confidence,
    capturedAt: event.capturedAt
  });
}

function publishToDevice(deviceId, topicName, payload) {
  if (!client || !connected) {
    return Promise.resolve(false);
  }

  const topic = `${commandTopicPrefix}/${deviceId}/${topicName}`;

  return new Promise((resolve) => {
    client.publish(topic, JSON.stringify(payload), { qos: 1 }, (error) => {
      if (error) {
        console.error('MQTT publish failed:', error.message);
        resolve(false);
        return;
      }

      resolve(true);
    });
  });
}

module.exports = {
  connectMqtt,
  getMqttStatus,
  publishDeviceCommand,
  publishLockCommand,
  publishRecognitionDecision
};
