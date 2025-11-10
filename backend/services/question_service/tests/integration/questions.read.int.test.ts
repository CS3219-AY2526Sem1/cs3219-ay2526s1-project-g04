import request from 'supertest';
import { makeTestApp } from '../helpers/test-app.js';

describe('Questions (public)', () => {
  const app = makeTestApp();

  it('GET /questions returns paginated items', async () => {
    const res = await request(app)
      .get('/questions')
      .query({ page: 1, size: 5 });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    // Should include at least one of our seeded published ids
    const ids = res.body.items.map((x: any) => x.id);
    expect(ids).toEqual(expect.arrayContaining(['reverse-string']));
  });

  it('GET /questions/:id returns published question with body_html', async () => {
    const res = await request(app).get('/questions/reverse-string');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 'reverse-string',
      status: 'published',
      body_md: expect.any(String),
      body_html: expect.any(String),
      difficulty: expect.any(String),
    });
  });

  it('GET /questions/:id/resources 404 for non-existent', async () => {
    const res = await request(app).get('/questions/not-here/resources');
    expect([404, 400]).toContain(res.status);
  });

  it('GET /questions/:id (draft should 404 publicly)', async () => {
    const res = await request(app).get('/questions/palindrome-linked-list');
    expect(res.status).toBe(404);
  });
});
