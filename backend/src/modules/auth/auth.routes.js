const express = require('express');
const router = express.Router();
const prisma = require('../../config/database');
const { comparePassword, hashPassword } = require('../../utils/passwords');
const { signToken } = require('../../utils/jwt');
const { successResponse, errorResponse } = require('../../utils/response');
const { logAudit } = require('../../utils/audit');
const { authenticate } = require('../../middleware/auth');
const { resolveUserPermissions } = require('../../config/permissions');
const whatsappGateway = require('../whatsapp/whatsapp-gateway.service');
const { z } = require('zod');
const { validateBody } = require('../../middleware/validate');

const loginSchema = z.object({
  email: z.string().min(1, 'Email, Username, atau NIK wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi'),
});

router.post('/login', validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const identifier = (email || '').trim();

    // Cleaned phone variations (strip spaces, hyphens, brackets)
    const digitsOnly = identifier.replace(/[^0-9]/g, '');
    const phone08 = digitsOnly.startsWith('62')
      ? '0' + digitsOnly.slice(2)
      : digitsOnly;
    const phone62 = digitsOnly.startsWith('0')
      ? '62' + digitsOnly.slice(1)
      : digitsOnly;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: identifier.toLowerCase() },
          { email: identifier.toLowerCase() },
          { nik: identifier.toUpperCase() },
          { nik: identifier },
          { phone: identifier },
          { phone: phone08 },
          { phone: phone62 },
          { phone: digitsOnly },
        ],
      },
      include: { department: true },
    });

    if (!user) {
      return errorResponse(res, 'Email, Username, NIK, atau password salah.', 401);
    }

    if (!user.isActive) {
      return errorResponse(res, 'Akun Anda dinonaktifkan. Silakan hubungi Administrator HRGA.', 403);
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return errorResponse(res, 'Email, Username, NIK, atau password salah.', 401);
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      departmentId: user.departmentId,
    });

    await logAudit({
      userId: user.id,
      action: 'LOGIN',
      resourceType: 'AUTH',
      resourceId: user.id,
      req,
    });

    return successResponse(
      res,
      {
        token,
        user: {
          id: user.id,
          username: user.username,
          nik: user.nik,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          avatarUrl: user.avatarUrl,
          permissions: resolveUserPermissions(user),
          customPermissions: user.permissions || [],
          department: user.department,
        },
      },
      'Login berhasil.'
    );
  } catch (err) {
    next(err);
  }
});

