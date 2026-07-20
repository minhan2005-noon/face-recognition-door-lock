import './styles.css';
import * as THREE from 'three';

const STORAGE_KEYS = {
  apiBase: 'doorLockDashboard.apiBase',
  apiKey: 'doorLockDashboard.apiKey'
};

const DEFAULT_API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const ENDPOINTS = {
  health: { method: 'GET', path: '/health', label: 'Kiểm tra máy chủ' },
  devices: { method: 'GET', path: '/devices', label: 'Danh sách thiết bị' },
  updateDevice: { method: 'PATCH', path: '/devices/:id/status', label: 'Cập nhật kết nối' },
  users: { method: 'GET', path: '/users', label: 'Danh sách người dùng' },
  createUser: { method: 'POST', path: '/users', label: 'Thêm người dùng' },
  disableUser: { method: 'DELETE', path: '/users/:id', label: 'Tắt quyền người dùng' },
  logs: { method: 'GET', path: '/access-logs', label: 'Lịch sử ra vào' },
  commands: { method: 'GET', path: '/lock/commands', label: 'Lịch sử điều khiển cửa' },
  lock: { method: 'POST', path: '/lock/lock', label: 'Khóa cửa' },
  unlock: { method: 'POST', path: '/lock/unlock', label: 'Mở cửa' },
  recognition: { method: 'POST', path: '/recognition-events', label: 'Kết quả nhận diện' },
  smartOverview: { method: 'GET', path: '/smart-home/overview', label: 'Tổng quan nhà thông minh' },
  smartCommand: { method: 'POST', path: '/smart-home/devices/:id/command', label: 'Điều khiển thiết bị' },
  sensorReading: { method: 'POST', path: '/smart-home/sensors', label: 'Dữ liệu cảm biến' },
  voiceCommand: { method: 'POST', path: '/smart-home/voice-command', label: 'Lệnh giọng nói' },
  simulate: { method: 'POST', path: '/smart-home/simulate', label: 'Mô phỏng demo' }
};

const state = {
  apiBase: localStorage.getItem(STORAGE_KEYS.apiBase) || DEFAULT_API_BASE,
  apiKey: localStorage.getItem(STORAGE_KEYS.apiKey) || '',
  health: null,
  devices: [],
  users: [],
  logs: [],
  commands: [],
  smart: {
    states: [],
    sensors: [],
    commands: [],
    rules: []
  },
  events: [],
  selectedDeviceId: 'door_lock_001',
  loading: false,
  lastRequest: null,
  error: null,
  socket: null,
  socketState: 'idle',
  cameraStream: null,
  cameraState: 'idle'
};

document.querySelector('#app').innerHTML = `
  <header class="app-header">
    <canvas id="homeScene" aria-label="Mô hình 3D nhà thông minh"></canvas>
    <div class="scene-overlay"></div>
    <div class="brand-block">
      <p class="eyebrow">Nhà thông minh AI</p>
      <h1>Trung tâm điều khiển an ninh</h1>
      <p class="hero-copy">Theo dõi cửa, khách, thiết bị, cảm biến và thang máy mô hình trong một màn hình.</p>
    </div>
    <div class="runtime-strip">
      <div class="status-pill" id="apiStatus">Máy chủ chưa kiểm tra</div>
      <div class="status-pill" id="mqttStatus">Thiết bị chưa kiểm tra</div>
      <div class="status-pill" id="wsStatus">Trực tiếp chưa kết nối</div>
    </div>
  </header>

  <main class="dashboard-shell">
    <section class="toolbar" aria-label="Cấu hình API">
      <div class="toolbar-title">
        <span>Kết nối hệ thống</span>
        <strong id="lastRequestBox">Chưa gọi API</strong>
      </div>
      <div class="toolbar-fields">
        <label>
          Địa chỉ máy chủ
          <input id="apiBaseInput" spellcheck="false" />
        </label>
        <label>
          Mã truy cập
          <input id="apiKeyInput" type="password" spellcheck="false" placeholder="Nhập mã truy cập nếu máy chủ bật bảo mật" />
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
        <span class="metric-label">Lượt vào gần nhất</span>
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
        <span id="alertMetricMeta" class="metric-meta">Tự tính từ API hiện có</span>
      </article>
    </section>

    <section class="content-grid">
      <section class="panel device-panel">
        <div class="panel-heading">
          <div>
            <p class="section-kicker">Điều khiển</p>
            <h2>Cửa chính và thiết bị</h2>
          </div>
          <button id="refreshDevicesBtn" type="button" class="secondary">Tải lại</button>
        </div>
        <div id="deviceControlList" class="device-grid"></div>
      </section>

      <section class="panel smart-panel">
        <div class="panel-heading">
          <div>
            <p class="section-kicker">Nhà thông minh</p>
            <h2>Ổ cắm, thang máy và mô phỏng</h2>
          </div>
          <button id="refreshSmartBtn" type="button" class="secondary">Tải lại</button>
        </div>
        <div id="smartDeviceList" class="smart-grid"></div>
        <div class="scenario-strip">
          <button type="button" data-scenario="admin_home">Admin về nhà</button>
          <button type="button" data-scenario="guest_visit" class="secondary">Khách hợp lệ</button>
          <button type="button" data-scenario="unknown_alert" class="danger">Người lạ</button>
        </div>
      </section>

      <section class="panel sensors-panel">
        <div class="panel-heading">
          <div>
            <p class="section-kicker">Cảm biến</p>
            <h2>Ánh sáng, nhiệt độ, khẩn cấp</h2>
          </div>
        </div>
        <form id="sensorForm" class="sensor-form">
          <label>
            Loại cảm biến
            <select id="sensorTypeInput">
              <option value="light">Ánh sáng</option>
              <option value="temperature">Nhiệt độ</option>
              <option value="gas">Gas/khói</option>
              <option value="flame">Lửa</option>
            </select>
          </label>
          <label>
            Giá trị
            <input id="sensorValueInput" type="number" step="0.1" value="28" />
          </label>
          <button type="submit">Gửi cảm biến</button>
        </form>
        <div id="sensorList" class="stack-list compact-list"></div>
      </section>

      <section class="panel voice-panel">
        <div class="panel-heading">
          <div>
            <p class="section-kicker">Giọng nói</p>
            <h2>Điều khiển bằng giọng nói</h2>
          </div>
        </div>
        <form id="voiceForm" class="voice-form">
          <input id="voicePhraseInput" placeholder="Ví dụ: bật đèn, bật quạt, gọi thang máy tầng 2" />
          <button type="submit">Gửi lệnh</button>
        </form>
        <div class="quick-voice">
          <button type="button" data-voice="bật đèn" class="secondary small">Bật đèn</button>
          <button type="button" data-voice="tắt đèn" class="secondary small">Tắt đèn</button>
          <button type="button" data-voice="bật quạt" class="secondary small">Bật quạt</button>
          <button type="button" data-voice="gọi thang máy tầng 2" class="secondary small">Tầng 2</button>
        </div>
        <pre id="voiceResultBox" class="code-box">Chưa có lệnh giọng nói.</pre>
      </section>

      <section class="panel realtime-panel">
        <div class="panel-heading">
          <div>
            <p class="section-kicker">Trực tiếp</p>
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
          <button id="refreshLogsBtn" type="button" class="secondary">Tải lại</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Hành động</th>
                <th>Kết quả</th>
                <th>Thiết bị</th>
                <th>Người dùng</th>
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
            <h2>Người dùng và vai trò</h2>
          </div>
          <button id="refreshUsersBtn" type="button" class="secondary">Tải lại</button>
        </div>
        <form id="createUserForm" class="inline-form">
          <input id="userNameInput" placeholder="Tên người dùng" required />
          <select id="userRoleInput">
            <option value="owner">Chủ nhà</option>
            <option value="family">Người thân</option>
            <option value="guest">Khách</option>
            <option value="resident">Cư dân</option>
            <option value="admin">Quản trị viên</option>
            <option value="blocked">Bị chặn</option>
          </select>
          <button type="submit">Thêm</button>
        </form>
        <div id="usersList" class="stack-list compact-list"></div>
      </section>

      <section class="panel reports-panel">
        <div class="panel-heading">
          <div>
            <p class="section-kicker">Báo cáo</p>
            <h2>Báo cáo nhanh</h2>
          </div>
        </div>
        <div id="reportsList" class="report-grid"></div>
      </section>

      <section class="panel ai-panel">
        <div class="panel-heading">
          <div>
            <p class="section-kicker">Thử AI</p>
            <h2>Thử nhận diện khuôn mặt</h2>
          </div>
        </div>
        <div class="camera-stage">
          <video id="cameraPreview" autoplay muted playsinline></video>
          <canvas id="cameraSnapshot" hidden></canvas>
          <div id="cameraPlaceholder" class="camera-placeholder">
            <span class="camera-lens"></span>
            <strong>Camera nhận diện mặt</strong>
            <small>Bật camera để demo luồng mở cửa bằng khuôn mặt</small>
          </div>
          <div class="scan-line"></div>
        </div>
        <div class="camera-actions">
          <button id="startCameraBtn" type="button">Bật camera</button>
          <button id="captureFaceBtn" type="button" class="secondary">Chụp mô phỏng</button>
          <span id="cameraStatus" class="mini-pill idle">Chưa bật camera</span>
        </div>
        <form id="recognitionForm" class="form-stack">
          <label>
            Thiết bị
            <select id="recognitionDeviceInput" required></select>
          </label>
          <label>
            Người dùng
            <select id="recognitionUserInput"></select>
          </label>
          <label>
            Độ tin cậy
            <input id="confidenceInput" type="number" min="0" max="1" step="0.01" value="0.92" />
          </label>
          <label class="check-row">
            <input id="recognizedInput" type="checkbox" checked />
            Nhận diện đúng người
          </label>
          <button type="submit">Gửi kết quả</button>
        </form>
        <pre id="decisionBox" class="code-box">Chưa có kết quả.</pre>
      </section>

      <section class="panel api-panel">
        <div class="panel-heading">
          <div>
            <p class="section-kicker">Kết nối kỹ thuật</p>
            <h2>Các chức năng dashboard đang dùng</h2>
          </div>
        </div>
        <div class="endpoint-grid" id="endpointGrid"></div>
      </section>
    </section>
  </main>

  <div id="toast" class="toast" hidden></div>
`;

