const crypto = require('crypto');

function cleanQrToken(input) {
  if (!input || typeof input !== 'string') return '';
  let str = input.trim();
  if (str.includes('code=') || str.includes('token=')) {
    try {
      const dummyUrl = str.startsWith('http://') || str.startsWith('https://')
        ? str
        : `http://dummy.com/${str.replace(/^\/+/, '')}`;
      const url = new URL(dummyUrl);
      const code = url.searchParams.get('code') || url.searchParams.get('token');
      if (code) return code.trim();
    } catch {
      const match = str.match(/[?&](?:code|token)=([^&#\s]+)/i);
      if (match && match[1]) return decodeURIComponent(match[1]).trim();
    }
  }
  return str;
}

function hashToken(token) {
  const clean = cleanQrToken(token);
  if (!clean) return '';
  return crypto.createHash('sha256').update(clean).digest('hex');
}

function generateSecureToken(prefix = 'tok') {
  const random = crypto.randomBytes(24).toString('hex');
  return `${prefix}_${random}`;
}

module.exports = {
  cleanQrToken,
  hashToken,
  generateSecureToken,
};


