const express = require('express');
const router = express.Router();
const prisma = require('../../config/database');
const { successResponse, errorResponse } = require('../../utils/response');
const { authenticate } = require('../../middleware/auth');
const { requirePermission, requireAnyPermission } = require('../../middleware/rbac');
const { logAudit } = require('../../utils/audit');
const { generateSecureToken, hashToken } = require('../../utils/crypto');
const { z } = require('zod');
const { validateBody } = require('../../middleware/validate');

const roomSchema = z.object({
  code: z.string().min(2, 'Kode ruangan minimal 2 karakter').toUpperCase(),
  name: z.string().min(3, 'Nama ruangan minimal 3 karakter'),
  location: z.string().min(3, 'Lokasi ruangan wajib diisi'),
  capacity: z.number().int().positive('Kapasitas harus lebih dari 0'),
  description: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  photos: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  facilities: z
    .array(
      z.object({
        name: z.string().min(1),
        quantity: z.number().int().positive().default(1),
        condition: z.string().default('GOOD'),
      })
    )
    .optional(),
});

const blockSchema = z.object({
  roomId: z.string().uuid(),
  title: z.string().min(3),
  reason: z.string().min(3),
  blockType: z.enum(['MAINTENANCE', 'MANAGEMENT_HOLD', 'CLEANING', 'SPECIAL_EVENT']).default('MAINTENANCE'),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
});

router.use(authenticate);

