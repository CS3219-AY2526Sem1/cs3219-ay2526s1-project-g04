import { jest } from '@jest/globals';

// Preserve a function's real signature while treating it as a jest mock:
export const asMock = <T extends (...args: any[]) => any>(fn: T) =>
  fn as unknown as jest.MockedFunction<T>;
