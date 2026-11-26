const express = require('express');
const router = express.Router();
const prisma = require('../../config/database');
const ExcelJS = require('exceljs');
const { stringify } = require('csv-stringify/sync');
const { formatWIB } = require('../../utils/timezone');
const { successResponse, errorResponse } = require('../../utils/response');
const { authenticate } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/rbac');
const { getSystemSettings } = require('../../config/system-settings');

router.use(authenticate);
router.use(requirePermission('menu:reports'));

/**
 * Parse YYYY-MM-DD (or ISO string) into inclusive WIB (+07:00) start/end Date objects.
 * Prevents endDate = "YYYY-MM-DD" from cutting off bookings after 07:00 WIB.
 */
function parseWIBDateRange(startDate, endDate, defaultDays = 30) {
  const now = new Date();
  let start;
  let end;

  if (startDate) {
    start = startDate.includes('T')
      ? new Date(startDate)
      : new Date(`${startDate}T00:00:00.000+07:00`);
  } else {
    const wibToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(
      new Date(now.getTime() - defaultDays * 24 * 60 * 60 * 1000)
    );
    start = new Date(`${wibToday}T00:00:00.000+07:00`);
  }

  if (endDate) {
    end = endDate.includes('T')
      ? new Date(endDate)
      : new Date(`${endDate}T23:59:59.999+07:00`);
  } else {
    const wibToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now);
    end = new Date(`${wibToday}T23:59:59.999+07:00`);
  }

  return { start, end };
}

