export interface SessionManagerOptions {
  timeoutMinutes: number;
}

export interface UserSession {
  userId: string;
  threadId?: string;
  currentDir?: string;
  createdAt: Date;
  lastActivity: Date;
}

export class SessionManager {
  private sessions: Map<string, UserSession> = new Map();
  private options: SessionManagerOptions;

  constructor(options: SessionManagerOptions) {
    this.options = options;
  }

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

  setThreadId(userId: string, threadId: string): void {
    const session = this.get(userId);
    session.threadId = threadId;
    session.lastActivity = new Date();
  }

  reset(userId: string): void {
    this.sessions.delete(userId);
  }

  getActiveSessions(): UserSession[] {
    const now = new Date();
    const activeSessions: UserSession[] = [];

    this.sessions.forEach((session) => {
      const diffMinutes = (now.getTime() - session.lastActivity.getTime()) / 60000;
      if (diffMinutes < this.options.timeoutMinutes) {
        activeSessions.push(session);
      }
    });

    return activeSessions;
  }

  cleanup(): void {
    const now = new Date();
    let cleanedCount = 0;

    this.sessions.forEach((session, userId) => {
      const diffMinutes = (now.getTime() - session.lastActivity.getTime()) / 60000;
      if (diffMinutes > this.options.timeoutMinutes * 2) {
        this.sessions.delete(userId);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      console.log(`🧹 已清理 ${cleanedCount} 個過期會話`);
    }
  }

  getStats(): { total: number; active: number } {
    const total = this.sessions.size;
    const active = this.getActiveSessions().length;
    return { total, active };
  }
}
