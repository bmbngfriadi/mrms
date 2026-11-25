const prisma = require('../../config/database');
const { getSystemSettings } = require('../../config/system-settings');
const notificationService = require('../notifications/notification.service');
const { toZonedTime } = require('date-fns-tz');

class BookingService {
  /**
   * Validate all business rules before booking
   */
  async validateBookingRules({ roomId, userId, startTime, endTime, attendeesCount }) {
    const settings = await getSystemSettings();
    const now = new Date();

    // 1. Time validity
    if (startTime >= endTime) {
      throw { statusCode: 400, message: 'Waktu selesai harus lebih besar dari waktu mulai.' };
    }

    if (startTime < new Date(now.getTime() - 5 * 60 * 1000)) {
      throw { statusCode: 400, message: 'Waktu mulai tidak boleh berada di masa lampau.' };
    }

    // 2. Duration checks
    const durationMinutes = (endTime.getTime() - startTime.getTime()) / (60 * 1000);
    const minDuration = parseInt(settings.DURATION_MIN_MINUTES, 10) || 30;
    const maxDuration = parseInt(settings.DURATION_MAX_MINUTES, 10) || 240;

    if (durationMinutes < minDuration) {
      throw {
        statusCode: 400,
        message: `Durasi booking minimal adalah ${minDuration} menit. Anda memilih ${durationMinutes} menit.`,
      };
    }

    if (durationMinutes > maxDuration) {
      throw {
        statusCode: 400,
        message: `Durasi booking maksimal adalah ${maxDuration / 60} jam (${maxDuration} menit). Anda memilih ${durationMinutes} menit.`,
      };
    }

    // 3. Booking Horizon check
    const horizonDays = parseInt(settings.BOOKING_HORIZON_DAYS, 10) || 30;
    const maxHorizonDate = new Date(now.getTime() + horizonDays * 24 * 60 * 60 * 1000);
    if (startTime > maxHorizonDate) {
      throw {
        statusCode: 400,
        message: `Booking hanya dapat dibuat maksimal ${horizonDays} hari ke depan.`,
      };
    }

    // 4. Operational Hours & Days (Asia/Jakarta timezone)
    const zonedStart = toZonedTime(startTime, settings.TIMEZONE || 'Asia/Jakarta');
    const dayOfWeek = zonedStart.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const allowedDays = (settings.OPERATIONAL_DAYS || '1,2,3,4,5').split(',').map((d) => parseInt(d.trim(), 10));

    if (!allowedDays.includes(dayOfWeek)) {
      throw {
        statusCode: 400,
        message: 'Booking tidak diizinkan di luar hari operasional kerja (Senin - Jumat).',
      };
    }

    const startHour = zonedStart.getHours();
    const startMin = zonedStart.getMinutes();
    const startTimeInMinutes = startHour * 60 + startMin;

    const zonedEnd = toZonedTime(endTime, settings.TIMEZONE || 'Asia/Jakarta');
    const endHour = zonedEnd.getHours();
    const endMin = zonedEnd.getMinutes();
    const endTimeInMinutes = endHour * 60 + endMin;

    const [opStartH, opStartM] = (settings.OPERATIONAL_HOURS_START || '08:00').split(':').map(Number);
    const [opEndH, opEndM] = (settings.OPERATIONAL_HOURS_END || '17:00').split(':').map(Number);
    const opStartInMinutes = opStartH * 60 + opStartM;
    const opEndInMinutes = opEndH * 60 + opEndM;

    if (startTimeInMinutes < opStartInMinutes || endTimeInMinutes > opEndInMinutes) {
      throw {
        statusCode: 400,
        message: `Booking harus berada dalam jam operasional (${settings.OPERATIONAL_HOURS_START} - ${settings.OPERATIONAL_HOURS_END} WIB).`,
      };
    }

    // 5. Room & Capacity check
    const room = await prisma.meetingRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw { statusCode: 404, message: 'Ruang meeting tidak ditemukan.' };
    }

    if (!room.isActive) {
      throw { statusCode: 400, message: 'Ruang meeting sedang tidak aktif atau dinonaktifkan.' };
    }

    if (attendeesCount > room.capacity) {
      throw {
        statusCode: 400,
        message: `Jumlah peserta (${attendeesCount}) melebihi kapasitas ruangan '${room.name}' (maksimal ${room.capacity} orang).`,
      };
    }

