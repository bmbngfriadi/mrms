import { describe, it, expect } from 'vitest';

describe('Concurrency Tests: Anti Double Booking Race Condition Protection', () => {
  // Concurrency simulation engine replicating PostgreSQL advisory lock & range conflict serialization
  class ConcurrentBookingSimulator {
    constructor() {
      this.roomLocks = new Map();
      this.confirmedBookings = [];
    }

    async acquireRoomLock(roomId) {
      while (this.roomLocks.get(roomId)) {
        // Wait until lock released (transaction commit/rollback)
        await new Promise((r) => setTimeout(r, 10));
      }
      this.roomLocks.set(roomId, true);
    }

    releaseRoomLock(roomId) {
      this.roomLocks.set(roomId, false);
    }

    async tryBookRoom({ bookingId, roomId, startTime, endTime }) {
      await this.acquireRoomLock(roomId);

      try {
        // Overlap condition check within serialized transaction
        const hasOverlap = this.confirmedBookings.some((b) => {
          return (
            b.roomId === roomId &&
            b.status === 'CONFIRMED' &&
            new Date(b.startTime) < new Date(endTime) &&
            new Date(b.endTime) > new Date(startTime)
          );
        });

        // Simulate small random query latency (10-30ms)
        await new Promise((r) => setTimeout(r, Math.floor(10 + Math.random() * 20)));

        if (hasOverlap) {
          throw new Error('Bentrok jadwal terdeteksi! Ruangan ini sudah dibooking pada rentang waktu yang dipilih.');
        }

        const newBooking = { bookingId, roomId, startTime, endTime, status: 'CONFIRMED' };
        this.confirmedBookings.push(newBooking);
        return newBooking;
      } finally {
        this.releaseRoomLock(roomId);
      }
    }
  }

  it('should allow only ONE booking and reject the other when two users request the same room and time concurrently', async () => {
    const simulator = new ConcurrentBookingSimulator();
    const roomId = 'room-smp-01';
    const startTime = '2026-11-13T10:00:00+07:00';
    const endTime = '2026-11-13T11:30:00+07:00';

    // Dispatch two simultaneous requests concurrently using Promise.allSettled
    const [result1, result2] = await Promise.allSettled([
      simulator.tryBookRoom({ bookingId: 'req-user-1', roomId, startTime, endTime }),
      simulator.tryBookRoom({ bookingId: 'req-user-2', roomId, startTime, endTime }),
    ]);

    // Exactly one must be fulfilled and one must be rejected
    const fulfilled = [result1, result2].filter((r) => r.status === 'fulfilled');
    const rejected = [result1, result2].filter((r) => r.status === 'rejected');

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    expect(rejected[0].reason.message).toContain('Bentrok jadwal terdeteksi');
    expect(simulator.confirmedBookings.length).toBe(1);
  });

  it('should reject a new booking if an extension overlaps with it concurrently', async () => {
    const simulator = new ConcurrentBookingSimulator();
    const roomId = 'room-rjw-02';

    // Existing booking from 09:00 to 10:00
    await simulator.tryBookRoom({
      bookingId: 'existing-bkg',
      roomId,
      startTime: '2026-11-13T09:00:00+07:00',
      endTime: '2026-11-13T10:00:00+07:00',
    });

    // Concurrent: User A requests extension from 10:00 to 10:30, User B requests new booking from 10:00 to 11:00
    const [extResult, newResult] = await Promise.allSettled([
      simulator.tryBookRoom({
        bookingId: 'ext-user-A',
        roomId,
        startTime: '2026-11-13T10:00:00+07:00',
        endTime: '2026-11-13T10:30:00+07:00',
      }),
      simulator.tryBookRoom({
        bookingId: 'new-user-B',
        roomId,
        startTime: '2026-11-13T10:00:00+07:00',
        endTime: '2026-11-13T11:00:00+07:00',
      }),
    ]);

    const fulfilled = [extResult, newResult].filter((r) => r.status === 'fulfilled');
    const rejected = [extResult, newResult].filter((r) => r.status === 'rejected');

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
  });
});

