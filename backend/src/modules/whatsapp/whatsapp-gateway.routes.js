const express = require('express');
const router = express.Router();
const controller = require('./whatsapp-gateway.controller');
const whatsappGateway = require('./whatsapp-gateway.service');
const { authenticate } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/rbac');
const { successResponse, errorResponse } = require('../../utils/response');
const env = require('../../config/env');

// Internal worker/service dispatch endpoint (Protected by x-internal-secret)
router.post('/internal-send', async (req, res) => {
  try {
    const internalSecret = req.headers['x-internal-secret'];
    const validSecret = process.env.JWT_SECRET || env.JWT_SECRET;
    if (!internalSecret || internalSecret !== validSecret) {
      return errorResponse(res, 'Akses internal tidak sah.', 401);
    }

    const { to, message } = req.body;
    if (!to || !message) {
      return errorResponse(res, 'Nomor tujuan dan pesan wajib disertakan.', 400);
    }

    const result = await whatsappGateway.sendMessage(to, message);
    return successResponse(res, result, 'Pesan diproses oleh WhatsApp Gateway');
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
});

// All user-facing endpoints require menu:whatsapp permission
router.use(authenticate);
router.use(requirePermission('menu:whatsapp'));

router.get('/status', (req, res, next) => controller.getStatus(req, res, next));
router.post('/connect', (req, res, next) => controller.connect(req, res, next));
router.post('/disconnect', (req, res, next) => controller.disconnect(req, res, next));
router.post('/test-connection', (req, res, next) => controller.testConnection(req, res, next));
router.post('/test-send', (req, res, next) => controller.testSend(req, res, next));

module.exports = router;

