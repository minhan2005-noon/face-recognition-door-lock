import './styles.css';

const STORAGE_KEYS = {
  apiBase: 'doorLockDashboard.apiBase',
  apiKey: 'doorLockDashboard.apiKey'
};

const DEFAULT_API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const ENDPOINTS = {
  health: { method: 'GET', path: '/health', label: 'Backend status' },
  devices: { method: 'GET', path: '/devices', label: 'Device status' },
  updateDevice: { method: 'PATCH', path: '/devices/:id/status', label: 'Update device status' },
  users: { method: 'GET', path: '/users', label: 'Users' },
  createUser: { method: 'POST', path: '/users', label: 'Create user' },
  disableUser: { method: 'DELETE', path: '/users/:id', label: 'Disable user' },
  logs: { method: 'GET', path: '/access-logs', label: 'Latest/history' },
  commands: { method: 'GET', path: '/lock/commands', label: 'Command history' },
  lock: { method: 'POST', path: '/lock/lock', label: 'Send lock command' },
  unlock: { method: 'POST', path: '/lock/unlock', label: 'Send unlock command' },
  recognition: { method: 'POST', path: '/recognition-events', label: 'Send recognition event' }
};

const state = {
  apiBase: localStorage.getItem(STORAGE_KEYS.apiBase) || DEFAULT_API_BASE,
  apiKey: localStorage.getItem(STORAGE_KEYS.apiKey) || '',
  health: null,
  devices: [],
  users: [],
  logs: [],
  commands: [],
  events: [],
  selectedDeviceId: 'door_lock_001',
  loading: false,
  lastRequest: null,
  error: null,
  socket: null,
  socketState: 'idle'
};

