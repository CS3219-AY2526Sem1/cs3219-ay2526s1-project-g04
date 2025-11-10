import request from 'supertest';
import { makeTestApp } from '../helpers/test-app.js';

describe('App', () => {
  it('GET /healthz', async () => {
    const app = makeTestApp();
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
