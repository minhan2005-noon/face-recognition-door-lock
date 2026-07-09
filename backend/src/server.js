require('dotenv').config();
console.log('MQTT_URL =', process.env.MQTT_URL);
const http = require('http');
const app = require('./app');
const { initDatabase } = require('./database');
const { connectMqtt } = require('./services/mqttService');
const { initWebSocket } = require('./services/webSocketService');

const port = Number(process.env.PORT || 3000);

async function startServer() {
  await initDatabase();
  const server = http.createServer(app);

  initWebSocket(server);
  connectMqtt();

  server.listen(port, () => {
    console.log(`Backend API is running at http://localhost:${port}`);
    console.log(`WebSocket gateway is running at ws://localhost:${port}/ws`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start backend API:', error);
  process.exit(1);
});
