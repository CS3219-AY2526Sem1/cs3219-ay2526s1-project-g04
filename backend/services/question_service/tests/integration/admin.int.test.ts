import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import { makeTestApp } from '../helpers/test-app.js';
import { makeAdminToken } from '../helpers/jwt.js';

describe('Admin lifecycle', () => {
  const app = makeTestApp();

  it('create → publish → read', async () => {
    const token = await makeAdminToken();

    const create = await request(app)
      .post('/admin/questions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Count Components',
        body_md: 'Given an undirected graph, count connected components.',
        difficulty: 'Medium',
        topics: ['graphs', 'algorithms'],
      });
    expect(create.status).toBe(201);
    const { id } = create.body;

    const publish = await request(app)
      .post(`/admin/questions/${id}/publish`)
      .set('Authorization', `Bearer ${token}`);
    expect(publish.status).toBe(200);

    const read = await request(app).get(`/questions/${id}`);
    expect(read.status).toBe(200);
    expect(read.body.status).toBe('published');
  });
});
