const express = require('express');
const router = express.Router();
const prisma = require('../../config/database');
const { successResponse, errorResponse } = require('../../utils/response');
const { authenticate } = require('../../middleware/auth');
const { requireRole, requirePermission } = require('../../middleware/rbac');
const { PERMISSION_GROUPS, ROLE_DEFAULTS, ALL_PERMISSION_IDS } = require('../../config/permissions');
const { hashPassword } = require('../../utils/passwords');
const { logAudit } = require('../../utils/audit');
const { z } = require('zod');
const { validateBody } = require('../../middleware/validate');

const userCreateSchema = z.object({
  nik: z.string().min(1, 'NIK wajib diisi'),
  username: z.string().min(1, 'Username minimal 1 karakter').optional(),
  name: z.string().min(1, 'Nama lengkap wajib diisi'),
  email: z.string().email('Format email tidak valid'),
  phone: z.string().min(1, 'Nomor HP/WA wajib diisi'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  role: z.enum(['EMPLOYEE', 'HRGA', 'ADMIN']),
  departmentId: z.string().uuid('ID Departemen tidak valid'),
  permissions: z.array(z.string()).optional(),
});

const userUpdateSchema = z.object({
  nik: z.string().min(1).optional(),
  username: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(1).optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['EMPLOYEE', 'HRGA', 'ADMIN']).optional(),
  departmentId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
  permissions: z.array(z.string()).optional(),
});

router.use(authenticate);

