import './styles.css';

const STORAGE_KEYS = {
  apiBase: 'doorLockDashboard.apiBase',
  apiKey: 'doorLockDashboard.apiKey',
  faceProfiles: 'doorLockDashboard.faceProfiles',
  selectedDeviceId: 'doorLockDashboard.selectedDeviceId',
  selectedScanUserId: 'doorLockDashboard.selectedScanUserId'
};

const DEFAULT_API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const DEFAULT_API_KEY = import.meta.env.VITE_API_KEY || 'minhan123';

const ENDPOINTS = {
  health: { method: 'GET', path: '/health', label: 'Kiểm tra hệ thống' },
  devices: { method: 'GET', path: '/devices', label: 'Tải trạng thái cửa' },
  updateDevice: { method: 'PATCH', path: '/devices/:id/status', label: 'Cập nhật trạng thái cửa' },
  users: { method: 'GET', path: '/users', label: 'Tải danh sách người dùng' },
  createUser: { method: 'POST', path: '/users', label: 'Thêm người dùng' },
  updateUser: { method: 'PATCH', path: '/users/:id', label: 'Cập nhật quyền người dùng' },
  disableUser: { method: 'DELETE', path: '/users/:id', label: 'Xóa người dùng' },
  logs: { method: 'GET', path: '/access-logs', label: 'Tải lịch sử ra vào' },
  clearLogs: { method: 'DELETE', path: '/access-logs', label: 'Xóa lịch sử ra vào' },
  commands: { method: 'GET', path: '/lock/commands', label: 'Tải lệnh khóa cửa' },
  lock: { method: 'POST', path: '/lock/lock', label: 'Khóa cửa' },
  unlock: { method: 'POST', path: '/lock/unlock', label: 'Mở cửa' },
  recognition: { method: 'POST', path: '/recognition-events', label: 'Quét khuôn mặt' }
};

const state = {
  apiBase: localStorage.getItem(STORAGE_KEYS.apiBase) || DEFAULT_API_BASE,
  apiKey: localStorage.getItem(STORAGE_KEYS.apiKey) || DEFAULT_API_KEY,
  health: null,
  devices: [],
  users: [],
  logs: [],
  commands: [],
  events: [],
  selectedDeviceId: localStorage.getItem(STORAGE_KEYS.selectedDeviceId) || 'door_lock_001',
  selectedScanUserId: localStorage.getItem(STORAGE_KEYS.selectedScanUserId) || '',
  loading: false,
  lastRequest: null,
  error: null,
  socket: null,
  socketState: 'idle',
  cameraStream: null,
  cameraReady: false,
  faceProfiles: loadStoredFaceProfiles()
};

