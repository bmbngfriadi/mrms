const prisma = require('../config/database');

async function logAudit({
  userId = null,
  action,
  resourceType,
  resourceId = null,
  req = null,
  oldValues = null,
  newValues = null,
}) {
  try {
    let ipAddress = null;
    let userAgent = null;

    if (req) {
      ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
      userAgent = req.headers['user-agent'] || null;
      if (!userId && req.user) {
        userId = req.user.id;
      }
    }

    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resourceType,
        resourceId: resourceId ? String(resourceId) : null,
        ipAddress,
        userAgent,
        oldValues: oldValues ? oldValues : undefined,
        newValues: newValues ? newValues : undefined,
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
  }
}

module.exports = {
  logAudit,
};

