const express = require('express');
const router = express.Router();
const prisma = require('../../config/database');
const { successResponse, errorResponse } = require('../../utils/response');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { logAudit } = require('../../utils/audit');
const { z } = require('zod');
const { validateBody } = require('../../middleware/validate');

const deptSchema = z.object({
  code: z.string().min(1, 'Kode departemen minimal 1 karakter').trim().toUpperCase(),
  name: z.string().min(1, 'Nama departemen minimal 1 karakter').trim(),
  isActive: z.boolean().optional(),
});

router.use(authenticate);

// Public to authenticated users (e.g. dropdowns in booking/registration)
router.get('/', async (req, res, next) => {
  try {
    const departments = await prisma.department.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { users: true } },
      },
    });
    return successResponse(res, departments, 'Daftar departemen berhasil diambil.');
  } catch (err) {
    next(err);
  }
});

// Admin only CRUD
router.post('/', requireRole(['ADMIN']), validateBody(deptSchema), async (req, res, next) => {
  try {
    const { code, name, isActive = true } = req.body;
    const dept = await prisma.department.create({
      data: { code, name, isActive },
    });
    await logAudit({
      userId: req.user.id,
      action: 'CREATE_DEPARTMENT',
      resourceType: 'DEPARTMENT',
      resourceId: dept.id,
      newValues: dept,
      req,
    });
    return successResponse(res, dept, 'Departemen berhasil ditambahkan.', 201);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireRole(['ADMIN']), validateBody(deptSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { code, name, isActive } = req.body;
    const old = await prisma.department.findUnique({ where: { id } });
    if (!old) return errorResponse(res, 'Departemen tidak ditemukan.', 404);

    const updated = await prisma.department.update({
      where: { id },
      data: { code, name, isActive: isActive !== undefined ? isActive : old.isActive },
    });

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE_DEPARTMENT',
      resourceType: 'DEPARTMENT',
      resourceId: id,
      oldValues: old,
      newValues: updated,
      req,
    });
    return successResponse(res, updated, 'Departemen berhasil diperbarui.');
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const userCount = await prisma.user.count({ where: { departmentId: id } });
    if (userCount > 0) {
      return errorResponse(res, 'Departemen tidak dapat dihapus karena masih digunakan oleh pengguna.', 400);
    }

    const deleted = await prisma.department.delete({ where: { id } });
    await logAudit({
      userId: req.user.id,
      action: 'DELETE_DEPARTMENT',
      resourceType: 'DEPARTMENT',
      resourceId: id,
      oldValues: deleted,
      req,
    });
    return successResponse(res, null, 'Departemen berhasil dihapus.');
  } catch (err) {
    next(err);
  }
});

module.exports = router;