document.querySelector('#app').innerHTML = `
  <header class="app-header">
    <div class="brand-block">
      <p class="eyebrow">Khóa cửa nhận diện khuôn mặt</p>
      <h1>Bảng điều khiển vận hành</h1>
    </div>
    <div class="runtime-strip">
      <div class="status-pill" id="apiStatus">API chưa kiểm tra</div>
      <div class="status-pill" id="mqttStatus">MQTT chưa kiểm tra</div>
      <div class="status-pill" id="wsStatus">WebSocket chưa kết nối</div>
    </div>
  </header>

  <main class="dashboard-shell">
    <section class="toolbar" aria-label="Cấu hình API">
      <div class="toolbar-title">
        <span>Backend connection</span>
        <strong id="lastRequestBox">Chưa gọi API</strong>
      </div>
      <div class="toolbar-fields">
        <label>
          Backend API
          <input id="apiBaseInput" spellcheck="false" />
        </label>
        <label>
          API key
          <input id="apiKeyInput" type="password" spellcheck="false" placeholder="Nhập API_KEY nếu backend bật bảo mật" />
        </label>
      </div>
      <div class="toolbar-actions">
        <button id="saveConfigBtn" type="button">Lưu cấu hình</button>
        <button id="refreshAllBtn" type="button" class="secondary">Tải lại</button>
      </div>
    </section>

    <section class="metrics-grid" aria-label="Tổng quan">
      <article class="metric">
        <span class="metric-label">Thiết bị online</span>
        <strong id="onlineMetric">0/0</strong>
        <span id="deviceMetricMeta" class="metric-meta">Chưa có dữ liệu</span>
      </article>
      <article class="metric">
        <span class="metric-label">Latest access</span>
        <strong id="latestMetric">N/A</strong>
        <span id="latestMetricMeta" class="metric-meta">Chưa có log</span>
      </article>
      <article class="metric">
        <span class="metric-label">Queued commands</span>
        <strong id="queuedMetric">0</strong>
        <span id="queuedMetricMeta" class="metric-meta">Lệnh đang chờ thiết bị</span>
      </article>
      <article class="metric">
        <span class="metric-label">Alerts</span>
        <strong id="alertMetric">0</strong>
        <span id="alertMetricMeta" class="metric-meta">Tự tính từ API hiện có</span>
      </article>
    </section>

    <section class="content-grid">
      <section class="panel device-panel">
        <div class="panel-heading">
          <div>
            <p class="section-kicker">Control</p>
            <h2>Thiết bị và lệnh khóa</h2>
          </div>
          <button id="refreshDevicesBtn" type="button" class="secondary">Refresh</button>
        </div>
        <div id="deviceControlList" class="device-grid"></div>
      </section>

      <section class="panel realtime-panel">
        <div class="panel-heading">
          <div>
            <p class="section-kicker">Realtime</p>
            <h2>Sự kiện WebSocket</h2>
          </div>
          <button id="connectWsBtn" type="button" class="secondary">Kết nối lại</button>
        </div>
        <div id="eventStream" class="event-stream"></div>
      </section>

      <section class="panel history-panel">
        <div class="panel-heading">
          <div>
            <p class="section-kicker">Latest / History</p>
            <h2>Lịch sử ra vào</h2>
          </div>
          <button id="refreshLogsBtn" type="button" class="secondary">Refresh</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Action</th>
                <th>Result</th>
                <th>Device</th>
                <th>User</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody id="logsTable"></tbody>
          </table>
        </div>
      </section>

      <section class="panel alerts-panel">
        <div class="panel-heading">
          <div>
            <p class="section-kicker">Alerts</p>
            <h2>Cảnh báo vận hành</h2>
          </div>
        </div>
        <div id="alertsList" class="stack-list"></div>
      </section>

      <section class="panel users-panel">
        <div class="panel-heading">
          <div>
            <p class="section-kicker">Users</p>
            <h2>Người được phép</h2>
          </div>
          <button id="refreshUsersBtn" type="button" class="secondary">Refresh</button>
        </div>
        <form id="createUserForm" class="inline-form">
          <input id="userNameInput" placeholder="Tên người dùng" required />
          <select id="userRoleInput">
            <option value="resident">resident</option>
            <option value="admin">admin</option>
            <option value="guest">guest</option>
          </select>
          <button type="submit">Thêm</button>
        </form>
        <div id="usersList" class="stack-list compact-list"></div>
      </section>

      <section class="panel reports-panel">
        <div class="panel-heading">
          <div>
            <p class="section-kicker">Reports</p>
            <h2>Báo cáo nhanh</h2>
          </div>
        </div>
        <div id="reportsList" class="report-grid"></div>
      </section>

      <section class="panel ai-panel">
        <div class="panel-heading">
          <div>
            <p class="section-kicker">AI Test</p>
            <h2>Gửi recognition event mẫu</h2>
          </div>
        </div>
        <form id="recognitionForm" class="form-stack">
          <label>
            Thiết bị
            <select id="recognitionDeviceInput" required></select>
          </label>
          <label>
            User
            <select id="recognitionUserInput"></select>
          </label>
          <label>
            Confidence
            <input id="confidenceInput" type="number" min="0" max="1" step="0.01" value="0.92" />
          </label>
          <label class="check-row">
            <input id="recognizedInput" type="checkbox" checked />
            Nhận diện thành công
          </label>
          <button type="submit">Gửi event</button>
        </form>
        <pre id="decisionBox" class="code-box">Chưa có event.</pre>
      </section>

      <section class="panel api-panel">
        <div class="panel-heading">
          <div>
            <p class="section-kicker">API Contract</p>
            <h2>Endpoint dashboard đang gọi</h2>
          </div>
        </div>
        <div class="endpoint-grid" id="endpointGrid"></div>
      </section>
    </section>
  </main>

  <div id="toast" class="toast" hidden></div>
`;