// Admin & HRGA: Download Excel Template for Bulk Import
router.get('/template', requireRole(['ADMIN', 'HRGA']), async (req, res, next) => {
  try {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MRMS PT Cemindo Gemilang Tbk';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Data Pengguna', {
      views: [{ showGridLines: true }],
    });

    const departments = await prisma.department.findMany({
      where: { isActive: true },
      select: { code: true, name: true },
      orderBy: { code: 'asc' },
    });
    const deptListStr = departments.map((d) => d.code).join(', ');

    sheet.columns = [
      { header: 'NIK (Wajib)', key: 'nik', width: 18 },
      { header: 'Nama Lengkap (Wajib)', key: 'name', width: 28 },
      { header: 'Username (Opsional)', key: 'username', width: 20 },
      { header: 'Email Perusahaan (Wajib)', key: 'email', width: 32 },
      { header: 'Nomor WhatsApp (Wajib)', key: 'phone', width: 20 },
      { header: 'Departemen (Kode/Nama)', key: 'department', width: 25 },
      { header: 'Peran (EMPLOYEE/HRGA/ADMIN)', key: 'role', width: 25 },
      { header: 'Password Awal (Opsional)', key: 'password', width: 22 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFB52025' },
      };
      cell.font = {
        name: 'Segoe UI',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF991B1E' } },
        bottom: { style: 'medium', color: { argb: 'FF7F1D1D' } },
        left: { style: 'thin', color: { argb: 'FF991B1E' } },
        right: { style: 'thin', color: { argb: 'FF991B1E' } },
      };
    });

    const sampleRows = [
      {
        nik: 'CG-PRD-099',
        name: 'Agus Pratama',
        username: 'agus.pratama',
        email: 'agus.pratama@cemindogemilang.com',
        phone: '081234567890',
        department: departments[0]?.code || 'IT',
        role: 'EMPLOYEE',
        password: 'Password123!',
      },
      {
        nik: 'CG-FIN-098',
        name: 'Dewi Anggraini',
        username: 'dewi.anggraini',
        email: 'dewi.anggraini@cemindogemilang.com',
        phone: '081234567891',
        department: departments[1]?.code || 'HRGA & SUPPORTING',
        role: 'EMPLOYEE',
        password: '',
      },
    ];

    sampleRows.forEach((item) => {
      const row = sheet.addRow(item);
      row.height = 22;
      row.eachCell((cell) => {
        cell.font = { name: 'Segoe UI', size: 10 };
        cell.alignment = { vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      });
    });

    const infoSheet = workbook.addWorksheet('Petunjuk Pengisian', {
      views: [{ showGridLines: true }],
    });
    infoSheet.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Kolom', key: 'col', width: 25 },
      { header: 'Ketentuan / Aturan Validasi', key: 'rule', width: 50 },
      { header: 'Contoh Isi', key: 'example', width: 30 },
    ];
    const infoHeader = infoSheet.getRow(1);
    infoHeader.height = 26;
    infoHeader.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' },
      };
      cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    const instructions = [
      { no: 1, col: 'NIK', rule: 'Wajib diisi, unik per karyawan.', example: 'CG-IT-001' },
      { no: 2, col: 'Nama Lengkap', rule: 'Wajib diisi, nama lengkap karyawan.', example: 'Bambang Friadi' },
      { no: 3, col: 'Username', rule: 'Opsional. Jika kosong, sistem otomatis membuat dari awalan email.', example: 'bambang' },
      { no: 4, col: 'Email Perusahaan', rule: 'Wajib diisi, format email valid, unik.', example: 'bambang.friadi@cemindo.com' },
      { no: 5, col: 'Nomor WhatsApp', rule: 'Wajib diisi, format 08xx atau 62xx untuk OTP & notifikasi.', example: '081363331467' },
      { no: 6, col: 'Departemen', rule: `Kode atau Nama Departemen terdaftar. Pilihan: ${deptListStr}`, example: departments[0]?.code || 'IT' },
      { no: 7, col: 'Peran', rule: 'Pilihan: EMPLOYEE, HRGA, atau ADMIN.', example: 'EMPLOYEE' },
      { no: 8, col: 'Password Awal', rule: 'Opsional, minimal 6 karakter. Default: Password123!', example: 'Password123!' },
      { no: 9, col: 'Aturan Overwrite', rule: 'Data pada file import akan langsung MENIMPA (update) data pengguna lama di sistem. Pengguna baru otomatis ditambahkan. Akun ADMIN dilindungi dan tidak ditimpa.', example: 'Menimpa data lama (Kecuali ADMIN)' },
    ];

    instructions.forEach((ins) => {
      const r = infoSheet.addRow(ins);
      r.height = 22;
      r.eachCell((cell) => {
        cell.font = { name: 'Segoe UI', size: 9 };
        cell.alignment = { vertical: 'middle' };
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="Template_Import_Pengguna_MRMS.xlsx"'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
});

// Admin only: Bulk Import Users (Overwrite Mode, Admin Protected)
router.post('/import', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const { fileBase64, rows: directRows, cleanUnmatched = true } = req.body;
    let rawRows = [];

    if (Array.isArray(directRows) && directRows.length > 0) {
      rawRows = directRows;
    } else if (fileBase64) {
      const ExcelJS = require('exceljs');
      const cleanBase64 = fileBase64.replace(/^data:.*?;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');

      function identifyColumn(headerStr) {
        const h = String(headerStr || '').toLowerCase().trim();
        if (h.includes('nik')) return 'nik';
        if (h.includes('departemen') || h.includes('dept')) return 'department';
        if (h.includes('peran') || h.includes('role')) return 'role';
        if (h.includes('password') || h.includes('sandi') || h.includes('pass')) return 'password';
        if (h.includes('email') || h.includes('surel')) return 'email';
        if (h.includes('username') || h.includes('user name')) return 'username';
        if (
          h.includes('whatsapp') ||
          h.includes('telepon') ||
          h.includes('phone') ||
          h.includes('kontak') ||
          h.includes('hp') ||
          /\bwa\b/.test(h)
        )
          return 'phone';
        if (h.includes('nama lengkap') || h.includes('nama') || h.includes('name')) return 'name';
        return null;
      }

      try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.worksheets[0];
        if (worksheet) {
          const colMap = {};
          worksheet.getRow(1).eachCell((cell, colNumber) => {
            colMap[colNumber] = identifyColumn(cell.value);
          });

          worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // skip header row
            const rowData = {};
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
              const field = colMap[colNumber];
              if (field) {
                let val = cell.value;
                if (val && typeof val === 'object') {
                  if (val.text) val = val.text;
                  else if (val.result) val = val.result;
                  else val = String(val);
                }
                if (val !== undefined && val !== null) {
                  rowData[field] = String(val).trim();
                }
              }
            });

            // Positional fallback
            const getCellVal = (col) => {
              let val = row.getCell(col).value;
              if (val && typeof val === 'object') {
                if (val.text) val = val.text;
                else if (val.result) val = val.result;
                else val = String(val);
              }
              return val !== undefined && val !== null ? String(val).trim() : '';
            };

            if (!rowData.nik) rowData.nik = getCellVal(1);
            if (!rowData.name) rowData.name = getCellVal(2);
            if (!rowData.username) rowData.username = getCellVal(3);
            if (!rowData.email) rowData.email = getCellVal(4);
            if (!rowData.phone) rowData.phone = getCellVal(5);
            if (!rowData.department) rowData.department = getCellVal(6);
            if (!rowData.role) rowData.role = getCellVal(7);
            if (!rowData.password) rowData.password = getCellVal(8);

            if (rowData.nik || rowData.name || rowData.email || rowData.username) {
              rawRows.push(rowData);
            }
          });
        }
      } catch (xlsxErr) {
        // Fallback CSV parsing
        const text = buffer.toString('utf-8');
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length > 1) {
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
            if (cols.length >= 2) {
              rawRows.push({
                nik: cols[0],
                name: cols[1],
                username: cols[2],
                email: cols[3],
                phone: cols[4],
                department: cols[5],
                role: cols[6],
                password: cols[7],
              });
            }
          }
        }
      }
    }

    if (rawRows.length === 0) {
      return errorResponse(
        res,
        'File template kosong atau format tidak sesuai. Harap unduh template resmi dan masukkan data pengguna.',
        400
      );
    }

    const departments = await prisma.department.findMany({
      where: { isActive: true },
    });
    const defaultDept = departments[0] || (await prisma.department.findFirst());

    const existingUsers = await prisma.user.findMany({
      select: {
        id: true,
        nik: true,
        username: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        departmentId: true,
        isActive: true,
      },
    });

    // Identify ADMIN users to strictly protect them from overwrite or deletion
    const adminUsers = existingUsers.filter(
      (u) => u.role === 'ADMIN' || (u.username && u.username.toLowerCase() === 'admin')
    );
    const adminUserIds = new Set(adminUsers.map((u) => u.id));
    const adminNiks = new Set(adminUsers.map((u) => (u.nik || '').toLowerCase().trim()));
    const adminUsernames = new Set(
      adminUsers.filter((u) => u.username).map((u) => u.username.toLowerCase().trim())
    );
    const adminEmails = new Set(adminUsers.map((u) => (u.email || '').toLowerCase().trim()));

    const imported = [];
    const overwritten = [];
    const skipped = [];
    const touchedUserIds = new Set();

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      let nik = (row.nik || '').trim();
      let name = (row.name || '').trim();
      let email = (row.email || '').toLowerCase().trim();
      let username = (row.username || '').toLowerCase().trim();
      let phone = (row.phone || '').trim();
      let deptInput = (row.department || '').trim();
      let role = (row.role || 'EMPLOYEE').toUpperCase().trim();
      let password = (row.password || '').trim();

      // Email & Username generation if missing
      if (!email && name) {
        const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '.');
        email = `${cleanName}@cemindogemilang.com`;
      }
      if (!username && email) {
        username = email.split('@')[0].toLowerCase();
      }

      // Valid Phone fallback if missing
      if (!phone) {
        phone = '0812' + Math.floor(10000000 + Math.random() * 90000000);
      }

      // Basic row validity check
      if (!name) {
        skipped.push({
          row: i + 2,
          nik: nik || '-',
          name: name || '-',
          reason: 'Nama Lengkap kosong.',
        });
        continue;
      }

      // Role validation: EMPLOYEE, HRGA, ADMIN
      if (!['EMPLOYEE', 'HRGA', 'ADMIN'].includes(role)) {
        role = 'EMPLOYEE';
      }

      // Check if row matches an ADMIN account (Strictly Protected: akun admin di DB tidak ditimpa dari file import)
      const matchesAdmin =
        (username && adminUsernames.has(username.toLowerCase())) ||
        (email && adminEmails.has(email.toLowerCase()));

      if (matchesAdmin) {
        skipped.push({
          row: i + 2,
          nik,
          name,
          username,
          email,
          reason: 'Akun ADMIN dilindungi sistem dan tidak ditimpa.',
        });
        continue;
      }

      // Resolve Target Department
      let targetDept = defaultDept;
      if (deptInput) {
        const dLower = deptInput.toLowerCase();
        const match =
          departments.find((d) => d.code.toLowerCase() === dLower) ||
          departments.find((d) => d.name.toLowerCase() === dLower) ||
          departments.find((d) => d.name.toLowerCase().includes(dLower)) ||
          departments.find((d) => dLower.includes(d.code.toLowerCase()));
        if (match) targetDept = match;
      }

      if (!targetDept) {
        skipped.push({
          row: i + 2,
          nik,
          name,
          reason: 'Departemen tidak ditemukan dan tidak ada departemen aktif.',
        });
        continue;
      }

      // 9. Check if matching existing non-admin user (berdasarkan Username atau Email)
      // NIK dan nomor telepon diizinkan sama antar karyawan saat testing/transisi
      const existingNonAdmin = existingUsers.find(
        (u) =>
          !adminUserIds.has(u.id) &&
          (
            (username && u.username && u.username.toLowerCase().trim() === username.toLowerCase().trim()) ||
            (email && u.email && u.email.toLowerCase().trim() === email.toLowerCase().trim())
          )
      );

      if (existingNonAdmin) {
        // OVERWRITE / UPDATE existing non-admin user
        const updateData = {
          nik,
          name,
          username,
          email,
          phone,
          departmentId: targetDept.id,
          role,
          isActive: true,
        };
        if (password) {
          updateData.passwordHash = await hashPassword(password);
        }

        const updated = await prisma.user.update({
          where: { id: existingNonAdmin.id },
          data: updateData,
          select: {
            id: true,
            nik: true,
            username: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            department: { select: { code: true, name: true } },
          },
        });

        touchedUserIds.add(updated.id);

        // Update in-memory cache to prevent intra-file duplicate collision
        const idx = existingUsers.findIndex((u) => u.id === updated.id);
        if (idx >= 0) {
          existingUsers[idx] = {
            ...existingUsers[idx],
            nik: updated.nik,
            username: updated.username,
            email: updated.email,
            name: updated.name,
            phone: updated.phone,
            departmentId: targetDept.id,
            role: updated.role,
          };
        }

        overwritten.push({
          row: i + 2,
          id: updated.id,
          nik: updated.nik,
          username: updated.username,
          name: updated.name,
          email: updated.email,
          department: updated.department?.name,
          role: updated.role,
        });
      } else {
        // INSERT / CREATE new user
        const passwordHash = await hashPassword(password || 'Password123!');
        const newUser = await prisma.user.create({
          data: {
            nik,
            username,
            name,
            email,
            phone,
            passwordHash,
            role,
            departmentId: targetDept.id,
            isActive: true,
          },
          select: {
            id: true,
            nik: true,
            username: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            department: { select: { code: true, name: true } },
          },
        });

        touchedUserIds.add(newUser.id);
        existingUsers.push({
          id: newUser.id,
          nik: newUser.nik,
          username: newUser.username,
          email: newUser.email,
          name: newUser.name,
          phone: newUser.phone,
          departmentId: targetDept.id,
          role: newUser.role,
          isActive: true,
        });

        imported.push({
          row: i + 2,
          id: newUser.id,
          nik: newUser.nik,
          username: newUser.username,
          name: newUser.name,
          email: newUser.email,
          department: newUser.department?.name,
          role: newUser.role,
        });
      }
    }

    // 10. Clean up stale non-admin users not present in the imported file
    let cleanedCount = 0;
    let deactivatedCount = 0;
    const cleaned = [];

    if (cleanUnmatched) {
      const staleNonAdmins = existingUsers.filter(
        (u) => !adminUserIds.has(u.id) && !touchedUserIds.has(u.id)
      );

      for (const stale of staleNonAdmins) {
        const activeBooking = await prisma.booking.findFirst({
          where: {
            userId: stale.id,
            status: { in: ['CONFIRMED', 'CHECKED_IN'] },
            endTime: { gte: new Date() },
          },
        });

        if (!activeBooking) {
          // Safe cascade delete
          await prisma.$transaction(async (tx) => {
            await tx.passwordResetOtp.deleteMany({ where: { userId: stale.id } });
            await tx.auditLog.updateMany({ where: { userId: stale.id }, data: { userId: null } });
            await tx.roomUsageSession.updateMany({
              where: { manualCheckoutById: stale.id },
              data: { manualCheckoutById: null },
            });
            const staleBookings = await tx.booking.findMany({
              where: { userId: stale.id },
              select: { id: true },
            });
            const bIds = staleBookings.map((b) => b.id);
            if (bIds.length > 0) {
              await tx.bookingHistory.deleteMany({ where: { bookingId: { in: bIds } } });
              await tx.roomUsageSession.deleteMany({ where: { bookingId: { in: bIds } } });
              await tx.booking.deleteMany({ where: { id: { in: bIds } } });
            }
            await tx.bookingHistory.deleteMany({ where: { actorId: stale.id } });
            await tx.roomBlock.deleteMany({ where: { createdById: stale.id } });
            await tx.user.delete({ where: { id: stale.id } });
          });
          cleanedCount++;
          cleaned.push({
            id: stale.id,
            nik: stale.nik,
            name: stale.name,
            email: stale.email,
            action: 'DELETED',
          });
        } else {
          await prisma.user.update({
            where: { id: stale.id },
            data: { isActive: false },
          });
          deactivatedCount++;
          cleaned.push({
            id: stale.id,
            nik: stale.nik,
            name: stale.name,
            email: stale.email,
            action: 'DEACTIVATED',
          });
        }
      }
    }

    await logAudit({
      userId: req.user.id,
      action: 'BULK_IMPORT_OVERWRITE_USERS',
      resourceType: 'USER',
      resourceId: req.user.id,
      newValues: {
        totalRows: rawRows.length,
        overwrittenCount: overwritten.length,
        importedCount: imported.length,
        skippedCount: skipped.length,
        cleanedCount,
        deactivatedCount,
        cleanUnmatched: Boolean(cleanUnmatched),
      },
      req,
    });

    return successResponse(
      res,
      {
        totalRows: rawRows.length,
        overwrittenCount: overwritten.length,
        importedCount: imported.length,
        skippedCount: skipped.length,
        cleanedCount,
        deactivatedCount,
        overwritten,
        imported,
        skipped,
        cleaned,
      },
      `Bulk import berhasil: ${overwritten.length} data ditimpa/diperbarui, ${imported.length} data baru ditambahkan, ${skipped.length} akun ADMIN dilindungi.`
    );
  } catch (err) {
    next(err);
  }
});

