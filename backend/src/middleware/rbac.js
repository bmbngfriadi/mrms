const { errorResponse } = require('../utils/response');
const { checkPermission, resolveUserPermissions } = require('../config/permissions');

function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Otentikasi diperlukan.', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(
        res,
        `Akses ditolak. Peran '${req.user.role}' tidak memiliki wewenang untuk tindakan ini.`,
        403
      );
    }

    next();
  };
}

function requirePermission(permissionId) {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Otentikasi diperlukan.', 401);
    }

    // Direct check via granular permission resolver
    if (!checkPermission(req.user, permissionId)) {
      return errorResponse(
        res,
        `Akses ditolak. Anda tidak memiliki izin (${permissionId}) untuk melakukan tindakan ini. Hubungi Administrator untuk memperbarui checklist hak akses Anda.`,
        403
      );
    }

    next();
  };
}

module.exports = {
  requireRole,
  requirePermission,
  hasPermission: checkPermission,
  resolveUserPermissions,
};