const elements = {
  homeScene: document.querySelector('#homeScene'),
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
  smartDeviceList: document.querySelector('#smartDeviceList'),
  sensorList: document.querySelector('#sensorList'),
  eventStream: document.querySelector('#eventStream'),
  endpointGrid: document.querySelector('#endpointGrid'),
  lastRequestBox: document.querySelector('#lastRequestBox'),
  toast: document.querySelector('#toast'),
  recognitionDeviceInput: document.querySelector('#recognitionDeviceInput'),
  recognitionUserInput: document.querySelector('#recognitionUserInput'),
  cameraPreview: document.querySelector('#cameraPreview'),
  cameraSnapshot: document.querySelector('#cameraSnapshot'),
  cameraPlaceholder: document.querySelector('#cameraPlaceholder'),
  cameraStatus: document.querySelector('#cameraStatus'),
  decisionBox: document.querySelector('#decisionBox'),
  voiceResultBox: document.querySelector('#voiceResultBox')
};

elements.apiBaseInput.value = state.apiBase;
elements.apiKeyInput.value = state.apiKey;

document.querySelector('#saveConfigBtn').addEventListener('click', saveConfig);
document.querySelector('#refreshAllBtn').addEventListener('click', refreshAll);
document.querySelector('#refreshDevicesBtn').addEventListener('click', loadDevices);
document.querySelector('#refreshLogsBtn').addEventListener('click', loadLogsAndCommands);
document.querySelector('#refreshUsersBtn').addEventListener('click', loadUsers);
document.querySelector('#refreshSmartBtn').addEventListener('click', loadSmartHome);
document.querySelector('#connectWsBtn').addEventListener('click', connectWebSocket);
document.querySelector('#createUserForm').addEventListener('submit', createUser);
document.querySelector('#recognitionForm').addEventListener('submit', sendRecognitionEvent);
document.querySelector('#sensorForm').addEventListener('submit', sendSensorReading);
document.querySelector('#voiceForm').addEventListener('submit', sendVoiceCommand);
document.querySelector('#startCameraBtn').addEventListener('click', startCameraPreview);
document.querySelector('#captureFaceBtn').addEventListener('click', captureFacePreview);
elements.deviceControlList.addEventListener('click', handleDeviceAction);
elements.usersList.addEventListener('click', handleUserAction);
elements.smartDeviceList.addEventListener('click', handleSmartDeviceAction);
document.querySelector('.scenario-strip').addEventListener('click', handleScenarioAction);
document.querySelector('.quick-voice').addEventListener('click', handleQuickVoice);

initHomeScene();
initScrollEffects();
renderEndpointGrid();
refreshAll();

