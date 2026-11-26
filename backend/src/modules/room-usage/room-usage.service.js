const prisma = require('../../config/database');
const { hashToken, cleanQrToken } = require('../../utils/crypto');
const { getSetting } = require('../../config/system-settings');
const { formatWIB } = require('../../utils/timezone');
const notificationService = require('../notifications/notification.service');

class RoomUsageService {
  /**
   * Validate QR token and booking eligibility before check-in
   */
  async validateCheckin({ qrToken, bookingId, userId, userRole, mutateLateStatus = true }) {
    if (!qrToken) {
      throw { statusCode: 400, message: 'QR Token wajib disertakan.' };
    }

    const cleanInput = cleanQrToken(qrToken);
    const now = new Date();
    const lateToleranceMinutes = parseInt(await getSetting('LATE_TOLERANCE_MINUTES'), 10) || 15;

    let room = null;
    let booking = null;

    // A. Check if user entered a Booking Code (e.g. BKG-967352-827)
    if (cleanInput.toUpperCase().startsWith('BKG-')) {
      const explicitBooking = await prisma.booking.findFirst({
        where: { bookingCode: { equals: cleanInput, mode: 'insensitive' } },
        include: { room: true, user: { include: { department: true } }, usageSession: true },
      });

      if (!explicitBooking) {
        throw {
          statusCode: 404,
          message: `Kode booking '${cleanInput}' tidak ditemukan dalam sistem.`,
        };
      }

      // Check if meeting has already ended
      if (now > explicitBooking.endTime) {
        const startStr = formatWIB(explicitBooking.startTime, 'HH:mm');
        const endStr = formatWIB(explicitBooking.endTime, 'HH:mm');
        throw {
          statusCode: 400,
          message: `'${cleanInput}' adalah Kode Reservasi untuk ruangan '${explicitBooking.room.name}', namun jadwal rapat ini (${startStr} - ${endStr} WIB) telah berakhir pada pukul ${endStr} WIB. Silakan buat reservasi baru jika ingin menggunakan ruangan.`,
        };
      }

      booking = explicitBooking;
      room = explicitBooking.room;
    }

    // B. If not a booking code, verify QR token matches room check-in token
    if (!room) {
      const cleanTokenHash = hashToken(cleanInput);
      const rawTokenHash = hashToken(qrToken);
      room = await prisma.meetingRoom.findFirst({
        where: { qrCheckinTokenHash: { in: [cleanTokenHash, rawTokenHash] } },
      });

      if (!room) {
        // Check if user scanned the CHECKOUT QR instead
        const isCheckoutRoom = await prisma.meetingRoom.findFirst({
          where: { qrCheckoutTokenHash: { in: [cleanTokenHash, rawTokenHash] } },
        });
        if (isCheckoutRoom) {
          throw {
            statusCode: 400,
            isWrongAction: true,
            correctAction: 'CHECKOUT',
            roomId: isCheckoutRoom.id,
            roomName: isCheckoutRoom.name,
            message: `QR yang dipindai adalah QR Check-Out (Keluar) untuk '${isCheckoutRoom.name}'. Silakan pindai QR Check-In (Masuk) di pintu ruangan, atau buka halaman Check-Out jika Anda ingin menyelesaikan meeting.`,
          };
        }

        // Check if user entered a partial booking code without BKG-
        const potentialBooking = await prisma.booking.findFirst({
          where: { bookingCode: { contains: cleanInput, mode: 'insensitive' } },
          include: { room: true },
        });
        if (potentialBooking) {
          throw {
            statusCode: 400,
            message: `'${cleanInput}' menyerupai kode reservasi (${potentialBooking.bookingCode}) untuk ruangan '${potentialBooking.room.name}'. Untuk Check-In, gunakan QR Code di pintu ruangan atau masukkan kode lengkap '${potentialBooking.bookingCode}'.`,
          };
        }

        throw {
          statusCode: 404,
          message: 'QR Code tidak valid atau bukan QR Check-in ruangan PT Cemindo Gemilang. Pastikan Anda memindai QR Code di pintu ruangan atau memasukkan Kode Booking yang valid.',
        };
      }
    }

    if (!room.isActive) {
      throw { statusCode: 400, message: `Ruangan '${room.name}' sedang dinonaktifkan.` };
    }

    // 2. Find eligible booking(s) if not already loaded from bookingCode
    if (!booking) {
      if (bookingId) {
        booking = await prisma.booking.findUnique({
          where: { id: bookingId },
          include: { room: true, user: { include: { department: true } }, usageSession: true },
        });
        if (!booking || booking.roomId !== room.id) {
          throw { statusCode: 400, message: 'Booking yang dipilih tidak sesuai dengan ruangan QR ini.' };
        }
      } else {
        // Find ALL today's upcoming/active bookings for this user (or all users if Admin/HRGA) in this room
        const wibDateStr = formatWIB(now, 'yyyy-MM-dd');
        const endOfTodayWIB = new Date(`${wibDateStr}T23:59:59+07:00`);

        const todaysBookings = await prisma.booking.findMany({
          where: {
            roomId: room.id,
            userId: userRole === 'EMPLOYEE' ? userId : undefined,
            status: { in: ['CONFIRMED', 'CHECKED_IN', 'NO_SHOW_PENDING'] },
            startTime: { lte: endOfTodayWIB },
            endTime: { gte: now },
          },
          orderBy: { startTime: 'asc' },
          include: { room: true, user: { include: { department: true } }, usageSession: true },
        });

        // If previewing and user has >1 meeting today in this room, let them pick which agenda to check in to
        if (!mutateLateStatus && todaysBookings.length > 1) {
          return {
            room,
            bookings: todaysBookings,
            requiresSelection: true,
            now,
            isIdempotent: false,
          };
        }

        if (todaysBookings.length >= 1) {
          booking = todaysBookings[0];
        }
      }
    }

    if (!booking) {
      // Check if room is currently booked by someone else
      const activeByOther = await prisma.booking.findFirst({
        where: {
          roomId: room.id,
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
          startTime: { lte: new Date(now.getTime() + 30 * 60 * 1000) },
          endTime: { gte: now },
        },
        include: { user: { include: { department: true } } },
      });

      if (activeByOther) {
        throw {
          statusCode: 403,
          message: `Ruangan '${room.name}' saat ini direservasi oleh ${activeByOther.user.name} (${activeByOther.user.department?.name || 'Karyawan'}) untuk agenda '${activeByOther.title}'. Check-in hanya dapat dilakukan oleh pemesan tersebut atau Administrator.`,
        };
      }

      // Check if user has an upcoming booking on a future day in this room
      const futureBooking = await prisma.booking.findFirst({
        where: {
          roomId: room.id,
          userId: userRole === 'EMPLOYEE' ? userId : undefined,
          status: 'CONFIRMED',
          startTime: { gt: now },
        },
        orderBy: { startTime: 'asc' },
      });

      if (futureBooking) {
        const timeStr = formatWIB(futureBooking.startTime, 'dd MMM yyyy, HH:mm');
        throw {
          statusCode: 400,
          message: `Check-in belum dibuka. Anda memiliki reservasi '${futureBooking.title}' pada ${timeStr} WIB. Check-in hanya dapat dilakukan pada hari jadwal rapat.`,
        };
      }

      throw {
        statusCode: 404,
        message: `Tidak ditemukan reservasi aktif untuk ruangan '${room.name}' pada hari ini. Silakan buat reservasi baru terlebih dahulu.`,
      };
    }

    // Role & ownership check
    if (userRole === 'EMPLOYEE' && booking.userId !== userId) {
      throw {
        statusCode: 403,
        message: `Hanya pemesan terdaftar (${booking.user.name}) yang berhak melakukan check-in pada reservasi ini.`,
      };
    }

    // Idempotency check: Already checked in
    if (booking.status === 'CHECKED_IN' && booking.usageSession) {
      return {
        booking,
        session: booking.usageSession,
        room,
        isIdempotent: true,
        message: 'Anda sudah berhasil check-in sebelumnya.',
      };
    }

    // Ensure room does not have another ACTIVE session currently running
    const activeSessionOther = await prisma.roomUsageSession.findFirst({
      where: {
        roomId: room.id,
        status: { in: ['ACTIVE', 'OVERDUE'] },
        bookingId: { not: booking.id },
      },
      include: { booking: { include: { user: true } } },
    });
    if (activeSessionOther) {
      throw {
        statusCode: 409,
        message: `Ruangan '${room.name}' saat ini masih digunakan oleh ${activeSessionOther.booking?.user?.name || 'pengguna lain'} (${activeSessionOther.booking?.title || '-'}) yang belum melakukan Check-Out.`,
      };
    }

    // 3. Late arrival boundary check (+15 minutes inclusive)
    const scheduledStart = new Date(booking.startTime);
    // tolerance boundary: scheduledStart + 15 minutes (with 59 seconds leeway for precision)
    const lateCutoff = new Date(scheduledStart.getTime() + (lateToleranceMinutes * 60 + 59) * 1000);

    if (now > lateCutoff) {
      // Late: Mark booking as NO_SHOW_PENDING if not already (only when mutating)
      if (mutateLateStatus && booking.status !== 'NO_SHOW_PENDING') {
        await prisma.booking.update({
          where: { id: booking.id },
          data: { status: 'NO_SHOW_PENDING' },
        });
        await prisma.bookingHistory.create({
          data: {
            bookingId: booking.id,
            actorId: userId,
            action: 'NO_SHOW_MARKED',
            reason: `Check-in ditolak: Waktu check-in melebihi toleransi keterlambatan (+${lateToleranceMinutes} menit).`,
          },
        });
      }

      const lateStr = formatWIB(lateCutoff, 'HH:mm');
      throw {
        statusCode: 400,
        message: `Check-in ditolak! Batas toleransi keterlambatan (+${lateToleranceMinutes} menit) telah berakhir pada ${lateStr} WIB. Silakan lakukan Reschedule jadwal terlebih dahulu.`,
        needsReschedule: true,
      };
    }

    // Allow check-in any time on the scheduled day (WIB) so swapped meetings in the same day work smoothly
    const bookingDayWIB = formatWIB(scheduledStart, 'yyyy-MM-dd');
    const todayWIB = formatWIB(now, 'yyyy-MM-dd');
    if (bookingDayWIB > todayWIB) {
      throw {
        statusCode: 400,
        message: `Check-in belum dapat dilakukan. Jadwal meeting ini adalah pada tanggal ${formatWIB(scheduledStart, 'dd MMM yyyy, HH:mm')} WIB.`,
      };
    }

    return { room, booking, now, isIdempotent: false };
  }

