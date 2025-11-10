import { afterAll, jest } from '@jest/globals';

process.env.TZ = 'UTC';
jest.setTimeout(30_000);

const spies = [
  jest.spyOn(console, 'error').mockImplementation(() => {}),
  jest.spyOn(console, 'warn').mockImplementation(() => {}),
  jest.spyOn(console, 'log').mockImplementation(() => {}),
];
afterAll(() => spies.forEach((s) => s.mockRestore()));