async function refreshAll() {
  setLoading(true);
  state.error = null;

  try {
    await loadHealth();
    await Promise.all([loadDevices(), loadUsers(), loadLogsAndCommands(), loadSmartHome()]);
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

function initHomeScene() {
  const canvas = elements.homeScene;
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(4.2, 3.1, 6.4);
  camera.lookAt(0, 0.4, 0);
  const pointer = { x: 0, y: 0 };
  let scrollDepth = 0;

  const ambient = new THREE.AmbientLight(0xffffff, 0.45);
  scene.add(ambient);

  const keyLight = new THREE.PointLight(0x4fffe2, 3.5, 12);
  keyLight.position.set(2.8, 3.2, 3.4);
  scene.add(keyLight);

  const warmLight = new THREE.PointLight(0xffc15a, 1.5, 10);
  warmLight.position.set(-3.5, 1.2, 2.2);
  scene.add(warmLight);

  const group = new THREE.Group();
  scene.add(group);

  const floorGrid = new THREE.GridHelper(9, 22, 0x21f7d0, 0x243741);
  floorGrid.position.y = -1.1;
  floorGrid.material.opacity = 0.32;
  floorGrid.material.transparent = true;
  group.add(floorGrid);

  const backGrid = new THREE.GridHelper(12, 28, 0xd86dff, 0x1f2c37);
  backGrid.position.set(0, 1.35, -3.2);
  backGrid.rotation.x = Math.PI / 2;
  backGrid.material.opacity = 0.18;
  backGrid.material.transparent = true;
  group.add(backGrid);

  const house = new THREE.Group();
  group.add(house);

  const wallMaterial = new THREE.MeshBasicMaterial({
    color: 0x7defff,
    wireframe: true,
    transparent: true,
    opacity: 0.28
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.7, 2.2, 2.5), wallMaterial);
  body.position.y = 0.1;
  house.add(body);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.85, 1.25, 4), wallMaterial);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 1.82;
  house.add(roof);

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.42, 2),
    new THREE.MeshStandardMaterial({
      color: 0x9fffe8,
      emissive: 0x20d7bb,
      emissiveIntensity: 1.4,
      roughness: 0.2,
      metalness: 0.35
    })
  );
  core.position.set(0, 0.28, 0);
  group.add(core);

  const nodeGeometry = new THREE.SphereGeometry(0.12, 24, 24);
  const nodes = [
    ['door_lock_001', 'Cửa', -1.85, -0.38, 1.32],
    ['socket_light_001', 'Đèn', -1.2, 1.18, 0.88],
    ['socket_fan_001', 'Quạt', 1.18, 0.84, 0.98],
    ['socket_tv_001', 'TV', 1.65, -0.42, 0.42],
    ['elevator_001', 'Thang', 1.72, 0.15, -0.92],
    ['env_node_001', 'Cảm biến', -1.5, 0.48, -0.9],
    ['face_camera_001', 'Camera', -0.25, 1.45, 1.45]
  ].map(([id, label, x, y, z]) => {
    const material = new THREE.MeshStandardMaterial({
      color: 0x5c7380,
      emissive: 0x16262b,
      emissiveIntensity: 0.5,
      roughness: 0.3,
      metalness: 0.2
    });
    const mesh = new THREE.Mesh(nodeGeometry, material);
    mesh.position.set(x, y, z);
    mesh.userData = { id, label, baseScale: 1 };
    group.add(mesh);

    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x26f0c7,
      transparent: true,
      opacity: 0.22
    });
    const points = [new THREE.Vector3(0, 0.28, 0), mesh.position.clone()];
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterial);
    line.userData = { id };
    group.add(line);

    return { id, mesh, line };
  });

  const rings = new THREE.Group();
  for (let i = 0; i < 3; i += 1) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.2 + i * 0.42, 0.006, 8, 96),
      new THREE.MeshBasicMaterial({
        color: i === 1 ? 0xffc15a : 0x26f0c7,
        transparent: true,
        opacity: 0.28 - i * 0.04
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.95 + i * 0.05;
    rings.add(ring);
  }
  group.add(rings);

  const particleGeometry = new THREE.BufferGeometry();
  const particleCount = 160;
  const particlePositions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i += 1) {
    particlePositions[i * 3] = (Math.random() - 0.5) * 9;
    particlePositions[i * 3 + 1] = (Math.random() - 0.2) * 4.8;
    particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 7;
  }
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const particles = new THREE.Points(
    particleGeometry,
    new THREE.PointsMaterial({
      color: 0x7defff,
      size: 0.028,
      transparent: true,
      opacity: 0.62
    })
  );
  group.add(particles);

  const clock = new THREE.Clock();

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    if (canvas.width !== width || canvas.height !== height) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
  }

  function updateNodeColors() {
    const stateByDevice = new Map(state.smart.states.map((item) => [item.deviceId, item]));
    nodes.forEach(({ id, mesh, line }) => {
      const deviceState = stateByDevice.get(id);
      const cameraActive = id === 'face_camera_001' && ['active', 'captured'].includes(state.cameraState);
      const active = cameraActive || ['on', 'unlock'].includes(deviceState?.powerState);
      const elevatorMoving = id === 'elevator_001' && deviceState?.mode === 'floor_2';
      const color = active || elevatorMoving ? 0x45ffd4 : 0x60717c;
      const glow = active || elevatorMoving ? 0x22f5cf : 0x17252a;
      mesh.material.color.setHex(color);
      mesh.material.emissive.setHex(glow);
      mesh.material.emissiveIntensity = active || elevatorMoving ? 2.4 : 0.45;
      line.material.opacity = active || elevatorMoving ? 0.72 : 0.18;
      line.material.color.setHex(active || elevatorMoving ? 0x26f0c7 : 0x3e5963);
    });
  }

  function animate() {
    resize();
    updateNodeColors();
    const time = clock.getElapsedTime();
    scrollDepth += ((window.scrollY || 0) * 0.0009 - scrollDepth) * 0.05;
    group.rotation.y = Math.sin(time * 0.36) * 0.2 + pointer.x * 0.16 + scrollDepth;
    group.rotation.x = Math.sin(time * 0.22) * 0.045 - pointer.y * 0.08;
    camera.position.x += (4.2 + pointer.x * 0.55 - camera.position.x) * 0.04;
    camera.position.y += (3.1 - pointer.y * 0.22 - camera.position.y) * 0.04;
    camera.lookAt(0, 0.35, 0);
    core.rotation.x += 0.014;
    core.rotation.y += 0.018;
    rings.rotation.z = time * 0.5;
    particles.rotation.y = -time * 0.12;
    particles.position.z = Math.sin(time * 0.7) * 0.26;
    nodes.forEach(({ mesh }, index) => {
      const pulse = 1 + Math.sin(time * 4.2 + index) * 0.12;
      mesh.scale.setScalar(pulse);
    });
    renderer.render(scene, camera);
    window.requestAnimationFrame(animate);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', (event) => {
    pointer.x = event.clientX / Math.max(1, window.innerWidth) - 0.5;
    pointer.y = event.clientY / Math.max(1, window.innerHeight) - 0.5;
  });
  animate();
}

