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
  private questionId: string;

  constructor(
    sessionId: number,
    userAId: number,
    userBId: number,
    questionId: string,
  ) {
    this.users[userAId] = {
      state: USERSTATE.waiting,
    };
    this.users[userBId] = {
      state: USERSTATE.waiting,
    };

    this.sessionId = sessionId;
    this.questionId = questionId;
  }

  // Checks if all users in the session are ready (i.e., both users have joined the session)
  public allReady(): boolean {
    for (const val of Object.values(this.users)) {
      if (val.state === USERSTATE.waiting) {
        return false;
      }
    }
    return true;
  }

  // Marks a specific user as ready in the current session
  public readyUser(userId: number) {
    console.log(
      `[Session] Added userId ${userId} to session ${this.sessionId}`,
    );
    if (userId in this.users) {
      this.users[userId]!.state = USERSTATE.ready;
    }
  }

  // Checks if a user is still in the 'waiting' state
  public userNotReady(userId: number): boolean {
    // console.log(this.users[userId]);
    if (userId in this.users) {
      return this.users[userId]!.state === USERSTATE.waiting;
    } else {
      // handle the case where userId does not exist
      return false;
    }
  }

  public getUsers(): string[] {
    return Object.keys(this.users);
  }

  // Returns the session ID
  public getId() {
    return this.sessionId;
  }

  // Returns the question ID associated with this session
  public getQuestionId() {
    return this.questionId;
  }
}