    return room;
  }

  /**
   * Check for conflicts against existing bookings, maintenance blocks, and active usage sessions
   */
  async checkConflicts(tx, roomId, startTime, endTime, excludeBookingId = null) {
    // 1. Conflict with bookings
    const bookingConflict = await tx.booking.findFirst({
      where: {
        roomId,
        id: excludeBookingId ? { not: excludeBookingId } : undefined,
        status: { in: ['CONFIRMED', 'CHECKED_IN', 'NO_SHOW_PENDING'] },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      include: {
        user: { select: { name: true, department: { select: { name: true } } } },
      },
    });

    if (bookingConflict) {
      throw {
        statusCode: 409,
        message: `Bentrok jadwal! Ruangan telah dibooking oleh ${bookingConflict.user.name} (${bookingConflict.user.department.name}) untuk agenda '${bookingConflict.title}'.`,
      };
    }

    // 2. Conflict with maintenance/blocks
    const blockConflict = await tx.roomBlock.findFirst({
      where: {
        roomId,
        isActive: true,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });

    if (blockConflict) {
      throw {
        statusCode: 409,
        message: `Ruangan sedang dalam status ${blockConflict.blockType}: '${blockConflict.title}' (${blockConflict.reason}).`,
      };
    }

    // 3. Conflict with active/overdue usage sessions that started before and haven't checked out yet
    const now = new Date();
    if (startTime <= now) {
      const activeSession = await tx.roomUsageSession.findFirst({
        where: {
          roomId,
          status: { in: ['ACTIVE', 'OVERDUE'] },
          bookingId: excludeBookingId ? { not: excludeBookingId } : undefined,
        },
        include: {
          booking: {
            include: { user: { select: { name: true } } },
          },
        },
      });

      if (activeSession) {
        throw {
          statusCode: 409,
          message: `Ruangan saat ini masih digunakan oleh ${activeSession.booking?.user?.name || 'sesi sebelumnya'} dan belum checkout. Harap tunggu atau hubungi HRGA.`,
        };
      }
    }
  }

  /**
   * Create Booking with strict Concurrency Lock & Anti-Double-Booking Protection
   */
  async createBooking({ roomId, userId, title, meetingType = 'INTERNAL', attendeesCount, requirements = [], notes, startTime, endTime }) {
    const start = new Date(startTime);
    const end = new Date(endTime);

    const cleanReqs = Array.isArray(requirements)
      ? requirements.map((r) => String(r).trim()).filter(Boolean)
      : [];
    const reqText = cleanReqs.length > 0 ? cleanReqs.join(', ') : null;
    const cleanNotes = notes ? String(notes).trim() : null;
    const combinedNotes = [
      reqText ? `[Kebutuhan: ${reqText}]` : null,
      cleanNotes,
    ]
      .filter(Boolean)
      .join(' • ') || null;

    // Initial business validation
    const room = await this.validateBookingRules({
      roomId,
      userId,
      startTime: start,
      endTime: end,
      attendeesCount,
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { department: true },
    });

    const bookingCode = `BKG-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    // Transaction with advisory lock on roomId to serialize concurrent requests for the same room
    const newBooking = await prisma.$transaction(async (tx) => {
      // PostgreSQL advisory transaction lock
      await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext('room_' || $1))`, roomId);

      // Re-verify conflicts inside locked transaction
      await this.checkConflicts(tx, roomId, start, end);

      const booking = await tx.booking.create({
        data: {
          bookingCode,
          roomId,
          userId,
          title,
          meetingType,
          attendeesCount,
          notes: combinedNotes,
          startTime: start,
          endTime: end,
          status: 'CONFIRMED',
        },
        include: {
          room: true,
          user: { include: { department: true } },
        },
      });

      await tx.bookingHistory.create({
        data: {
          bookingId: booking.id,
          actorId: userId,
          action: 'CREATED',
          newData: {
            bookingCode,
            roomId,
            startTime: start,
            endTime: end,
            status: 'CONFIRMED',
          },
          reason: 'Booking baru dibuat oleh karyawan.',
        },
      });

      return booking;
    });

    // Enqueue notifications (asynchronous, does not block main transaction)
    notificationService.notifyEvent('BOOKING_CREATED', {
      bookingId: newBooking.id,
      bookingCode: newBooking.bookingCode,
      roomName: newBooking.room.name,
      roomLocation: newBooking.room.location,
      userName: newBooking.user.name,
      departmentName: newBooking.user.department.name,
      title: newBooking.title,
      startTime: newBooking.startTime,
      endTime: newBooking.endTime,
      bookerEmail: newBooking.user.email,
      bookerPhone: newBooking.user.phone,
      bookerName: newBooking.user.name,
      requirements: reqText,
      notes: cleanNotes,
    });

    return newBooking;
  }

  /**
   * Reschedule booking (Only before check-in)
   */
  async rescheduleBooking({ bookingId, userId, userRole, newStartTime, newEndTime, reason }) {
    const start = new Date(newStartTime);
    const end = new Date(newEndTime);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { room: true, user: { include: { department: true } } },
    });

    if (!booking) {
      throw { statusCode: 404, message: 'Booking tidak ditemukan.' };
    }

    // Role & ownership check
    if (userRole === 'EMPLOYEE' && booking.userId !== userId) {
      throw { statusCode: 403, message: 'Anda tidak memiliki wewenang untuk mengubah booking karyawan lain.' };
    }

    if (booking.status !== 'CONFIRMED' && booking.status !== 'NO_SHOW_PENDING') {
      throw {
        statusCode: 400,
        message: `Booking dengan status ${booking.status} tidak dapat di-reschedule.`,
      };
    }

    // Validate rules
    await this.validateBookingRules({
      roomId: booking.roomId,
      userId: booking.userId,
      startTime: start,
      endTime: end,
      attendeesCount: booking.attendeesCount,
    });

    const updated = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext('room_' || $1))`, booking.roomId);

      await this.checkConflicts(tx, booking.roomId, start, end, booking.id);

      const oldData = { startTime: booking.startTime, endTime: booking.endTime, status: booking.status };

      const res = await tx.booking.update({
        where: { id: booking.id },
        data: {
          startTime: start,
          endTime: end,
          status: 'CONFIRMED', // Restores from NO_SHOW_PENDING to CONFIRMED
        },
        include: { room: true, user: { include: { department: true } } },
      });

      await tx.bookingHistory.create({
        data: {
          bookingId: booking.id,
          actorId: userId,
          action: 'RESCHEDULED',
          previousData: oldData,
          newData: { startTime: start, endTime: end, status: 'CONFIRMED' },
          reason: reason || 'Reschedule jadwal oleh pemesan.',
        },
      });

      return res;
    });

    // Cancel old reminders and schedule fresh notifications
    await notificationService.cancelPendingReminders(booking.id);

    notificationService.notifyEvent('BOOKING_RESCHEDULED', {
      bookingId: updated.id,
      bookingCode: updated.bookingCode,
      roomName: updated.room.name,
      roomLocation: updated.room.location,
      userName: updated.user.name,
      departmentName: updated.user.department.name,
      title: updated.title,
      startTime: updated.startTime,
      endTime: updated.endTime,
      bookerEmail: updated.user.email,
      bookerPhone: updated.user.phone,
      bookerName: updated.user.name,
      reason: reason || 'Perubahan jadwal oleh pemesan.',
    });

    return updated;
  }

  /**
   * Extend booking (before scheduled end, if no conflict)
   */
  async extendBooking({ bookingId, userId, userRole, additionalMinutes }) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        room: true,
        user: { include: { department: true } },
        usageSession: true,
      },
    });

    if (!booking) {
      throw { statusCode: 404, message: 'Booking tidak ditemukan.' };
    }

    if (userRole === 'EMPLOYEE' && booking.userId !== userId) {
      throw { statusCode: 403, message: 'Anda tidak dapat memperpanjang booking orang lain.' };
    }

    if (booking.status !== 'CHECKED_IN') {
      throw {
        statusCode: 400,
        message: 'Perpanjangan hanya dapat dilakukan pada booking yang sedang aktif (CHECKED_IN).',
      };
    }

    const currentEnd = new Date(booking.endTime);
    const newEnd = new Date(currentEnd.getTime() + additionalMinutes * 60 * 1000);

    // Max duration check
    const settings = await getSystemSettings();
    const maxDuration = parseInt(settings.DURATION_MAX_MINUTES, 10) || 240;
    const totalDuration = (newEnd.getTime() - booking.startTime.getTime()) / (60 * 1000);

    if (totalDuration > maxDuration) {
      throw {
        statusCode: 400,
        message: `Total durasi setelah extension (${totalDuration} menit) melebihi batas maksimal ${maxDuration} menit.`,
      };
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext('room_' || $1))`, booking.roomId);

      await this.checkConflicts(tx, booking.roomId, currentEnd, newEnd, booking.id);

      const res = await tx.booking.update({
        where: { id: booking.id },
        data: { endTime: newEnd },
        include: { room: true, user: { include: { department: true } } },
      });

      await tx.bookingHistory.create({
        data: {
          bookingId: booking.id,
          actorId: userId,
          action: 'EXTENDED',
          previousData: { endTime: currentEnd },
          newData: { endTime: newEnd },
          reason: `Perpanjangan waktu meeting selama +${additionalMinutes} menit.`,
        },
      });

      return res;
    });

    notificationService.notifyEvent('BOOKING_EXTENDED', {
      bookingId: updated.id,
      bookingCode: updated.bookingCode,
      roomName: updated.room.name,
      roomLocation: updated.room.location,
      userName: updated.user.name,
      departmentName: updated.user.department.name,
      title: updated.title,
      startTime: updated.startTime,
      endTime: updated.endTime,
      bookerEmail: updated.user.email,
      bookerPhone: updated.user.phone,
      bookerName: updated.user.name,
      reason: `Waktu diperpanjang +${additionalMinutes} menit. Selesai pada: ${newEnd.toLocaleTimeString()}`,
    });

    return updated;
  }

  /**
   * Cancel booking (Employee can only cancel own booking before checkin)
   */
  async cancelBooking({ bookingId, userId, userRole, reason }) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { room: true, user: { include: { department: true } } },
    });

    if (!booking) {
      throw { statusCode: 404, message: 'Booking tidak ditemukan.' };
    }

    if (userRole === 'EMPLOYEE' && booking.userId !== userId) {
      throw { statusCode: 403, message: 'Anda tidak dapat membatalkan booking karyawan lain.' };
    }

    if (booking.status === 'COMPLETED' || booking.status === 'CANCELLED') {
      throw { statusCode: 400, message: `Booking sudah berstatus ${booking.status}.` };
    }

    if (userRole === 'EMPLOYEE' && booking.status === 'CHECKED_IN') {
      throw {
        statusCode: 400,
        message: 'Booking yang sudah check-in tidak dapat dibatalkan. Silakan lakukan Check-out awal (Early Release).',
      };
    }

    const cancelled = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: reason || 'Dibatalkan oleh pemesan.',
      },
      include: { room: true, user: { include: { department: true } } },
    });

    await prisma.bookingHistory.create({
      data: {
        bookingId,
        actorId: userId,
        action: 'CANCELLED',
        previousData: { status: booking.status },
        newData: { status: 'CANCELLED' },
        reason: reason || 'Dibatalkan oleh pemesan.',
      },
    });

    // Cancel all pending reminders
    await notificationService.cancelPendingReminders(bookingId);

    // Notify booker & HRGA
    notificationService.notifyEvent('BOOKING_CANCELLED', {
      bookingId: cancelled.id,
      bookingCode: cancelled.bookingCode,
      roomName: cancelled.room.name,
      roomLocation: cancelled.room.location,
      userName: cancelled.user.name,
      departmentName: cancelled.user.department.name,
      title: cancelled.title,
      startTime: cancelled.startTime,
      endTime: cancelled.endTime,
      bookerEmail: cancelled.user.email,
      bookerPhone: cancelled.user.phone,
      bookerName: cancelled.user.name,
      reason: reason || 'Dibatalkan oleh pemesan.',
    });

    return cancelled;
  }

  /**
   * Admin / Permitted User: Full Edit Booking
   */
  async adminUpdateBooking({ bookingId, adminUserId, updateData }) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { room: true, user: true, usageSession: true },
    });

    if (!booking) {
      throw { statusCode: 404, message: 'Data booking tidak ditemukan.' };
    }

    const newRoomId = updateData.roomId || booking.roomId;
    const newStartTime = updateData.startTime ? new Date(updateData.startTime) : booking.startTime;
    const newEndTime = updateData.endTime ? new Date(updateData.endTime) : booking.endTime;

    if (newStartTime >= newEndTime) {
      throw { statusCode: 400, message: 'Waktu selesai harus lebih besar dari waktu mulai.' };
    }

    // Overlap conflict check if room, start, or end changed and status is CONFIRMED or CHECKED_IN
    const finalStatus = updateData.status || booking.status;
    if (['CONFIRMED', 'CHECKED_IN'].includes(finalStatus)) {
      const conflict = await prisma.booking.findFirst({
        where: {
          id: { not: bookingId },
          roomId: newRoomId,
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
          AND: [
            { startTime: { lt: newEndTime } },
            { endTime: { gt: newStartTime } },
          ],
        },
      });

      if (conflict) {
        throw {
          statusCode: 409,
          message: `Konflik jadwal! Ruangan sudah terisi oleh booking lain (${conflict.bookingCode}) pada rentang jam tersebut.`,
        };
      }
    }

    const payload = {};
    if (updateData.title !== undefined) payload.title = updateData.title.trim();
    if (updateData.meetingType !== undefined) payload.meetingType = updateData.meetingType;
    if (updateData.attendeesCount !== undefined) payload.attendeesCount = parseInt(updateData.attendeesCount, 10);
    if (updateData.notes !== undefined) payload.notes = updateData.notes;
    if (updateData.roomId !== undefined) payload.roomId = updateData.roomId;
    if (updateData.startTime !== undefined) payload.startTime = newStartTime;
    if (updateData.endTime !== undefined) payload.endTime = newEndTime;
    if (updateData.status !== undefined) payload.status = updateData.status;
    if (updateData.cancellationReason !== undefined) payload.cancellationReason = updateData.cancellationReason;
    if (updateData.status === 'CANCELLED' && !booking.cancelledAt) {
      payload.cancelledAt = new Date();
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: payload,
      include: {
        room: true,
        user: { include: { department: true } },
        usageSession: true,
      },
    });

    await prisma.bookingHistory.create({
      data: {
        bookingId,
        actorId: adminUserId,
        action: 'ADMIN_UPDATED',
        previousData: {
          title: booking.title,
          startTime: booking.startTime,
          endTime: booking.endTime,
          roomId: booking.roomId,
          status: booking.status,
        },
        newData: payload,
        reason: updateData.adminNote || 'Pembaruan data booking oleh Administrator.',
      },
    });

    return updated;
  }

  /**
   * Admin / Permitted User: Delete Booking Permanently
   */
  async adminDeleteBooking({ bookingId, adminUserId, reason }) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { room: true, user: true },
    });

    if (!booking) {
      throw { statusCode: 404, message: 'Data booking tidak ditemukan.' };
    }

    // Cancel pending notification reminders
    await notificationService.cancelPendingReminders(bookingId);

    // Delete related NotificationOutbox
    await prisma.notificationOutbox.deleteMany({
      where: { eventId: bookingId },
    }).catch(() => {});

    // Delete booking (cascades to bookingHistory and roomUsageSession)
    await prisma.booking.delete({
      where: { id: bookingId },
    });

    return { id: bookingId, bookingCode: booking.bookingCode, title: booking.title };
  }

  /**
   * Admin / Permitted User: Update History Usage
   */
  async adminUpdateHistory({ bookingId, adminUserId, updateData }) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { usageSession: true, room: true, user: true },
    });

    if (!booking) {
      throw { statusCode: 404, message: 'Data riwayat booking tidak ditemukan.' };
    }

    const bookingPayload = {};
    if (updateData.title !== undefined) bookingPayload.title = updateData.title.trim();
    if (updateData.meetingType !== undefined) bookingPayload.meetingType = updateData.meetingType;
    if (updateData.notes !== undefined) bookingPayload.notes = updateData.notes;
    if (updateData.cancellationReason !== undefined) bookingPayload.cancellationReason = updateData.cancellationReason;
    if (updateData.status !== undefined) bookingPayload.status = updateData.status;

    let updatedSession = null;
    if (booking.usageSession && (updateData.actualCheckin || updateData.actualCheckout)) {
      const sessionPayload = {};
      if (updateData.actualCheckin) sessionPayload.actualCheckin = new Date(updateData.actualCheckin);
      if (updateData.actualCheckout) sessionPayload.actualCheckout = new Date(updateData.actualCheckout);

      updatedSession = await prisma.roomUsageSession.update({
        where: { id: booking.usageSession.id },
        data: sessionPayload,
      });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: bookingPayload,
      include: {
        room: true,
        user: { include: { department: true } },
        usageSession: true,
      },
    });

    await prisma.bookingHistory.create({
      data: {
        bookingId,
        actorId: adminUserId,
        action: 'HISTORY_EDITED',
        previousData: {
          title: booking.title,
          notes: booking.notes,
          cancellationReason: booking.cancellationReason,
          status: booking.status,
        },
        newData: { ...bookingPayload, session: updatedSession },
        reason: updateData.adminNote || 'Koreksi arsip riwayat penggunaan oleh Administrator.',
      },
    });

    return updatedBooking;
  }
}

const bookingService = new BookingService();
module.exports = bookingService;