function initScrollEffects() {
  document.addEventListener('pointermove', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    const rect = button.getBoundingClientRect();
    button.style.setProperty('--bubble-x', `${event.clientX - rect.left}px`);
    button.style.setProperty('--bubble-y', `${event.clientY - rect.top}px`);
  });

  const motionItems = document.querySelectorAll('.toolbar, .metric, .panel');
  motionItems.forEach((item, index) => {
    item.classList.add('scroll-reveal');
    item.style.setProperty('--reveal-delay', `${Math.min(index * 35, 280)}ms`);
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle('is-visible', entry.isIntersecting);
      });
    },
    {
      threshold: 0.14,
      rootMargin: '0px 0px -8% 0px'
    }
  );

  motionItems.forEach((item) => observer.observe(item));

  const updateScrollVars = () => {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = window.scrollY / maxScroll;
    document.documentElement.style.setProperty('--scroll-shift', `${Math.round(progress * 180)}px`);
    document.documentElement.style.setProperty('--scroll-glow', String(0.18 + progress * 0.22));
  };

  updateScrollVars();
  window.addEventListener('scroll', updateScrollVars, { passive: true });
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

async function loadSmartHome() {
  const payload = await requestApi(ENDPOINTS.smartOverview);
  state.smart = {
    states: payload.data?.states || [],
    sensors: payload.data?.sensors || [],
    commands: payload.data?.commands || [],
    rules: payload.data?.rules || []
  };

  if (payload.data?.devices?.length) {
    state.devices = payload.data.devices;
  }

  if (payload.data?.logs?.length) {
    state.logs = payload.data.logs;
  }

  if (payload.data?.users?.length) {
    state.users = payload.data.users;
  }

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
      showToast(`Đã cập nhật thiết bị ${displayStatus(action).toLowerCase()}.`);
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
    showToast('Đã tắt quyền người dùng.');
    await loadUsers();
  } catch (error) {
    showToast(error.message);
  }
}

async function handleSmartDeviceAction(event) {
  const button = event.target.closest('button[data-smart-action]');
  if (!button) return;

  try {
    const payload = await requestApi(ENDPOINTS.smartCommand, {
      params: { id: button.dataset.deviceId },
      body: {
        action: button.dataset.smartAction,
        channel: button.dataset.channel || null,
        value: button.dataset.value || null,
        source: 'dashboard',
        reason: 'dashboard_smart_control'
      }
    });
    addLocalEvent('smart.command', payload.data);
    showToast('Đã gửi lệnh nhà thông minh.');
    await Promise.all([loadSmartHome(), loadLogsAndCommands()]);
  } catch (error) {
    showToast(error.message);
    addLocalEvent('error', error.message);
  }
}

async function handleScenarioAction(event) {
  const button = event.target.closest('button[data-scenario]');
  if (!button) return;

  try {
    const payload = await requestApi(ENDPOINTS.simulate, {
      body: { scenario: button.dataset.scenario }
    });
    addLocalEvent('simulation', payload.data);
    showToast(payload.message || 'Đã chạy mô phỏng.');
    await Promise.all([loadSmartHome(), loadLogsAndCommands(), loadUsers()]);
  } catch (error) {
    showToast(error.message);
    addLocalEvent('error', error.message);
  }
}

async function createUser(event) {
  event.preventDefault();

  const nameInput = document.querySelector('#userNameInput');
  const roleInput = document.querySelector('#userRoleInput');
  const name = nameInput.value.trim();

  if (!name) {
    showToast('Bạn cần nhập tên người dùng.');
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
    showToast('Đã thêm người dùng.');
    await loadUsers();
  } catch (error) {
    showToast(error.message);
  }
}

async function sendSensorReading(event) {
  event.preventDefault();

  const sensorType = document.querySelector('#sensorTypeInput').value;
  const value = Number(document.querySelector('#sensorValueInput').value);
  const unit = sensorType === 'temperature' ? 'C' : sensorType === 'light' ? 'lux' : 'state';

  try {
    const payload = await requestApi(ENDPOINTS.sensorReading, {
      body: {
        deviceId: 'env_node_001',
        sensorType,
        value,
        unit
      }
    });
    addLocalEvent('sensor.sent', payload.data);
    showToast('Đã gửi dữ liệu cảm biến.');
    await loadSmartHome();
  } catch (error) {
    showToast(error.message);
    addLocalEvent('error', error.message);
  }
}

async function sendVoiceCommand(event) {
  event.preventDefault();
  const phraseInput = document.querySelector('#voicePhraseInput');
  await submitVoicePhrase(phraseInput.value.trim());
  phraseInput.value = '';
}

async function handleQuickVoice(event) {
  const button = event.target.closest('button[data-voice]');
  if (!button) return;
  await submitVoicePhrase(button.dataset.voice);
}

async function submitVoicePhrase(phrase) {
  if (!phrase) {
    showToast('Bạn cần nhập lệnh giọng nói.');
    return;
  }

  try {
    const payload = await requestApi(ENDPOINTS.voiceCommand, {
      body: { phrase }
    });
    elements.voiceResultBox.textContent = formatReadablePayload(payload);
    addLocalEvent('voice.sent', payload.data);
    showToast(payload.message || 'Đã gửi lệnh giọng nói.');
    await loadSmartHome();
  } catch (error) {
    elements.voiceResultBox.textContent = error.message;
    showToast(error.message);
  }
}

async function startCameraPreview() {
  if (!navigator.mediaDevices?.getUserMedia) {
    state.cameraState = 'unsupported';
    renderCameraState();
    showToast('Trình duyệt này chưa hỗ trợ camera.');
    return;
  }

  try {
    if (state.cameraStream) {
      state.cameraStream.getTracks().forEach((track) => track.stop());
    }

    state.cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 960 },
        height: { ideal: 540 }
      },
      audio: false
    });
    elements.cameraPreview.srcObject = state.cameraStream;
    state.cameraState = 'active';
    renderCameraState();
    showToast('Camera đã sẵn sàng.');
  } catch (error) {
    state.cameraState = 'blocked';
    renderCameraState();
    showToast('Không mở được camera. Bạn vẫn có thể dùng chụp mô phỏng.');
  }
}

