const prisma = require('../../config/database');
const notificationWorker = require('./notification.worker');
const { successResponse, errorResponse } = require('../../utils/response');

async function getNotificationLogs(req, res, next) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const skip = (page - 1) * limit;

    const { channel, eventType, status, search } = req.query;

    const where = {};
    if (channel) where.channel = channel;
    if (eventType) where.eventType = eventType;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { recipient: { contains: search, mode: 'insensitive' } },
        { providerResponse: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.notificationLog.count({ where }),
      prisma.notificationLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return successResponse(res, logs, 'Daftar log notifikasi berhasil diambil.', 200, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
}

async function retryNotification(req, res, next) {
  try {
    const { id } = req.params;
    await notificationWorker.retryJob(id);
    return successResponse(res, null, 'Notifikasi telah dijadwalkan ulang untuk dikirim.');
  } catch (err) {
    next(err);
  }
}

async function getRecipients(req, res, next) {
  try {
    const recipients = await prisma.notificationRecipient.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return successResponse(res, recipients, 'Daftar penerima notifikasi HRGA.');
  } catch (err) {
    next(err);
  }
}

async function createRecipient(req, res, next) {
  try {
    const { name, email, phone, channel } = req.body;
    const recipient = await prisma.notificationRecipient.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
        channel: channel || 'ALL',
      },
    });
    return successResponse(res, recipient, 'Penerima notifikasi HRGA berhasil ditambahkan.', 201);
  } catch (err) {
    next(err);
  }
}

async function updateRecipient(req, res, next) {
  try {
    const { id } = req.params;
    const { name, email, phone, channel, isActive } = req.body;
    const recipient = await prisma.notificationRecipient.update({
      where: { id },
      data: {
        name,
        email: email || null,
        phone: phone || null,
        channel,
        isActive,
      },
    });
    return successResponse(res, recipient, 'Penerima notifikasi HRGA berhasil diperbarui.');
  } catch (err) {
    next(err);
  }
}

async function deleteRecipient(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.notificationRecipient.delete({ where: { id } });
    return successResponse(res, null, 'Penerima notifikasi HRGA berhasil dihapus.');
  } catch (err) {
    next(err);
  }
}

async function testEmail(req, res, next) {
  try {
    const notificationService = require('./notification.service');
    const targetEmail = req.body.recipient || req.user.email || 'batam.cg@gmail.com';
    const emailProvider = await notificationService.getEmailProvider();

    const result = await emailProvider.sendEmail({
      to: targetEmail,
      subject: 'Tes Notifikasi Email – MRMS PT Cemindo Gemilang Tbk (Plant Batam)',
      text: 'Halo,\n\nIni adalah email uji coba dari Meeting Room Management System (MRMS) PT Cemindo Gemilang Tbk Plant Batam. Layanan notifikasi email SMTP aktif dan berjalan dengan baik.\n\nSalam,\nMRMS System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; rounded: 12px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-weight: 900; font-size: 18px; color: #b52025; letter-spacing: 0.5px;">PT CEMINDO GEMILANG Tbk</div>
            <div style="font-size: 13px; color: #64748b; font-weight: bold;">PLANT BATAM &bull; MEETING ROOM SYSTEM</div>
          </div>
          <div style="padding: 16px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #b52025; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 14px; color: #1e293b; font-weight: bold;">Tes Pengiriman Email Berhasil!</p>
            <p style="margin: 6px 0 0; font-size: 12px; color: #475569;">
              Akun pengirim Google SMTP <strong>batam.cg@gmail.com</strong> telah terhubung dan aktif melayani notifikasi otomatis sistem.
            </p>
          </div>
          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
            &copy; 2026 PT Cemindo Gemilang Tbk &bull; Plant Batam
          </p>
        </div>
      `,
    });

    return successResponse(
      res,
      result,
      `Email tes berhasil dikirim ke ${targetEmail}. Provider: ${emailProvider.name}`
    );
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getNotificationLogs,
  retryNotification,
  getRecipients,
  createRecipient,
  updateRecipient,
  deleteRecipient,
  testEmail,
};

