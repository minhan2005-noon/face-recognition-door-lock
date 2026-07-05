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

module.exports = {
  formatAccessLog,
  formatDevice,
  formatFaceData,
  formatLockCommand,
  formatRecognitionEvent,
  formatUser
};
