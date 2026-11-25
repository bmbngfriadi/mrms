require('dotenv').config();

const env = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/mrms_db?schema=public',
  JWT_SECRET: process.env.JWT_SECRET || 'cemindo-gemilang-mrms-super-secret-key-2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  APP_BASE_URL: process.env.APP_BASE_URL || 'https://cg-plantbatam.com/mrms',
  API_PREFIX: process.env.API_PREFIX || '/mrms/api',
  NOTIFICATION_MODE: process.env.NOTIFICATION_MODE || 'mock', // mock | production
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || 'MRMS PT Cemindo Gemilang Tbk <noreply-mrms@cemindogemilang.com>',
  WA_API_URL: process.env.WA_API_URL || '',
  WA_API_TOKEN: process.env.WA_API_TOKEN || '',
  WA_PHONE_NUMBER_ID: process.env.WA_PHONE_NUMBER_ID || '',
};

module.exports = env;

