const app = require('./app');
const { initDatabase } = require('./database');
const { connectMqtt } = require('./services/mqttService');

const port = Number(process.env.PORT || 3000);

async function startServer() {
  await initDatabase();
  connectMqtt();

  app.listen(port, () => {
    console.log(`Backend API is running at http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start backend API:', error);
  process.exit(1);
});