// Self-service Forgot Password: Step 1 - Request WhatsApp OTP
router.post('/forgot-password/request-otp', async (req, res, next) => {
  try {
    const { identifier } = req.body;
    if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
      return errorResponse(res, 'Silakan masukkan Username, Email, NIK, atau Nomor WhatsApp Anda.', 400);
    }

    const trimmed = identifier.trim();
    const digitsOnly = trimmed.replace(/[^0-9]/g, '');
    const phone08 = digitsOnly.startsWith('62') ? '0' + digitsOnly.slice(2) : digitsOnly;
    const phone62 = digitsOnly.startsWith('0') ? '62' + digitsOnly.slice(1) : digitsOnly;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: trimmed.toLowerCase() },
          { email: trimmed.toLowerCase() },
          { nik: trimmed.toUpperCase() },
          { nik: trimmed },
          { phone: trimmed },
          { phone: phone08 },
          { phone: phone62 },
          { phone: digitsOnly },
        ],
      },
      include: { department: true },
    });

    if (!user) {
      return errorResponse(res, 'Akun tidak ditemukan. Periksa kembali data yang Anda masukkan.', 404);
    }

    if (!user.isActive) {
      return errorResponse(res, 'Akun ini dinonaktifkan. Hubungi Administrator HRGA Plant Batam.', 403);
    }

    if (!user.phone) {
      return errorResponse(res, 'Akun tidak memiliki nomor WhatsApp terdaftar. Hubungi HRGA.', 400);
    }

    // Generate random 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate prior unused OTPs for this user
    await prisma.passwordResetOtp.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Create new OTP record
    const otpRecord = await prisma.passwordResetOtp.create({
      data: {
        id: require('crypto').randomUUID(),
        userId: user.id,
        otpCode,
        phone: user.phone,
        expiresAt,
      },
    });

    // Compose official WhatsApp message
    const waMessage =
      `*[PT CEMINDO GEMILANG Tbk - PLANT BATAM]*\n` +
      `─────────────────\n` +
      `Halo *${user.name}*,\n\n` +
      `Berikut adalah kode OTP untuk mereset kata sandi akun Meeting Room Management System Anda:\n\n` +
      `🔑 *KODE OTP: ${otpCode}*\n\n` +
      `Kode ini berlaku selama *10 menit*.\n` +
      `Jangan bagikan kode ini kepada siapa pun demi keamanan akun Anda.\n\n` +
      `─────────────────\n` +
      `_Sistem Otomatis MRMS Plant Batam_`;

    let waResult = null;
    try {
      waResult = await whatsappGateway.sendMessage(user.phone, waMessage);
    } catch (e) {
      console.warn('[Forgot Password] WhatsApp delivery warning:', e.message);
    }

    // Mask phone number for security e.g. 0812****1001
    const p = user.phone;
    const maskedPhone =
      p.length > 6
        ? p.slice(0, 4) + '****' + p.slice(-4)
        : p;

    await logAudit({
      userId: user.id,
      action: 'PASSWORD_RESET_OTP_REQUESTED',
      resourceType: 'AUTH',
      resourceId: otpRecord.id,
      newValues: { maskedPhone },
      req,
    });

    return successResponse(
      res,
      {
        maskedPhone,
        userId: user.id,
        debugOtp: process.env.NODE_ENV !== 'production' ? otpCode : undefined,
      },
      `Kode OTP 6 digit telah dikirimkan ke WhatsApp (${maskedPhone}). Silakan cek pesan WhatsApp Anda.`
    );
  } catch (err) {
    next(err);
  }
});

// Self-service Forgot Password: Step 2 - Verify OTP & Set New Password
router.post('/forgot-password/verify-and-reset', async (req, res, next) => {
  try {
    const { identifier, otpCode, newPassword } = req.body;

    if (!identifier || !otpCode || !newPassword) {
      return errorResponse(res, 'Data tidak lengkap (identitas, kode OTP, dan kata sandi baru wajib diisi).', 400);
    }

    if (newPassword.length < 6) {
      return errorResponse(res, 'Kata sandi baru minimal 6 karakter.', 400);
    }

    const trimmed = identifier.trim();
    const digitsOnly = trimmed.replace(/[^0-9]/g, '');
    const phone08 = digitsOnly.startsWith('62') ? '0' + digitsOnly.slice(2) : digitsOnly;
    const phone62 = digitsOnly.startsWith('0') ? '62' + digitsOnly.slice(1) : digitsOnly;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: trimmed.toLowerCase() },
          { email: trimmed.toLowerCase() },
          { nik: trimmed.toUpperCase() },
          { nik: trimmed },
          { phone: trimmed },
          { phone: phone08 },
          { phone: phone62 },
          { phone: digitsOnly },
        ],
      },
    });

    if (!user) {
      return errorResponse(res, 'Akun tidak ditemukan.', 404);
    }

    // Look for active OTP
    const cleanOtp = otpCode.toString().trim();
    const validOtp = await prisma.passwordResetOtp.findFirst({
      where: {
        userId: user.id,
        otpCode: cleanOtp,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!validOtp) {
      return errorResponse(res, 'Kode OTP salah atau sudah kedaluwarsa. Silakan ajukan kode baru.', 400);
    }

    // Hash new password
    const newHash = await hashPassword(newPassword);

    // Update password & mark OTP as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash },
      }),
      prisma.passwordResetOtp.update({
        where: { id: validOtp.id },
        data: { usedAt: new Date() },
      }),
    ]);

    await logAudit({
      userId: user.id,
      action: 'PASSWORD_RESET_SUCCESSFUL',
      resourceType: 'AUTH',
      resourceId: user.id,
      req,
    });

    // Notify user on WhatsApp that password was changed
    const successMsg =
      `*[PT CEMINDO GEMILANG Tbk - PLANT BATAM]*\n` +
      `─────────────────\n` +
      `Halo *${user.name}*,\n\n` +
      `Kata sandi akun MRMS Anda baru saja berhasil direset.\n` +
      `Jika Anda tidak melakukan perubahan ini, segera hubungi Administrator HRGA atau IT Plant Batam.\n\n` +
      `─────────────────\n` +
      `_Sistem Otomatis MRMS Plant Batam_`;

    try {
      await whatsappGateway.sendMessage(user.phone, successMsg);
    } catch {}

    return successResponse(
      res,
      { success: true },
      'Kata sandi Anda berhasil direset! Silakan masuk menggunakan kata sandi baru Anda.'
    );
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, async (req, res) => {
  return successResponse(res, {
    user: {
      id: req.user.id,
      username: req.user.username,
      nik: req.user.nik,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      role: req.user.role,
      avatarUrl: req.user.avatarUrl,
      permissions: resolveUserPermissions(req.user),
      customPermissions: req.user.permissions || [],
      department: req.user.department,
    },
  });
});

