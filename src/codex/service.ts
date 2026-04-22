/**
 * Codex 服務 - 核心整合層
 * 管理 Codex SDK、執行緒、訊息處理
 */

import { CodexSDKWrapper, CodexResult } from './sdk-wrapper';
import { ThreadManager } from './thread-manager';
import { Logger } from '../utils/logger';

export interface CodexServiceOptions {
  timeout: number;
  model: string;
}

export class CodexService {
  private sdk: CodexSDKWrapper;
  private threadManager: ThreadManager;
  private logger: Logger;
  private options: CodexServiceOptions;

  constructor(options: CodexServiceOptions) {
    this.options = options;
    this.sdk = new CodexSDKWrapper({
      model: options.model,
      timeout: options.timeout,
    });
    this.threadManager = new ThreadManager(options.model);
    this.logger = new Logger('CodexService');
  }

  async initialize(): Promise<boolean> {
    return this.sdk.initialize();
  }

  async process(
    userId: string,
    message: string,
    workingDir?: string
  ): Promise<string> {
    // 取得或建立使用者的執行緒
    let thread = this.threadManager.getByUser(userId);
    if (!thread) {
      thread = this.threadManager.create(userId);
      await this.sdk.startThread(thread.id);
    }

    // 建構完整的提示訊息
    const fullMessage = this.buildPrompt(message, workingDir);

    // 更新狀態為執行中
    this.threadManager.updateStatus(thread.id, 'running', '處理中...');

    try {
      // 執行 Codex
      const result = await this.sdk.run(thread.id, fullMessage);

      // 更新狀態為閒置
      this.threadManager.updateStatus(thread.id, 'idle');

      // 格式化輸出
      return this.formatOutput(result, message);

    } catch (error: any) {
      this.threadManager.updateStatus(thread.id, 'error', error.message);

      // SDK 不可用時使用模擬模式
      if (!this.sdk.isAvailable()) {
        return this.mockResponse(message, workingDir);
      }

      throw error;
    }
  }

  /**
   * 建構給 Codex 的完整提示
   */
  private buildPrompt(message: string, workingDir?: string): string {
    const parts: string[] = [];

    if (workingDir) {
      parts.push(`[當前工作目錄：${workingDir}]`);
    }

    parts.push(message);
    return parts.join('\n');
  }

  /**
   * 格式化 Codex 輸出
   */
  private formatOutput(result: CodexResult, originalMessage: string): string {
    const lines: string[] = [];
    lines.push(result.text);

    // 加入執行時間（如果超過 5 秒）
    if (result.duration > 5000) {
      lines.push('');
      lines.push(`⏱️ 處理時間：${(result.duration / 1000).toFixed(1)}秒`);
    }

    return lines.join('\n');
  }

  /**
   * 模擬回應（用於開發測試）
   */
  private mockResponse(message: string, workingDir?: string): string {
    return [
      `*[Codex 模擬模式]*`,
      ``,
      `收到訊息：${message}`,
      `工作目錄：${workingDir || '未設定'}`,
      `模型：${this.options.model}`,
      ``,
      `⚠️ 請確認已安裝 Codex SDK：`,
      `\`npm install @openai/codex-sdk\``,
    ].join('\n');
  }

  resetThread(userId: string): void {
    this.threadManager.deleteByUser(userId);
    this.logger.info(`已重設使用者 ${userId} 的會話`);
  }

  getActiveThreads(): number {
    return this.threadManager.getStats().active;
  }

  getStats() {
    return this.threadManager.getStats();
  }
}