// Admin & HRGA: Get Permission Catalog & Role Defaults
router.get('/permissions/catalog', requireRole(['ADMIN', 'HRGA']), async (req, res) => {
  return successResponse(
    res,
    {
      groups: PERMISSION_GROUPS,
      roleDefaults: ROLE_DEFAULTS,
      allIds: ALL_PERMISSION_IDS,
    },
    'Katalog hak akses berhasil diambil.'
  );
});

// Admin & HRGA can list users
router.get('/', requireRole(['ADMIN', 'HRGA']), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const skip = (page - 1) * limit;
    const { search, role, departmentId } = req.query;

    const where = {};
    if (role) where.role = role;
    if (departmentId) where.departmentId = departmentId;
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { nik: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          nik: true,
          username: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          permissions: true,
          isActive: true,
          createdAt: true,
          department: { select: { id: true, code: true, name: true } },
        },
      }),
    ]);

    return successResponse(res, users, 'Daftar pengguna berhasil diambil.', 200, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
});

// Admin only: Create User
router.post('/', requireRole(['ADMIN']), validateBody(userCreateSchema), async (req, res, next) => {
  try {
    const { nik, username, name, email, phone, password, role, departmentId, permissions } = req.body;
    const finalUsername = (username || email.split('@')[0] || '').toLowerCase().trim();

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase().trim() },
          { username: finalUsername },
        ],
      },
    });

    if (existing) {
      return errorResponse(res, 'Email atau Username sudah digunakan oleh pengguna lain.', 409);
    }

    const passwordHash = await hashPassword(password);
    const initialPermissions = Array.isArray(permissions) && permissions.length > 0 
      ? permissions 
      : (ROLE_DEFAULTS[role] || []);

    const user = await prisma.user.create({
      data: {
        nik: nik.trim(),
        username: finalUsername,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        passwordHash,
        role,
        departmentId,
        permissions: initialPermissions,
        isActive: true,
      },
      select: {
        id: true,
        nik: true,
        username: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        permissions: true,
        isActive: true,
        department: true,
      },
    });

    await logAudit({
      userId: req.user.id,
      action: 'CREATE_USER',
      resourceType: 'USER',
      resourceId: user.id,
      newValues: { nik, username: finalUsername, name, email, role, departmentId, permissions: initialPermissions },
      req,
    });

    return successResponse(res, user, 'Pengguna berhasil dibuat.', 201);
  } catch (err) {
    next(err);
  }
});