// Get all rooms with current live status and facilities
router.get('/', async (req, res, next) => {
  try {
    const { activeOnly } = req.query;
    const now = new Date();

    const where = {};
    if (activeOnly === 'true') {
      where.isActive = true;
    }

    const rooms = await prisma.meetingRoom.findMany({
      where,
      include: {
        facilities: true,
        usageSessions: {
          where: {
            status: { in: ['ACTIVE', 'OVERDUE'] },
          },
          include: {
            booking: {
              include: { user: { select: { id: true, name: true, department: true } } },
            },
          },
        },
        blocks: {
          where: {
            isActive: true,
            startTime: { lte: now },
            endTime: { gte: now },
          },
        },
        bookings: {
          where: {
            status: { in: ['CONFIRMED', 'CHECKED_IN'] },
            startTime: { lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) },
            endTime: { gte: now },
          },
          orderBy: { startTime: 'asc' },
          take: 3,
          include: {
            user: { select: { id: true, name: true, department: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Compute live status
    const formatted = rooms.map((r) => {
      let currentStatus = 'AVAILABLE';
      let activeSession = null;
      let activeBlock = null;

      if (!r.isActive) {
        currentStatus = 'INACTIVE';
      } else if (r.blocks && r.blocks.length > 0) {
        currentStatus = r.blocks[0].blockType === 'MAINTENANCE' ? 'MAINTENANCE' : 'BLOCKED';
        activeBlock = r.blocks[0];
      } else if (r.usageSessions && r.usageSessions.length > 0) {
        const session = r.usageSessions[0];
        currentStatus = session.status === 'OVERDUE' ? 'OVERDUE' : 'OCCUPIED';
        activeSession = session;
      } else if (
        r.bookings &&
        r.bookings.some((b) => b.status === 'CONFIRMED' && b.startTime <= now && b.endTime >= now)
      ) {
        currentStatus = 'RESERVED';
      }

      return {
        id: r.id,
        code: r.code,
        name: r.name,
        location: r.location,
        capacity: r.capacity,
        description: r.description,
        imageUrl: r.imageUrl,
        photos: r.photos && r.photos.length > 0 ? r.photos : (r.imageUrl ? [r.imageUrl] : []),
        isActive: r.isActive,
        facilities: r.facilities,
        currentStatus,
        activeSession,
        activeBlock,
        nextBookings: r.bookings,
        qrCheckinTokenRaw: req.user.role === 'ADMIN' ? r.qrCheckinTokenRaw : undefined,
        qrCheckoutTokenRaw: req.user.role === 'ADMIN' ? r.qrCheckoutTokenRaw : undefined,
      };
    });

    return successResponse(res, formatted, 'Daftar ruangan berhasil diambil.');
  } catch (err) {
    next(err);
  }
});

// Get room details & availability schedule for a date
router.get('/:id/availability', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date } = req.query; // YYYY-MM-DD

    const room = await prisma.meetingRoom.findUnique({
      where: { id },
      include: { facilities: true },
    });

    if (!room) return errorResponse(res, 'Ruangan tidak ditemukan.', 404);

    let startOfDay, endOfDay;
    if (date) {
      startOfDay = new Date(`${date}T00:00:00+07:00`);
      endOfDay = new Date(`${date}T23:59:59+07:00`);
    } else {
      const now = new Date();
      startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    }

    const [bookings, blocks, activeSessions] = await Promise.all([
      prisma.booking.findMany({
        where: {
          roomId: id,
          status: { in: ['CONFIRMED', 'CHECKED_IN', 'NO_SHOW_PENDING', 'COMPLETED'] },
          startTime: { lte: endOfDay },
          endTime: { gte: startOfDay },
        },
        orderBy: { startTime: 'asc' },
        include: {
          user: { select: { id: true, name: true, department: true } },
          usageSession: true,
        },
      }),
      prisma.roomBlock.findMany({
        where: {
          roomId: id,
          isActive: true,
          startTime: { lte: endOfDay },
          endTime: { gte: startOfDay },
        },
      }),
      prisma.roomUsageSession.findMany({
        where: {
          roomId: id,
          status: { in: ['ACTIVE', 'OVERDUE'] },
        },
        include: {
          booking: { include: { user: { select: { id: true, name: true, department: true } } } },
        },
      }),
    ]);

    return successResponse(res, {
      room: {
        ...room,
        photos: room.photos && room.photos.length > 0 ? room.photos : (room.imageUrl ? [room.imageUrl] : []),
      },
      date: date || new Date().toISOString().split('T')[0],
      bookings,
      blocks,
      activeSessions,
    });
  } catch (err) {
    next(err);
  }
});

// Admin: Create room
router.post('/', requirePermission('menu:rooms_master'), validateBody(roomSchema), async (req, res, next) => {
  try {
    const { code, name, location, capacity, description, imageUrl, photos = [], isActive = true, facilities = [] } = req.body;

    const rawCheckin = generateSecureToken(`qr_in_${code.toLowerCase()}`);
    const rawCheckout = generateSecureToken(`qr_out_${code.toLowerCase()}`);

    const roomPhotos = photos && photos.length > 0 ? photos : (imageUrl ? [imageUrl] : []);

    const room = await prisma.meetingRoom.create({
      data: {
        code,
        name,
        location,
        capacity,
        description,
        imageUrl: roomPhotos[0] || imageUrl,
        photos: roomPhotos,
        isActive,
        qrCheckinTokenRaw: rawCheckin,
        qrCheckoutTokenRaw: rawCheckout,
        qrCheckinTokenHash: hashToken(rawCheckin),
        qrCheckoutTokenHash: hashToken(rawCheckout),
        facilities: {
          create: facilities.map((f) => ({
            name: f.name,
            quantity: f.quantity || 1,
            condition: f.condition || 'GOOD',
          })),
        },
      },
      include: { facilities: true },
    });

    await logAudit({
      userId: req.user.id,
      action: 'CREATE_ROOM',
      resourceType: 'ROOM',
      resourceId: room.id,
      newValues: { code, name, location, capacity, imageUrl, photos: roomPhotos },
      req,
    });

    return successResponse(res, room, 'Ruangan berhasil dibuat beserta token QR.', 201);
  } catch (err) {
    next(err);
  }
});

// Admin: Update room
router.put('/:id', requirePermission('menu:rooms_master'), validateBody(roomSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { code, name, location, capacity, description, imageUrl, photos, isActive, facilities } = req.body;

    const old = await prisma.meetingRoom.findUnique({ where: { id } });
    if (!old) return errorResponse(res, 'Ruangan tidak ditemukan.', 404);

    const updateData = {
      code,
      name,
      location,
      capacity,
      description,
      imageUrl: imageUrl !== undefined ? imageUrl : old.imageUrl,
      isActive: isActive !== undefined ? isActive : old.isActive,
    };

    if (photos !== undefined && Array.isArray(photos)) {
      updateData.photos = photos;
      if (photos.length > 0 && !imageUrl) {
        updateData.imageUrl = photos[0];
      }
    }

    const room = await prisma.meetingRoom.update({
      where: { id },
      data: updateData,
    });

    if (facilities && Array.isArray(facilities)) {
      await prisma.roomFacility.deleteMany({ where: { roomId: id } });
      await prisma.roomFacility.createMany({
        data: facilities.map((f) => ({
          roomId: id,
          name: f.name,
          quantity: f.quantity || 1,
          condition: f.condition || 'GOOD',
        })),
      });
    }

    const updated = await prisma.meetingRoom.findUnique({
      where: { id },
      include: { facilities: true },
    });

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE_ROOM',
      resourceType: 'ROOM',
      resourceId: id,
      oldValues: old,
      newValues: updated,
      req,
    });

    return successResponse(res, updated, 'Data ruangan berhasil diperbarui.');
  } catch (err) {
    next(err);
  }
});

