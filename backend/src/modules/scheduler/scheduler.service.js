const prisma = require('../../config/database');
const notificationService = require('../notifications/notification.service');
const { getSetting } = require('../../config/system-settings');

class SchedulerService {
  constructor() {
    this.isRunning = false;
    this.checkIntervalMs = 30000; // Check every 30 seconds
    this.timer = null;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[SchedulerService] Started background scheduler...');
    this.runLoop();
  }

  stop() {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    console.log('[SchedulerService] Stopped.');
  }

  async runLoop() {
    try {
      await this.runScheduledTasks();
    } catch (err) {
      console.error('[SchedulerService] Error running tasks:', err.message);
    } finally {
      if (this.isRunning) {
        this.timer = setTimeout(() => this.runLoop(), this.checkIntervalMs);
      }
    }
  }

  async runScheduledTasks() {
    await this.check20MinuteReminders();
    await this.checkLateArrivals();
    await this.checkOverdueCheckouts();
  }

  /**
   * 1. 20-minute Reminder before meeting start
   */
  async check20MinuteReminders() {
    const reminderMinutes = parseInt(await getSetting('REMINDER_MINUTES_BEFORE'), 10) || 20;
    const now = new Date();
    // Target window: bookings starting between now and (now + reminderMinutes + 2 minutes)
    const windowStart = now;
    const windowEnd = new Date(now.getTime() + (reminderMinutes + 2) * 60 * 1000);

    const upcomingBookings = await prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        startTime: {
          gte: windowStart,
          lte: windowEnd,
        },
      },
      include: {
        room: true,
        user: { include: { department: true } },
      },
    });

    for (const b of upcomingBookings) {
      const eventId = `reminder_20m_${b.id}_${b.startTime.getTime()}`;
      // Check if already dispatched
      const existing = await prisma.notificationOutbox.findFirst({
        where: { eventId },
      });

      if (!existing) {
        await notificationService.notifyEvent('REMINDER_20M', {
          eventId,
          bookingId: b.id,
          bookingCode: b.bookingCode,
          roomName: b.room.name,
          roomLocation: b.room.location,
          userName: b.user.name,
          departmentName: b.user.department.name,
          title: b.title,
          startTime: b.startTime,
          endTime: b.endTime,
          bookerEmail: b.user.email,
          bookerPhone: b.user.phone,
          bookerName: b.user.name,
        });
      }
    }
  }

  /**
   * 2. Late arrival: scheduled_start + 15 minutes grace period
   */
  async checkLateArrivals() {
    const lateToleranceMinutes = parseInt(await getSetting('LATE_TOLERANCE_MINUTES'), 10) || 15;
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - lateToleranceMinutes * 60 * 1000);

    // Bookings that were supposed to start before cutoffTime, still in CONFIRMED state
    const lateBookings = await prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        startTime: { lte: cutoffTime },
        endTime: { gte: now },
      },
      include: {
        room: true,
        user: { include: { department: true } },
      },
    });

    for (const b of lateBookings) {
      // Mark as NO_SHOW_PENDING
      await prisma.booking.update({
        where: { id: b.id },
        data: { status: 'NO_SHOW_PENDING' },
      });

      // Record history
      await prisma.bookingHistory.create({
        data: {
          bookingId: b.id,
          action: 'NO_SHOW_MARKED',
          reason: `Check-in terlewat batas toleransi keterlambatan (${lateToleranceMinutes} menit). Menunggu tindakan HRGA atau reschedule oleh pemesan.`,
        },
      });

      // Notify booker and HRGA
      const eventId = `late_${b.id}_${Date.now()}`;
      await notificationService.notifyEvent('LATE_NO_SHOW', {
        eventId,
        bookingId: b.id,
        bookingCode: b.bookingCode,
        roomName: b.room.name,
        roomLocation: b.room.location,
        userName: b.user.name,
        departmentName: b.user.department.name,
        title: b.title,
        startTime: b.startTime,
        endTime: b.endTime,
        actualTime: now,
        bookerEmail: b.user.email,
        bookerPhone: b.user.phone,
        bookerName: b.user.name,
        reason: `Batas waktu toleransi check-in (+${lateToleranceMinutes} menit) telah berakhir. Check-in ditolak sampai jadwal di-reschedule.`,
      });
    }
  }

  /**
   * 3. Overdue checkout: scheduled_end passed and session still ACTIVE
   */
  async checkOverdueCheckouts() {
    const now = new Date();

    const overdueSessions = await prisma.roomUsageSession.findMany({
      where: {
        status: 'ACTIVE',
        booking: {
          endTime: { lt: now },
        },
      },
      include: {
        booking: {
          include: {
            room: true,
            user: { include: { department: true } },
          },
        },
      },
    });

    for (const s of overdueSessions) {
      // Transition to OVERDUE
      await prisma.roomUsageSession.update({
        where: { id: s.id },
        data: { status: 'OVERDUE' },
      });

      const b = s.booking;
      const eventId = `overdue_${b.id}_${b.endTime.getTime()}`;

      // Notify booker and HRGA
      await notificationService.notifyEvent('OVERDUE_CHECKOUT', {
        eventId,
        bookingId: b.id,
        bookingCode: b.bookingCode,
        roomName: b.room.name,
        roomLocation: b.room.location,
        userName: b.user.name,
        departmentName: b.user.department.name,
        title: b.title,
        startTime: b.startTime,
        endTime: b.endTime,
        actualTime: now,
        bookerEmail: b.user.email,
        bookerPhone: b.user.phone,
        bookerName: b.user.name,
        reason: 'Jadwal meeting telah berakhir tetapi ruangan belum di-checkout. Ruangan tetap berstatus OCCUPIED sampai checkout tercatat.',
      });
    }
  }
}

const schedulerService = new SchedulerService();
module.exports = schedulerService;