const elements = {
  apiBaseInput: document.querySelector('#apiBaseInput'),
  apiKeyInput: document.querySelector('#apiKeyInput'),
  apiStatus: document.querySelector('#apiStatus'),
  mqttStatus: document.querySelector('#mqttStatus'),
  wsStatus: document.querySelector('#wsStatus'),
  onlineMetric: document.querySelector('#onlineMetric'),
  deviceMetricMeta: document.querySelector('#deviceMetricMeta'),
  latestMetric: document.querySelector('#latestMetric'),
  latestMetricMeta: document.querySelector('#latestMetricMeta'),
  queuedMetric: document.querySelector('#queuedMetric'),
  queuedMetricMeta: document.querySelector('#queuedMetricMeta'),
  alertMetric: document.querySelector('#alertMetric'),
  alertMetricMeta: document.querySelector('#alertMetricMeta'),
  deviceControlList: document.querySelector('#deviceControlList'),
  logsTable: document.querySelector('#logsTable'),
  alertsList: document.querySelector('#alertsList'),
  reportsList: document.querySelector('#reportsList'),
  usersList: document.querySelector('#usersList'),
  eventStream: document.querySelector('#eventStream'),
  endpointGrid: document.querySelector('#endpointGrid'),
  lastRequestBox: document.querySelector('#lastRequestBox'),
  toast: document.querySelector('#toast'),
  recognitionDeviceInput: document.querySelector('#recognitionDeviceInput'),
  recognitionUserInput: document.querySelector('#recognitionUserInput'),
  decisionBox: document.querySelector('#decisionBox')
};

elements.apiBaseInput.value = state.apiBase;
elements.apiKeyInput.value = state.apiKey;

document.querySelector('#saveConfigBtn').addEventListener('click', saveConfig);
document.querySelector('#refreshAllBtn').addEventListener('click', refreshAll);
document.querySelector('#refreshDevicesBtn').addEventListener('click', loadDevices);
document.querySelector('#refreshLogsBtn').addEventListener('click', loadLogsAndCommands);
document.querySelector('#refreshUsersBtn').addEventListener('click', loadUsers);
document.querySelector('#connectWsBtn').addEventListener('click', connectWebSocket);
document.querySelector('#createUserForm').addEventListener('submit', createUser);
document.querySelector('#recognitionForm').addEventListener('submit', sendRecognitionEvent);
elements.deviceControlList.addEventListener('click', handleDeviceAction);
elements.usersList.addEventListener('click', handleUserAction);

renderEndpointGrid();
refreshAll();

async function refreshAll() {
  setLoading(true);
  state.error = null;

  try {
    await loadHealth();
    await Promise.all([loadDevices(), loadUsers(), loadLogsAndCommands()]);
    connectWebSocket();
    showToast('Đã tải dữ liệu dashboard.');
  } catch (error) {
    state.error = error.message;
    addLocalEvent('error', error.message);
    showToast(error.message);
  } finally {
    setLoading(false);
    renderAll();
  }
}

async function loadHealth() {
  state.health = await requestApi(ENDPOINTS.health);
  renderRuntimeStatus();
}

async function loadDevices() {
  const payload = await requestApi(ENDPOINTS.devices);
  state.devices = payload.data || [];
  if (!state.devices.some((device) => device.id === state.selectedDeviceId)) {
    state.selectedDeviceId = state.devices[0]?.id || '';
  }
  renderAll();
}

async function loadUsers() {
  const payload = await requestApi(ENDPOINTS.users);
  state.users = payload.data || [];
  renderAll();
}

async function loadLogsAndCommands() {
  const [logsPayload, commandsPayload] = await Promise.all([
    requestApi(ENDPOINTS.logs),
    requestApi(ENDPOINTS.commands)
  ]);

  state.logs = logsPayload.data || [];
  state.commands = commandsPayload.data || [];
  renderAll();
}

