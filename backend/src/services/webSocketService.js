const WebSocket = require('ws');
const {
  getApiKeyFromHeaders,
  isApiKeyProtectionEnabled,
  isValidApiKey
} = require('../middleware/apiKeyAuth');

let wss = null;

function initWebSocket(server) {
  wss = new WebSocket.Server({
    server,
    path: process.env.WS_PATH || '/ws'
  });

  wss.on('connection', (socket, req) => {
    if (!isAuthorizedWebSocketRequest(req)) {
      socket.close(1008, 'Unauthorized');
      return;
    }

    socket.isAlive = true;

    socket.on('pong', () => {
      socket.isAlive = true;
    });

    sendToSocket(socket, 'connection', {
      message: 'Connected to backend realtime gateway'
    });
  });

  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((socket) => {
      if (socket.isAlive === false) {
        socket.terminate();
        return;
      }

      socket.isAlive = false;
      socket.ping();
    });
  }, Number(process.env.WS_HEARTBEAT_MS || 30000));

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  return wss;
}

function isAuthorizedWebSocketRequest(req) {
  if (!isApiKeyProtectionEnabled()) {
    return true;
  }

  const headerKey = getApiKeyFromHeaders(req.headers);
  const queryKey = getApiKeyFromUrl(req.url);

  return isValidApiKey(headerKey || queryKey);
}

function getApiKeyFromUrl(url = '') {
  try {
    const parsedUrl = new URL(url, 'ws://localhost');
    return parsedUrl.searchParams.get('apiKey') || parsedUrl.searchParams.get('token');
  } catch (error) {
    return null;
  }
}

function getWebSocketStatus() {
  return {
    enabled: Boolean(wss),
    path: process.env.WS_PATH || '/ws',
    clients: wss ? wss.clients.size : 0,
    protected: isApiKeyProtectionEnabled()
  };
}

function broadcast(type, data = {}) {
  if (!wss) {
    return 0;
  }

  const payload = JSON.stringify({
    type,
    data,
    sentAt: new Date().toISOString()
  });

  let sentCount = 0;
  wss.clients.forEach((socket) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(payload);
      sentCount += 1;
    }
  });

  return sentCount;
}

function sendToSocket(socket, type, data = {}) {
  if (socket.readyState !== WebSocket.OPEN) {
    return;
  }

  socket.send(
    JSON.stringify({
      type,
      data,
      sentAt: new Date().toISOString()
    })
  );
}

module.exports = {
  broadcast,
  getWebSocketStatus,
  initWebSocket
};
