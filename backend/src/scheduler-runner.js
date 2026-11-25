const schedulerService = require('./modules/scheduler/scheduler.service');

console.log('Starting MRMS Scheduler Service (Late Arrival, Overdue, Reminders)...');
schedulerService.start();

process.on('SIGTERM', () => {
  console.log('Stopping Scheduler Service...');
  schedulerService.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Stopping Scheduler Service...');
  schedulerService.stop();
  process.exit(0);
});

