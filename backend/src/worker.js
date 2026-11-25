const notificationWorker = require('./modules/notifications/notification.worker');

console.log('Starting MRMS Notification Worker Service...');
notificationWorker.start();

process.on('SIGTERM', () => {
  console.log('Stopping Notification Worker...');
  notificationWorker.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Stopping Notification Worker...');
  notificationWorker.stop();
  process.exit(0);
});

