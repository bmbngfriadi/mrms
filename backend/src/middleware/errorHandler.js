const { errorResponse } = require('../utils/response');

function errorHandler(err, req, res, next) {
  console.error('Unhandled Application Error:', err);

  // PostgreSQL / Prisma Exclusion Constraint Violation (code 23P01) or overlap conflict
  if (err.code === '23P01' || err.message?.includes('no_overlapping_active_bookings') || err.message?.includes('conflicting key value violates exclusion constraint')) {
    return errorResponse(
      res,
      'Bentrok jadwal terdeteksi! Ruangan ini sudah dibooking pada rentang waktu yang dipilih.',
      409
    );
  }

  // Prisma Unique Constraint Violation
  if (err.code === 'P2002') {
    const fields = err.meta?.target || 'data';
    return errorResponse(
      res,
      `Data dengan ${Array.isArray(fields) ? fields.join(', ') : fields} ini sudah terdaftar.`,
      409
    );
  }

  // Prisma Record Not Found
  if (err.code === 'P2025') {
    return errorResponse(res, 'Data yang diminta tidak ditemukan.', 404);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Terjadi kesalahan internal pada server.';
  return errorResponse(res, message, statusCode, err.errors || null);
}

module.exports = {
  errorHandler,
};

