const express = require('express');
const router = express.Router();
const controller = require('./room-usage.controller');
const { authenticate } = require('../../middleware/auth');
const { requirePermission, requireAnyPermission } = require('../../middleware/rbac');
const { z } = require('zod');
const { validateBody } = require('../../middleware/validate');

const checkinSchema = z.object({
  qrToken: z.string().min(5, 'QR Token wajib diisi'),
  bookingId: z.string().uuid().optional().nullable(),
});

const checkoutSchema = z.object({
  qrToken: z.string().min(5, 'QR Token wajib diisi'),
  bookingId: z.string().uuid().optional().nullable(),
});

const manualCheckoutSchema = z.object({
  sessionId: z.string().uuid('ID sesi tidak valid'),
  verifiedActualEndTime: z.string().datetime().optional().nullable(),
  reason: z.string().min(5, 'Alasan manual checkout minimal 5 karakter'),
});

router.use(authenticate);

router.post('/checkin/preview', validateBody(checkinSchema), controller.handleCheckinPreview);
router.post('/checkin', validateBody(checkinSchema), controller.handleCheckin);
router.post('/checkout/preview', validateBody(checkoutSchema), controller.handleCheckoutPreview);
router.post('/checkout', validateBody(checkoutSchema), controller.handleCheckout);

// HRGA / Admin / Permitted users via checklist
router.post('/manual-checkout', requireAnyPermission(['room:force_checkout', 'menu:overdue', 'menu:live_monitoring']), validateBody(manualCheckoutSchema), controller.handleManualCheckout);
router.get('/active', requireAnyPermission(['menu:live_monitoring', 'menu:overdue']), controller.getActiveSessions);
router.get('/overdue', requireAnyPermission(['menu:overdue', 'room:force_checkout']), controller.getOverdueSessions);

module.exports = router;

