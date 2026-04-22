import { Logger } from '../utils/logger';

interface CodexThread {
  id: string;
  lastActivity: Date;
}

export class CodexService {
  private threads: Map<string, CodexThread> = new Map();
  private codex: any = null;
  private logger: Logger;

  constructor() {
    this.logger = new Logger('CodexService');
  }

  async process(userId: string, message: string, workingDir?: string): Promise<string> {
    try {
      // 嘗試使用 Codex SDK
      const { Codex } = await import('@openai/codex-sdk');
      if (!this.codex) {
        this.codex = new Codex();
      }

      let thread = this.threads.get(userId);
      if (!thread) {
        const codexThread = this.codex.startThread();
        thread = { id: codexThread.id, lastActivity: new Date() };
        this.threads.set(userId, thread);
      }

      const codexThread = this.codex.resumeThread(thread.id);
      const result = await codexThread.run(message);

      thread.lastActivity = new Date();
      return result.finalResponse || result.toString();
    } catch (error: any) {
      this.logger.warn('Codex SDK 不可用，使用模擬模式', error.message);
      return `[Codex 模擬模式]\n\n收到訊息：${message}\n工作目錄：${workingDir || '未設定'}\n\n請確認 Codex SDK 已安裝：\nnpm install @openai/codex-sdk`;
    }
  }

  resetThread(userId: string): void {
    this.threads.delete(userId);
  }
}
