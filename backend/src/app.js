const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./modules/auth/auth.routes');
const usersRoutes = require('./modules/users/users.routes');
const departmentsRoutes = require('./modules/departments/departments.routes');
const roomsRoutes = require('./modules/rooms/rooms.routes');
const bookingsRoutes = require('./modules/bookings/bookings.routes');
const roomUsageRoutes = require('./modules/room-usage/room-usage.routes');
const qrRoutes = require('./modules/qr/qr.routes');
const notificationsRoutes = require('./modules/notifications/notification.routes');
const reportsRoutes = require('./modules/reports/reports.routes');
const settingsRoutes = require('./modules/settings/settings.routes');
const auditRoutes = require('./modules/audit/audit.routes');
const whatsappRoutes = require('./modules/whatsapp/whatsapp-gateway.routes');

function createApp() {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(cookieParser());

  // Health check endpoint
  const healthHandler = (req, res) => {
    res.status(200).json({
      status: 'healthy',
      system: 'Meeting Room Management System (MRMS)',
      company: 'PT Cemindo Gemilang Tbk - Plant Batam',
      timestamp: new Date().toISOString(),
    });
  };

  app.get('/health', healthHandler);
  app.get('/mrms/health', healthHandler);
  app.get('/mrms/api/health', healthHandler);
  app.get('/meeting-room/health', healthHandler);
  app.get('/meeting-room/api/health', healthHandler);

  const mountRoutes = (router) => {
    router.use('/auth', authRoutes);
    router.use('/users', usersRoutes);
    router.use('/departments', departmentsRoutes);
    router.use('/rooms', roomsRoutes);
    router.use('/bookings', bookingsRoutes);
    router.use('/room-usage', roomUsageRoutes);
    router.use('/qr', qrRoutes);
    router.use('/notifications', notificationsRoutes);
    router.use('/reports', reportsRoutes);
    router.use('/settings', settingsRoutes);
    router.use('/audit', auditRoutes);
    router.use('/whatsapp', whatsappRoutes);
  };

  const apiRouter = express.Router();
  mountRoutes(apiRouter);

  // Mount on subpaths (/mrms/api, /meeting-room/api) and root API for maximum flexibility
  app.use('/mrms/api', apiRouter);
  app.use('/meeting-room/api', apiRouter);
  app.use('/api', apiRouter);

  // Global Error Handler
  app.use(errorHandler);

  return app;
}

module.exports = createApp;

