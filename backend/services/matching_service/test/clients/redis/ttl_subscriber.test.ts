import { jest } from '@jest/globals';

const mockConnect = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockSubscribe = jest
  .fn<(channel: string, callback: (message: string) => void) => Promise<void>>()
  .mockResolvedValue(undefined);

await jest.unstable_mockModule('@shared/redis/src/redis.js', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    connect: mockConnect,
    subscribe: mockSubscribe,
  })),
}));

const { TTLSubscriber } = await import(
  '../../../src/clients/redis/ttl_subscriber.js'
);
import { TTLHandler } from '../../../src/workers/ttl_handler.js';
import { logger } from '../../../src/logger/logger.js';

logger.info = jest.fn((): any => logger);
logger.warn = jest.fn((): any => logger);
logger.error = jest.fn((): any => logger);

describe('TTLSubscriber', () => {
  let handler: TTLHandler;
  let subscriber: InstanceType<typeof TTLSubscriber>;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = { handleUserExpiry: jest.fn() } as any;
    subscriber = new TTLSubscriber(handler);
  });

  it('connects to Redis and subscribes', async () => {
    await subscriber.subscribe();

    expect(mockConnect).toHaveBeenCalled();
    expect(mockSubscribe).toHaveBeenCalledWith(
      '__keyevent@0__:expired',
      expect.any(Function),
    );
  });

  it('calls handleUserExpiry for valid keys', async () => {
    let capturedCallback!: (key: string) => Promise<void>;
    mockSubscribe.mockImplementation(
      async (_channel, cb: (message: string) => void) => {
        capturedCallback = async (key: string) => cb(key);
      },
    );

    await subscriber.subscribe();
    expect(capturedCallback).toBeDefined();
    await capturedCallback!('user_ttl:123');
    expect(handler.handleUserExpiry).toHaveBeenCalledWith('123');
  });

  it('ignores non-user_ttl keys', async () => {
    let capturedCallback!: (key: string) => Promise<void>;
    mockSubscribe.mockImplementation(
      async (_channel, cb: (message: string) => void) => {
        capturedCallback = async (key: string) => cb(key);
      },
    );

    await subscriber.subscribe();
    expect(capturedCallback).toBeDefined();
    await capturedCallback!('other_key:1');
    expect(handler.handleUserExpiry).not.toHaveBeenCalled();
  });
});