// Admin only: Update User Permissions Checklist
router.put('/:id/permissions', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return errorResponse(res, 'Format data permissions harus berupa array string.', 400);
    }

    const validPermissions = permissions.filter((p) => ALL_PERMISSION_IDS.includes(p) || p === '*');

    const oldUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, role: true, permissions: true },
    });

    if (!oldUser) {
      return errorResponse(res, 'Pengguna tidak ditemukan.', 404);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { permissions: validPermissions },
      select: {
        id: true,
        nik: true,
        username: true,
        name: true,
        role: true,
        permissions: true,
      },
    });

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE_USER_PERMISSIONS',
      resourceType: 'USER',
      resourceId: id,
      oldValues: { permissions: oldUser.permissions },
      newValues: { permissions: validPermissions },
      req,
    });

    return successResponse(
      res,
      updated,
      `Checklist hak akses untuk ${updated.name} berhasil diperbarui (${validPermissions.length} izin aktif).`
    );
  } catch (err) {
    next(err);
  }
});

// Admin only: Update User
router.put('/:id', requireRole(['ADMIN']), validateBody(userUpdateSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nik, username, name, email, phone, password, role, departmentId, isActive, permissions } = req.body;

    const oldUser = await prisma.user.findUnique({ where: { id } });
    if (!oldUser) return errorResponse(res, 'Pengguna tidak ditemukan.', 404);

    const updateData = {};
    if (nik) updateData.nik = nik.trim();
    if (username !== undefined) updateData.username = username ? username.toLowerCase().trim() : null;
    if (name) updateData.name = name.trim();
    if (email) updateData.email = email.toLowerCase().trim();
    if (phone) updateData.phone = phone.trim();
    if (role) updateData.role = role;
    if (departmentId) updateData.departmentId = departmentId;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (permissions !== undefined && Array.isArray(permissions)) updateData.permissions = permissions;
    if (password) updateData.passwordHash = await hashPassword(password);

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        nik: true,
        username: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        permissions: true,
        isActive: true,
        department: true,
      },
    });

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE_USER',
      resourceType: 'USER',
      resourceId: id,
      oldValues: { nik: oldUser.nik, email: oldUser.email, role: oldUser.role, isActive: oldUser.isActive },
      newValues: updateData,
      req,
    });

    return successResponse(res, updated, 'Data pengguna berhasil diperbarui.');
  } catch (err) {
    next(err);
  }
});

