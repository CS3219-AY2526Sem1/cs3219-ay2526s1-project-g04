export enum USERSTATE {
  waiting = 'waiting',
  ready = 'ready',
  left = 'left',
  end = 'end',
}

export interface UserEntry {
  state: USERSTATE;
}

export class Session {
  private users: Record<string, UserEntry> = {};
  private sessionId: number;

  constructor(sessionId: number, userAId: number, userBId: number) {
    this.users[userAId] = {
      state: USERSTATE.waiting,
    };
    this.users[userBId] = {
      state: USERSTATE.waiting,
    };

    this.sessionId = sessionId;
  }

  public allReady(): boolean {
    for (const val of Object.values(this.users)) {
      if (val.state === USERSTATE.waiting) {
        return false;
      }
    }
    return true;
  }

  public readyUser(userId: number) {
    console.log(`Added userId ${userId} to session ${this.sessionId}`);
    this.users[userId]!.state = USERSTATE.ready;
  }

  public userNotReady(userId: number): boolean {
    console.log(this.users[userId]);
    return this.users[userId]!.state === USERSTATE.waiting;
  }

  public updateCodeDocument() {
    //TODO
  }

  public updateChatMessage() {
    //TODO
  }

  public save() {
    //TODO
  }

  public end() {
    //TODO
  }

  public getId() {
    return this.sessionId;
  }
}
