const express = require('express');
const router = express.Router();
const controller = require('./room-usage.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
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

router.post('/checkin', validateBody(checkinSchema), controller.handleCheckin);
router.post('/checkout', validateBody(checkoutSchema), controller.handleCheckout);

// HRGA & Admin only
router.post('/manual-checkout', requireRole(['HRGA', 'ADMIN']), validateBody(manualCheckoutSchema), controller.handleManualCheckout);
router.get('/active', requireRole(['HRGA', 'ADMIN']), controller.getActiveSessions);
router.get('/overdue', requireRole(['HRGA', 'ADMIN']), controller.getOverdueSessions);

module.exports = router;

