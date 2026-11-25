import { describe, it, expect } from 'vitest';
import { requireRole } from '../../src/middleware/rbac';

describe('Unit Tests: RBAC and Role Permissions', () => {
  function runMiddleware(middleware, req, res) {
    let nextCalled = false;
    let nextError = null;
    middleware(req, res, (err) => {
      nextCalled = true;
      nextError = err;
    });
    return { nextCalled, nextError };
  }

  it('should allow access when user role matches allowed roles', () => {
    const middleware = requireRole(['ADMIN', 'HRGA']);
    const req = { user: { id: 'u1', role: 'ADMIN' } };
    const res = { status: () => res, json: () => res };

    const { nextCalled } = runMiddleware(middleware, req, res);
    expect(nextCalled).toBe(true);
  });

  it('should deny access when user role is EMPLOYEE for HRGA-only route', () => {
    const middleware = requireRole(['HRGA', 'ADMIN']);
    let statusCode = 0;
    let jsonBody = null;

    const req = { user: { id: 'u2', role: 'EMPLOYEE' } };
    const res = {
      status: (code) => {
        statusCode = code;
        return res;
      },
      json: (data) => {
        jsonBody = data;
        return res;
      },
    };

    const { nextCalled } = runMiddleware(middleware, req, res);
    expect(nextCalled).toBe(false);
    expect(statusCode).toBe(403);
    expect(jsonBody?.success).toBe(false);
    expect(jsonBody?.message).toContain('Akses ditolak');
  });

  it('should deny unauthenticated requests', () => {
    const middleware = requireRole(['ADMIN']);
    let statusCode = 0;

    const req = {}; // No user attached
    const res = {
      status: (code) => {
        statusCode = code;
        return res;
      },
      json: () => res,
    };

    const { nextCalled } = runMiddleware(middleware, req, res);
    expect(nextCalled).toBe(false);
    expect(statusCode).toBe(401);
  });
});

