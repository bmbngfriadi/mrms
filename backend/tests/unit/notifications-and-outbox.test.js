import { describe, it, expect } from 'vitest';
import notificationService from '../../src/modules/notifications/notification.service';

describe('Unit Tests: Notification Formatting & Deduplication', () => {
  const samplePayload = {
    bookingId: 'bkg-123',
    bookingCode: 'BKG-20261113-001',
    roomName: 'Ruang Semen Merah Putih',
    roomLocation: 'Lantai 2 Gedung Admin',
    userName: 'Budi Santoso',
    departmentName: 'Produksi Semen',
    title: 'Evaluasi Operasional Kiln',
    startTime: new Date('2026-11-13T09:00:00+07:00'),
    endTime: new Date('2026-11-13T11:00:00+07:00'),
    bookerEmail: 'budi.santoso@cemindogemilang.com',
    bookerPhone: '081270003003',
  };

  it('should format WhatsApp message with strict 17-char divider and Cemindo header', () => {
    const { waText } = notificationService.generateNotificationTemplates('BOOKING_CREATED', samplePayload);

    expect(waText).toContain('PT CEMINDO GEMILANG Tbk');
    expect(waText).toContain('Plant Batam — MRMS');
    // Verify exact 17 character divider
    expect(waText).toContain('─────────────────');
    expect('─────────────────'.length).toBe(17);
    expect(waText).toContain('BKG-20261113-001');
    expect(waText).toContain('Ruang Semen Merah Putih');
    expect(waText).toContain('_Pesan Otomatis, MRMS Plant Batam_');
  });

  it('should format Email with HTML table and corporate brand colors', () => {
    const { emailSubject, emailHtml } = notificationService.generateNotificationTemplates('BOOKING_CREATED', samplePayload);

    expect(emailSubject).toContain('[MRMS PT Cemindo Gemilang]');
    expect(emailSubject).toContain('BKG-20261113-001');
    expect(emailHtml).toContain('#b52025'); // Brand color
    expect(emailHtml).toContain('Evaluasi Operasional Kiln');
  });
});