async function requestApi(endpoint, options = {}) {
  const path = applyPathParams(endpoint.path, options.params);
  const query = options.query ? `?${new URLSearchParams(options.query)}` : '';
  const url = `${getApiBase()}${path}${query}`;
  const method = options.method || endpoint.method;

  state.lastRequest = {
    method,
    path: `/api${path}${query}`,
    label: endpoint.label,
    at: new Date().toLocaleTimeString('vi-VN')
  };
  renderLastRequest();

  const headers = {
    'Content-Type': 'application/json'
  };

  if (state.apiKey) {
    headers['X-API-Key'] = state.apiKey;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    const message = payload.message || `${method} ${path} failed with ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

function saveConfig() {
  const apiBase = normalizeApiBase(elements.apiBaseInput.value || DEFAULT_API_BASE);
  const apiKey = elements.apiKeyInput.value.trim();

  state.apiBase = apiBase;
  state.apiKey = apiKey;
  localStorage.setItem(STORAGE_KEYS.apiBase, apiBase);
  localStorage.setItem(STORAGE_KEYS.apiKey, apiKey);

  if (state.socket) {
    state.socket.close();
  }

  showToast('Đã lưu cấu hình API.');
  refreshAll();
}

async function handleDeviceAction(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const deviceId = button.dataset.deviceId;
  const action = button.dataset.action;

  try {
    if (action === 'unlock' || action === 'lock') {
      const endpoint = action === 'unlock' ? ENDPOINTS.unlock : ENDPOINTS.lock;
      const payload = await requestApi(endpoint, {
        body: {
          deviceId,
          reason: `dashboard_${action}`
        }
      });
      addLocalEvent('command.created', payload.data?.command || payload.data);
      showToast(action === 'unlock' ? 'Đã gửi lệnh mở khóa.' : 'Đã gửi lệnh khóa.');
      await loadLogsAndCommands();
      return;
    }

    if (action === 'online' || action === 'offline') {
      await requestApi(ENDPOINTS.updateDevice, {
        params: { id: deviceId },
        body: {
          status: action,
          lastSeenAt: new Date().toISOString()
        }
      });
      showToast(`Đã cập nhật thiết bị ${action}.`);
      await loadDevices();
    }
  } catch (error) {
    showToast(error.message);
    addLocalEvent('error', error.message);
  }
}

async function handleUserAction(event) {
  const button = event.target.closest('button[data-user-action]');
  if (!button) return;

  const userId = button.dataset.userId;

  try {
    await requestApi(ENDPOINTS.disableUser, {
      params: { id: userId }
    });
    showToast('Đã vô hiệu hóa user.');
    await loadUsers();
  } catch (error) {
    showToast(error.message);
  }
}

async function createUser(event) {
  event.preventDefault();

  const nameInput = document.querySelector('#userNameInput');
  const roleInput = document.querySelector('#userRoleInput');
  const name = nameInput.value.trim();

  if (!name) {
    showToast('Bạn cần nhập tên user.');
    return;
  }

  try {
    await requestApi(ENDPOINTS.createUser, {
      body: {
        name,
        role: roleInput.value
      }
    });
    nameInput.value = '';
    showToast('Đã thêm user.');
    await loadUsers();
  } catch (error) {
    showToast(error.message);
  }
}

async function sendRecognitionEvent(event) {
  event.preventDefault();

  const deviceId = elements.recognitionDeviceInput.value;
  const userId = elements.recognitionUserInput.value || null;
  const confidence = Number(document.querySelector('#confidenceInput').value);
  const recognized = document.querySelector('#recognizedInput').checked;

  if (!deviceId) {
    showToast('Chưa có thiết bị để gửi event.');
    return;
  }

  try {
    const payload = await requestApi(ENDPOINTS.recognition, {
      body: {
        deviceId,
        userId,
        confidence,
        recognized
      }
    });

    elements.decisionBox.textContent = JSON.stringify(payload, null, 2);
    addLocalEvent('recognition.sent', payload.data);
    showToast(payload.message || 'Đã gửi recognition event.');
    await loadLogsAndCommands();
  } catch (error) {
    elements.decisionBox.textContent = error.message;
    showToast(error.message);
  }
}

function connectWebSocket() {
  if (!state.health?.websocket?.enabled) {
    state.socketState = 'disabled';
    renderRuntimeStatus();
    return;
  }

  if (state.socket) {
    state.socket.close();
  }

  const wsUrl = buildWebSocketUrl();
  state.socketState = 'connecting';
  renderRuntimeStatus();

  const socket = new WebSocket(wsUrl);
  state.socket = socket;

  socket.addEventListener('open', () => {
    state.socketState = 'connected';
    renderRuntimeStatus();
  });

  socket.addEventListener('message', (message) => {
    try {
      addLocalEvent('ws.message', JSON.parse(message.data));
    } catch (error) {
      addLocalEvent('ws.message', message.data);
    }
  });

  socket.addEventListener('close', () => {
    state.socketState = 'closed';
    renderRuntimeStatus();
  });

  socket.addEventListener('error', () => {
    state.socketState = 'error';
    renderRuntimeStatus();
  });
}

function buildWebSocketUrl() {
  const apiUrl = new URL(getApiBase());
  const wsPath = state.health?.websocket?.path || '/ws';
  const protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = new URL(`${protocol}//${apiUrl.host}${wsPath}`);

  if (state.apiKey) {
    url.searchParams.set('apiKey', state.apiKey);
  }

  return url.toString();
}

function renderAll() {
  renderRuntimeStatus();
  renderMetrics();
  renderDevices();
  renderLogs();
  renderUsers();
  renderAlerts();
  renderReports();
  renderRecognitionOptions();
  renderEndpointGrid();
}

function renderRuntimeStatus() {
  setPill(
    elements.apiStatus,
    state.health ? `API ${state.health.status}` : state.error ? 'API lỗi' : 'API chưa kiểm tra',
    state.health ? 'ok' : state.error ? 'error' : 'idle'
  );

  const mqtt = state.health?.mqtt;
  const mqttLabel = mqtt
    ? `MQTT ${mqtt.enabled ? (mqtt.connected ? 'connected' : 'disconnected') : 'disabled'}`
    : 'MQTT chưa kiểm tra';
  setPill(elements.mqttStatus, mqttLabel, mqtt?.connected ? 'ok' : mqtt?.enabled ? 'warn' : 'idle');

  const socketOk = state.socketState === 'connected';
  const socketLabel = `WebSocket ${state.socketState}`;
  setPill(elements.wsStatus, socketLabel, socketOk ? 'ok' : state.socketState === 'error' ? 'error' : 'idle');
}

function renderMetrics() {
  const onlineDevices = state.devices.filter((device) => device.status === 'online').length;
  const latestLog = state.logs[0];
  const queuedCommands = state.commands.filter((command) => command.status === 'queued').length;
  const alerts = collectAlerts();

  elements.onlineMetric.textContent = `${onlineDevices}/${state.devices.length}`;
  elements.deviceMetricMeta.textContent = state.devices.length
    ? `${state.devices.length - onlineDevices} thiết bị offline`
    : 'Chưa có thiết bị';

  elements.latestMetric.textContent = latestLog ? latestLog.result : 'N/A';
  elements.latestMetricMeta.textContent = latestLog
    ? `${latestLog.action} - ${formatDate(latestLog.createdAt)}`
    : 'Chưa có access log';

  elements.queuedMetric.textContent = String(queuedCommands);
  elements.queuedMetricMeta.textContent = `${state.commands.length} command gần nhất`;

  elements.alertMetric.textContent = String(alerts.length);
  elements.alertMetricMeta.textContent = alerts[0]?.message || 'Không có cảnh báo nghiêm trọng';
}

function renderDevices() {
  if (!state.devices.length) {
    elements.deviceControlList.innerHTML = emptyState('Chưa có thiết bị. Backend sẽ seed sẵn door_lock_001 khi chạy.');
    return;
  }

  elements.deviceControlList.innerHTML = state.devices
    .map((device) => {
      const isSelected = device.id === state.selectedDeviceId;
      const statusTone = device.status === 'online' ? 'ok' : 'idle';

      return `
        <article class="device-card ${isSelected ? 'selected' : ''}">
          <div class="device-title">
            <div>
              <strong>${escapeHtml(device.name)}</strong>
              <span class="mono">${escapeHtml(device.id)}</span>
            </div>
            <span class="mini-pill ${statusTone}">${escapeHtml(device.status)}</span>
          </div>
          <dl class="device-meta">
            <div><dt>Type</dt><dd>${escapeHtml(device.type)}</dd></div>
            <div><dt>Battery</dt><dd>${device.batteryLevel ?? 'N/A'}</dd></div>
            <div><dt>Last seen</dt><dd>${escapeHtml(formatDate(device.lastSeenAt))}</dd></div>
          </dl>
          <div class="button-row">
            <button type="button" data-action="unlock" data-device-id="${escapeAttr(device.id)}" title="POST /api/lock/unlock">Mở khóa</button>
            <button type="button" data-action="lock" data-device-id="${escapeAttr(device.id)}" class="danger" title="POST /api/lock/lock">Khóa cửa</button>
            <button type="button" data-action="online" data-device-id="${escapeAttr(device.id)}" class="secondary" title="PATCH /api/devices/:id/status">Online</button>
            <button type="button" data-action="offline" data-device-id="${escapeAttr(device.id)}" class="secondary" title="PATCH /api/devices/:id/status">Offline</button>
          </div>
        </article>
      `;
    })
    .join('');
}

function renderLogs() {
  if (!state.logs.length) {
    elements.logsTable.innerHTML = `<tr><td colspan="6">${emptyText('Chưa có lịch sử ra vào.')}</td></tr>`;
    return;
  }

  elements.logsTable.innerHTML = state.logs
    .slice(0, 12)
    .map(
      (log) => `
        <tr>
          <td>${escapeHtml(formatDate(log.createdAt))}</td>
          <td><span class="mini-pill">${escapeHtml(log.action)}</span></td>
          <td><span class="mini-pill ${log.result === 'allowed' ? 'ok' : log.result === 'denied' ? 'error' : 'idle'}">${escapeHtml(log.result)}</span></td>
          <td class="mono">${escapeHtml(log.deviceId || 'N/A')}</td>
          <td class="mono">${escapeHtml(log.userId || 'N/A')}</td>
          <td>${escapeHtml(log.reason || 'N/A')}</td>
        </tr>
      `
    )
    .join('');
}

function renderUsers() {
  if (!state.users.length) {
    elements.usersList.innerHTML = emptyState('Chưa có user. Tạo user để test recognition event.');
    return;
  }

  elements.usersList.innerHTML = state.users
    .slice(0, 8)
    .map(
      (user) => `
        <article class="row-item">
          <div>
            <strong>${escapeHtml(user.name)}</strong>
            <span class="meta">${escapeHtml(user.role)} - <span class="mono">${escapeHtml(user.id)}</span></span>
          </div>
          <div class="row-actions">
            <span class="mini-pill ${user.status === 'active' ? 'ok' : 'idle'}">${escapeHtml(user.status)}</span>
            ${
              user.status === 'active'
                ? `<button type="button" data-user-action="disable" data-user-id="${escapeAttr(user.id)}" class="secondary small">Disable</button>`
                : ''
            }
          </div>
        </article>
      `
    )
    .join('');
}

function renderAlerts() {
  const alerts = collectAlerts();

  if (!alerts.length) {
    elements.alertsList.innerHTML = emptyState('Không có cảnh báo từ dữ liệu hiện tại.');
    return;
  }

  elements.alertsList.innerHTML = alerts
    .map(
      (alert) => `
        <article class="alert-item ${alert.level}">
          <strong>${escapeHtml(alert.title)}</strong>
          <span>${escapeHtml(alert.message)}</span>
        </article>
      `
    )
    .join('');
}

function renderReports() {
  const allowed = state.logs.filter((log) => log.result === 'allowed').length;
  const denied = state.logs.filter((log) => log.result === 'denied').length;
  const manualCommands = state.commands.filter((command) => command.reason === 'manual' || command.reason?.startsWith('dashboard')).length;
  const activeUsers = state.users.filter((user) => user.status === 'active').length;

  const reports = [
    ['Allowed', allowed, 'access_logs.result = allowed'],
    ['Denied', denied, 'access_logs.result = denied'],
    ['Manual commands', manualCommands, 'lock_commands.reason'],
    ['Active users', activeUsers, 'users.status = active']
  ];

  elements.reportsList.innerHTML = reports
    .map(
      ([label, value, source]) => `
        <article class="report-item">
          <span>${escapeHtml(label)}</span>
          <strong>${value}</strong>
          <small>${escapeHtml(source)}</small>
        </article>
      `
    )
    .join('');
}

function renderRecognitionOptions() {
  elements.recognitionDeviceInput.innerHTML = state.devices.length
    ? state.devices.map((device) => `<option value="${escapeAttr(device.id)}">${escapeHtml(device.name)}</option>`).join('')
    : '<option value="">Chưa có thiết bị</option>';

  const activeUsers = state.users.filter((user) => user.status === 'active');
  elements.recognitionUserInput.innerHTML = [
    '<option value="">Unknown user</option>',
    ...activeUsers.map((user) => `<option value="${escapeAttr(user.id)}">${escapeHtml(user.name)}</option>`)
  ].join('');
}

function renderEndpointGrid() {
  elements.endpointGrid.innerHTML = Object.values(ENDPOINTS)
    .map(
      (endpoint) => `
        <article class="endpoint-item">
          <span class="method ${endpoint.method.toLowerCase()}">${endpoint.method}</span>
          <code>/api${escapeHtml(endpoint.path)}</code>
          <span>${escapeHtml(endpoint.label)}</span>
        </article>
      `
    )
    .join('');
}

function renderLastRequest() {
  if (!state.lastRequest) {
    elements.lastRequestBox.textContent = 'Chưa gọi API';
    return;
  }

  elements.lastRequestBox.textContent = `${state.lastRequest.method} ${state.lastRequest.path} lúc ${state.lastRequest.at}`;
}

function addLocalEvent(type, data) {
  state.events.unshift({
    type,
    data,
    at: new Date().toISOString()
  });

  state.events = state.events.slice(0, 20);
  renderEvents();
}

function renderEvents() {
  if (!state.events.length) {
    elements.eventStream.innerHTML = emptyState('Chưa có realtime event.');
    return;
  }

  elements.eventStream.innerHTML = state.events
    .map(
      (event) => `
        <article class="event-item">
          <div>
            <strong>${escapeHtml(event.type)}</strong>
            <span>${escapeHtml(formatDate(event.at))}</span>
          </div>
          <pre>${escapeHtml(JSON.stringify(event.data, null, 2))}</pre>
        </article>
      `
    )
    .join('');
}

function collectAlerts() {
  const alerts = [];

  if (state.error) {
    alerts.push({
      level: 'critical',
      title: 'API error',
      message: state.error
    });
  }

  state.devices
    .filter((device) => device.status !== 'online')
    .forEach((device) => {
      alerts.push({
        level: 'warning',
        title: 'Device offline',
        message: `${device.name} đang ở trạng thái ${device.status}`
      });
    });

  const recentDenied = state.logs.filter((log) => log.result === 'denied').slice(0, 3);
  recentDenied.forEach((log) => {
    alerts.push({
      level: 'critical',
      title: 'Denied access',
      message: `${log.deviceId || 'device'} từ chối truy cập lúc ${formatDate(log.createdAt)}`
    });
  });

  state.commands
    .filter((command) => command.status === 'failed')
    .forEach((command) => {
      alerts.push({
        level: 'critical',
        title: 'Command failed',
        message: `${command.action} thất bại trên ${command.deviceId}`
      });
    });

  return alerts;
}

function setPill(element, text, stateName) {
  element.textContent = text;
  element.className = `status-pill ${stateName}`;
}

function setLoading(isLoading) {
  state.loading = isLoading;
  document.body.classList.toggle('is-loading', isLoading);
}

function applyPathParams(path, params = {}) {
  return Object.entries(params).reduce(
    (result, [key, value]) => result.replace(`:${key}`, encodeURIComponent(value)),
    path
  );
}

function getApiBase() {
  return normalizeApiBase(state.apiBase);
}

function normalizeApiBase(value) {
  return value.trim().replace(/\/+$/, '');
}

function formatDate(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN');
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 2800);
}

function emptyState(message) {
  return `<div class="empty-state">${escapeHtml(message)}</div>`;
}

function emptyText(message) {
  return escapeHtml(message);
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