document.querySelector('#app').innerHTML = `
  <header class="app-header">
    <div class="brand-block">
      <p class="eyebrow">Khóa cửa nhận diện khuôn mặt</p>
      <h1>Face Door Access</h1>
    </div>
    <div class="runtime-strip">
      <div class="status-pill" id="apiStatus">Hệ thống chưa kiểm tra</div>
      <div class="status-pill" id="mqttStatus">Cửa chưa kiểm tra</div>
      <div class="status-pill" id="wsStatus">Kết nối trực tiếp chưa bật</div>
    </div>
  </header>

  <main class="dashboard-shell">
    <section class="toolbar" aria-label="Cấu hình kết nối">
      <div class="toolbar-title">
        <span>Kết nối hệ thống</span>
        <strong id="lastRequestBox">Chưa có thao tác</strong>
      </div>
      <div class="toolbar-fields">
        <label>
          Địa chỉ hệ thống
          <input id="apiBaseInput" spellcheck="false" />
        </label>
        <label>
          Mã truy cập
          <input id="apiKeyInput" type="password" spellcheck="false" placeholder="Nhập mã truy cập" />
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
        <span class="metric-label">Lần ra vào mới nhất</span>
        <strong id="latestMetric">N/A</strong>
        <span id="latestMetricMeta" class="metric-meta">Chưa có log</span>
      </article>
      <article class="metric">
        <span class="metric-label">Lệnh đang chờ</span>
        <strong id="queuedMetric">0</strong>
        <span id="queuedMetricMeta" class="metric-meta">Lệnh đang chờ thiết bị</span>
      </article>
      <article class="metric">
        <span class="metric-label">Cảnh báo</span>
        <strong id="alertMetric">0</strong>
        <span id="alertMetricMeta" class="metric-meta">Không có cảnh báo</span>
      </article>
    </section>

    <section class="content-grid">
      <section class="panel device-panel">
        <div class="panel-heading">
          <div>
            <p class="section-kicker">Điều khiển</p>
            <h2>Thiết bị và lệnh khóa</h2>
          </div>
          <button id="refreshDevicesBtn" type="button" class="secondary">Làm mới</button>
        </div>
        <div id="deviceControlList" class="device-grid"></div>
      </section>

      <section class="panel realtime-panel">
        <div class="panel-heading">
          <div>
            <p class="section-kicker">Hoạt động mới</p>
            <h2>Dòng sự kiện trực tiếp</h2>
          </div>
          <button id="connectWsBtn" type="button" class="secondary">Kết nối lại</button>
        </div>
        <div id="eventStream" class="event-stream"></div>
      </section>

      <section class="panel history-panel">
        <div class="panel-heading">
          <div>
            <p class="section-kicker">Lịch sử</p>
            <h2>Lịch sử ra vào</h2>
          </div>
          <div class="panel-actions">
            <button id="refreshLogsBtn" type="button" class="secondary">Làm mới</button>
            <button id="clearLogsBtn" type="button" class="danger">Xóa lịch sử</button>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Hành động</th>
                <th>Kết quả</th>
                <th>Cửa</th>
                <th>Người</th>
                <th>Lý do</th>
              </tr>
            </thead>
            <tbody id="logsTable"></tbody>
          </table>
        </div>
      </section>

      <section class="panel alerts-panel">
        <div class="panel-heading">
          <div>
            <p class="section-kicker">Cảnh báo</p>
            <h2>Cảnh báo vận hành</h2>
          </div>
        </div>
        <div id="alertsList" class="stack-list"></div>
      </section>

      <section class="panel users-panel">
        <div class="panel-heading">
          <div>
            <p class="section-kicker">Người dùng</p>
            <h2>Người được phép</h2>
          </div>
          <button id="refreshUsersBtn" type="button" class="secondary">Làm mới</button>
        </div>
        <form id="createUserForm" class="inline-form">
          <input id="userNameInput" placeholder="Tên người dùng" required />
          <select id="userRoleInput">
            <option value="admin">Admin</option>
            <option value="resident">Cư dân</option>
            <option value="guest">Khách</option>
          </select>
          <button type="submit">Thêm</button>
        </form>
        <div id="usersList" class="stack-list compact-list"></div>
      </section>

      <section class="panel reports-panel">
        <div class="panel-heading">
          <div>
            <p class="section-kicker">Tổng kết</p>
            <h2>Báo cáo nhanh</h2>
          </div>
        </div>
        <div id="reportsList" class="report-grid"></div>
      </section>

      <section class="panel ai-panel">
        <div class="panel-heading">
          <div>
            <p class="section-kicker">Quét camera</p>
            <h2>Quét mặt admin để mở cửa</h2>
          </div>
        </div>
        <div class="camera-box">
          <video id="cameraPreview" autoplay muted playsinline></video>
          <div id="scanStatus" class="scan-status">Camera chưa bật</div>
        </div>
        <form id="recognitionForm" class="form-stack">
          <label>
            Thiết bị
            <select id="recognitionDeviceInput" required></select>
          </label>
          <label>
            Người quét
            <select id="recognitionUserInput"></select>
          </label>
          <div class="scan-actions">
            <button id="startCameraBtn" type="button">Bật camera</button>
            <button id="enrollFaceBtn" type="button" class="secondary">Lưu mặt admin</button>
            <button id="scanFaceBtn" type="submit">Quét và mở cửa</button>
            <button id="stopCameraBtn" type="button" class="secondary">Tắt</button>
          </div>
        </form>
        <div id="decisionBox" class="decision-box">Chưa có kết quả quét.</div>
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
  lastRequestBox: document.querySelector('#lastRequestBox'),
  toast: document.querySelector('#toast'),
  recognitionDeviceInput: document.querySelector('#recognitionDeviceInput'),
  recognitionUserInput: document.querySelector('#recognitionUserInput'),
  cameraPreview: document.querySelector('#cameraPreview'),
  scanStatus: document.querySelector('#scanStatus'),
  decisionBox: document.querySelector('#decisionBox')
};

elements.apiBaseInput.value = state.apiBase;
elements.apiKeyInput.value = state.apiKey;

document.querySelector('#saveConfigBtn').addEventListener('click', saveConfig);
document.querySelector('#refreshAllBtn').addEventListener('click', refreshAll);
document.querySelector('#refreshDevicesBtn').addEventListener('click', loadDevices);
document.querySelector('#refreshLogsBtn').addEventListener('click', loadLogsAndCommands);
document.querySelector('#clearLogsBtn').addEventListener('click', clearAccessHistory);
document.querySelector('#refreshUsersBtn').addEventListener('click', loadUsers);
document.querySelector('#connectWsBtn').addEventListener('click', connectWebSocket);
document.querySelector('#createUserForm').addEventListener('submit', createUser);
document.querySelector('#recognitionForm').addEventListener('submit', scanAndUnlock);
document.querySelector('#startCameraBtn').addEventListener('click', startCamera);
document.querySelector('#enrollFaceBtn').addEventListener('click', enrollSelectedAdminFace);
document.querySelector('#stopCameraBtn').addEventListener('click', stopCamera);
elements.recognitionDeviceInput.addEventListener('change', handleScanDeviceChange);
elements.recognitionUserInput.addEventListener('change', handleScanUserChange);
elements.deviceControlList.addEventListener('click', handleDeviceAction);
elements.usersList.addEventListener('click', handleUserAction);

refreshAll();

async function refreshAll() {
  setLoading(true);
  state.error = null;

  try {
    await loadHealth();
    await Promise.all([loadDevices(), loadUsers(), loadLogsAndCommands()]);
    connectWebSocket();
    showToast('Đã tải dữ liệu.');
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
    localStorage.setItem(STORAGE_KEYS.selectedDeviceId, state.selectedDeviceId);
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
    const message = payload.message || `Thao tác không thành công (${response.status})`;
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

  showToast('Đã lưu cấu hình.');
  refreshAll();
}

function handleScanDeviceChange() {
  state.selectedDeviceId = elements.recognitionDeviceInput.value;
  localStorage.setItem(STORAGE_KEYS.selectedDeviceId, state.selectedDeviceId);
}

function handleScanUserChange() {
  state.selectedScanUserId = elements.recognitionUserInput.value;
  localStorage.setItem(STORAGE_KEYS.selectedScanUserId, state.selectedScanUserId);
}

async function clearAccessHistory() {
  const confirmed = window.confirm('Xóa toàn bộ lịch sử ra vào?');
  if (!confirmed) return;

  try {
    const payload = await requestApi(ENDPOINTS.clearLogs);
    state.logs = [];
    addLocalEvent('history.cleared', payload.data);
    showToast('Đã xóa lịch sử ra vào.');
    await loadLogsAndCommands();
  } catch (error) {
    showToast(error.message);
    addLocalEvent('error', error.message);
  }
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
          reason: `manual_${action}`
        }
      });
      addLocalEvent('door.command', payload.data?.command || payload.data);
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
      showToast(action === 'online' ? 'Đã đánh dấu cửa đang kết nối.' : 'Đã đánh dấu cửa mất kết nối.');
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
  const action = button.dataset.userAction;
  const user = state.users.find((item) => item.id === userId);

  try {
    if (action === 'make-admin' || action === 'make-guest') {
      const role = action === 'make-admin' ? 'admin' : 'guest';
      await requestApi(ENDPOINTS.updateUser, {
        params: { id: userId },
        body: {
          name: user?.name,
          role,
          status: user?.status || 'active'
        }
      });
      showToast(role === 'admin' ? 'Đã cấp quyền admin.' : 'Đã chuyển user về guest.');
      await loadUsers();
      return;
    }

    await requestApi(ENDPOINTS.disableUser, {
      params: { id: userId }
    });
    delete state.faceProfiles[userId];
    persistFaceProfiles();
    showToast('Đã xóa user khỏi danh sách hoạt động.');
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

    elements.decisionBox.textContent = payload.decision === 'unlock'
      ? `Đã mở cửa cho ${selectedUser.name}. Độ khớp ${Math.round(match.score * 100)}%.`
      : 'Chưa thể mở cửa.';
    addLocalEvent('recognition.sent', payload.data);
    showToast(payload.message || 'Đã gửi recognition event.');
    await loadLogsAndCommands();
  } catch (error) {
    elements.decisionBox.textContent = error.message;
    showToast(error.message);
  }
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    showToast('Trình duyệt không hỗ trợ camera.');
    setScanStatus('Trình duyệt không hỗ trợ camera', 'error');
    return;
  }

  if (state.cameraStream) {
    setScanStatus('Camera đang bật', 'ok');
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 960 },
        height: { ideal: 540 }
      },
      audio: false
    });

    state.cameraStream = stream;
    state.cameraReady = true;
    elements.cameraPreview.srcObject = stream;
    await elements.cameraPreview.play();
    setScanStatus('Camera đã sẵn sàng', 'ok');
  } catch (error) {
    state.cameraReady = false;
    setScanStatus('Không mở được camera', 'error');
    showToast('Không mở được camera. Kiểm tra quyền camera của trình duyệt.');
  }
}

function stopCamera() {
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach((track) => track.stop());
  }

  state.cameraStream = null;
  state.cameraReady = false;
  elements.cameraPreview.srcObject = null;
  setScanStatus('Camera đã tắt', 'idle');
}

async function scanAndUnlock(event) {
  event.preventDefault();

  const deviceId = elements.recognitionDeviceInput.value;
  const userId = elements.recognitionUserInput.value;
  state.selectedDeviceId = deviceId;
  state.selectedScanUserId = userId;
  localStorage.setItem(STORAGE_KEYS.selectedDeviceId, deviceId);
  localStorage.setItem(STORAGE_KEYS.selectedScanUserId, userId);
  const selectedUser = state.users.find((user) => user.id === userId);

  if (!deviceId) {
    showToast('Chưa có thiết bị để quét.');
    return;
  }

  if (!selectedUser) {
    showToast('Chọn người cần quét trước.');
    return;
  }

  if (selectedUser.role !== 'admin') {
    await sendDeniedRecognition(deviceId, userId, 'User chưa phải admin');
    return;
  }

  if (!state.cameraReady) {
    await startCamera();
  }

  if (!state.cameraReady) {
    return;
  }

  const storedProfile = state.faceProfiles[userId];
  if (!storedProfile) {
    setScanStatus('Admin này chưa lưu mặt', 'error');
    showToast('Bấm Lưu mặt admin trước khi quét mở cửa.');
    return;
  }

  if (!Array.isArray(storedProfile.signature) || storedProfile.signature.length !== 1024) {
    setScanStatus('Cần lưu lại mặt admin', 'error');
    showToast('Bấm Lưu mặt admin lại để dùng kiểm tra camera trống.');
    return;
  }

  setScanStatus('Đang so khớp khuôn mặt...', 'warn');

  try {
    const currentCapture = captureFaceSignature();
    const frameCheck = validateFaceFrame(currentCapture.quality);

    if (!frameCheck.valid) {
      await sendDeniedRecognition(deviceId, userId, frameCheck.reason);
      return;
    }

    const match = compareFaceSignatures(storedProfile.signature, currentCapture.signature);

    if (!match.allowed) {
      await sendDeniedRecognition(deviceId, userId, `Mặt không khớp (${Math.round(match.score * 100)}%)`);
      return;
    }

    const payload = await requestApi(ENDPOINTS.recognition, {
      body: {
        deviceId,
        userId,
        confidence: match.score,
        recognized: true,
        capturedAt: new Date().toISOString()
      }
    });

    elements.decisionBox.textContent = payload.decision === 'unlock'
      ? `Đã mở cửa cho ${selectedUser.name}. Độ khớp ${Math.round(match.score * 100)}%.`
      : 'Chưa thể mở cửa.';
    addLocalEvent('face.scan.unlock', payload.data);
    setScanStatus(payload.decision === 'unlock' ? 'Đã nhận diện admin - mở cửa' : 'Từ chối truy cập', payload.decision === 'unlock' ? 'ok' : 'error');
    showToast(payload.message || 'Đã quét mặt.');
    await loadLogsAndCommands();
  } catch (error) {
    elements.decisionBox.textContent = error.message;
    setScanStatus('Quét thất bại', 'error');
    showToast(error.message);
  }
}

function setScanStatus(message, tone = 'idle') {
  elements.scanStatus.textContent = message;
  elements.scanStatus.className = `scan-status ${tone}`;
}

async function enrollSelectedAdminFace() {
  const userId = elements.recognitionUserInput.value;
  state.selectedScanUserId = userId;
  localStorage.setItem(STORAGE_KEYS.selectedScanUserId, userId);
  const selectedUser = state.users.find((user) => user.id === userId);

  if (!selectedUser) {
    showToast('Chọn user admin trước.');
    return;
  }

  if (selectedUser.role !== 'admin') {
    setScanStatus('Chỉ admin mới được lưu mặt', 'error');
    showToast('Đổi user này sang admin trước khi lưu mặt.');
    return;
  }

  if (!state.cameraReady) {
    await startCamera();
  }

  if (!state.cameraReady) {
    return;
  }

  const capture = captureFaceSignature();
  const frameCheck = validateFaceFrame(capture.quality);

  if (!frameCheck.valid) {
    setScanStatus(frameCheck.reason, 'error');
    showToast('Không lưu mặt: ' + frameCheck.reason);
    return;
  }

  state.faceProfiles[userId] = {
    userId,
    name: selectedUser.name,
    signature: capture.signature,
    quality: capture.quality,
    createdAt: new Date().toISOString()
  };
  persistFaceProfiles();
  renderRecognitionOptions();
  setScanStatus(`Đã lưu mặt admin: ${selectedUser.name}`, 'ok');
  showToast('Đã lưu mặt admin trên trình duyệt này.');
}

async function sendDeniedRecognition(deviceId, userId, reason) {
  try {
    const payload = await requestApi(ENDPOINTS.recognition, {
      body: {
        deviceId,
        userId: userId || null,
        confidence: 0,
        recognized: false,
        capturedAt: new Date().toISOString()
      }
    });
    elements.decisionBox.textContent = `Không mở cửa. ${reason}.`;
    addLocalEvent('face.scan.denied', { reason, data: payload.data });
    setScanStatus(reason, 'error');
    showToast('Không mở cửa: ' + reason);
    await loadLogsAndCommands();
  } catch (error) {
    elements.decisionBox.textContent = error.message;
    setScanStatus('Từ chối nhưng ghi log thất bại', 'error');
    showToast(error.message);
  }
}

function captureFaceSignature() {
  const video = elements.cameraPreview;
  const canvas = document.createElement('canvas');
  const size = 32;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(video, 0, 0, size, size);
  const { data } = context.getImageData(0, 0, size, size);
  const signature = [];
  const lumaValues = [];
  let skinPixels = 0;
  let centerLuma = 0;
  let outerLuma = 0;
  let centerCount = 0;
  let outerCount = 0;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      const luma = (red * 0.299 + green * 0.587 + blue * 0.114) / 255;
      const normalized = Number(luma.toFixed(4));
      const isCenter = x >= 9 && x <= 22 && y >= 6 && y <= 25;
      const maxChannel = Math.max(red, green, blue);
      const minChannel = Math.min(red, green, blue);
      const looksLikeSkin = red > 70 && green > 45 && blue > 30 && red > blue && maxChannel - minChannel > 15;

      signature.push(normalized);
      lumaValues.push(luma);

      if (looksLikeSkin) {
        skinPixels += 1;
      }

      if (isCenter) {
        centerLuma += luma;
        centerCount += 1;
      } else {
        outerLuma += luma;
        outerCount += 1;
      }
    }
  }

  const mean = lumaValues.reduce((total, value) => total + value, 0) / lumaValues.length;
  const variance = lumaValues.reduce((total, value) => total + (value - mean) ** 2, 0) / lumaValues.length;
  const centerAverage = centerCount ? centerLuma / centerCount : 0;
  const outerAverage = outerCount ? outerLuma / outerCount : 0;
  const centerContrast = Math.abs(centerAverage - outerAverage);
  const skinRatio = skinPixels / lumaValues.length;

  return {
    signature,
    quality: {
      mean,
      variance,
      centerContrast,
      skinRatio
    }
  };
}

function validateFaceFrame(quality) {
  if (!quality) {
    return { valid: false, reason: 'Camera chưa có hình ảnh rõ' };
  }

  if (quality.mean < 0.08) {
    return { valid: false, reason: 'Khung hình quá tối' };
  }

  if (quality.mean > 0.94) {
    return { valid: false, reason: 'Khung hình quá sáng hoặc trống' };
  }

  if (quality.variance < 0.006) {
    return { valid: false, reason: 'Camera đang trống hoặc thiếu chi tiết khuôn mặt' };
  }

  if (quality.centerContrast < 0.018 && quality.skinRatio < 0.06) {
    return { valid: false, reason: 'Không thấy khuôn mặt rõ trong camera' };
  }

  return { valid: true, reason: 'Khung hình hợp lệ' };
}

function compareFaceSignatures(reference = [], current = []) {
  if (!reference.length || reference.length !== current.length) {
    return { allowed: false, score: 0 };
  }

  const difference = reference.reduce((total, value, index) => total + Math.abs(value - current[index]), 0) / reference.length;
  const score = Math.max(0, Math.min(1, 1 - difference * 2.2));

  return {
    allowed: score >= 0.72,
    score: Number(score.toFixed(2))
  };
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
}

function renderRuntimeStatus() {
  setPill(
    elements.apiStatus,
    state.health ? 'Hệ thống sẵn sàng' : state.error ? 'Hệ thống lỗi' : 'Hệ thống chưa kiểm tra',
    state.health ? 'ok' : state.error ? 'error' : 'idle'
  );

  const mqtt = state.health?.mqtt;
  const mqttLabel = mqtt
    ? `Cửa ${mqtt.enabled ? (mqtt.connected ? 'đã kết nối' : 'mất kết nối') : 'chưa bật'}`
    : 'Cửa chưa kiểm tra';
  setPill(elements.mqttStatus, mqttLabel, mqtt?.connected ? 'ok' : mqtt?.enabled ? 'warn' : 'idle');

  const socketOk = state.socketState === 'connected';
  const socketLabel = socketOk ? 'Trực tiếp đang bật' : 'Trực tiếp chưa kết nối';
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

  elements.latestMetric.textContent = latestLog ? formatResult(latestLog.result) : 'N/A';
  elements.latestMetricMeta.textContent = latestLog
    ? `${latestLog.action} - ${formatDate(latestLog.createdAt)}`
    : 'Chưa có access log';

  elements.queuedMetric.textContent = String(queuedCommands);
  elements.queuedMetricMeta.textContent = `${state.commands.length} lệnh gần nhất`;

  elements.alertMetric.textContent = String(alerts.length);
  elements.alertMetricMeta.textContent = alerts[0]?.message || 'Không có cảnh báo nghiêm trọng';
}

function renderDevices() {
  if (!state.devices.length) {
    elements.deviceControlList.innerHTML = emptyState('Chưa có thiết bị cửa.');
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
              <span class="meta">${escapeHtml(formatDeviceType(device.type))}</span>
            </div>
            <span class="mini-pill ${statusTone}">${escapeHtml(formatDeviceStatus(device.status))}</span>
          </div>
          <dl class="device-meta">
            <div><dt>Loại</dt><dd>${escapeHtml(formatDeviceType(device.type))}</dd></div>
            <div><dt>Pin</dt><dd>${device.batteryLevel ?? 'N/A'}</dd></div>
            <div><dt>Lần cuối</dt><dd>${escapeHtml(formatDate(device.lastSeenAt))}</dd></div>
          </dl>
          <div class="button-row">
            <button type="button" data-action="unlock" data-device-id="${escapeAttr(device.id)}">Mở khóa</button>
            <button type="button" data-action="lock" data-device-id="${escapeAttr(device.id)}" class="danger">Khóa cửa</button>
            <button type="button" data-action="online" data-device-id="${escapeAttr(device.id)}" class="secondary">Đang kết nối</button>
            <button type="button" data-action="offline" data-device-id="${escapeAttr(device.id)}" class="secondary">Mất kết nối</button>
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
          <td><span class="mini-pill">${escapeHtml(formatAction(log.action))}</span></td>
          <td><span class="mini-pill ${log.result === 'allowed' ? 'ok' : log.result === 'denied' ? 'error' : 'idle'}">${escapeHtml(formatResult(log.result))}</span></td>
          <td>${escapeHtml(getDeviceName(log.deviceId))}</td>
          <td>${escapeHtml(getUserName(log.userId))}</td>
          <td>${escapeHtml(formatReason(log.reason))}</td>
        </tr>
      `
    )
    .join('');
}

