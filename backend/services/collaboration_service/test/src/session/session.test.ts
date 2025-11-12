import { Session, USERSTATE } from '../../../src/session/session.js';

describe('Session', () => {
  const sessionId = 100;
  const questionId = 'q123';
  const userAId = 1;
  const userBId = 2;
  const userCId = 3; // An external, non-session user

  let session: Session;

  beforeEach(() => {
    session = new Session(sessionId, userAId, userBId, questionId);
  });

  describe('constructor', () => {
    it('should initialize users with the "waiting" state', () => {
      // Users are stored as strings in the Record<string, UserEntry>
      expect((session as any).users[userAId]).toEqual({
        state: USERSTATE.waiting,
      });
      expect((session as any).users[userBId]).toEqual({
        state: USERSTATE.waiting,
      });
    });

    it('should correctly store sessionId and questionId', () => {
      expect((session as any).sessionId).toBe(sessionId);
      expect((session as any).questionId).toBe(questionId);
    });
  });

  describe('allReady', () => {
    it('should return false when both users are in the initial "waiting" state', () => {
      expect(session.allReady()).toBe(false);
    });

    it('should return false when one user is "waiting" and one is "ready"', () => {
      (session as any).users[userAId].state = USERSTATE.ready;
      expect(session.allReady()).toBe(false);
    });

    it('should return true when both users are in the "ready" state', () => {
      (session as any).users[userAId].state = USERSTATE.ready;
      (session as any).users[userBId].state = USERSTATE.ready;
      expect(session.allReady()).toBe(true);
    });

    it('should return true when both users are in the "left" state (or any non-waiting state)', () => {
      (session as any).users[userAId].state = USERSTATE.left;
      (session as any).users[userBId].state = USERSTATE.end;
      expect(session.allReady()).toBe(true);
    });
  });

  describe('readyUser', () => {
    it('should change a user state from "waiting" to "ready"', () => {
      expect((session as any).users[userAId].state).toBe(USERSTATE.waiting);

      session.readyUser(userAId);

      expect((session as any).users[userAId].state).toBe(USERSTATE.ready);
    });

    it('should not throw an error if the userId is not in the session', () => {
      expect(() => session.readyUser(userCId)).not.toThrow();

      expect((session as any).users[userCId]).toBeUndefined();
    });
  });

  //  userNotReady() Tests
  describe('userNotReady', () => {
    it('should return true if the user is in the initial "waiting" state', () => {
      expect(session.userNotReady(userAId)).toBe(true);
    });

    it('should return false if the user is in the "ready" state', () => {
      session.readyUser(userAId);
      expect(session.userNotReady(userAId)).toBe(false);
    });

    it('should return false if the user is in the "left" state', () => {
      (session as any).users[userAId].state = USERSTATE.left;
      expect(session.userNotReady(userAId)).toBe(false);
    });

    it('should return false if the userId does not exist in the session (edge case)', () => {
      // Check the else branch
      expect(session.userNotReady(userCId)).toBe(false);
    });
  });

  //  Getter Tests
  describe('Getters', () => {
    it('getUsers should return an array of user IDs (as strings)', () => {
      const users = session.getUsers();
      expect(users).toEqual(
        expect.arrayContaining([String(userAId), String(userBId)]),
      );
      expect(users.length).toBe(2);
    });

    it('getId should return the session ID', () => {
      expect(session.getId()).toBe(sessionId);
    });

    it('getQuestionId should return the question ID', () => {
      expect(session.getQuestionId()).toBe(questionId);
    });
  });
});

export { USERSTATE };
