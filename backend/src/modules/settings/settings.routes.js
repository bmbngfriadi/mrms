const express = require('express');
const router = express.Router();
const prisma = require('../../config/database');
const { getSystemSettings } = require('../../config/system-settings');
const { successResponse, errorResponse } = require('../../utils/response');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { logAudit } = require('../../utils/audit');

// Authenticated users can view settings (e.g. for calendar/booking constraints)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const settings = await prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });
    return successResponse(res, settings, 'Daftar pengaturan sistem.');
  } catch (err) {
    next(err);
  }
});

// Admin only: Update system setting
router.put('/', authenticate, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const { settings } = req.body; // array of { key, value }
    if (!Array.isArray(settings)) {
      return errorResponse(res, 'Format data pengaturan tidak valid. Harus berupa array.', 400);
    }

    const updated = [];
    for (const item of settings) {
      if (item.key && item.value !== undefined) {
        const row = await prisma.systemSetting.upsert({
          where: { key: item.key },
          update: { value: String(item.value) },
          create: {
            key: item.key,
            value: String(item.value),
            description: item.description || null,
          },
        });
        updated.push(row);
      }
    }

    // Force refresh cached settings
    await getSystemSettings(true);

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE_SYSTEM_SETTINGS',
      resourceType: 'SETTINGS',
      newValues: settings,
      req,
    });

    return successResponse(res, updated, 'Pengaturan sistem berhasil diperbarui.');
  } catch (err) {
    next(err);
  }
});

module.exports = router;