// 1. Room Usage Summary & Detailed Table
router.get('/room-usage', async (req, res, next) => {
  try {
    const { startDate, endDate, roomId, departmentId, status, format } = req.query;

    const where = {};
    if (roomId) where.roomId = roomId;
    if (status) where.status = status;
    if (departmentId) where.user = { departmentId };

    if (startDate || endDate) {
      const { start, end } = parseWIBDateRange(startDate, endDate);
      where.startTime = {};
      if (startDate) where.startTime.gte = start;
      if (endDate) where.startTime.lte = end;
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        room: true,
        user: { include: { department: true } },
        usageSession: {
          include: { manualCheckoutUser: { select: { name: true } } },
        },
      },
      orderBy: { startTime: 'desc' },
    });

    const rows = bookings.map((b) => {
      const plannedMinutes = (new Date(b.endTime) - new Date(b.startTime)) / 60000;
      let actualMinutes = 0;
      if (b.usageSession?.actualCheckin && b.usageSession?.actualCheckout) {
        actualMinutes =
          (new Date(b.usageSession.actualCheckout) - new Date(b.usageSession.actualCheckin)) / 60000;
      }

      return {
        id: b.id,
        bookingCode: b.bookingCode,
        roomName: b.room.name,
        roomCode: b.room.code,
        agenda: b.title,
        bookerName: b.user.name,
        department: b.user.department.name,
        meetingType: b.meetingType,
        attendeesCount: b.attendeesCount,
        status: b.status,
        plannedStart: formatWIB(b.startTime),
        plannedEnd: formatWIB(b.endTime),
        plannedDurationMinutes: Math.round(plannedMinutes),
        actualCheckin: b.usageSession?.actualCheckin ? formatWIB(b.usageSession.actualCheckin) : '-',
        actualCheckout: b.usageSession?.actualCheckout ? formatWIB(b.usageSession.actualCheckout) : '-',
        actualDurationMinutes: Math.round(actualMinutes),
        isManualCheckout: b.usageSession?.isManualCheckout || false,
        manualCheckoutOfficer: b.usageSession?.manualCheckoutUser?.name || '-',
        manualCheckoutReason: b.usageSession?.manualCheckoutReason || '-',
      };
    });

    if (format === 'csv') {
      const csvData = stringify(rows, { header: true });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="room-usage-report.csv"');
      return res.send(csvData);
    }

    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'PT Cemindo Gemilang Tbk - Plant Batam';
      workbook.created = new Date();

      const sheet = workbook.addWorksheet('Laporan Penggunaan Ruangan', {
        views: [{ state: 'frozen', ySplit: 5 }],
      });

      // 1. Corporate Header Block
      sheet.mergeCells('A1:P1');
      sheet.getCell('A1').value = 'PT CEMINDO GEMILANG Tbk — PLANT BATAM';
      sheet.getCell('A1').font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFB52025' } };
      sheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' };
      sheet.getRow(1).height = 24;

      sheet.mergeCells('A2:P2');
      sheet.getCell('A2').value = 'LAPORAN REKAPITULASI PENGGUNAAN RUANG MEETING (MRMS)';
      sheet.getCell('A2').font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E293B' } };
      sheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'left' };
      sheet.getRow(2).height = 18;

      sheet.mergeCells('A3:P3');
      const startStr = startDate ? startDate.toString().substring(0, 10) : 'Semua';
      const endStr = endDate ? endDate.toString().substring(0, 10) : 'Semua';
      sheet.getCell('A3').value = `Periode: ${startStr} s/d ${endStr}  |  Total Data: ${rows.length} reservasi  |  Dicetak pada: ${formatWIB(new Date())}`;
      sheet.getCell('A3').font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };
      sheet.getCell('A3').alignment = { vertical: 'middle', horizontal: 'left' };
      sheet.getRow(3).height = 16;

      sheet.getRow(4).height = 8; // Empty separator row

      // 2. Column Definitions
      const columns = [
        { header: 'No.', key: 'no', width: 6, align: 'center' },
        { header: 'Kode Booking', key: 'bookingCode', width: 18, align: 'center' },
        { header: 'Ruangan', key: 'roomName', width: 28, align: 'left' },
        { header: 'Agenda / Judul Rapat', key: 'agenda', width: 34, align: 'left' },
        { header: 'Pemesan', key: 'bookerName', width: 22, align: 'left' },
        { header: 'Departemen', key: 'department', width: 24, align: 'left' },
        { header: 'Status', key: 'status', width: 16, align: 'center' },
        { header: 'Jadwal Mulai', key: 'plannedStart', width: 20, align: 'center' },
        { header: 'Jadwal Selesai', key: 'plannedEnd', width: 20, align: 'center' },
        { header: 'Rencana (Menit)', key: 'plannedDurationMinutes', width: 16, align: 'right' },
        { header: 'Check-in Aktual', key: 'actualCheckin', width: 20, align: 'center' },
        { header: 'Check-out Aktual', key: 'actualCheckout', width: 20, align: 'center' },
        { header: 'Aktual (Menit)', key: 'actualDurationMinutes', width: 16, align: 'right' },
        { header: 'Checkout Manual', key: 'isManualCheckoutText', width: 16, align: 'center' },
        { header: 'Petugas HRGA', key: 'manualCheckoutOfficer', width: 22, align: 'left' },
        { header: 'Alasan Manual', key: 'manualCheckoutReason', width: 30, align: 'left' },
      ];

      // Row 5: Table Headers
      const headerRow = sheet.getRow(5);
      headerRow.height = 28;
      columns.forEach((col, idx) => {
        const cell = headerRow.getCell(idx + 1);
        cell.value = col.header;
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFB52025' }, // Cemindo Corporate Red
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = {
          top: { style: 'medium', color: { argb: 'FF8A1217' } },
          bottom: { style: 'medium', color: { argb: 'FF8A1217' } },
          left: { style: 'thin', color: { argb: 'FFDC2626' } },
          right: { style: 'thin', color: { argb: 'FFDC2626' } },
        };
        sheet.getColumn(idx + 1).width = col.width;
      });

      // 3. Data Rows
      let totalPlannedMinutes = 0;
      let totalActualMinutes = 0;

      rows.forEach((r, idx) => {
        const rowNumber = 6 + idx;
        const row = sheet.getRow(rowNumber);
        row.height = 22;

        const isEven = idx % 2 === 0;
        const rowBgColor = isEven ? 'FFFFFFFF' : 'FFF8FAFC'; // Soft zebra striping

        const isManual = r.isManualCheckout ? 'Ya (Oleh HRGA)' : 'Tidak';
        totalPlannedMinutes += Number(r.plannedDurationMinutes) || 0;
        totalActualMinutes += Number(r.actualDurationMinutes) || 0;

        const values = [
          idx + 1,
          r.bookingCode,
          r.roomName,
          r.agenda,
          r.bookerName,
          r.department,
          r.status,
          r.plannedStart,
          r.plannedEnd,
          Number(r.plannedDurationMinutes) || 0,
          r.actualCheckin,
          r.actualCheckout,
          Number(r.actualDurationMinutes) || 0,
          isManual,
          r.manualCheckoutOfficer || '-',
          r.manualCheckoutReason || '-',
        ];

        values.forEach((val, colIdx) => {
          const cell = row.getCell(colIdx + 1);
          cell.value = val;
          cell.font = { name: 'Arial', size: 9 };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: rowBgColor },
          };
          cell.alignment = {
            vertical: 'middle',
            horizontal: columns[colIdx].align,
          };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          };

          // Distinct Status styling
          if (columns[colIdx].key === 'status') {
            if (val === 'COMPLETED') {
              cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF059669' } };
            } else if (val === 'CANCELLED') {
              cell.font = { name: 'Arial', size: 9, color: { argb: 'FF94A3B8' } };
            } else if (val === 'CHECKED_IN') {
              cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0284C7' } };
            } else if (val === 'OVERDUE') {
              cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFE11D48' } };
            }
          }
        });
      });

      // 4. Summary / Total Row
      const summaryRowNum = 6 + rows.length;
      const summaryRow = sheet.getRow(summaryRowNum);
      summaryRow.height = 24;

      summaryRow.getCell(1).value = '';
      summaryRow.getCell(2).value = 'TOTAL KESELURUHAN';
      summaryRow.getCell(2).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E293B' } };
      summaryRow.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };

      summaryRow.getCell(10).value = totalPlannedMinutes;
      summaryRow.getCell(10).font = { name: 'Arial', size: 10, bold: true };
      summaryRow.getCell(10).alignment = { vertical: 'middle', horizontal: 'right' };

      summaryRow.getCell(13).value = totalActualMinutes;
      summaryRow.getCell(13).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFB52025' } };
      summaryRow.getCell(13).alignment = { vertical: 'middle', horizontal: 'right' };

      for (let c = 1; c <= 16; c++) {
        const cell = summaryRow.getCell(c);
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF1F5F9' },
        };
        cell.border = {
          top: { style: 'medium', color: { argb: 'FF94A3B8' } },
          bottom: { style: 'double', color: { argb: 'FF475569' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      }

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      const filename = `Laporan_MRMS_Plant_Batam_${startStr}_${endStr}.xlsx`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return await workbook.xlsx.write(res);
    }

    return successResponse(res, rows, 'Laporan penggunaan ruangan berhasil diambil.');
  } catch (err) {
    next(err);
  }
});

