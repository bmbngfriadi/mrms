const express = require('express');
const router = express.Router();
const controller = require('./notification.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');

router.use(authenticate);

// Admin can view logs
router.get('/logs', requireRole(['ADMIN']), controller.getNotificationLogs);

// Admin can retry failed notifications
router.post('/:id/retry', requireRole(['ADMIN']), controller.retryNotification);

// Admin can test send email
router.post('/test-email', requireRole(['ADMIN']), controller.testEmail);

// Admin manages HRGA recipients
router.get('/recipients', requireRole(['ADMIN']), controller.getRecipients);
router.post('/recipients', requireRole(['ADMIN']), controller.createRecipient);
router.put('/recipients/:id', requireRole(['ADMIN']), controller.updateRecipient);
router.delete('/recipients/:id', requireRole(['ADMIN']), controller.deleteRecipient);

module.exports = router;

