function toBoolean(value) {
  return Boolean(value);
}

function formatUser(row) {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function formatDevice(row) {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    type: row.type,
    status: row.status,
    batteryLevel: row.battery_level,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function formatAccessLog(row) {
  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    deviceId: row.device_id,
    action: row.action,
    result: row.result,
    reason: row.reason,
    confidence: row.confidence,
    createdAt: row.created_at
  };
}

function formatRecognitionEvent(row) {
  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    deviceId: row.device_id,
    recognized: toBoolean(row.recognized),
    confidence: row.confidence,
    decision: row.decision,
    capturedAt: row.captured_at,
    createdAt: row.created_at
  };
}

function formatFaceData(row) {
  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    embeddingId: row.embedding_id,
    modelVersion: row.model_version,
    metadata: JSON.parse(row.metadata || '{}'),
    createdAt: row.created_at
  };
}

function formatLockCommand(row) {
  if (!row) return null;

  return {
    id: row.id,
    deviceId: row.device_id,
    userId: row.user_id,
    action: row.action,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at
  };
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value || JSON.stringify(fallback));
  } catch (error) {
    return fallback;
  }
}

function formatGuestAccess(row) {
  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
    allowedDevices: parseJson(row.allowed_devices, []),
    allowedActions: parseJson(row.allowed_actions, []),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function formatDeviceState(row) {
  if (!row) return null;

  return {
    deviceId: row.device_id,
    powerState: row.power_state,
    mode: row.mode,
    currentValue: row.current_value,
    targetValue: row.target_value,
    metadata: parseJson(row.metadata, {}),
    updatedAt: row.updated_at
  };
}

function formatDeviceCommand(row) {
  if (!row) return null;

  return {
    id: row.id,
    deviceId: row.device_id,
    userId: row.user_id,
    action: row.action,
    channel: row.channel,
    value: row.value,
    source: row.source,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at
  };
}

function formatSensorReading(row) {
  if (!row) return null;

  return {
    id: row.id,
    deviceId: row.device_id,
    sensorType: row.sensor_type,
    value: row.value,
    unit: row.unit,
    metadata: parseJson(row.metadata, {}),
    capturedAt: row.captured_at,
    createdAt: row.created_at
  };
}

function formatAutomationRule(row) {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    triggerType: row.trigger_type,
    condition: parseJson(row.condition_json, {}),
    actions: parseJson(row.actions_json, []),
    enabled: Boolean(row.enabled),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

module.exports = {
  formatAccessLog,
  formatAutomationRule,
  formatDeviceCommand,
  formatDevice,
  formatDeviceState,
  formatFaceData,
  formatGuestAccess,
  formatLockCommand,
  formatRecognitionEvent,
  formatSensorReading,
  formatUser
};
