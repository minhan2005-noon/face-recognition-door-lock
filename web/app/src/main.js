import './styles.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const state = {
  devices: [],
  users: []
};

document.querySelector('#app').innerHTML = `
  <header class="topbar">
    <div>
      <p class="eyebrow">Face Recognition Door Lock</p>
      <h1>Dashboard quản lý khóa cửa</h1>
    </div>
    <div class="status-pill" id="apiStatus">Đang kiểm tra API</div>
  </header>

  <main class="layout">
    <section class="panel user-panel">
      <div class="panel-heading">
        <h2>Người dùng</h2>
        <button id="refreshUsersBtn" type="button">Tải lại</button>
      </div>

      <form id="createUserForm" class="form-grid">
        <label>
          Tên
          <input id="userNameInput" name="name" placeholder="Nguyen Van A" required />
        </label>
        <label>
          Vai trò
          <select id="userRoleInput" name="role">
            <option value="resident">resident</option>
            <option value="admin">admin</option>
            <option value="guest">guest</option>
          </select>
        </label>
        <button type="submit">Thêm user</button>
      </form>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tên</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
              <th>ID</th>
            </tr>
          </thead>
          <tbody id="usersTable"></tbody>
        </table>
      </div>
    </section>

    <section class="panel">
      <div class="panel-heading">
        <h2>Thiết bị</h2>
        <button id="refreshDevicesBtn" type="button">Tải lại</button>
      </div>
      <div id="devicesList" class="list"></div>
    </section>

    <section class="panel">
      <div class="panel-heading">
        <h2>Test nhận diện</h2>
      </div>

      <form id="recognitionForm" class="stack">
        <label>
          Thiết bị
          <select id="recognitionDeviceInput" required></select>
        </label>
        <label>
          User
          <select id="recognitionUserInput" required></select>
        </label>
        <label>
          Độ tin cậy
          <input id="confidenceInput" type="number" min="0" max="1" step="0.01" value="0.92" />
        </label>
        <label class="check-row">
          <input id="recognizedInput" type="checkbox" checked />
          Nhận diện thành công
        </label>
        <button type="submit">Gửi event</button>
      </form>

      <pre id="decisionBox" class="decision-box">Chưa có event.</pre>
    </section>

    <section class="panel logs-panel">
      <div class="panel-heading">
        <h2>Lịch sử ra vào</h2>
        <button id="refreshLogsBtn" type="button">Tải lại</button>
      </div>
      <div id="logsList" class="list"></div>
    </section>
  </main>

  <div id="toast" class="toast" hidden></div>
`;

const apiStatus = document.querySelector('#apiStatus');
const usersTable = document.querySelector('#usersTable');
const devicesList = document.querySelector('#devicesList');
const logsList = document.querySelector('#logsList');
const decisionBox = document.querySelector('#decisionBox');
const toast = document.querySelector('#toast');
const recognitionDeviceInput = document.querySelector('#recognitionDeviceInput');
const recognitionUserInput = document.querySelector('#recognitionUserInput');

document.querySelector('#createUserForm').addEventListener('submit', createUser);
document.querySelector('#recognitionForm').addEventListener('submit', sendRecognitionEvent);
document.querySelector('#refreshUsersBtn').addEventListener('click', loadUsers);
document.querySelector('#refreshDevicesBtn').addEventListener('click', loadDevices);
document.querySelector('#refreshLogsBtn').addEventListener('click', loadLogs);

boot();

async function boot() {
  await checkHealth();
  await Promise.all([loadUsers(), loadDevices(), loadLogs()]);
}

async function requestJson(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  const payload = await response.json();

  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || 'API request failed');
  }

  return payload;
}

async function checkHealth() {
  try {
    const payload = await requestJson('/health');
    apiStatus.textContent = `${payload.service}: ${payload.status}`;
    apiStatus.classList.add('ok');
    apiStatus.classList.remove('error');
  } catch (error) {
    apiStatus.textContent = 'API lỗi kết nối';
    apiStatus.classList.add('error');
    apiStatus.classList.remove('ok');
  }
}

