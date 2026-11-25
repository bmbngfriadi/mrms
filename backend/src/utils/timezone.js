const { formatInTimeZone, toZonedTime } = require('date-fns-tz');

const WIB_TIMEZONE = 'Asia/Jakarta';

function formatWIB(date, formatPattern = 'yyyy-MM-dd HH:mm:ss') {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(d, WIB_TIMEZONE, formatPattern);
}

function getZonedNow() {
  return toZonedTime(new Date(), WIB_TIMEZONE);
}

function parseWIBDate(dateStr, timeStr) {
  // dateStr: YYYY-MM-DD, timeStr: HH:mm
  const isoStr = `${dateStr}T${timeStr}:00+07:00`;
  return new Date(isoStr);
}

module.exports = {
  WIB_TIMEZONE,
  formatWIB,
  getZonedNow,
  parseWIBDate,
};