async function captureFacePreview() {
  const canvas = elements.cameraSnapshot;
  const context = canvas.getContext('2d');
  const video = elements.cameraPreview;
  const width = video.videoWidth || 640;
  const height = video.videoHeight || 360;

  canvas.width = width;
  canvas.height = height;

  if (state.cameraStream && video.videoWidth) {
    context.drawImage(video, 0, 0, width, height);
  } else {
    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#06201f');
    gradient.addColorStop(0.55, '#102b34');
    gradient.addColorStop(1, '#1f1730');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    context.strokeStyle = '#34e7c6';
    context.lineWidth = 5;
    context.beginPath();
    context.ellipse(width / 2, height * 0.42, width * 0.13, height * 0.22, 0, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.arc(width / 2, height * 0.78, width * 0.2, Math.PI, 0);
    context.stroke();
  }

  elements.cameraPlaceholder.hidden = true;
  state.cameraState = 'captured';
  renderCameraState();
  showToast('Đã chụp khung hình nhận diện.');

  const activeUsers = state.users.filter((user) => user.status === 'active');
  if (!elements.recognitionUserInput.value && activeUsers[0]) {
    elements.recognitionUserInput.value = activeUsers[0].id;
  }
  document.querySelector('#recognizedInput').checked = true;
  document.querySelector('#confidenceInput').value = state.cameraStream ? '0.94' : '0.88';
}

async function sendRecognitionEvent(event) {
  event.preventDefault();

  const deviceId = elements.recognitionDeviceInput.value;
  const userId = elements.recognitionUserInput.value || null;
  const confidence = Number(document.querySelector('#confidenceInput').value);
  const recognized = document.querySelector('#recognizedInput').checked;

  if (!deviceId) {
    showToast('Chưa có thiết bị để gửi kết quả nhận diện.');
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

    elements.decisionBox.textContent = formatReadablePayload(payload);
    addLocalEvent('recognition.sent', payload.data);
    showToast(payload.message || 'Đã gửi kết quả nhận diện.');
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
  renderSmartHome();
  renderSensors();
  renderAlerts();
  renderReports();
  renderRecognitionOptions();
  renderEndpointGrid();
  renderCameraState();
}

function renderRuntimeStatus() {
  setPill(
    elements.apiStatus,
    state.health ? 'Máy chủ sẵn sàng' : state.error ? 'Máy chủ lỗi' : 'Máy chủ chưa kiểm tra',
    state.health ? 'ok' : state.error ? 'error' : 'idle'
  );

  const mqtt = state.health?.mqtt;
  const mqttLabel = mqtt
    ? `Thiết bị ${mqtt.enabled ? (mqtt.connected ? 'đã nối' : 'chưa nối') : 'mô phỏng'}`
    : 'Thiết bị chưa kiểm tra';
  setPill(elements.mqttStatus, mqttLabel, mqtt?.connected ? 'ok' : mqtt?.enabled ? 'warn' : 'idle');

  const socketOk = state.socketState === 'connected';
  const socketLabel = `Trực tiếp ${displayRealtimeState(state.socketState)}`;
  setPill(elements.wsStatus, socketLabel, socketOk ? 'ok' : state.socketState === 'error' ? 'error' : 'idle');
}

function renderMetrics() {
  const onlineDevices = state.devices.filter((device) => device.status === 'online').length;
  const latestLog = state.logs[0];
  const queuedCommands =
    state.commands.filter((command) => command.status === 'queued').length +
    state.smart.commands.filter((command) => command.status === 'queued').length;
  const alerts = collectAlerts();

  elements.onlineMetric.textContent = `${onlineDevices}/${state.devices.length}`;
  elements.deviceMetricMeta.textContent = state.devices.length
    ? `${state.devices.length - onlineDevices} thiết bị ngoại tuyến`
    : 'Chưa có thiết bị';

  elements.latestMetric.textContent = latestLog ? displayResult(latestLog.result) : 'N/A';
  elements.latestMetricMeta.textContent = latestLog
    ? `${displayAction(latestLog.action)} - ${formatDate(latestLog.createdAt)}`
    : 'Chưa có lịch sử';

  elements.queuedMetric.textContent = String(queuedCommands);
  elements.queuedMetricMeta.textContent = `${state.commands.length + state.smart.commands.length} lệnh gần nhất`;

  elements.alertMetric.textContent = String(alerts.length);
  elements.alertMetricMeta.textContent = alerts[0]?.message || 'Không có cảnh báo nghiêm trọng';
}

function renderDevices() {
  if (!state.devices.length) {
    elements.deviceControlList.innerHTML = emptyState('Chưa có thiết bị. Máy chủ sẽ tạo sẵn dữ liệu mẫu khi chạy.');
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
              <strong>${escapeHtml(displayDeviceName(device))}</strong>
          <span class="meta">${escapeHtml(displayDeviceId(device.id))}</span>
            </div>
            <span class="mini-pill ${statusTone}">${escapeHtml(displayStatus(device.status))}</span>
          </div>
          <dl class="device-meta">
            <div><dt>Nhóm</dt><dd>${escapeHtml(displayDeviceType(device.type))}</dd></div>
            <div><dt>Pin</dt><dd>${device.batteryLevel ?? 'N/A'}</dd></div>
            <div><dt>Lần cuối</dt><dd>${escapeHtml(formatDate(device.lastSeenAt))}</dd></div>
          </dl>
          <div class="button-row">
            <button type="button" data-action="unlock" data-device-id="${escapeAttr(device.id)}" title="POST /api/lock/unlock">Mở khóa</button>
            <button type="button" data-action="lock" data-device-id="${escapeAttr(device.id)}" class="danger" title="POST /api/lock/lock">Khóa cửa</button>
            <button type="button" data-action="online" data-device-id="${escapeAttr(device.id)}" class="secondary" title="Đánh dấu đang kết nối">Đang nối</button>
            <button type="button" data-action="offline" data-device-id="${escapeAttr(device.id)}" class="secondary" title="Đánh dấu ngoại tuyến">Ngoại tuyến</button>
          </div>
        </article>
      `;
    })
    .join('');
}

function renderSmartHome() {
  const stateByDevice = new Map(state.smart.states.map((item) => [item.deviceId, item]));
  const smartDevices = state.devices.filter((device) =>
    ['smart_socket', 'elevator', 'environment'].includes(device.type)
  );

  if (!smartDevices.length) {
    elements.smartDeviceList.innerHTML = emptyState('Chưa có thiết bị nhà thông minh. Máy chủ sẽ tạo sẵn dữ liệu mẫu khi chạy.');
    return;
  }

  elements.smartDeviceList.innerHTML = smartDevices
    .map((device) => {
      const deviceState = stateByDevice.get(device.id);
      const powerState = deviceState?.powerState || 'off';
      const channel = inferChannel(device);
      const isElevator = device.type === 'elevator';
      const isEnvironment = device.type === 'environment';

      return `
        <article class="smart-card">
          <div class="device-title">
            <div>
              <strong>${escapeHtml(displayDeviceName(device))}</strong>
              <span class="meta">${escapeHtml(displayDeviceId(device.id))}</span>
            </div>
            <span class="mini-pill ${powerState === 'on' || powerState === 'unlock' ? 'ok' : 'idle'}">${escapeHtml(displayPowerState(powerState))}</span>
          </div>
          <dl class="device-meta">
            <div><dt>Nhóm</dt><dd>${escapeHtml(displayDeviceType(device.type))}</dd></div>
            <div><dt>Chế độ</dt><dd>${escapeHtml(displayMode(deviceState?.mode))}</dd></div>
            <div><dt>Cập nhật</dt><dd>${escapeHtml(formatDate(deviceState?.updatedAt))}</dd></div>
          </dl>
          <div class="button-row smart-actions">
            ${
              isEnvironment
                ? '<span class="meta">Nhận dữ liệu từ form cảm biến bên dưới</span>'
                : isElevator
                  ? `
                    <button type="button" data-smart-action="goto_floor" data-value="1" data-channel="elevator" data-device-id="${escapeAttr(device.id)}">Tầng 1</button>
                    <button type="button" data-smart-action="goto_floor" data-value="2" data-channel="elevator" data-device-id="${escapeAttr(device.id)}">Tầng 2</button>
                    <button type="button" data-smart-action="off" data-channel="elevator" data-device-id="${escapeAttr(device.id)}" class="secondary">Dừng</button>
                  `
                  : `
                    <button type="button" data-smart-action="on" data-channel="${escapeAttr(channel)}" data-device-id="${escapeAttr(device.id)}">Bật</button>
                    <button type="button" data-smart-action="off" data-channel="${escapeAttr(channel)}" data-device-id="${escapeAttr(device.id)}" class="secondary">Tắt</button>
                  `
            }
          </div>
        </article>
      `;
    })
    .join('');
}

function renderSensors() {
  if (!state.smart.sensors.length) {
    elements.sensorList.innerHTML = emptyState('Chưa có dữ liệu cảm biến.');
    return;
  }

  elements.sensorList.innerHTML = state.smart.sensors
    .slice(0, 8)
    .map(
      (sensor) => `
        <article class="row-item">
          <div>
            <strong>${escapeHtml(sensor.sensorType)}: ${escapeHtml(sensor.value)} ${escapeHtml(sensor.unit || '')}</strong>
            <span class="meta">${escapeHtml(displayDeviceId(sensor.deviceId))} - ${escapeHtml(formatDate(sensor.capturedAt))}</span>
          </div>
          <span class="mini-pill">${escapeHtml(sensor.unit || 'value')}</span>
        </article>
      `
    )
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
          <td><span class="mini-pill">${escapeHtml(displayAction(log.action))}</span></td>
          <td><span class="mini-pill ${log.result === 'allowed' ? 'ok' : log.result === 'denied' ? 'error' : 'idle'}">${escapeHtml(displayResult(log.result))}</span></td>
          <td>${escapeHtml(displayDeviceId(log.deviceId || 'N/A'))}</td>
          <td>${escapeHtml(displayUser(log.userId))}</td>
          <td>${escapeHtml(displayReason(log.reason || 'N/A'))}</td>
        </tr>
      `
    )
    .join('');
}

function renderUsers() {
  if (!state.users.length) {
    elements.usersList.innerHTML = emptyState('Chưa có người dùng. Tạo người dùng để thử nhận diện.');
    return;
  }

  elements.usersList.innerHTML = state.users
    .slice(0, 8)
    .map(
      (user) => `
        <article class="row-item">
          <div>
            <strong>${escapeHtml(displayPersonName(user))}</strong>
            <span class="meta">${escapeHtml(displayRole(user.role))} - ${escapeHtml(displayDeviceId(user.id))}</span>
          </div>
          <div class="row-actions">
            <span class="mini-pill ${user.status === 'active' ? 'ok' : 'idle'}">${escapeHtml(displayStatus(user.status))}</span>
            ${
              user.status === 'active'
                ? `<button type="button" data-user-action="disable" data-user-id="${escapeAttr(user.id)}" class="secondary small">Tắt quyền</button>`
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
  const devicesOn = state.smart.states.filter((item) => ['on', 'unlock'].includes(item.powerState)).length;
  const sensorCount = state.smart.sensors.length;

  const reports = [
    ['Đã cho vào', allowed, 'Lượt mở cửa thành công'],
    ['Bị từ chối', denied, 'Người lạ hoặc khách hết quyền'],
    ['Lệnh thủ công', manualCommands, 'Gửi từ dashboard'],
    ['Người còn quyền', activeUsers, 'Tài khoản đang hoạt động'],
    ['Thiết bị đang bật', devicesOn, 'Đèn, quạt, TV, cửa, thang máy'],
    ['Dữ liệu cảm biến', sensorCount, 'Ánh sáng, nhiệt độ, khẩn cấp']
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
    ? state.devices.map((device) => `<option value="${escapeAttr(device.id)}">${escapeHtml(displayDeviceName(device))}</option>`).join('')
    : '<option value="">Chưa có thiết bị</option>';

  const activeUsers = state.users.filter((user) => user.status === 'active');
  elements.recognitionUserInput.innerHTML = [
    '<option value="">Người lạ</option>',
    ...activeUsers.map((user) => `<option value="${escapeAttr(user.id)}">${escapeHtml(displayPersonName(user))}</option>`)
  ].join('');
}

function renderCameraState() {
  if (!elements.cameraStatus) return;

  const labels = {
    idle: 'Chưa bật camera',
    active: 'Camera đang chạy',
    captured: 'Đã chụp khuôn mặt',
    blocked: 'Chưa được cấp quyền',
    unsupported: 'Không hỗ trợ camera'
  };
  const tone = ['active', 'captured'].includes(state.cameraState)
    ? 'ok'
    : ['blocked', 'unsupported'].includes(state.cameraState)
      ? 'error'
      : 'idle';

  elements.cameraStatus.textContent = labels[state.cameraState] || 'Chưa bật camera';
  elements.cameraStatus.className = `mini-pill ${tone}`;
  elements.cameraPreview.classList.toggle('is-active', state.cameraState === 'active');
  elements.cameraSnapshot.hidden = state.cameraState !== 'captured';
  elements.cameraPreview.hidden = state.cameraState === 'captured';
  elements.cameraPlaceholder.hidden = ['active', 'captured'].includes(state.cameraState);
}

function renderEndpointGrid() {
  elements.endpointGrid.innerHTML = Object.values(ENDPOINTS)
    .map(
      (endpoint) => `
        <article class="endpoint-item">
          <span class="method ${endpoint.method.toLowerCase()}">${displayMethod(endpoint.method)}</span>
          <code>${escapeHtml(displayEndpoint(endpoint.path))}</code>
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
    elements.eventStream.innerHTML = emptyState('Chưa có sự kiện trực tiếp.');
    return;
  }

  elements.eventStream.innerHTML = state.events
    .map(
      (event) => `
        <article class="event-item">
          <div>
            <strong>${escapeHtml(displayEventType(event.type))}</strong>
            <span>${escapeHtml(formatDate(event.at))}</span>
          </div>
          <pre>${escapeHtml(formatReadablePayload(event.data))}</pre>
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
      title: 'Lỗi máy chủ',
      message: state.error
    });
  }

  state.devices
    .filter((device) => device.status !== 'online')
    .forEach((device) => {
      alerts.push({
        level: 'warning',
        title: 'Thiết bị ngoại tuyến',
        message: `${displayDeviceName(device)} đang ở trạng thái ${displayStatus(device.status)}`
      });
    });

  const recentDenied = state.logs.filter((log) => log.result === 'denied').slice(0, 3);
  recentDenied.forEach((log) => {
    alerts.push({
      level: 'critical',
      title: 'Truy cập bị từ chối',
        message: `${displayDeviceId(log.deviceId || 'thiết bị')} từ chối truy cập lúc ${formatDate(log.createdAt)}`
    });
  });

  state.commands
    .filter((command) => command.status === 'failed')
    .forEach((command) => {
      alerts.push({
        level: 'critical',
        title: 'Lệnh thất bại',
        message: `${displayAction(command.action)} thất bại trên ${displayDeviceId(command.deviceId)}`
      });
    });

  state.smart.sensors
    .filter((sensor) =>
      (sensor.sensorType === 'temperature' && sensor.value >= 35) ||
      (['gas', 'flame'].includes(sensor.sensorType) && sensor.value > 0)
    )
    .slice(0, 3)
    .forEach((sensor) => {
      alerts.push({
        level: 'critical',
        title: 'Cảnh báo cảm biến',
        message: `${displaySensorType(sensor.sensorType)} = ${sensor.value}${sensor.unit || ''} tại ${formatDate(sensor.capturedAt)}`
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

function inferChannel(device) {
  if (device.id.includes('light')) return 'light';
  if (device.id.includes('fan')) return 'fan';
  if (device.id.includes('tv')) return 'tv';
  if (device.type === 'elevator') return 'elevator';
  return device.type;
}

function displayDeviceId(value) {
  const labels = {
    door_lock_001: 'Cửa chính',
    socket_light_001: 'Đèn phòng khách',
    socket_fan_001: 'Quạt phòng khách',
    socket_tv_001: 'TV mô hình',
    elevator_001: 'Thang máy',
    env_node_001: 'Node môi trường'
  };
  if (labels[value]) return labels[value];
  return String(value || 'N/A').replaceAll('_', ' ');
}

function displayDeviceName(device) {
  if (!device) return 'N/A';
  const labels = {
    door_lock_001: 'Khóa cửa chính',
    socket_light_001: 'Đèn phòng khách',
    socket_fan_001: 'Quạt phòng khách',
    socket_tv_001: 'TV mô hình',
    elevator_001: 'Thang máy 2 tầng',
    env_node_001: 'Node môi trường'
  };
  return labels[device.id] || String(device.name || device.id || 'Thiết bị').replaceAll('_', ' ');
}

function displayDeviceType(value) {
  const labels = {
    door_lock: 'Khóa cửa',
    smart_socket: 'Ổ cắm thông minh',
    elevator: 'Thang máy',
    environment: 'Môi trường'
  };
  return labels[value] || String(value || 'N/A').replaceAll('_', ' ');
}

function displayStatus(value) {
  const labels = {
    active: 'Đang hoạt động',
    inactive: 'Đã tắt quyền',
    blocked: 'Bị chặn',
    online: 'Đang kết nối',
    offline: 'Ngoại tuyến',
    queued: 'Đang chờ',
    failed: 'Thất bại'
  };
  return labels[value] || String(value || 'N/A').replaceAll('_', ' ');
}

function displayPowerState(value) {
  const labels = {
    on: 'Đang bật',
    off: 'Đang tắt',
    unlock: 'Đang mở',
    locked: 'Đang khóa',
    lock: 'Đang khóa',
    emergency_open: 'Mở khẩn cấp'
  };
  return labels[value] || String(value || 'N/A').replaceAll('_', ' ');
}

function displayMode(value) {
  const labels = {
    floor_1: 'Tầng 1',
    floor_2: 'Tầng 2',
    emergency: 'Khẩn cấp'
  };
  return labels[value] || (value ? String(value).replaceAll('_', ' ') : 'N/A');
}

function displayAction(value) {
  const labels = {
    unlock: 'Mở cửa',
    lock: 'Khóa cửa',
    deny: 'Từ chối',
    on: 'Bật',
    off: 'Tắt',
    toggle: 'Đảo trạng thái',
    goto_floor: 'Gọi thang máy',
    set_level: 'Đặt mức',
    emergency_open: 'Mở khẩn cấp'
  };
  return labels[value] || String(value || 'N/A').replaceAll('_', ' ');
}

function displayResult(value) {
  const labels = {
    allowed: 'Cho phép',
    denied: 'Từ chối',
    queued: 'Đang chờ'
  };
  return labels[value] || String(value || 'N/A').replaceAll('_', ' ');
}

function displayReason(value) {
  const labels = {
    recognized_owner: 'Nhận diện chủ nhà',
    recognized_admin: 'Nhận diện quản trị viên',
    recognized_family: 'Nhận diện người thân',
    recognized_resident: 'Nhận diện cư dân',
    guest_within_schedule: 'Khách trong khung giờ',
    guest_missing_schedule: 'Khách chưa được cấp lịch',
    guest_expired: 'Khách hết thời hạn',
    guest_not_started: 'Chưa tới giờ khách vào',
    guest_device_not_allowed: 'Khách không có quyền thiết bị này',
    unknown_user: 'Người lạ',
    unknown_user_demo: 'Mô phỏng người lạ',
    inactive_or_blocked_user: 'Tài khoản bị tắt hoặc chặn',
    role_not_allowed: 'Vai trò không được mở cửa',
    owner_home_demo: 'Mô phỏng chủ nhà về',
    owner_arrived: 'Chủ nhà về',
    owner_arrived_low_light: 'Trời tối nên bật đèn',
    owner_arrived_hot_room: 'Phòng nóng nên bật quạt',
    guest_demo: 'Mô phỏng khách',
    guest_limited_access: 'Khách chỉ bật thiết bị cơ bản',
    dashboard_smart_control: 'Điều khiển từ dashboard',
    high_temperature: 'Nhiệt độ cao',
    low_light: 'Ánh sáng yếu',
    emergency_sensor: 'Cảm biến khẩn cấp',
    emergency_ventilation: 'Thông gió khẩn cấp',
    voice_elevator_demo: 'Gọi thang máy bằng giọng nói',
    dashboard_unlock: 'Mở cửa từ dashboard',
    dashboard_lock: 'Khóa cửa từ dashboard'
  };
  return labels[value] || String(value || 'N/A').replaceAll('_', ' ');
}

function displayRole(value) {
  const labels = {
    owner: 'Chủ nhà',
    admin: 'Quản trị viên',
    family: 'Người thân',
    guest: 'Khách',
    resident: 'Cư dân',
    blocked: 'Bị chặn'
  };
  return labels[value] || String(value || 'N/A').replaceAll('_', ' ');
}

function displayUser(value) {
  return value ? 'Người dùng đã nhận diện' : 'Không xác định';
}

function displayPersonName(user) {
  if (!user) return 'Không xác định';
  const lowerName = String(user.name || '').toLowerCase();
  if (lowerName.includes('admin')) return 'Quản trị viên Demo';
  if (lowerName.includes('owner')) return 'Chủ nhà Demo';
  if (lowerName.includes('guest') && lowerName.includes('schedule')) return 'Khách chưa cấp lịch';
  if (lowerName.includes('guest')) return 'Khách Demo';
  return String(user.name || user.id || 'Người dùng').replaceAll('_', ' ');
}

function displaySensorType(value) {
  const labels = {
    light: 'Ánh sáng',
    temperature: 'Nhiệt độ',
    gas: 'Gas/khói',
    flame: 'Lửa'
  };
  return labels[value] || String(value || 'N/A').replaceAll('_', ' ');
}

function displayRealtimeState(value) {
  const labels = {
    idle: 'chưa bật',
    connecting: 'đang nối',
    connected: 'đã nối',
    closed: 'đã ngắt',
    disabled: 'đang tắt',
    error: 'bị lỗi'
  };
  return labels[value] || String(value || 'N/A');
}

function displayEventType(value) {
  const labels = {
    connection: 'Kết nối',
    error: 'Lỗi hệ thống',
    'command.created': 'Tạo lệnh cửa',
    'smart.command': 'Điều khiển nhà thông minh',
    simulation: 'Mô phỏng demo',
    'sensor.sent': 'Dữ liệu cảm biến',
    'voice.sent': 'Lệnh giọng nói',
    'recognition.sent': 'Kết quả nhận diện',
    'ws.message': 'Tin trực tiếp'
  };
  return labels[value] || String(value || 'Sự kiện').replaceAll('_', ' ').replaceAll('.', ' ');
}

function displayMethod(value) {
  const labels = {
    GET: 'Xem',
    POST: 'Gửi',
    PATCH: 'Sửa',
    DELETE: 'Tắt'
  };
  return labels[value] || value;
}

function displayEndpoint(path) {
  const labels = {
    '/health': 'Kiểm tra máy chủ',
    '/devices': 'Danh sách thiết bị',
    '/devices/:id/status': 'Cập nhật thiết bị',
    '/users': 'Người dùng',
    '/users/:id': 'Vô hiệu hóa người dùng',
    '/access-logs': 'Lịch sử ra vào',
    '/lock/commands': 'Lệnh khóa cửa',
    '/lock/lock': 'Khóa cửa',
    '/lock/unlock': 'Mở cửa',
    '/recognition-events': 'Kết quả nhận diện',
    '/smart-home/overview': 'Tổng quan nhà thông minh',
    '/smart-home/devices/:id/command': 'Điều khiển thiết bị',
    '/smart-home/sensors': 'Dữ liệu cảm biến',
    '/smart-home/voice-command': 'Lệnh giọng nói',
    '/smart-home/simulate': 'Mô phỏng demo'
  };
  return labels[path] || path.replaceAll('_', ' ');
}

function formatReadablePayload(value) {
  return JSON.stringify(toReadablePayload(value), null, 2).replaceAll('_', ' ');
}

function toReadablePayload(value) {
  if (Array.isArray(value)) {
    return value.map(toReadablePayload);
  }

  if (!value || typeof value !== 'object') {
    if (typeof value === 'string') {
      return value.replaceAll('_', ' ');
    }
    return value;
  }

  const labelMap = {
    deviceId: 'thiết bị',
    userId: 'người dùng',
    commandId: 'mã lệnh',
    eventId: 'mã sự kiện',
    createdAt: 'thời điểm tạo',
    capturedAt: 'thời điểm chụp',
    powerState: 'trạng thái',
    sensorType: 'cảm biến',
    targetFloor: 'tầng đến',
    source: 'nguồn lệnh',
    reason: 'lý do',
    action: 'hành động',
    status: 'tình trạng',
    result: 'kết quả',
    confidence: 'độ tin cậy',
    decision: 'quyết định',
    phrase: 'câu lệnh',
    type: 'loại',
    data: 'dữ liệu',
    message: 'thông báo',
    sentAt: 'thời điểm gửi'
  };

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => {
      let readable = toReadablePayload(item);
      if (key === 'deviceId' || key === 'thiết bị') readable = displayDeviceId(item);
      if (key === 'action' || key === 'hành động') readable = displayAction(item);
      if (key === 'reason' || key === 'lý do') readable = displayReason(item);
      if (key === 'status' || key === 'tình trạng') readable = displayStatus(item);
      if (key === 'result' || key === 'kết quả') readable = displayResult(item);
      if (key === 'decision' || key === 'quyết định') readable = displayAction(item);
      if (key === 'powerState' || key === 'trạng thái') readable = displayPowerState(item);
      if (key === 'sensorType' || key === 'cảm biến') readable = displaySensorType(item);
      if (key === 'type' || key === 'loại') readable = displayEventType(item);
      if (key === 'message' && typeof item === 'string' && item.includes('backend realtime')) {
        readable = 'Đã kết nối dòng sự kiện';
      }
      return [labelMap[key] || key.replaceAll('_', ' '), readable];
    })
  );
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
