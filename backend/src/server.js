const createApp = require('./app');
const env = require('./config/env');
const notificationWorker = require('./modules/notifications/notification.worker');
const schedulerService = require('./modules/scheduler/scheduler.service');
const whatsappGateway = require('./modules/whatsapp/whatsapp-gateway.service');
const fs = require('fs');
const path = require('path');

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`====================================================`);
  console.log(`PT CEMINDO GEMILANG Tbk — PLANT BATAM`);
  console.log(`Meeting Room Management System (MRMS) API Server`);
  console.log(`Port: ${env.PORT}`);
  console.log(`Mode: ${env.NODE_ENV} | Notifications: ${env.NOTIFICATION_MODE}`);
  console.log(`Subpath Base: ${env.API_PREFIX}`);
  console.log(`Health Check: http://localhost:${env.PORT}${env.API_PREFIX}/health`);
  console.log(`====================================================`);

  // Auto-reconnect WhatsApp Gateway if session credentials exist
  const credsFile = path.join(whatsappGateway.sessionDir, 'creds.json');
  if (fs.existsSync(credsFile)) {
    console.log('[WA Gateway] Found existing credentials, auto-connecting...');
    whatsappGateway.connect().catch((err) => {
      console.warn('[WA Gateway] Auto-connect error on startup:', err.message);
    });
  }
});

// If RUN_EMBEDDED_WORKERS=true, run worker and scheduler in same process
if (process.env.RUN_EMBEDDED_WORKERS === 'true') {
  notificationWorker.start();
  schedulerService.start();
}

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    notificationWorker.stop();
    schedulerService.stop();
    process.exit(0);
  });
});