router.put('/change-password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return errorResponse(res, 'Password saat ini dan password baru wajib diisi.', 400);
    }

    if (newPassword.length < 6) {
      return errorResponse(res, 'Password baru minimal harus 6 karakter.', 400);
    }

    const isMatch = await comparePassword(currentPassword, req.user.passwordHash);
    if (!isMatch) {
      return errorResponse(res, 'Password saat ini yang Anda masukkan salah.', 400);
    }

    if (currentPassword === newPassword) {
      return errorResponse(res, 'Password baru tidak boleh sama dengan password lama.', 400);
    }

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash: newHash },
    });

    await logAudit({
      userId: req.user.id,
      action: 'CHANGE_PASSWORD_SELF',
      resourceType: 'USER',
      resourceId: req.user.id,
      req,
    });

    if (req.user.phone) {
      const msg =
        `*[PT CEMINDO GEMILANG Tbk - PLANT BATAM]*\n` +
        `─────────────────\n` +
        `Halo *${req.user.name}*,\n\n` +
        `Kata sandi akun MRMS Anda baru saja berhasil diubah secara mandiri melalui Halaman Profil.\n` +
        `Jika Anda tidak melakukan perubahan ini, segera hubungi Administrator HRGA atau IT Plant Batam.\n\n` +
        `─────────────────\n` +
        `_Sistem Otomatis MRMS Plant Batam_`;
      try {
        await whatsappGateway.sendMessage(req.user.phone, msg);
      } catch {}
    }

    return successResponse(res, null, 'Password Anda berhasil diperbarui.');
  } catch (err) {
    next(err);
  }
});

router.put('/profile', authenticate, async (req, res, next) => {
  try {
    const { name, phone, avatarUrl } = req.body;
    const updateData = {};

    if (name !== undefined) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      include: { department: true },
    });

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE_PROFILE_SELF',
      resourceType: 'USER',
      resourceId: req.user.id,
      newValues: { name: updated.name, phone: updated.phone, hasAvatar: Boolean(updated.avatarUrl) },
      req,
    });

    return successResponse(
      res,
      {
        id: updated.id,
        username: updated.username,
        nik: updated.nik,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        role: updated.role,
        avatarUrl: updated.avatarUrl,
        permissions: resolveUserPermissions(updated),
        customPermissions: updated.permissions || [],
        department: updated.department,
      },
      'Profil Anda berhasil diperbarui.'
    );
  } catch (err) {
    next(err);
  }
});

router.post('/logout', authenticate, async (req, res) => {
  await logAudit({
    userId: req.user?.id,
    action: 'LOGOUT',
    resourceType: 'AUTH',
    req,
  });
  return successResponse(res, null, 'Logout berhasil.');
});

module.exports = router;
