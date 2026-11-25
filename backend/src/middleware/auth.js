const { verifyToken } = require('../utils/jwt');
const prisma = require('../config/database');
const { errorResponse } = require('../utils/response');

async function authenticate(req, res, next) {
  let token = null;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return errorResponse(res, 'Akses ditolak. Sesi tidak ditemukan atau token tidak valid.', 401);
  }

  const decoded = verifyToken(token);
  if (!decoded || !decoded.userId) {
    return errorResponse(res, 'Sesi telah kedaluwarsa atau tidak valid. Silakan login kembali.', 401);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        department: true,
      },
    });

    if (!user) {
      return errorResponse(res, 'Pengguna tidak ditemukan.', 401);
    }

    if (!user.isActive) {
      return errorResponse(res, 'Akun Anda telah dinonaktifkan oleh Administrator.', 403);
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return errorResponse(res, 'Terjadi kesalahan saat memverifikasi otentikasi.', 500);
  }
}

module.exports = {
  authenticate,
};