// Admin: Toggle active status
router.patch('/:id/status', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (id === req.user.id && isActive === false) {
      return errorResponse(res, 'Anda tidak dapat menonaktifkan akun sendiri.', 400);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: Boolean(isActive) },
      select: { id: true, name: true, isActive: true },
    });

    await logAudit({
      userId: req.user.id,
      action: 'TOGGLE_USER_STATUS',
      resourceType: 'USER',
      resourceId: id,
      newValues: { isActive: updated.isActive },
      req,
    });

    return successResponse(res, updated, `Status akun berhasil diubah menjadi ${updated.isActive ? 'Aktif' : 'Non-aktif'}.`);
  } catch (err) {
    next(err);
  }
});

// Admin only: Delete User
router.delete('/:id', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return errorResponse(res, 'Anda tidak dapat menghapus akun Anda sendiri.', 400);
    }

    const user = await prisma.user.findUnique({
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

    if (!user) {
      return errorResponse(res, 'Pengguna tidak ditemukan.', 404);
    }

    if (user.bookings && user.bookings.length > 0) {
      return errorResponse(
        res,
        `Tidak dapat menghapus pengguna "${user.name}" karena masih memiliki ${user.bookings.length} reservasi aktif/mendatang. Harap batalkan reservasi terlebih dahulu.`,
        400
      );
    }

    // Cascade safe delete in Prisma transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete password reset OTPs
      await tx.passwordResetOtp.deleteMany({ where: { userId: id } });
      // 2. Unlink audit logs (preserve audit trail with userId: null)
      await tx.auditLog.updateMany({ where: { userId: id }, data: { userId: null } });
      // 3. Unlink manual checkouts
      await tx.roomUsageSession.updateMany({
        where: { manualCheckoutById: id },
        data: { manualCheckoutById: null },
      });
      // 4. Delete past bookings of this user
      const userBookings = await tx.booking.findMany({
        where: { userId: id },
        select: { id: true },
      });
      const bookingIds = userBookings.map((b) => b.id);
      if (bookingIds.length > 0) {
        await tx.bookingHistory.deleteMany({ where: { bookingId: { in: bookingIds } } });
        await tx.roomUsageSession.deleteMany({ where: { bookingId: { in: bookingIds } } });
        await tx.booking.deleteMany({ where: { id: { in: bookingIds } } });
      }
      await tx.bookingHistory.deleteMany({ where: { actorId: id } });
      await tx.roomBlock.deleteMany({ where: { createdById: id } });
      // 5. Delete the user
      await tx.user.delete({ where: { id } });
    });

    await logAudit({
      userId: req.user.id,
      action: 'DELETE_USER',
      resourceType: 'USER',
      resourceId: id,
      oldValues: {
        nik: user.nik,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      req,
    });

    return successResponse(res, null, `Pengguna "${user.name}" berhasil dihapus dari sistem.`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