async function loadUsers() {
  const payload = await requestJson('/users');
  state.users = payload.data;
  renderUsers();
  renderUserOptions();
}

async function loadDevices() {
  const payload = await requestJson('/devices');
  state.devices = payload.data;
  renderDevices();
  renderDeviceOptions();
}

async function loadLogs() {
  const payload = await requestJson('/access-logs');
  renderLogs(payload.data);
}

async function createUser(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const name = document.querySelector('#userNameInput').value.trim();
  const role = document.querySelector('#userRoleInput').value;

  if (!name) {
    showToast('Bạn cần nhập tên user.');
    return;
  }

  await requestJson('/users', {
    method: 'POST',
    body: JSON.stringify({ name, role })
  });

  form.reset();
  showToast('Đã thêm user.');
  await loadUsers();
}

async function sendRecognitionEvent(event) {
  event.preventDefault();

  const deviceId = recognitionDeviceInput.value;
  const userId = recognitionUserInput.value;
  const confidence = Number(document.querySelector('#confidenceInput').value);
  const recognized = document.querySelector('#recognizedInput').checked;

  if (!deviceId || !userId) {
    showToast('Cần có thiết bị và user để gửi event.');
    return;
  }

  const payload = await requestJson('/recognition-events', {
    method: 'POST',
    body: JSON.stringify({ deviceId, userId, confidence, recognized })
  });

  decisionBox.textContent = JSON.stringify(payload, null, 2);
  showToast(payload.message);
  await loadLogs();
}

function renderUsers() {
  if (state.users.length === 0) {
    usersTable.innerHTML = '<tr><td colspan="4">Chưa có user.</td></tr>';
    return;
  }

  usersTable.innerHTML = state.users
    .map(
      (user) => `
        <tr>
          <td><strong>${escapeHtml(user.name)}</strong></td>
          <td>${escapeHtml(user.role)}</td>
          <td>${escapeHtml(user.status)}</td>
          <td class="mono">${escapeHtml(user.id)}</td>
        </tr>
      `
    )
    .join('');
}

function renderDevices() {
  if (state.devices.length === 0) {
    devicesList.innerHTML = '<div class="empty">Chưa có thiết bị.</div>';
    return;
  }

  devicesList.innerHTML = state.devices
    .map(
      (device) => `
        <article class="list-item">
          <strong>${escapeHtml(device.name)}</strong>
          <span class="meta">ID: ${escapeHtml(device.id)}</span>
          <span class="meta">Loại: ${escapeHtml(device.type)} | Trạng thái: ${escapeHtml(device.status)}</span>
          <span class="meta">Pin: ${device.batteryLevel ?? 'N/A'} | Last seen: ${escapeHtml(device.lastSeenAt || 'N/A')}</span>
        </article>
      `
    )
    .join('');
}

function renderLogs(logs) {
  if (logs.length === 0) {
    logsList.innerHTML = '<div class="empty">Chưa có lịch sử.</div>';
    return;
  }

  logsList.innerHTML = logs
    .map(
      (log) => `
        <article class="list-item">
          <strong>${escapeHtml(log.action)} - ${escapeHtml(log.result)}</strong>
          <span class="meta">Device: ${escapeHtml(log.deviceId || 'N/A')}</span>
          <span class="meta">User: ${escapeHtml(log.userId || 'N/A')}</span>
          <span class="meta">Reason: ${escapeHtml(log.reason || 'N/A')} | Confidence: ${log.confidence ?? 'N/A'}</span>
          <span class="meta">${escapeHtml(log.createdAt)}</span>
        </article>
      `
    )
    .join('');
}

function renderDeviceOptions() {
  recognitionDeviceInput.innerHTML = state.devices
    .map((device) => `<option value="${escapeHtml(device.id)}">${escapeHtml(device.name)}</option>`)
    .join('');
}

function renderUserOptions() {
  recognitionUserInput.innerHTML = state.users
    .filter((user) => user.status === 'active')
    .map((user) => `<option value="${escapeHtml(user.id)}">${escapeHtml(user.name)}</option>`)
    .join('');
}

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.hidden = true;
  }, 2600);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
