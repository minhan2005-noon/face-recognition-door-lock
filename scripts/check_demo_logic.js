const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = 3325;
const API_BASE = `http://localhost:${PORT}/api`;
const API_KEY = 'test-key';
const DB_PATH = '/tmp/door-lock-logic-check.sqlite';

async function main() {
  fs.rmSync(DB_PATH, { force: true });

  const server = spawn(process.execPath, ['backend/src/server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(PORT),
      DATABASE_PATH: DB_PATH,
      API_KEY,
      MQTT_URL: ''
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  try {
    await waitForHealth();
    const summary = [];

    const initialTemps = await api('/smart-home/temperatures');
    assert(initialTemps.data.indoor?.value === 28, 'Seed nhiệt độ trong phòng phải có 28°C');
    assert(initialTemps.data.outdoor?.value === 31, 'Seed nhiệt độ ngoài phòng phải có 31°C');
    summary.push('Nhiệt độ seed OK');

    const users = await api('/users');
    const owner = users.data.find((user) => ['owner', 'admin', 'family', 'resident'].includes(user.role));
    const guestNoSchedule = users.data.find((user) => user.role === 'guest');
    assert(owner, 'Phải có user chủ nhà/người thân để test nhận diện');
    assert(guestNoSchedule, 'Phải có khách chưa cấp lịch để test quyền khách');

    await api('/recognition-events', {
      method: 'POST',
      body: {
        deviceId: 'door_lock_001',
        userId: guestNoSchedule.id,
        recognized: true,
        confidence: 0.88
      }
    });
    const guestDenied = await api('/smart-home/face-status');
    assert(guestDenied.data.access === 'denied', 'Khách chưa cấp lịch phải bị từ chối');
    assert(guestDenied.data.personType === 'guest', 'Khách bị từ chối vẫn phải hiện là guest, không phải người lạ');
    summary.push('Khách chưa cấp lịch bị từ chối OK');

    await api('/recognition-events', {
      method: 'POST',
      body: {
        deviceId: 'door_lock_001',
        userId: owner.id,
        recognized: true,
        confidence: 0.94
      }
    });
    const ownerFace = await api('/smart-home/face-status');
    assert(ownerFace.data.access === 'allowed', 'Chủ nhà/người thân phải được phép mở cửa');
    assert(ownerFace.data.isFamily === true, 'Chủ nhà/người thân phải được đánh dấu là family');
    const afterOwnerOverview = await api('/smart-home/overview');
    const doorAfterOwner = afterOwnerOverview.data.states.find((state) => state.deviceId === 'door_lock_001');
    assert(doorAfterOwner?.powerState === 'unlock', 'Nhận diện chủ nhà mở cửa thì trạng thái cửa phải là unlock');
    summary.push('Nhận diện người thân OK');

    await api('/recognition-events', {
      method: 'POST',
      body: {
        deviceId: 'door_lock_001',
        recognized: false,
        confidence: 0.19
      }
    });
    const strangerFace = await api('/smart-home/face-status');
    assert(strangerFace.data.access === 'denied', 'Người lạ phải bị từ chối');
    assert(strangerFace.data.personType === 'stranger', 'Người lạ phải hiện đúng loại stranger');
    summary.push('Nhận diện người lạ OK');

    await api('/smart-home/temperatures', {
      method: 'POST',
      body: { indoor: 32.5, outdoor: 35.1 }
    });
    const afterHot = await api('/smart-home/overview');
    const fanState = afterHot.data.states.find((state) => state.deviceId === 'socket_fan_001');
    assert(fanState?.powerState === 'on', 'Nhiệt độ trong phòng cao phải bật quạt');
    assert(afterHot.data.temperatures.difference === -2.6, 'Chênh lệch nhiệt độ phải tính indoor - outdoor');
    summary.push('Nhiệt độ cao bật quạt OK');

    await api('/smart-home/devices/socket_fan_001/command', {
      method: 'POST',
      body: { action: 'off', channel: 'fan', source: 'test', reason: 'reset_fan' }
    });
    await api('/smart-home/temperatures', {
      method: 'POST',
      body: { outdoor: 39.2 }
    });
    const afterOutdoorHot = await api('/smart-home/overview');
    const fanAfterOutdoorHot = afterOutdoorHot.data.states.find((state) => state.deviceId === 'socket_fan_001');
    assert(fanAfterOutdoorHot?.powerState === 'off', 'Chỉ nhiệt độ ngoài phòng nóng thì không tự bật quạt trong phòng');
    summary.push('Nhiệt độ ngoài phòng không bật nhầm quạt OK');

    await api('/smart-home/simulate', {
      method: 'POST',
      body: { scenario: 'guest_visit' }
    });
    const guestAllowed = await api('/smart-home/face-status');
    assert(guestAllowed.data.personType === 'guest', 'Mô phỏng khách phải cập nhật faceStatus là guest');
    assert(guestAllowed.data.access === 'allowed', 'Mô phỏng khách hợp lệ phải được cho vào');
    summary.push('Mô phỏng khách hợp lệ OK');

    await api('/recognition-events', {
      method: 'POST',
      body: {
        deviceId: 'door_lock_001',
        userId: owner.id,
        recognized: true,
        confidence: 0.95
      }
    });
    await api('/smart-home/simulate', {
      method: 'POST',
      body: { scenario: 'unknown_alert' }
    });
    const afterUnknownSim = await api('/smart-home/face-status');
    assert(afterUnknownSim.data.personType === 'stranger', 'Mô phỏng người lạ phải cập nhật faceStatus thành stranger');
    assert(afterUnknownSim.data.access === 'denied', 'Mô phỏng người lạ phải cập nhật faceStatus bị từ chối');
    summary.push('Mô phỏng người lạ cập nhật iOS faceStatus OK');

    console.log(JSON.stringify({ ok: true, summary }, null, 2));
  } finally {
    server.kill('SIGTERM');
  }
}

async function waitForHealth() {
  const started = Date.now();
  while (Date.now() - started < 6000) {
    try {
      const health = await fetch(`${API_BASE}/health`);
      if (health.ok) return;
    } catch (error) {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error('Server test không khởi động kịp.');
}

async function api(pathname, options = {}) {
  const response = await fetch(`${API_BASE}${pathname}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    throw new Error(`${options.method || 'GET'} ${pathname} failed: ${JSON.stringify(payload)}`);
  }
  return payload;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
