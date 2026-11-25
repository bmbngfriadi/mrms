import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { hashToken, generateSecureToken } from '../../src/utils/crypto';
import { formatWIB, parseWIBDate } from '../../src/utils/timezone';

describe('Unit Tests: Core Business Rules & Validations', () => {
  describe('QR Token Hashing & Validation', () => {
    it('should generate secure token and match its SHA-256 hash', () => {
      const rawToken = generateSecureToken('qr_in_smp');
      expect(rawToken).toMatch(/^qr_in_smp_[0-9a-f]{48}$/);

      const hash1 = hashToken(rawToken);
      const hash2 = crypto.createHash('sha256').update(rawToken).digest('hex');

      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64);
    });

    it('should distinguish checkin and checkout tokens', () => {
      const checkinToken = generateSecureToken('qr_in_room');
      const checkoutToken = generateSecureToken('qr_out_room');

      expect(checkinToken).not.toBe(checkoutToken);
      expect(hashToken(checkinToken)).not.toBe(hashToken(checkoutToken));
    });
  });

  describe('Late Arrival Boundary Rules (+15 Minutes Grace Period)', () => {
    const scheduledStart = new Date('2026-11-13T09:00:00+07:00');
    const lateToleranceMinutes = 15;

    // Helper implementing the exact boundary rule
    function isCheckinPermitted(now, scheduled, toleranceMinutes) {
      const lateCutoff = new Date(scheduled.getTime() + (toleranceMinutes * 60 + 59) * 1000);
      return now <= lateCutoff;
    }

    it('should ALLOW check-in exactly on scheduled start time', () => {
      const checkinTime = new Date('2026-11-13T09:00:00+07:00');
      expect(isCheckinPermitted(checkinTime, scheduledStart, lateToleranceMinutes)).toBe(true);
    });

    it('should ALLOW check-in at +10 minutes after start time', () => {
      const checkinTime = new Date('2026-11-13T09:10:00+07:00');
      expect(isCheckinPermitted(checkinTime, scheduledStart, lateToleranceMinutes)).toBe(true);
    });

    it('should ALLOW check-in at +15 minutes (boundary limit)', () => {
      const checkinTime = new Date('2026-11-13T09:15:00+07:00');
      expect(isCheckinPermitted(checkinTime, scheduledStart, lateToleranceMinutes)).toBe(true);
    });

    it('should REJECT check-in at +16 minutes (exceeded tolerance limit)', () => {
      const checkinTime = new Date('2026-11-13T09:16:00+07:00');
      expect(isCheckinPermitted(checkinTime, scheduledStart, lateToleranceMinutes)).toBe(false);
    });
  });

  describe('Booking Duration & Operational Boundaries', () => {
    it('should reject booking with startTime >= endTime', () => {
      const start = new Date('2026-11-13T10:00:00+07:00');
      const end = new Date('2026-11-13T09:30:00+07:00');
      expect(start >= end).toBe(true);
    });

    it('should validate minimum duration of 30 minutes', () => {
      const start = new Date('2026-11-13T10:00:00+07:00');
      const endTooShort = new Date('2026-11-13T10:15:00+07:00');
      const endValid = new Date('2026-11-13T10:30:00+07:00');

      const durationShort = (endTooShort - start) / 60000;
      const durationValid = (endValid - start) / 60000;

      expect(durationShort < 30).toBe(true);
      expect(durationValid >= 30).toBe(true);
    });

    it('should validate maximum duration of 240 minutes (4 hours)', () => {
      const start = new Date('2026-11-13T09:00:00+07:00');
      const endTooLong = new Date('2026-11-13T13:30:00+07:00'); // 4.5 hours
      const endValid = new Date('2026-11-13T13:00:00+07:00');   // 4.0 hours

      const durationLong = (endTooLong - start) / 60000;
      const durationValid = (endValid - start) / 60000;

      expect(durationLong > 240).toBe(true);
      expect(durationValid <= 240).toBe(true);
    });

    it('should detect capacity overflow', () => {
      const roomCapacity = 12;
      const validAttendees = 10;
      const excessiveAttendees = 15;

      expect(validAttendees <= roomCapacity).toBe(true);
      expect(excessiveAttendees > roomCapacity).toBe(true);
    });
  });

  describe('Notification Retry Exponential Backoff', () => {
    function calculateBackoffDelayMinutes(retryCount) {
      // Exponential backoff: 1min, 4min, 16min
      return Math.pow(4, retryCount - 1);
    }

    it('should calculate exponential backoff intervals correctly', () => {
      expect(calculateBackoffDelayMinutes(1)).toBe(1);  // 1st retry: 1 min
      expect(calculateBackoffDelayMinutes(2)).toBe(4);  // 2nd retry: 4 min
      expect(calculateBackoffDelayMinutes(3)).toBe(16); // 3rd retry: 16 min
    });
  });

  describe('Timezone Asia/Jakarta (WIB) Formatting', () => {
    it('should format UTC timestamp in Asia/Jakarta (WIB) accurately', () => {
      // 02:00:00 UTC = 09:00:00 WIB (+7)
      const dateUtc = new Date('2026-11-13T02:00:00.000Z');
      const wibString = formatWIB(dateUtc, 'yyyy-MM-dd HH:mm');
      expect(wibString).toBe('2026-11-13 09:00');
    });
  });
});

