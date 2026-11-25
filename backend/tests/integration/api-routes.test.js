import { describe, it, expect } from 'vitest';
import request from 'supertest';
import createApp from '../../src/app';

describe('Integration Tests: Express API & Subpath Endpoints', () => {
  const app = createApp();

  it('GET /health should return 200 and healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.company).toContain('PT Cemindo Gemilang');
  });

  it('GET /meeting-room/api/health should respond accurately under subpath', async () => {
    const res = await request(app).get('/meeting-room/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('POST /api/auth/login should reject empty body with 422 validation error', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/qr/validate should reject missing token with 400', async () => {
    const res = await request(app).post('/api/qr/validate').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/rooms should reject unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/rooms');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

