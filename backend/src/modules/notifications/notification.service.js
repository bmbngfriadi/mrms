const prisma = require('../../config/database');
const { formatWIB } = require('../../utils/timezone');
const { getSetting } = require('../../config/system-settings');
const MockEmailProvider = require('./providers/mock-email.provider');
const SmtpEmailProvider = require('./providers/smtp-email.provider');
const MockWhatsAppProvider = require('./providers/mock-whatsapp.provider');
const HttpWhatsAppProvider = require('./providers/http-whatsapp.provider');
const BaileysWhatsAppProvider = require('./providers/baileys-whatsapp.provider');
const whatsappGateway = require('../whatsapp/whatsapp-gateway.service');

const DIVIDER = '─────────────────'; // Exactly 17 chars as per Cemindo Industrial standard

class NotificationService {
  constructor() {
    this.mockEmail = new MockEmailProvider();
    this.smtpEmail = new SmtpEmailProvider();
    this.mockWa = new MockWhatsAppProvider();
    this.httpWa = new HttpWhatsAppProvider();
    this.baileysWa = new BaileysWhatsAppProvider();
  }

  async getEmailProvider() {
    const mode = await getSetting('NOTIFICATION_MODE');
    const isProdMode = mode === 'production' || process.env.NOTIFICATION_MODE === 'production';
    if (isProdMode && this.smtpEmail.getTransporter()) {
      return this.smtpEmail;
    }
    return this.mockEmail;
  }

  async getWhatsAppProvider() {
    if (whatsappGateway.getStatus().isConnected) {
      return this.baileysWa;
    }
    const mode = await getSetting('NOTIFICATION_MODE');
    if (mode === 'production' && process.env.WA_API_URL && process.env.WA_API_TOKEN) {
      return this.httpWa;
    }
    return this.baileysWa; // Baileys provider seamlessly handles queueing/mock when offline
  }

  /**
   * Enqueue a notification with deduplication
   */
  async enqueueNotification({
    eventId,
    eventType,
    channel,
    recipient,
    recipientName,
    subject = null,
    body,
    scheduledAt = new Date(),
    metadata = null,
  }) {
    if (!recipient) return null;

    try {
      // Deduplicate check
      const existing = await prisma.notificationOutbox.findFirst({
        where: {
          eventId,
          channel,
          recipient,
        },
      });

      if (existing) {
        return existing;
      }

      return await prisma.notificationOutbox.create({
        data: {
          eventId,
          eventType,
          channel,
          recipient,
          recipientName,
          subject,
          body,
          scheduledAt,
          metadata: metadata || undefined,
          status: 'PENDING',
        },
      });
    } catch (err) {
      console.error(`Failed to enqueue ${channel} notification for ${recipient}:`, err.message);
      return null;
    }
  }

  /**
   * Cancel pending reminders when booking is rescheduled or cancelled
   */
  async cancelPendingReminders(bookingId) {
    try {
      await prisma.notificationOutbox.updateMany({
        where: {
          eventId: { startsWith: `reminder_${bookingId}` },
          status: 'PENDING',
        },
        data: {
          status: 'CANCELLED',
          errorMessage: 'Cancelled due to booking reschedule or cancellation',
        },
      });
    } catch (err) {
      console.error('Error cancelling pending reminders:', err.message);
    }
  }

