/**
 * Codex SDK 包裝器
 * 封裝 @openai/codex-sdk 的所有操作
 */

import { Logger } from '../utils/logger';

export interface CodexSDKOptions {
  model: string;
  timeout: number;
}

export interface CodexResult {
  text: string;
  threadId: string;
  duration: number;
}

export class CodexSDKWrapper {
  private codex: any = null;
  private threads: Map<string, any> = new Map();
  private logger: Logger;
  private options: CodexSDKOptions;

  constructor(options: CodexSDKOptions) {
    this.options = options;
    this.logger = new Logger('CodexSDK');
  }

  async initialize(): Promise<boolean> {
    try {
      const { Codex } = await import('@openai/codex-sdk');
      this.codex = new Codex();
      this.logger.info('Codex SDK 初始化成功');
      return true;
    } catch (error: any) {
      this.logger.warn('Codex SDK 初始化失敗', error.message);
      return false;
    }
  }

  async startThread(threadId: string): Promise<boolean> {
    if (!this.codex) return false;

    try {
      const thread = this.codex.startThread({ model: this.options.model });
      this.threads.set(threadId, thread);
      return true;
    } catch (error: any) {
      this.logger.error('建立執行緒失敗', error.message);
      return false;
    }
  }

  async resumeThread(threadId: string): Promise<any | null> {
    if (!this.codex) return null;

    try {
      const thread = this.codex.resumeThread(threadId);
      this.threads.set(threadId, thread);
      return thread;
    } catch (error: any) {
      this.logger.error('恢復執行緒失敗', error.message);
      return null;
    }
  }

  async run(
    threadId: string,
    message: string,
    onProgress?: (text: string) => void
  ): Promise<CodexResult> {
    const startTime = Date.now();
    const thread = this.threads.get(threadId);

    if (!thread) {
      throw new Error(`執行緒 ${threadId} 不存在`);
    }

    try {
      const result = await thread.run(message, {
        timeout: this.options.timeout,
        onStream: onProgress,
      });

      return {
        text: result.finalResponse || result.toString(),
        threadId,
        duration: Date.now() - startTime,
      };
    } catch (error: any) {
      this.logger.error('Codex 執行失敗', error.message);
      throw error;
    }
  }

  deleteThread(threadId: string): void {
    this.threads.delete(threadId);
  }

  isAvailable(): boolean {
    return this.codex !== null;
  }
}
