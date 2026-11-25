const express = require('express');
const router = express.Router();
const controller = require('./bookings.controller');
const { authenticate } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/rbac');
const { z } = require('zod');
const { validateBody } = require('../../middleware/validate');

const createBookingSchema = z.object({
  roomId: z.string().uuid('ID Ruangan tidak valid'),
  title: z.string().min(3, 'Agenda meeting minimal 3 karakter'),
  meetingType: z.string().default('INTERNAL'),
  attendeesCount: z.number().int().positive('Jumlah peserta minimal 1 orang'),
  notes: z.string().optional().nullable(),
  startTime: z.string().datetime('Format tanggal/waktu mulai harus ISO valid'),
  endTime: z.string().datetime('Format tanggal/waktu selesai harus ISO valid'),
});

const rescheduleSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  reason: z.string().optional(),
});

const extendSchema = z.object({
  additionalMinutes: z.number().int().positive(),
});

const cancelSchema = z.object({
  reason: z.string().optional(),
});

router.use(authenticate);

router.get('/', controller.getBookings);
router.get('/:id', controller.getBookingById);
router.post('/', validateBody(createBookingSchema), controller.createBooking);
router.put('/:id/reschedule', validateBody(rescheduleSchema), controller.rescheduleBooking);
router.post('/:id/extend', validateBody(extendSchema), controller.extendBooking);
router.post('/:id/cancel', validateBody(cancelSchema), controller.cancelBooking);

// Administrator / Permitted User: Direct Full Edit & Delete on Booking
router.put('/:id/admin-edit', requirePermission('booking:edit_any'), controller.adminUpdateBooking);
router.delete('/:id', requirePermission('booking:delete_any'), controller.adminDeleteBooking);

// Administrator / Permitted User: Riwayat Penggunaan Edit & Delete
router.put('/:id/history-edit', requirePermission('history:edit'), controller.adminUpdateHistory);
router.delete('/:id/history', requirePermission('history:delete'), controller.adminDeleteHistory);

module.exports = router;