// 2. Room Utilization: Actual Usage Hours / Available Operational Hours x 100%
router.get('/room-utilization', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const settings = await getSystemSettings();

    const { start, end } = parseWIBDateRange(startDate, endDate);

    const [opStartH, opStartM] = (settings.OPERATIONAL_HOURS_START || '08:00').split(':').map(Number);
    const [opEndH, opEndM] = (settings.OPERATIONAL_HOURS_END || '17:00').split(':').map(Number);
    const dailyOpHours = (opEndH * 60 + opEndM - (opStartH * 60 + opStartM)) / 60;

    // Count weekdays in WIB range (timezone-independent)
    const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
    const cur = new Date(start.getTime() + WIB_OFFSET_MS);
    cur.setUTCHours(0, 0, 0, 0);
    const endWib = new Date(end.getTime() + WIB_OFFSET_MS);
    endWib.setUTCHours(0, 0, 0, 0);
    let workingDaysCount = 0;
    while (cur <= endWib) {
      const day = cur.getUTCDay();
      if (day >= 1 && day <= 5) workingDaysCount++;
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    const baseOperationalHours = workingDaysCount * dailyOpHours;

    const rooms = await prisma.meetingRoom.findMany({
      where: { isActive: true },
      include: {
        bookings: {
          where: {
            status: { in: ['COMPLETED', 'CHECKED_IN'] },
            startTime: { gte: start, lte: end },
          },
          include: { usageSession: true },
        },
        blocks: {
          where: {
            isActive: true,
            startTime: { gte: start, lte: end },
          },
        },
      },
    });

    const report = rooms.map((r) => {
      // Calculate maintenance hours
      let maintenanceHours = 0;
      r.blocks.forEach((b) => {
        maintenanceHours += (new Date(b.endTime) - new Date(b.startTime)) / (1000 * 60 * 60);
      });

      const availableOperationalHours = Math.max(1, baseOperationalHours - maintenanceHours);

      // Calculate actual usage hours from sessions
      let actualUsageHours = 0;
      r.bookings.forEach((b) => {
        if (b.usageSession?.actualCheckin) {
          const checkin = new Date(b.usageSession.actualCheckin);
          const checkout = b.usageSession.actualCheckout
            ? new Date(b.usageSession.actualCheckout)
            : new Date();
          actualUsageHours += Math.max(0, (checkout - checkin) / (1000 * 60 * 60));
        }
      });

      const actualUsageMinutes = Math.round(actualUsageHours * 60);
      const utilizationPercentage = Math.min(
        100,
        Number(((actualUsageHours / availableOperationalHours) * 100).toFixed(2))
      );

      return {
        roomId: r.id,
        roomCode: r.code,
        roomName: r.name,
        capacity: r.capacity,
        totalBookings: r.bookings.length,
        baseOperationalHours: Number(baseOperationalHours.toFixed(1)),
        maintenanceHours: Number(maintenanceHours.toFixed(1)),
        availableOperationalHours: Number(availableOperationalHours.toFixed(1)),
        actualUsageHours: Number(actualUsageHours.toFixed(2)),
        actualUsageMinutes,
        utilizationPercentage,
      };
    });

    return successResponse(res, {
      formula: 'Utilization (%) = (Actual Usage Hours / Available Operational Hours) x 100%',
      formulaExplanation:
        'Available Operational Hours = (Hari Kerja Efektif x Jam Operasional Harian) - Total Durasi Maintenance & Pemblokiran Ruangan.',
      dateRange: { start: formatWIB(start), end: formatWIB(end) },
      workingDaysCount,
      dailyOpHours,
      report,
    });
  } catch (err) {
    next(err);
  }
});

