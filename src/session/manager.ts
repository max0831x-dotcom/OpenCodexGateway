export interface UserSession {
  userId: string;
  threadId?: string;
  currentDir?: string;
  createdAt: Date;
  lastActivity: Date;
}

export class SessionManager {
  private sessions: Map<string, UserSession> = new Map();

  get(userId: string): UserSession {
    let session = this.sessions.get(userId);
    if (!session) {
      session = {
        userId,
        createdAt: new Date(),
        lastActivity: new Date(),
      };
      this.sessions.set(userId, session);
    }
    return session;
  }

  setDirectory(userId: string, dir: string): void {
    const session = this.get(userId);
    session.currentDir = dir;
    session.lastActivity = new Date();
  }

  getDirectory(userId: string): string | undefined {
    return this.get(userId).currentDir;
  }

  reset(userId: string): void {
    this.sessions.delete(userId);
  }

  getActiveSessions(): UserSession[] {
    const now = new Date();
    const activeSessions: UserSession[] = [];
    this.sessions.forEach((session) => {
      const diffMinutes = (now.getTime() - session.lastActivity.getTime()) / 60000;
      if (diffMinutes < 60) {
        activeSessions.push(session);
      }
    });
    return activeSessions;
  }

  cleanup(): void {
    const now = new Date();
    this.sessions.forEach((session, userId) => {
      const diffHours = (now.getTime() - session.lastActivity.getTime()) / 3600000;
      if (diffHours > 24) {
        this.sessions.delete(userId);
      }
    });
  }
}
