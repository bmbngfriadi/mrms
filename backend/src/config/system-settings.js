const prisma = require('./database');

const DEFAULT_SETTINGS = {
  OPERATIONAL_HOURS_START: '08:00',
  OPERATIONAL_HOURS_END: '17:00',
  OPERATIONAL_DAYS: '1,2,3,4,5', // 1=Mon, 5=Fri
  BOOKING_HORIZON_DAYS: '30',
  DURATION_MIN_MINUTES: '30',
  DURATION_MAX_MINUTES: '240',
  LATE_TOLERANCE_MINUTES: '15',
  REMINDER_MINUTES_BEFORE: '20',
  TIMEZONE: 'Asia/Jakarta',
  NOTIFICATION_MODE: 'mock',
};

let cachedSettings = { ...DEFAULT_SETTINGS };
let lastFetched = 0;
const CACHE_TTL_MS = 60000; // 1 minute

async function getSystemSettings(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && now - lastFetched < CACHE_TTL_MS) {
    return cachedSettings;
  }

  try {
    const rows = await prisma.systemSetting.findMany();
    const mapped = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      mapped[row.key] = row.value;
    }
    cachedSettings = mapped;
    lastFetched = now;
    return cachedSettings;
  } catch (error) {
    console.error('Failed to load system settings from DB, using fallback defaults:', error.message);
    return cachedSettings;
  }
}

async function getSetting(key) {
  const settings = await getSystemSettings();
  return settings[key] !== undefined ? settings[key] : DEFAULT_SETTINGS[key];
}

module.exports = {
  getSystemSettings,
  getSetting,
  DEFAULT_SETTINGS,
};