// Admin & HRGA: Delete Meeting Room (Khusus Administrasi Sistem)
router.delete('/:id', requirePermission('menu:rooms_master'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const room = await prisma.meetingRoom.findUnique({
      where: { id },
      include: {
        bookings: {
          where: {
            status: { in: ['CONFIRMED', 'CHECKED_IN'] },
            endTime: { gte: new Date() },
          },
        },
      },
    });

    if (!room) {
      return errorResponse(res, 'Ruangan tidak ditemukan.', 404);
    }

    if (room.bookings && room.bookings.length > 0) {
      return errorResponse(
        res,
        `Tidak dapat menghapus ruangan "${room.name}" karena masih memiliki ${room.bookings.length} reservasi aktif/mendatang. Harap batalkan atau selesaikan reservasi terlebih dahulu.`,
        400
      );
    }

    // Cascade safe delete in Prisma transaction
    await prisma.$transaction(async (tx) => {
      // 1. Find all bookings associated with this room
      const roomBookings = await tx.booking.findMany({
        where: { roomId: id },
        select: { id: true },
      });
      const bookingIds = roomBookings.map((b) => b.id);

      // 2. Cascade delete history and sessions for these bookings
      if (bookingIds.length > 0) {
        await tx.bookingHistory.deleteMany({ where: { bookingId: { in: bookingIds } } });
        await tx.roomUsageSession.deleteMany({ where: { bookingId: { in: bookingIds } } });
        await tx.booking.deleteMany({ where: { id: { in: bookingIds } } });
      }

      // 3. Delete any orphaned sessions, blocks, or facilities directly referencing this room
      await tx.roomUsageSession.deleteMany({ where: { roomId: id } });
      await tx.roomBlock.deleteMany({ where: { roomId: id } });
      await tx.roomFacility.deleteMany({ where: { roomId: id } });

      // 4. Delete the meeting room
      await tx.meetingRoom.delete({ where: { id } });
    });

    await logAudit({
      userId: req.user.id,
      action: 'DELETE_ROOM',
      resourceType: 'ROOM',
      resourceId: id,
      oldValues: { id: room.id, code: room.code, name: room.name, location: room.location },
      req,
    });

    return successResponse(res, null, `Ruangan "${room.name}" (${room.code}) berhasil dihapus.`);
  } catch (err) {
    next(err);
  }
});

// HRGA & Admin: Manage Room Blocks / Maintenance
router.get('/blocks/all', requireAnyPermission(['menu:blocks', 'room:block_create']), async (req, res, next) => {
  try {
    const blocks = await prisma.roomBlock.findMany({
      include: {
        room: { select: { id: true, code: true, name: true, location: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { startTime: 'desc' },
    });
    return successResponse(res, blocks, 'Daftar pemblokiran/maintenance ruangan.');
  } catch (err) {
    next(err);
  }
});

router.post('/blocks', requireAnyPermission(['room:block_create', 'menu:blocks']), validateBody(blockSchema), async (req, res, next) => {
  try {
    const { roomId, title, reason, blockType, startTime, endTime } = req.body;
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      return errorResponse(res, 'Waktu mulai harus sebelum waktu selesai.', 400);
    }

    // Check conflict with active bookings
    const conflictBooking = await prisma.booking.findFirst({
      where: {
        roomId,
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        startTime: { lt: end },
        endTime: { gt: start },
      },
      include: { user: true },
    });

    if (conflictBooking) {
      return errorResponse(
        res,
        `Tidak dapat membuat block/maintenance karena ada booking aktif: ${conflictBooking.bookingCode} (${conflictBooking.title}) oleh ${conflictBooking.user.name}.`,
        409
      );
    }

    const block = await prisma.roomBlock.create({
      data: {
        roomId,
        title,
        reason,
        blockType,
        startTime: start,
        endTime: end,
        createdById: req.user.id,
        isActive: true,
      },
    });

    await logAudit({
      userId: req.user.id,
      action: 'CREATE_ROOM_BLOCK',
      resourceType: 'ROOM_BLOCK',
      resourceId: block.id,
      newValues: block,
      req,
    });

    return successResponse(res, block, 'Pemblokiran/maintenance ruangan berhasil dibuat.', 201);
  } catch (err) {
    next(err);
  }
});

router.delete('/blocks/:id', requireAnyPermission(['room:block_create', 'menu:blocks']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const block = await prisma.roomBlock.update({
      where: { id },
      data: { isActive: false },
    });

    await logAudit({
      userId: req.user.id,
      action: 'CANCEL_ROOM_BLOCK',
      resourceType: 'ROOM_BLOCK',
      resourceId: id,
      newValues: { isActive: false },
      req,
    });

    return successResponse(res, null, 'Blokir ruangan berhasil dibatalkan/dibuka kembali.');
  } catch (err) {
    next(err);
  }
});

module.exports = router;

