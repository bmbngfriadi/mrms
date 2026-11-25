const express = require('express');
const router = express.Router();
const prisma = require('../../config/database');
const QRCode = require('qrcode');
const { hashToken, generateSecureToken } = require('../../utils/crypto');
const { successResponse, errorResponse } = require('../../utils/response');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { logAudit } = require('../../utils/audit');
const env = require('../../config/env');

// Validate QR token (used by scanning page)
router.post('/validate', async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return errorResponse(res, 'Token QR wajib disertakan.', 400);

    const tokenHash = hashToken(token);

    // Look for check-in match
    let room = await prisma.meetingRoom.findFirst({
      where: { qrCheckinTokenHash: tokenHash },
      select: {
        id: true,
        code: true,
        name: true,
        location: true,
        capacity: true,
        isActive: true,
      },
    });

    if (room) {
      return successResponse(res, {
        action: 'CHECKIN',
        room,
        isValid: true,
      });
    }

    // Look for check-out match
    room = await prisma.meetingRoom.findFirst({
      where: { qrCheckoutTokenHash: tokenHash },
      select: {
        id: true,
        code: true,
        name: true,
        location: true,
        capacity: true,
        isActive: true,
      },
    });

    if (room) {
      return successResponse(res, {
        action: 'CHECKOUT',
        room,
        isValid: true,
      });
    }

    return errorResponse(res, 'QR Code tidak dikenali atau telah kedaluwarsa/dirotasi.', 404);
  } catch (err) {
    next(err);
  }
});

// Admin only: Rotate QR tokens
router.post('/rooms/:roomId/rotate', authenticate, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const room = await prisma.meetingRoom.findUnique({ where: { id: roomId } });
    if (!room) return errorResponse(res, 'Ruangan tidak ditemukan.', 404);

    const newRawCheckin = generateSecureToken(`qr_in_${room.code.toLowerCase()}`);
    const newRawCheckout = generateSecureToken(`qr_out_${room.code.toLowerCase()}`);

    const updated = await prisma.meetingRoom.update({
      where: { id: roomId },
      data: {
        qrCheckinTokenRaw: newRawCheckin,
        qrCheckoutTokenRaw: newRawCheckout,
        qrCheckinTokenHash: hashToken(newRawCheckin),
        qrCheckoutTokenHash: hashToken(newRawCheckout),
      },
    });

    await logAudit({
      userId: req.user.id,
      action: 'ROTATE_ROOM_QR',
      resourceType: 'ROOM_QR',
      resourceId: roomId,
      req,
    });

    return successResponse(res, {
      roomId,
      roomName: updated.name,
      checkinTokenRaw: newRawCheckin,
      checkoutTokenRaw: newRawCheckout,
    }, 'Token QR Ruangan berhasil dirotasi.');
  } catch (err) {
    next(err);
  }
});

// Admin: Get printable QR codes with QR images
router.get('/print-sheets', authenticate, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const rooms = await prisma.meetingRoom.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    const reqHost = req.headers['x-forwarded-host'] || req.headers.host;
    const reqProto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    let effectiveBaseUrl = env.APP_BASE_URL;
    if (env.APP_BASE_URL && env.APP_BASE_URL.includes('localhost') && reqHost && !reqHost.includes('localhost')) {
      effectiveBaseUrl = `${reqProto}://${reqHost}/meeting-room`;
    }

    const sheets = await Promise.all(
      rooms.map(async (r) => {
        const checkinUrl = `${effectiveBaseUrl}/scan/checkin?code=${r.qrCheckinTokenRaw}`;
        const checkoutUrl = `${effectiveBaseUrl}/scan/checkout?code=${r.qrCheckoutTokenRaw}`;

        const [checkinQrImage, checkoutQrImage] = await Promise.all([
          QRCode.toDataURL(checkinUrl, { width: 300, margin: 2 }),
          QRCode.toDataURL(checkoutUrl, { width: 300, margin: 2 }),
        ]);

        return {
          roomId: r.id,
          code: r.code,
          name: r.name,
          location: r.location,
          capacity: r.capacity,
          checkin: {
            url: checkinUrl,
            tokenRaw: r.qrCheckinTokenRaw,
            qrImage: checkinQrImage,
          },
          checkout: {
            url: checkoutUrl,
            tokenRaw: r.qrCheckoutTokenRaw,
            qrImage: checkoutQrImage,
          },
        };
      })
    );

    return successResponse(res, sheets, 'Lembar cetak QR berhasil disiapkan.');
  } catch (err) {
    next(err);
  }
});

module.exports = router;

