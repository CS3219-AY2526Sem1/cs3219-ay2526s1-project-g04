import { afterAll, jest } from '@jest/globals';

process.env.TZ = 'UTC';
jest.setTimeout(30_000);

if (process.env['JEST_DOMPURIFY_MOCK'] !== 'off') {
  jest.mock('isomorphic-dompurify', () => ({
    __esModule: true,
    default: {
      // keep the shape minimal. Return input so tests can assert exact HTML.
      sanitize: (html: string) => html,
    },
  }));
}

const spies = [
  jest.spyOn(console, 'error').mockImplementation(() => {}),
  jest.spyOn(console, 'warn').mockImplementation(() => {}),
  jest.spyOn(console, 'log').mockImplementation(() => {}),
];
afterAll(() => spies.forEach((s) => s.mockRestore()));