function renderUsers() {
  const visibleUsers = state.users.filter((user) => user.status === 'active');

  if (!visibleUsers.length) {
    elements.usersList.innerHTML = emptyState('Chưa có người dùng. Thêm admin để bắt đầu.');
    return;
  }

  elements.usersList.innerHTML = visibleUsers
    .slice(0, 8)
    .map(
      (user) => {
        const hasFaceProfile = Boolean(state.faceProfiles[user.id]);

        return `
        <article class="row-item">
          <div>
            <strong>${escapeHtml(user.name)}</strong>
            <span class="meta">${escapeHtml(formatRole(user.role))} - ${hasFaceProfile ? 'đã lưu mặt' : 'chưa lưu mặt'}</span>
          </div>
          <div class="row-actions">
            <span class="mini-pill ${user.status === 'active' ? 'ok' : 'idle'}">${escapeHtml(formatUserStatus(user.status))}</span>
            <button type="button" data-user-action="${user.role === 'admin' ? 'make-guest' : 'make-admin'}" data-user-id="${escapeAttr(user.id)}" class="secondary small">${user.role === 'admin' ? 'Khách' : 'Admin'}</button>
            ${
              user.status === 'active'
                ? `<button type="button" data-user-action="disable" data-user-id="${escapeAttr(user.id)}" class="danger small">Xóa</button>`
                : ''
            }
          </div>
        </article>
      `;
      }
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
  const manualCommands = state.commands.filter((command) => command.reason === 'manual' || command.reason?.startsWith('manual')).length;
  const activeUsers = state.users.filter((user) => user.status === 'active').length;

  const reports = [
    ['Đã mở cửa', allowed, 'Lượt hợp lệ'],
    ['Bị từ chối', denied, 'Lượt không hợp lệ'],
    ['Lệnh thủ công', manualCommands, 'Từ bảng điều khiển'],
    ['Người dùng', activeUsers, 'Đang được phép dùng']
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
  elements.recognitionDeviceInput.value = state.devices.some((device) => device.id === state.selectedDeviceId)
    ? state.selectedDeviceId
    : state.devices[0]?.id || '';

  const activeUsers = state.users.filter((user) => user.status === 'active');
  elements.recognitionUserInput.innerHTML = [
    '<option value="">Chọn user</option>',
    ...activeUsers.map((user) => {
      const profile = state.faceProfiles[user.id] ? ' / đã lưu mặt' : '';
      return `<option value="${escapeAttr(user.id)}">${escapeHtml(user.name)} (${escapeHtml(formatRole(user.role))}${profile})</option>`;
    })
  ].join('');
  elements.recognitionUserInput.value = activeUsers.some((user) => user.id === state.selectedScanUserId)
    ? state.selectedScanUserId
    : '';
}

function renderLastRequest() {
  if (!state.lastRequest) {
    elements.lastRequestBox.textContent = 'Chưa có thao tác';
    return;
  }

  elements.lastRequestBox.textContent = `${state.lastRequest.label} lúc ${state.lastRequest.at}`;
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
    elements.eventStream.innerHTML = emptyState('Chưa có hoạt động mới.');
    return;
  }

  elements.eventStream.innerHTML = state.events
    .map((event) => {
      const view = describeEvent(event);

      return `
        <article class="event-item ${view.tone}">
          <div class="event-icon">${escapeHtml(view.icon)}</div>
          <div class="event-copy">
            <div>
              <strong>${escapeHtml(view.title)}</strong>
              <span>${escapeHtml(formatDate(event.at))}</span>
            </div>
            <p>${escapeHtml(view.message)}</p>
          </div>
        </article>
      `;
    })
    .join('');
}

function collectAlerts() {
  const alerts = [];

  if (state.error) {
    alerts.push({
      level: 'critical',
      title: 'Hệ thống gặp lỗi',
      message: state.error
    });
  }

  state.devices
    .filter((device) => device.status !== 'online')
    .forEach((device) => {
      alerts.push({
        level: 'warning',
        title: 'Cửa mất kết nối',
        message: `${device.name} đang ở trạng thái ${device.status}`
      });
    });

  const recentDenied = state.logs.filter((log) => log.result === 'denied').slice(0, 3);
  recentDenied.forEach((log) => {
    alerts.push({
      level: 'critical',
      title: 'Từ chối mở cửa',
      message: `${log.deviceId || 'device'} từ chối truy cập lúc ${formatDate(log.createdAt)}`
    });
  });

  state.commands
    .filter((command) => command.status === 'failed')
    .forEach((command) => {
      alerts.push({
        level: 'critical',
        title: 'Lệnh cửa thất bại',
        message: `${formatAction(command.action)} thất bại trên ${getDeviceName(command.deviceId)}`
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

function formatAction(value) {
  const labels = {
    unlock: 'Mở cửa',
    lock: 'Khóa cửa',
    deny: 'Từ chối'
  };

  return labels[value] || value || 'N/A';
}

function formatResult(value) {
  const labels = {
    allowed: 'Đã mở',
    denied: 'Từ chối',
    queued: 'Đang chờ',
    success: 'Thành công',
    failed: 'Thất bại'
  };

  return labels[value] || value || 'N/A';
}

function formatReason(value) {
  const labels = {
    recognized_user: 'Khuôn mặt admin hợp lệ',
    unknown_or_inactive_user: 'Không đúng quyền hoặc chưa hoạt động',
    manual_unlock: 'Mở thủ công',
    manual_lock: 'Khóa thủ công',
    manual: 'Thao tác thủ công'
  };

  return labels[value] || value || 'N/A';
}

function formatRole(value) {
  const labels = {
    admin: 'Admin',
    resident: 'Cư dân',
    guest: 'Khách'
  };

  return labels[value] || value || 'N/A';
}

function formatUserStatus(value) {
  const labels = {
    active: 'Đang dùng',
    inactive: 'Đã xóa'
  };

  return labels[value] || value || 'N/A';
}

function formatDeviceType(value) {
  const labels = {
    door_lock: 'Khóa cửa'
  };

  return labels[value] || value || 'Thiết bị';
}

function formatDeviceStatus(value) {
  const labels = {
    online: 'Đang kết nối',
    offline: 'Mất kết nối'
  };

  return labels[value] || value || 'N/A';
}

function getUserName(userId) {
  if (!userId) return 'Khách lạ';
  return state.users.find((user) => user.id === userId)?.name || 'Người dùng đã xóa';
}

function getDeviceName(deviceId) {
  if (!deviceId) return 'Cửa không xác định';
  return state.devices.find((device) => device.id === deviceId)?.name || 'Cửa chính';
}

function describeEvent(event) {
  const data = event.data || {};

  if (event.type === 'face.scan.unlock' || data.command?.action === 'unlock') {
    return {
      icon: '✓',
      tone: 'success',
      title: 'Cửa đã được mở',
      message: `${getUserName(data.event?.userId || data.command?.userId)} quét mặt thành công.`
    };
  }

  if (event.type === 'face.scan.denied' || data.event?.decision === 'deny') {
    return {
      icon: '!',
      tone: 'danger',
      title: 'Từ chối mở cửa',
      message: event.data?.reason || 'Khuôn mặt hoặc quyền truy cập không hợp lệ.'
    };
  }

  if (event.type === 'history.cleared') {
    return {
      icon: '⌫',
      tone: 'neutral',
      title: 'Đã xóa lịch sử',
      message: `Đã xóa ${data.deleted ?? 0} dòng lịch sử ra vào.`
    };
  }

  if (event.type === 'door.command') {
    return {
      icon: '↗',
      tone: 'neutral',
      title: 'Đã gửi lệnh tới cửa',
      message: formatAction(data.action || data.command?.action)
    };
  }

  if (event.type === 'ws.message') {
    const payload = data.data || data;
    return describeEvent({
      type: payload.type || 'system',
      data: payload.data || payload,
      at: event.at
    });
  }

  if (event.type === 'connection') {
    return {
      icon: '●',
      tone: 'success',
      title: 'Kết nối trực tiếp đã sẵn sàng',
      message: 'Các hoạt động mới sẽ xuất hiện tại đây.'
    };
  }

  if (event.type === 'error') {
    return {
      icon: '!',
      tone: 'danger',
      title: 'Có lỗi xảy ra',
      message: String(data)
    };
  }

  return {
    icon: '•',
    tone: 'neutral',
    title: 'Hoạt động mới',
    message: 'Hệ thống vừa cập nhật trạng thái.'
  };
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 2800);
}

function loadStoredFaceProfiles() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.faceProfiles) || '{}');
  } catch (error) {
    return {};
  }
}

function persistFaceProfiles() {
  localStorage.setItem(STORAGE_KEYS.faceProfiles, JSON.stringify(state.faceProfiles));
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