  /**
   * Generate standardized WhatsApp and Email message formats
   */
  generateNotificationTemplates(eventType, payload) {
    const {
      bookingCode,
      roomName,
      roomLocation,
      userName,
      departmentName,
      title,
      startTime,
      endTime,
      actualTime,
      reason,
      actorName,
      requirements,
      notes,
    } = payload;

    const startStr = formatWIB(startTime, 'dd MMM yyyy, HH:mm') + ' WIB';
    const endStr = formatWIB(endTime, 'HH:mm') + ' WIB';
    const actualStr = actualTime ? formatWIB(actualTime, 'dd MMM yyyy, HH:mm') + ' WIB' : '-';

    let eventTitle = '';
    let statusEmoji = '📅';

    switch (eventType) {
      case 'BOOKING_CREATED':
        eventTitle = 'KONFIRMASI RESERVASI RUANG MEETING';
        statusEmoji = '🟢';
        break;
      case 'BOOKING_RESCHEDULED':
        eventTitle = 'PERUBAHAN JADWAL RESERVASI';
        statusEmoji = '🔄';
        break;
      case 'BOOKING_EXTENDED':
        eventTitle = 'PERPANJANGAN WAKTU RUANGAN (EXTENSION)';
        statusEmoji = '⏱️';
        break;
      case 'BOOKING_CANCELLED':
        eventTitle = 'PEMBATALAN RESERVASI RUANGAN';
        statusEmoji = '🔴';
        break;
      case 'REMINDER_20M':
        eventTitle = 'PENGINGAT: MEETING DIMULAI 20 MENIT LAGI';
        statusEmoji = '🔔';
        break;
      case 'CHECK_IN':
        eventTitle = 'CHECK-IN RUANGAN BERHASIL';
        statusEmoji = '🟢';
        break;
      case 'LATE_NO_SHOW':
        eventTitle = 'PERINGATAN: KETERLAMBATAN CHECK-IN (>15 MENIT)';
        statusEmoji = '⚠️';
        break;
      case 'CHECK_OUT':
        eventTitle = 'CHECK-OUT RUANGAN SELESAI';
        statusEmoji = '🔴';
        break;
      case 'OVERDUE_CHECKOUT':
        eventTitle = 'PERINGATAN: PENGGUNAAN RUANGAN OVERDUE';
        statusEmoji = '🚨';
        break;
      case 'MANUAL_CHECKOUT':
        eventTitle = 'PENGHENTIAN PENGGUNAAN MANUAL OLEH HRGA';
        statusEmoji = '📋';
        break;
      default:
        eventTitle = 'NOTIFIKASI SISTEM RUANG MEETING';
    }

    const waText = [
      `🏭 *PT CEMINDO GEMILANG Tbk*`,
      `📍 *Plant Batam — MRMS*`,
      DIVIDER,
      `${statusEmoji} *${eventTitle}*`,
      DIVIDER,
      `🔖 *Kode:* ${bookingCode}`,
      `🚪 *Ruangan:* ${roomName}`,
      `📌 *Lokasi:* ${roomLocation}`,
      `📝 *Agenda:* ${title}`,
      `👤 *Pemesan:* ${userName} (${departmentName})`,
      `🗓️ *Jadwal:* ${startStr} – ${endStr}`,
      actualTime ? `⏱️ *Waktu Aktual:* ${actualStr}` : null,
      actorName ? `🛡️ *Petugas / PIC:* ${actorName}` : null,
      requirements ? `☕ *Kebutuhan:* ${requirements}` : null,
      notes ? `💬 *Catatan:* ${notes}` : null,
      reason ? `ℹ️ *Keterangan:* ${reason}` : null,
      DIVIDER,
      `_Pesan otomatis dari sistem MRMS (no-reply). Mohon tidak membalas pesan ini._`,
    ]
      .filter(Boolean)
      .join('\n');

    const emailSubject = `[MRMS PT Cemindo Gemilang] ${eventTitle} - ${roomName} (${bookingCode})`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #b52025; color: white; padding: 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px;">PT CEMINDO GEMILANG Tbk</h2>
          <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">Plant Batam — Meeting Room Management System</p>
        </div>
        <div style="padding: 24px; background-color: #ffffff;">
          <h3 style="color: #1e293b; margin-top: 0; border-bottom: 2px solid #b52025; padding-bottom: 8px;">
            ${statusEmoji} ${eventTitle}
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 16px;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; width: 140px;">Kode Booking</td>
              <td style="padding: 8px 0; font-weight: bold; color: #0f172a;">${bookingCode}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Ruang Meeting</td>
              <td style="padding: 8px 0; font-weight: bold; color: #0f172a;">${roomName} (${roomLocation})</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Agenda Meeting</td>
              <td style="padding: 8px 0; color: #0f172a;">${title}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Pemesan</td>
              <td style="padding: 8px 0; color: #0f172a;">${userName} &bull; ${departmentName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Jadwal Rencana</td>
              <td style="padding: 8px 0; font-weight: bold; color: #b52025;">${startStr} s/d ${endStr}</td>
            </tr>
            ${actualTime
        ? `<tr>
                    <td style="padding: 8px 0; color: #64748b;">Waktu Aktual</td>
                    <td style="padding: 8px 0; font-weight: bold; color: #0f172a;">${actualStr}</td>
                  </tr>`
        : ''
      }
            ${actorName
        ? `<tr>
                    <td style="padding: 8px 0; color: #64748b;">Petugas / PIC</td>
                    <td style="padding: 8px 0; color: #0f172a;">${actorName}</td>
                  </tr>`
        : ''
      }
            ${requirements
        ? `<tr>
                    <td style="padding: 8px 0; color: #64748b;">Kebutuhan / Konsumsi</td>
                    <td style="padding: 8px 0; font-weight: bold; color: #0f172a;">${requirements}</td>
                  </tr>`
        : ''
      }
            ${notes
        ? `<tr>
                    <td style="padding: 8px 0; color: #64748b;">Catatan</td>
                    <td style="padding: 8px 0; color: #475569;">${notes}</td>
                  </tr>`
        : ''
      }
            ${reason
        ? `<tr>
                    <td style="padding: 8px 0; color: #64748b;">Alasan / Catatan</td>
                    <td style="padding: 8px 0; color: #475569;">${reason}</td>
                  </tr>`
        : ''
      }
          </table>
          <div style="margin-top: 24px; padding: 12px; background-color: #f8fafc; border-radius: 6px; font-size: 12px; color: #64748b;">
            Harap lakukan pemindaian QR Check-in di pintu ruangan meeting maksimal 15 menit setelah jadwal mulai. Ruangan tetap berstatus OCCUPIED sampai Anda memindai QR Check-out.
          </div>
        </div>
        <div style="background-color: #f1f5f9; padding: 12px 20px; font-size: 11px; color: #94a3b8; text-align: center;">
          PT Cemindo Gemilang Tbk &bull; Plant Batam &bull; Email otomatis, mohon tidak membalas langsung.
        </div>
      </div>
    `;

    return { waText, emailSubject, emailHtml };
  }

  /**
   * Dispatch an operational event notification to booker and HRGA
   */
  async notifyEvent(eventType, payload) {
    const {
      eventId = `${eventType.toLowerCase()}_${payload.bookingId}_${Date.now()}`,
      bookerEmail,
      bookerPhone,
      bookerName,
      scheduledAt = new Date(),
    } = payload;

    const { waText, emailSubject, emailHtml } = this.generateNotificationTemplates(eventType, payload);

    const jobs = [];

    // Booker notifications (All events)
    if (bookerEmail) {
      jobs.push(
        this.enqueueNotification({
          eventId,
          eventType,
          channel: 'EMAIL',
          recipient: bookerEmail,
          recipientName: bookerName || 'Pemesan',
          subject: emailSubject,
          body: emailHtml,
          scheduledAt,
        })
      );
    }

    if (bookerPhone) {
      jobs.push(
        this.enqueueNotification({
          eventId,
          eventType,
          channel: 'WHATSAPP',
          recipient: bookerPhone,
          recipientName: bookerName || 'Pemesan',
          subject: null,
          body: waText,
          scheduledAt,
        })
      );
    }

    // HRGA notifications (Except REMINDER_20M as specified in requirements matrix)
    if (eventType !== 'REMINDER_20M') {
      try {
        const hrgaRecipients = await prisma.notificationRecipient.findMany({
          where: { isActive: true },
        });

        for (const hr of hrgaRecipients) {
          if ((hr.channel === 'ALL' || hr.channel === 'EMAIL') && hr.email) {
            jobs.push(
              this.enqueueNotification({
                eventId: `${eventId}_hrga_${hr.id}`,
                eventType,
                channel: 'EMAIL',
                recipient: hr.email,
                recipientName: hr.name,
                subject: `[HRGA Monitor] ${emailSubject}`,
                body: emailHtml,
                scheduledAt,
              })
            );
          }
          if ((hr.channel === 'ALL' || hr.channel === 'WHATSAPP') && hr.phone) {
            jobs.push(
              this.enqueueNotification({
                eventId: `${eventId}_hrga_${hr.id}`,
                eventType,
                channel: 'WHATSAPP',
                recipient: hr.phone,
                recipientName: hr.name,
                subject: null,
                body: waText,
                scheduledAt,
              })
            );
          }
        }
      } catch (err) {
        console.error('Failed to load HRGA notification recipients:', err.message);
      }
    }

    await Promise.allSettled(jobs);
  }
}

const notificationService = new NotificationService();
module.exports = notificationService;

