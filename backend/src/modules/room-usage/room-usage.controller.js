const prisma = require('../../config/database');
const roomUsageService = require('./room-usage.service');
const { successResponse, errorResponse } = require('../../utils/response');
const { logAudit } = require('../../utils/audit');

async function handleCheckinPreview(req, res, next) {
  try {
    const { qrToken, bookingId } = req.body;
    const result = await roomUsageService.previewCheckin({
      qrToken,
      bookingId,
      userId: req.user.id,
      userRole: req.user.role,
    });

    return successResponse(res, result, 'Data reservasi siap untuk konfirmasi check-in.');
  } catch (err) {
    next(err);
  }
}

async function handleCheckin(req, res, next) {
  try {
    const { qrToken, bookingId } = req.body;
    const result = await roomUsageService.checkin({
      qrToken,
      bookingId,
      userId: req.user.id,
      userRole: req.user.role,
      req,
    });

    await logAudit({
      userId: req.user.id,
      action: 'QR_CHECKIN',
      resourceType: 'ROOM_USAGE',
      resourceId: result.session.id,
      newValues: {
        bookingId: result.booking.id,
        roomId: result.room.id,
        actualCheckin: result.session.actualCheckin,
      },
      req,
    });

    return successResponse(res, result, result.message || 'Check-in berhasil tercatat. Selamat menggunakan ruangan.');
  } catch (err) {
    next(err);
  }
}

async function handleCheckout(req, res, next) {
  try {
    const { qrToken, bookingId } = req.body;
    const result = await roomUsageService.checkout({
      qrToken,
      bookingId,
      userId: req.user.id,
      userRole: req.user.role,
    });

    await logAudit({
      userId: req.user.id,
      action: 'QR_CHECKOUT',
      resourceType: 'ROOM_USAGE',
      resourceId: result.session.id,
      newValues: {
        bookingId: result.booking.id,
        roomId: result.room.id,
        actualCheckout: result.session.actualCheckout,
      },
      req,
    });

    return successResponse(res, result, result.message || 'Check-out berhasil tercatat. Terima kasih.');
  } catch (err) {
    next(err);
  }
}

async function handleManualCheckout(req, res, next) {
  try {
    const { sessionId, verifiedActualEndTime, reason } = req.body;
    const result = await roomUsageService.manualCheckout({
      sessionId,
      verifiedActualEndTime,
      reason,
      officerId: req.user.id,
      req,
    });

    await logAudit({
      userId: req.user.id,
      action: 'MANUAL_CHECKOUT',
      resourceType: 'ROOM_USAGE',
      resourceId: sessionId,
      newValues: {
        verifiedActualEndTime,
        reason,
        officer: req.user.name,
      },
      req,
    });

    return successResponse(
      res,
      result,
      'Manual checkout berhasil diproses. Sesi penggunaan telah ditutup dan status ruangan diperbarui.'
    );
  } catch (err) {
    next(err);
  }
}

async function getActiveSessions(req, res, next) {
  try {
    const sessions = await prisma.roomUsageSession.findMany({
      where: { status: 'ACTIVE' },
      include: {
        room: true,
        booking: {
          include: {
            user: { select: { id: true, name: true, phone: true, department: true } },
          },
        },
      },
      orderBy: { actualCheckin: 'desc' },
    });
    return successResponse(res, sessions, 'Daftar sesi penggunaan aktif.');
  } catch (err) {
    next(err);
  }
}

async function getOverdueSessions(req, res, next) {
  try {
    const sessions = await prisma.roomUsageSession.findMany({
      where: { status: 'OVERDUE' },
      include: {
        room: true,
        booking: {
          include: {
            user: { select: { id: true, name: true, phone: true, department: true } },
          },
        },
      },
      orderBy: { actualCheckin: 'asc' },
    });
    return successResponse(res, sessions, 'Daftar sesi penggunaan overdue.');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleCheckinPreview,
  handleCheckin,
  handleCheckout,
  handleManualCheckout,
  getActiveSessions,
  getOverdueSessions,
};

