const prisma = require('../../config/database');
const bookingService = require('./bookings.service');
const { successResponse, errorResponse } = require('../../utils/response');
const { logAudit } = require('../../utils/audit');

async function getBookings(req, res, next) {
  try {
    const { roomId, status, userId, startDate, endDate, myOnly } = req.query;
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '50', 10);
    const skip = (page - 1) * limit;

    const where = {};

    if (roomId) where.roomId = roomId;
    if (status) where.status = status;

    if (myOnly === 'true' || (req.user.role === 'EMPLOYEE' && myOnly !== 'false' && !startDate && !endDate)) {
      where.userId = req.user.id;
    } else if (userId) {
      where.userId = userId;
    }

    if (startDate && endDate) {
      where.startTime = { lte: new Date(endDate) };
      where.endTime = { gte: new Date(startDate) };
    } else if (startDate) {
      where.startTime = { gte: new Date(startDate) };
    }

    const [total, bookings] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startTime: 'desc' },
        include: {
          room: { select: { id: true, code: true, name: true, location: true, capacity: true } },
          user: { select: { id: true, name: true, email: true, phone: true, department: true } },
          usageSession: true,
        },
      }),
    ]);

    return successResponse(res, bookings, 'Daftar reservasi berhasil diambil.', 200, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
}

async function getBookingById(req, res, next) {
  try {
    const { id } = req.params;
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        room: { include: { facilities: true } },
        user: { select: { id: true, name: true, email: true, phone: true, department: true } },
        usageSession: {
          include: {
            manualCheckoutUser: { select: { id: true, name: true } },
          },
        },
        history: {
          include: { actor: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!booking) {
      return errorResponse(res, 'Booking tidak ditemukan.', 404);
    }

    // Role check: Employee can view details if it's theirs or public summary
    return successResponse(res, booking, 'Detail booking berhasil diambil.');
  } catch (err) {
    next(err);
  }
}

async function createBooking(req, res, next) {
  try {
    const { roomId, title, meetingType, attendeesCount, notes, startTime, endTime } = req.body;

    const booking = await bookingService.createBooking({
      roomId,
      userId: req.user.id,
      title,
      meetingType,
      attendeesCount: parseInt(attendeesCount, 10),
      notes,
      startTime,
      endTime,
    });

    await logAudit({
      userId: req.user.id,
      action: 'CREATE_BOOKING',
      resourceType: 'BOOKING',
      resourceId: booking.id,
      newValues: { bookingCode: booking.bookingCode, roomId, startTime, endTime },
      req,
    });

    return successResponse(res, booking, 'Booking berhasil dibuat dan terkonfirmasi otomatis.', 201);
  } catch (err) {
    next(err);
  }
}

async function rescheduleBooking(req, res, next) {
  try {
    const { id } = req.params;
    const { startTime, endTime, reason } = req.body;

    const updated = await bookingService.rescheduleBooking({
      bookingId: id,
      userId: req.user.id,
      userRole: req.user.role,
      newStartTime: startTime,
      newEndTime: endTime,
      reason,
    });

    await logAudit({
      userId: req.user.id,
      action: 'RESCHEDULE_BOOKING',
      resourceType: 'BOOKING',
      resourceId: id,
      newValues: { startTime, endTime, reason },
      req,
    });

    return successResponse(res, updated, 'Jadwal booking berhasil diperbarui.');
  } catch (err) {
    next(err);
  }
}

async function extendBooking(req, res, next) {
  try {
    const { id } = req.params;
    const { additionalMinutes } = req.body;

    const updated = await bookingService.extendBooking({
      bookingId: id,
      userId: req.user.id,
      userRole: req.user.role,
      additionalMinutes: parseInt(additionalMinutes, 10),
    });

    await logAudit({
      userId: req.user.id,
      action: 'EXTEND_BOOKING',
      resourceType: 'BOOKING',
      resourceId: id,
      newValues: { additionalMinutes, newEndTime: updated.endTime },
      req,
    });

    return successResponse(res, updated, `Waktu meeting berhasil diperpanjang +${additionalMinutes} menit.`);
  } catch (err) {
    next(err);
  }
}

async function cancelBooking(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const cancelled = await bookingService.cancelBooking({
      bookingId: id,
      userId: req.user.id,
      userRole: req.user.role,
      reason,
    });

    await logAudit({
      userId: req.user.id,
      action: 'CANCEL_BOOKING',
      resourceType: 'BOOKING',
      resourceId: id,
      newValues: { reason },
      req,
    });

    return successResponse(res, cancelled, 'Booking berhasil dibatalkan.');
  } catch (err) {
    next(err);
  }
}

async function adminUpdateBooking(req, res, next) {
  try {
    const { id } = req.params;
    const updated = await bookingService.adminUpdateBooking({
      bookingId: id,
      adminUserId: req.user.id,
      updateData: req.body,
    });

    await logAudit({
      userId: req.user.id,
      action: 'ADMIN_UPDATE_BOOKING',
      resourceType: 'BOOKING',
      resourceId: id,
      newValues: req.body,
      req,
    });

    return successResponse(res, updated, 'Data reservasi berhasil diperbarui oleh Administrator.');
  } catch (err) {
    next(err);
  }
}

async function adminDeleteBooking(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    const deleted = await bookingService.adminDeleteBooking({
      bookingId: id,
      adminUserId: req.user.id,
      reason,
    });

    await logAudit({
      userId: req.user.id,
      action: 'ADMIN_DELETE_BOOKING',
      resourceType: 'BOOKING',
      resourceId: id,
      newValues: { reason, deletedCode: deleted.bookingCode, title: deleted.title },
      req,
    });

    return successResponse(res, deleted, `Reservasi (${deleted.bookingCode} - ${deleted.title}) berhasil dihapus permanen dari sistem.`);
  } catch (err) {
    next(err);
  }
}

async function adminUpdateHistory(req, res, next) {
  try {
    const { id } = req.params;
    const updated = await bookingService.adminUpdateHistory({
      bookingId: id,
      adminUserId: req.user.id,
      updateData: req.body,
    });

    await logAudit({
      userId: req.user.id,
      action: 'ADMIN_UPDATE_HISTORY',
      resourceType: 'BOOKING',
      resourceId: id,
      newValues: req.body,
      req,
    });

    return successResponse(res, updated, 'Data riwayat penggunaan berhasil diperbarui oleh Administrator.');
  } catch (err) {
    next(err);
  }
}

async function adminDeleteHistory(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    const deleted = await bookingService.adminDeleteBooking({
      bookingId: id,
      adminUserId: req.user.id,
      reason: reason || 'Penghapusan arsip riwayat penggunaan oleh Administrator',
    });

    await logAudit({
      userId: req.user.id,
      action: 'ADMIN_DELETE_HISTORY',
      resourceType: 'BOOKING',
      resourceId: id,
      newValues: { reason, deletedCode: deleted.bookingCode, title: deleted.title },
      req,
    });

    return successResponse(res, deleted, `Riwayat penggunaan (${deleted.bookingCode}) berhasil dihapus dari sistem.`);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getBookings,
  getBookingById,
  createBooking,
  rescheduleBooking,
  extendBooking,
  cancelBooking,
  adminUpdateBooking,
  adminDeleteBooking,
  adminUpdateHistory,
  adminDeleteHistory,
};