// 3. Department Usage Report
router.get('/department-usage', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const where = {
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
    };
    if (startDate || endDate) {
      const { start, end } = parseWIBDateRange(startDate, endDate);
      where.startTime = {};
      if (startDate) where.startTime.gte = start;
      if (endDate) where.startTime.lte = end;
    }

    const departments = await prisma.department.findMany({
      include: {
        users: {
          include: {
            bookings: {
              where,
              include: { usageSession: true },
            },
          },
        },
      },
    });

    const report = departments.map((d) => {
      let totalBookings = 0;
      let totalUsageMinutes = 0;
      let totalAttendees = 0;

      d.users.forEach((u) => {
        totalBookings += u.bookings.length;
        u.bookings.forEach((b) => {
          totalAttendees += b.attendeesCount || 0;
          if (b.usageSession?.actualCheckin) {
            const checkout = b.usageSession.actualCheckout
              ? new Date(b.usageSession.actualCheckout)
              : new Date();
            totalUsageMinutes += Math.max(
              0,
              (checkout - new Date(b.usageSession.actualCheckin)) / 60000
            );
          } else {
            totalUsageMinutes += Math.max(0, (new Date(b.endTime) - new Date(b.startTime)) / 60000);
          }
        });
      });

      return {
        departmentId: d.id,
        code: d.code,
        name: d.name,
        totalBookings,
        totalUsageHours: Number((totalUsageMinutes / 60).toFixed(2)),
        totalUsageMinutes: Math.round(totalUsageMinutes),
        totalAttendees,
      };
    });

    return successResponse(res, report, 'Laporan penggunaan per departemen.');
  } catch (err) {
    next(err);
  }
});

// 4. Operational Anomalies: Late Arrivals & No-Shows & Manual Checkouts
router.get('/anomalies', async (req, res, next) => {
  try {
    const [noShows, overdueAndManual] = await Promise.all([
      prisma.booking.findMany({
        where: {
          status: { in: ['NO_SHOW_PENDING', 'NO_SHOW'] },
        },
        include: {
          room: true,
          user: { include: { department: true } },
          history: { where: { action: 'NO_SHOW_MARKED' } },
        },
        orderBy: { startTime: 'desc' },
      }),
      prisma.roomUsageSession.findMany({
        where: {
          OR: [{ isManualCheckout: true }, { status: 'OVERDUE' }],
        },
        include: {
          room: true,
          booking: { include: { user: { include: { department: true } } } },
          manualCheckoutUser: { select: { name: true } },
        },
        orderBy: { actualCheckin: 'desc' },
      }),
    ]);

    return successResponse(res, {
      noShows,
      overdueAndManual,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

