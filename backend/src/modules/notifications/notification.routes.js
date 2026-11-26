const express = require('express');
const router = express.Router();
const controller = require('./notification.controller');
const { authenticate } = require('../../middleware/auth');
const { requirePermission, requireAnyPermission } = require('../../middleware/rbac');

router.use(authenticate);

// View logs & retry/test email
router.get('/logs', requirePermission('menu:notification_logs'), controller.getNotificationLogs);

router.post('/:id/retry', requirePermission('menu:notification_logs'), controller.retryNotification);

router.post('/test-email', requirePermission('menu:notification_logs'), controller.testEmail);

// Manage HRGA recipients
router.get('/recipients', requireAnyPermission(['menu:settings', 'system:settings_edit', 'menu:notification_logs']), controller.getRecipients);
router.post('/recipients', requireAnyPermission(['menu:settings', 'system:settings_edit', 'menu:notification_logs']), controller.createRecipient);
router.put('/recipients/:id', requireAnyPermission(['menu:settings', 'system:settings_edit', 'menu:notification_logs']), controller.updateRecipient);
router.delete('/recipients/:id', requireAnyPermission(['menu:settings', 'system:settings_edit', 'menu:notification_logs']), controller.deleteRecipient);

module.exports = router;

