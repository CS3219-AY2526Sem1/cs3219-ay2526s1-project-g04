import { jest } from '@jest/globals';

const mockConnect = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockPublishMessageWithType =
  jest.fn<(messageType: string, message: string) => void>();

jest.unstable_mockModule('@shared/messaging/src/publisher.js', () => {
  return {
    MessagePublisher: jest.fn().mockImplementation(() => ({
      connect: mockConnect,
      publishMessageWithType: mockPublishMessageWithType,
    })),
  };
});

const { MatchingMessenger } = await import(
  '../../../src/clients/messenger/messenger_client.js'
);

describe('MatchingMessenger', () => {
  it('publishes correctly', async () => {
    const messenger = await MatchingMessenger.getInstance();
    messenger.publishToCollaborationService('12345');

    expect(mockPublishMessageWithType).toHaveBeenCalledWith(
      expect.any(String),
      JSON.stringify({ type: 'matched', matchedId: 'matched:12345' }),
    );
  });

  it('returns the same singleton instance', async () => {
    const instance1 = await MatchingMessenger.getInstance();
    const instance2 = await MatchingMessenger.getInstance();
    expect(instance1).toBe(instance2);
  });
});
