/**
 * Codex 執行緒管理器
 * 管理 Codex 執行緒的生命週期、狀態和輸出
 */

import { Logger } from '../utils/logger';

export interface ThreadInfo {
  id: string;
  userId: string;
  model: string;
  createdAt: Date;
  lastActivity: Date;
  status: 'idle' | 'running' | 'error';
  currentTask?: string;
  messages: number;
}

export class ThreadManager {
  private threads: Map<string, ThreadInfo> = new Map();
  private logger: Logger;
  private model: string;

  constructor(model: string) {
    this.model = model;
    this.logger = new Logger('ThreadManager');
  }

  create(userId: string): ThreadInfo {
    const threadId = `thread_${Date.now()}_${userId}`;
    const thread: ThreadInfo = {
      id: threadId,
      userId,
      model: this.model,
      createdAt: new Date(),
      lastActivity: new Date(),
      status: 'idle',
      messages: 0,
    };
    this.threads.set(threadId, thread);
    this.logger.info(`建立新執行緒 ${threadId}（使用者 ${userId}）`);
    return thread;
  }

  get(threadId: string): ThreadInfo | undefined {
    return this.threads.get(threadId);
  }

  getByUser(userId: string): ThreadInfo | undefined {
    for (const thread of this.threads.values()) {
      if (thread.userId === userId) return thread;
    }
    return undefined;
  }

  updateStatus(threadId: string, status: ThreadInfo['status'], task?: string): void {
    const thread = this.threads.get(threadId);
    if (thread) {
      thread.status = status;
      thread.lastActivity = new Date();
      if (task) thread.currentTask = task;
      if (status === 'running') thread.messages++;
    }
  }

  delete(threadId: string): void {
    this.threads.delete(threadId);
    this.logger.info(`刪除執行緒 ${threadId}`);
  }

  deleteByUser(userId: string): void {
    const thread = this.getByUser(userId);
    if (thread) this.delete(thread.id);
  }

  getStats(): { total: number; active: number; running: number } {
    let active = 0;
    let running = 0;
    const now = Date.now();

    this.threads.forEach((t) => {
      const diff = now - t.lastActivity.getTime();
      if (diff < 3600000) active++; // 1小時內活躍
      if (t.status === 'running') running++;
    });

    return {
      total: this.threads.size,
      active,
      running,
    };
  }

  cleanup(): void {
    const now = Date.now();
    let count = 0;

    this.threads.forEach((t, id) => {
      const diff = now - t.lastActivity.getTime();
      if (diff > 86400000) { // 24小時無活動
        this.threads.delete(id);
        count++;
      }
    });

    if (count > 0) {
      this.logger.info(`已清理 ${count} 個過期執行緒`);
    }
  }
}
