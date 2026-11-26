const express = require('express');
const router = express.Router();
const prisma = require('../../config/database');
const { successResponse } = require('../../utils/response');
const { authenticate } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/rbac');

router.use(authenticate);
router.use(requirePermission('menu:audit_logs'));

router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '25', 10);
    const skip = (page - 1) * limit;

    const { action, resourceType, userId, search } = req.query;

    const where = {};
    if (action) where.action = action;
    if (resourceType) where.resourceType = resourceType;
    if (userId) where.userId = userId;

    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { resourceType: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
    ]);

    return successResponse(res, logs, 'Daftar audit log berhasil diambil.', 200, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

