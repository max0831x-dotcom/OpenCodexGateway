import { Logger } from '../utils/logger';

export interface CodexServiceOptions {
  timeout: number;
  model: string;
}

interface CodexThread {
  id: string;
  lastActivity: Date;
}

export class CodexService {
  private threads: Map<string, CodexThread> = new Map();
  private codex: any = null;
  private logger: Logger;
  private options: CodexServiceOptions;

  constructor(options: CodexServiceOptions) {
    this.options = options;
    this.logger = new Logger('CodexService');
  }

  async process(userId: string, message: string, workingDir?: string): Promise<string> {
    try {
      // 動態載入 Codex SDK
      const { Codex } = await import('@openai/codex-sdk');
      
      if (!this.codex) {
        this.codex = new Codex();
      }

      let thread = this.threads.get(userId);
      if (!thread) {
        const codexThread = this.codex.startThread({ model: this.options.model });
        thread = { id: codexThread.id, lastActivity: new Date() };
        this.threads.set(userId, thread);
      }

      const codexThread = this.codex.resumeThread(thread.id);

      // 如果有工作目錄，先切換
      const fullMessage = workingDir
        ? `[在工作目錄 ${workingDir} 中執行]\n${message}`
        : message;

      const result = await codexThread.run(fullMessage, {
        timeout: this.options.timeout,
      });

      thread.lastActivity = new Date();
      return result.finalResponse || result.toString();
    } catch (error: any) {
      this.logger.warn('Codex SDK 不可用，使用模擬模式', error.message);
      
      // 模擬模式 - 用於開發測試
      return [
        `*[Codex 模擬模式]*`,
        ``,
        `收到訊息：${message}`,
        `工作目錄：${workingDir || '未設定'}`,
        `模型：${this.options.model}`,
        `超時：${this.options.timeout}ms`,
        ``,
        `⚠️ 請確認已安裝 Codex SDK：`,
        `\`npm install @openai/codex-sdk\``,
      ].join('\n');
    }
  }

  resetThread(userId: string): void {
    this.threads.delete(userId);
    this.logger.info(`已重設使用者 ${userId} 的 Codex 會話`);
  }

  getActiveThreads(): number {
    return this.threads.size;
  }
}