  /**
   * Preview Check-in details without changing status or sending notifications
   */
  async previewCheckin({ qrToken, bookingId, userId, userRole }) {
    const validated = await this.validateCheckin({
      qrToken,
      bookingId,
      userId,
      userRole,
      mutateLateStatus: false,
    });

    if (validated.isIdempotent) {
      return {
        room: validated.room,
        booking: validated.booking,
        session: validated.session,
        alreadyCheckedIn: true,
        message: validated.message,
      };
    }

    if (validated.requiresSelection) {
      return {
        room: validated.room,
        bookings: validated.bookings,
        requiresSelection: true,
        alreadyCheckedIn: false,
      };
    }

    return {
      room: validated.room,
      booking: validated.booking,
      requiresSelection: false,
      alreadyCheckedIn: false,
    };
  }

  /**
   * Process QR Check-in (Confirm & persist + send WhatsApp/Email notifications)
   */
  async checkin({ qrToken, bookingId, userId, userRole, req }) {
    const validated = await this.validateCheckin({
      qrToken,
      bookingId,
      userId,
      userRole,
      mutateLateStatus: true,
    });

    if (validated.isIdempotent) {
      return validated;
    }

    const { room, booking, now } = validated;

    // 4. Perform check-in in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create room usage session
      const session = await tx.roomUsageSession.create({
        data: {
          bookingId: booking.id,
          roomId: room.id,
          actualCheckin: now,
          status: 'ACTIVE',
        },
      });

      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: { status: 'CHECKED_IN' },
        include: { room: true, user: { include: { department: true } } },
      });

      await tx.bookingHistory.create({
        data: {
          bookingId: booking.id,
          actorId: userId,
          action: 'CHECKED_IN',
          newData: { actualCheckin: now, status: 'CHECKED_IN' },
          reason: 'Check-in berhasil diverifikasi melalui pemindaian QR Check-in di pintu ruangan.',
        },
      });

      return { booking: updatedBooking, session, room };
    });

    // Notify booker & HRGA
    notificationService.notifyEvent('CHECK_IN', {
      bookingId: booking.id,
      bookingCode: booking.bookingCode,
      roomName: room.name,
      roomLocation: room.location,
      userName: booking.user.name,
      departmentName: booking.user.department.name,
      title: booking.title,
      startTime: booking.startTime,
      endTime: booking.endTime,
      actualTime: now,
      actualCheckin: now,
      bookerEmail: booking.user.email,
      bookerPhone: booking.user.phone,
      bookerName: booking.user.name,
      actorName: userRole !== 'EMPLOYEE' && booking.userId !== userId ? `${req.user.name} (${userRole})` : null,
    });

    return result;
  }

  /**
   * Validate QR token and active usage session before check-out
   */
  async validateCheckout({ qrToken, bookingId, userId, userRole }) {
    if (!qrToken) {
      throw { statusCode: 400, message: 'QR Token wajib disertakan.' };
    }

    const cleanInput = cleanQrToken(qrToken);
    let room = null;
    let targetBookingId = bookingId;

    // Check if input is a Booking Code (e.g. BKG-967352-827)
    if (cleanInput.toUpperCase().startsWith('BKG-')) {
      const explicitBooking = await prisma.booking.findFirst({
        where: { bookingCode: { equals: cleanInput, mode: 'insensitive' } },
        include: { room: true },
      });
      if (explicitBooking) {
        room = explicitBooking.room;
        targetBookingId = explicitBooking.id;
      } else {
        throw {
          statusCode: 404,
          message: `Kode booking '${cleanInput}' tidak ditemukan dalam sistem.`,
        };
      }
    }

    // 1. Verify QR matches room checkout token if room not identified from booking code
    if (!room) {
      const cleanTokenHash = hashToken(cleanInput);
      const rawTokenHash = hashToken(qrToken);
      room = await prisma.meetingRoom.findFirst({
        where: { qrCheckoutTokenHash: { in: [cleanTokenHash, rawTokenHash] } },
      });

      if (!room) {
        // Check if user scanned the CHECKIN QR instead
        const isCheckinRoom = await prisma.meetingRoom.findFirst({
          where: { qrCheckinTokenHash: { in: [cleanTokenHash, rawTokenHash] } },
        });
        if (isCheckinRoom) {
          throw {
            statusCode: 400,
            isWrongAction: true,
            correctAction: 'CHECKIN',
            roomId: isCheckinRoom.id,
            roomName: isCheckinRoom.name,
            message: `QR yang dipindai adalah QR Check-In (Masuk) untuk '${isCheckinRoom.name}'. Silakan pindai QR Check-Out (Keluar) di pintu ruangan untuk mengakhiri sesi rapat.`,
          };
        }
        throw { statusCode: 404, message: 'QR Code tidak valid atau bukan QR Check-out ruangan PT Cemindo Gemilang.' };
      }
    }

    // 2. Find active or overdue usage session in this room
    let session = await prisma.roomUsageSession.findFirst({
      where: {
        roomId: room.id,
        status: { in: ['ACTIVE', 'OVERDUE'] },
        bookingId: targetBookingId || undefined,
      },
      include: {
        booking: {
          include: { room: true, user: { include: { department: true } } },
        },
      },
    });

    if (!session) {
      // Check if session was already completed (Idempotency)
      const lastSession = await prisma.roomUsageSession.findFirst({
        where: {
          roomId: room.id,
          bookingId: bookingId || undefined,
        },
        orderBy: { actualCheckin: 'desc' },
        include: {
          booking: {
            include: { room: true, user: { include: { department: true } } },
          },
        },
      });

      if (lastSession && lastSession.status === 'COMPLETED') {
        return {
          session: lastSession,
          booking: lastSession.booking,
          room,
          isIdempotent: true,
          message: 'Ruangan ini sudah di-checkout sebelumnya.',
        };
      }

      // Check if there is a CONFIRMED booking right now that never checked in
      const unstartedBooking = await prisma.booking.findFirst({
        where: {
          roomId: room.id,
          status: 'CONFIRMED',
          startTime: { lte: new Date() },
          endTime: { gte: new Date() },
        },
        include: { user: true },
      });

      if (unstartedBooking) {
        throw {
          statusCode: 400,
          message: `Reservasi '${unstartedBooking.title}' belum pernah di-check-in sebelumnya sehingga tidak ada sesi aktif untuk di-checkout.`,
        };
      }

      throw {
        statusCode: 404,
        message: `Tidak ada sesi penggunaan aktif di ruangan '${room.name}' yang perlu di-checkout.`,
      };
    }

    // Role & ownership check
    if (userRole === 'EMPLOYEE' && session.booking.userId !== userId) {
      throw {
        statusCode: 403,
        message: `Hanya pemesan (${session.booking.user.name}) atau tim HRGA yang berwenang melakukan checkout.`,
      };
    }

    return { room, session, booking: session.booking, isIdempotent: false };
  }

  /**
   * Preview Check-out details without changing status or sending notifications
   */
  async previewCheckout({ qrToken, bookingId, userId, userRole }) {
    const validated = await this.validateCheckout({
      qrToken,
      bookingId,
      userId,
      userRole,
    });

    if (validated.isIdempotent) {
      return {
        room: validated.room,
        session: validated.session,
        booking: validated.booking,
        alreadyCheckedOut: true,
        message: validated.message,
      };
    }

    return {
      room: validated.room,
      session: validated.session,
      booking: validated.booking,
      alreadyCheckedOut: false,
    };
  }

  /**
   * Process QR Check-out (Confirm & persist + send WhatsApp/Email notifications)
   */
  async checkout({ qrToken, bookingId, userId, userRole }) {
    const validated = await this.validateCheckout({
      qrToken,
      bookingId,
      userId,
      userRole,
    });

    if (validated.isIdempotent) {
      return validated;
    }

    const { room, session } = validated;
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const closedSession = await tx.roomUsageSession.update({
        where: { id: session.id },
        data: {
          status: 'COMPLETED',
          actualCheckout: now,
        },
      });

      const completedBooking = await tx.booking.update({
        where: { id: session.bookingId },
        data: { status: 'COMPLETED' },
        include: { room: true, user: { include: { department: true } } },
      });

      await tx.bookingHistory.create({
        data: {
          bookingId: session.bookingId,
          actorId: userId,
          action: 'CHECKED_OUT',
          newData: { actualCheckout: now, status: 'COMPLETED' },
          reason: 'Checkout berhasil dicatat melalui pemindaian QR Check-out.',
        },
      });

      return { session: closedSession, booking: completedBooking, room };
    });

    // Notify booker & HRGA
    notificationService.notifyEvent('CHECK_OUT', {
      bookingId: session.bookingId,
      bookingCode: session.booking.bookingCode,
      roomName: room.name,
      roomLocation: room.location,
      userName: session.booking.user.name,
      departmentName: session.booking.user.department.name,
      title: session.booking.title,
      startTime: session.booking.startTime,
      endTime: session.booking.endTime,
      actualTime: now,
      actualCheckin: result.session.actualCheckin || session.actualCheckin,
      actualCheckout: now,
      bookerEmail: session.booking.user.email,
      bookerPhone: session.booking.user.phone,
      bookerName: session.booking.user.name,
    });

    return result;
  }

  /**
   * Manual Checkout by HRGA / Admin
   */
  async manualCheckout({ sessionId, verifiedActualEndTime, reason, officerId, req }) {
    if (!reason || reason.trim().length < 5) {
      throw { statusCode: 400, message: 'Alasan manual checkout wajib diisi (minimal 5 karakter).' };
    }

    const session = await prisma.roomUsageSession.findUnique({
      where: { id: sessionId },
      include: {
        booking: {
          include: { room: true, user: { include: { department: true } } },
        },
      },
    });

    if (!session) {
      throw { statusCode: 404, message: 'Sesi penggunaan tidak ditemukan.' };
    }

    if (session.status === 'COMPLETED') {
      throw { statusCode: 400, message: 'Sesi ini sudah berstatus COMPLETED.' };
    }

    const actionTime = new Date();
    const actualEnd = verifiedActualEndTime ? new Date(verifiedActualEndTime) : actionTime;

    const result = await prisma.$transaction(async (tx) => {
      const updatedSession = await tx.roomUsageSession.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          actualCheckout: actualEnd,
          isManualCheckout: true,
          manualCheckoutById: officerId,
          manualCheckoutReason: reason,
          manualCheckoutActionAt: actionTime,
        },
      });

      const updatedBooking = await tx.booking.update({
        where: { id: session.bookingId },
        data: { status: 'COMPLETED' },
      });

      await tx.bookingHistory.create({
        data: {
          bookingId: session.bookingId,
          actorId: officerId,
          action: 'MANUAL_CHECKOUT',
          newData: {
            actualCheckout: actualEnd,
            actionTime,
            officerId,
            reason,
          },
          reason: `Manual checkout oleh HRGA: ${reason}`,
        },
      });

      return { session: updatedSession, booking: updatedBooking, room: session.booking.room };
    });

    // Notify booker & HRGA
    notificationService.notifyEvent('MANUAL_CHECKOUT', {
      bookingId: session.bookingId,
      bookingCode: session.booking.bookingCode,
      roomName: session.booking.room.name,
      roomLocation: session.booking.room.location,
      userName: session.booking.user.name,
      departmentName: session.booking.user.department.name,
      title: session.booking.title,
      startTime: session.booking.startTime,
      endTime: session.booking.endTime,
      actualTime: actualEnd,
      actualCheckin: session.actualCheckin,
      actualCheckout: actualEnd,
      actorName: `${req.user.name} (HRGA)`,
      reason,
      bookerEmail: session.booking.user.email,
      bookerPhone: session.booking.user.phone,
      bookerName: session.booking.user.name,
    });

    return result;
  }
}

const roomUsageService = new RoomUsageService();
module.exports = roomUsageService;

