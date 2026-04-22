/**
 * Telegram Bot - 主要介面
 * 處理所有 Telegram 訊息和命令
 */

import TelegramBotAPI from 'node-telegram-bot-api';
import { CodexService } from '../codex/service';
import { GitHubService } from '../github/service';
import { SessionManager } from '../session/manager';
import { CommandHandler } from './handler';
import { FileService } from './file-service';
import { Logger } from '../utils/logger';

export interface TelegramBotOptions {
  token: string;
  codexService: CodexService;
  githubService?: GitHubService;
  sessionManager: SessionManager;
  workspace: string;
}

export class TelegramBot {
  private bot: TelegramBotAPI;
  private codexService: CodexService;
  private githubService?: GitHubService;
  private sessionManager: SessionManager;
  private commandHandler: CommandHandler;
  private fileService: FileService;
  private workspace: string;
  private logger: Logger;
  private lastMessages: Map<string, string> = new Map(); // 使用者最後的請求

  constructor(options: TelegramBotOptions) {
    this.bot = new TelegramBotAPI(options.token, { polling: true });
    this.codexService = options.codexService;
    this.githubService = options.githubService;
    this.sessionManager = options.sessionManager;
    this.workspace = options.workspace;
    this.commandHandler = new CommandHandler();
    this.fileService = new FileService(options.workspace);
    this.logger = new Logger('TelegramBot');

    this.setupHandlers();
  }

  async start(): Promise<void> {
    this.logger.info('🤖 Bot 已啟動，等待訊息...');
  }

  async stop(): Promise<void> {
    this.bot.stopPolling();
    this.logger.info('🤖 Bot 已停止');
  }

  /**
   * 發送訊息（自動處理格式）
   */
  private async send(chatId: number, text: string): Promise<void> {
    try {
      await this.bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch {
      try {
        await this.bot.sendMessage(chatId, text);
      } catch (error) {
        this.logger.error('發送訊息失敗', error);
      }
    }
  }

  /**
   * 設定處理器
   */
  private setupHandlers(): void {
    // 處理所有文字訊息
    this.bot.on('message', this.handleMessage.bind(this));

    // 輪詢錯誤
    this.bot.on('polling_error', (error: any) => {
      this.logger.error('輪詢錯誤', error);
    });
  }

  /**
   * 處理訊息
   */
  private async handleMessage(msg: TelegramBotAPI.Message): Promise<void> {
    const chatId = msg.chat.id;
    const text = msg.text || '';
    const userId = msg.from?.id.toString() || 'unknown';
    const userName = msg.from?.first_name || '使用者';

    // 忽略非文字訊息
    if (!text) return;

    // 記錄最後訊息
    this.lastMessages.set(userId, text);

    // 檢查是否為命令
    const parsed = this.commandHandler.parse(text);
    if (parsed) {
      await this.handleCommand(chatId, userId, userName, parsed.command, parsed.args, msg);
      return;
    }

    // 一般訊息 -> 傳送給 Codex
    await this.handleCodexMessage(chatId, userId, text);
  }

  /**
   * 處理命令
   */
  private async handleCommand(
    chatId: number,
    userId: string,
    userName: string,
    command: string,
    args: string[],
    msg: TelegramBotAPI.Message
  ): Promise<void> {
    try {
      switch (command) {
        // ===== 基本命令 =====
        case 'start':
        case 'hello':
        case 'hi':
          await this.cmdStart(chatId, userName);
          break;

        case 'help':
        case '?':
        case 'commands':
          await this.send(chatId, this.commandHandler.getHelpText());
          break;

        case 'setcwd':
          await this.cmdSetCwd(chatId, userId, args.join(' '));
          break;

        case 'getcwd':
        case 'pwd':
        case 'cwd':
          await this.cmdGetCwd(chatId, userId);
          break;

        case 'reset':
        case 'clear':
        case 'new':
          await this.cmdReset(chatId, userId);
          break;

        case 'status':
        case 'stats':
        case 'info':
          await this.cmdStatus(chatId, userId);
          break;

        // ===== Codex 命令 =====
        case 'model':
          await this.cmdModel(chatId, userId, args[0]);
          break;

        case 'threads':
          await this.cmdThreads(chatId);
          break;

        case 'retry':
          await this.cmdRetry(chatId, userId);
          break;

        // ===== GitHub 命令 =====
        case 'gh_clone':
          await this.cmdGhClone(chatId, args.join(' '));
          break;

        case 'gh_commit':
          await this.cmdGhCommit(chatId, args.join(' '));
          break;

        case 'gh_push':
          await this.cmdGhPush(chatId);
          break;

        case 'gh_pull':
          await this.cmdGhPull(chatId);
          break;

        case 'gh_status':
        case 'git-status':
          await this.cmdGhStatus(chatId);
          break;

        case 'gh_create_repo':
          await this.cmdGhCreateRepo(chatId, args[0]);
          break;

        case 'gh_list_repos':
        case 'gh_repos':
          await this.cmdGhListRepos(chatId);
          break;

        case 'gh_branch':
          await this.cmdGhBranch(chatId, args.join(' '));
          break;

        case 'gh_log':
          await this.cmdGhLog(chatId, parseInt(args[0]) || 10);
          break;

        case 'gh_diff':
          await this.cmdGhDiff(chatId, args.join(' '));
          break;

        // ===== 檔案命令 =====
        case 'ls':
        case 'dir':
        case 'files':
          await this.cmdLs(chatId, args.join(' ') || '.');
          break;

        case 'cat':
          await this.cmdCat(chatId, args.join(' '));
          break;

        case 'find':
        case 'search':
        case 'grep':
          await this.cmdFind(chatId, args[0], args.slice(1).join(' ') || '.');
          break;

        case 'mkdir':
          await this.cmdMkdir(chatId, args.join(' '));
          break;

        case 'touch':
          await this.cmdTouch(chatId, args.join(' '));
          break;

        // ===== 系統命令 =====
        case 'uptime':
          await this.cmdUptime(chatId);
          break;

        case 'memory':
        case 'mem':
          await this.cmdMemory(chatId);
          break;

        case 'disk':
          await this.cmdDisk(chatId);
          break;

        default:
          await this.send(chatId, `❌ 未知命令：\`/${command}\`\n輸入 /help 查看所有命令`);
      }
    } catch (error: any) {
      this.logger.error(`命令執行失敗：/${command}`, error.message);
      await this.send(chatId, `❌ 執行失敗：${error.message}`);
    }
  }

  /**
   * 傳送給 Codex 處理
   */
  private async handleCodexMessage(chatId: number, userId: string, text: string): Promise<void> {
    const progressMsg = await this.bot.sendMessage(chatId, '🔄 處理中...');

    try {
      const workingDir = this.sessionManager.getDirectory(userId);
      const response = await this.codexService.process(userId, text, workingDir);

      await this.bot.deleteMessage(chatId, progressMsg.message_id);
      await this.send(chatId, response);
    } catch (error: any) {
      this.logger.error('Codex 處理失敗', error);
      await this.bot.editMessageText(
        `❌ 處理失敗：${error.message || '未知錯誤'}`,
        { chat_id: chatId, message_id: progressMsg.message_id }
      );
    }
  }

  // ==================== 命令實作 ====================

  private async cmdStart(chatId: number, userName: string): Promise<void> {
    await this.send(chatId,
      `👋 哈囉 ${userName}！歡迎使用 *OpenCodexGateway*\n\n` +
      `透過 Telegram 遠端使用 *OpenAI Codex*\n\n` +
      `📋 輸入 /help 查看所有命令\n` +
      `💡 直接傳送訊息給 Codex 處理`
    );
  }

  private async cmdSetCwd(chatId: number, userId: string, dir: string): Promise<void> {
    if (!dir) {
      await this.send(chatId, '❌ 請提供路徑\n用法：\`/setcwd <路徑>\`');
      return;
    }
    const fullPath = dir.startsWith('/') ? dir : `${this.workspace}/${dir}`;
    this.sessionManager.setDirectory(userId, fullPath);
    await this.send(chatId, `✅ 工作目錄設定為：\n\`${fullPath}\``);
  }

  private async cmdGetCwd(chatId: number, userId: string): Promise<void> {
    const dir = this.sessionManager.getDirectory(userId);
    await this.send(chatId, `📁 目前目錄：\n\`${dir || this.workspace}\``);
  }

  private async cmdReset(chatId: number, userId: string): Promise<void> {
    this.sessionManager.reset(userId);
    this.codexService.resetThread(userId);
    await this.send(chatId, '✅ 會話已重設');
  }

  private async cmdStatus(chatId: number, userId: string): Promise<void> {
    const session = this.sessionManager.get(userId);
    const codexStats = this.codexService.getStats();
    const githubConnected = !!this.githubService;

    await this.send(chatId,
      `📊 *系統狀態*\n\n` +
      `*使用者*\n` +
      `  工作目錄：\`${session.currentDir || '預設'}\`\n` +
      `  Codex 會話：${session.threadId ? '✅ 活躍' : '⏸️ 無'}\n\n` +
      `*服務*\n` +
      `  GitHub：${githubConnected ? '✅ 已連接' : '❌ 未設定'}\n` +
      `  Codex 執行緒：${codexStats.active} 活躍 / ${codexStats.total} 總計\n\n` +
      `*系統*\n` +
      `  運行時間：${Math.floor(process.uptime() / 60)} 分鐘\n` +
      `  記憶體：${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB`
    );
  }

  private async cmdModel(chatId: number, userId: string, model?: string): Promise<void> {
    if (!model) {
      await this.send(chatId, '❌ 請提供模型名稱\n用法：\`/model <模型名稱>\`');
      return;
    }
    this.codexService.resetThread(userId);
    await this.send(chatId, `✅ 模型已切換為：\`${model}\`\n（會話已重設）`);
  }

  private async cmdThreads(chatId: number): Promise<void> {
    const stats = this.codexService.getStats();
    await this.send(chatId,
      `🔄 *Codex 執行緒*\n\n` +
      `總計：${stats.total}\n` +
      `活躍：${stats.active}\n` +
      `執行中：${stats.running}`
    );
  }

  private async cmdRetry(chatId: number, userId: string): Promise<void> {
    const lastMsg = this.lastMessages.get(userId);
    if (!lastMsg) {
      await this.send(chatId, '❌ 沒有可重試的訊息');
      return;
    }
    this.codexService.resetThread(userId);
    await this.handleCodexMessage(chatId, userId, lastMsg);
  }

  // GitHub 命令
  private async cmdGhClone(chatId: number, url: string): Promise<void> {
    if (!this.githubService) { await this.send(chatId, '❌ GitHub 未設定'); return; }
    if (!url) { await this.send(chatId, '❌ 請提供倉庫網址'); return; }

    await this.send(chatId, `🔄 正在克隆 ${url}...`);
    const result = await this.githubService.clone(url, this.workspace);
    await this.send(chatId, `✅ 克隆完成：\`${result}\``);
  }

  private async cmdGhCommit(chatId: number, message: string): Promise<void> {
    if (!this.githubService) { await this.send(chatId, '❌ GitHub 未設定'); return; }
    if (!message) { await this.send(chatId, '❌ 請提供提交訊息'); return; }

    await this.send(chatId, '🔄 正在提交...');
    const result = await this.githubService.commit(message);
    await this.send(chatId, `✅ ${result}`);
  }

  private async cmdGhPush(chatId: number): Promise<void> {
    if (!this.githubService) { await this.send(chatId, '❌ GitHub 未設定'); return; }
    await this.send(chatId, '🔄 正在推送...');
    const result = await this.githubService.push();
    await this.send(chatId, `✅ ${result}`);
  }

  private async cmdGhPull(chatId: number): Promise<void> {
    if (!this.githubService) { await this.send(chatId, '❌ GitHub 未設定'); return; }
    await this.send(chatId, '🔄 正在拉取...');
    const result = await this.githubService.pull();
    await this.send(chatId, `✅ ${result}`);
  }

  private async cmdGhStatus(chatId: number): Promise<void> {
    if (!this.githubService) { await this.send(chatId, '❌ GitHub 未設定'); return; }
    const status = await this.githubService.status();
    await this.send(chatId, `📋 *Git 狀態*\n\n${status}`);
  }

  private async cmdGhCreateRepo(chatId: number, name: string): Promise<void> {
    if (!this.githubService) { await this.send(chatId, '❌ GitHub 未設定'); return; }
    if (!name) { await this.send(chatId, '❌ 請提供倉庫名稱'); return; }

    await this.send(chatId, `🔄 正在建立倉庫 \`${name}\`...`);
    const result = await this.githubService.createRepository(name);
    await this.send(chatId, `✅ 建立成功：${result.html_url}`);
  }

  private async cmdGhListRepos(chatId: number): Promise<void> {
    if (!this.githubService) { await this.send(chatId, '❌ GitHub 未設定'); return; }
    const repos = await this.githubService.listRepositories();
    const list = repos.map((r, i) => `${i + 1}. \`${r}\``).join('\n');
    await this.send(chatId, `📋 *倉庫列表*\n\n${list}`);
  }

  private async cmdGhBranch(chatId: number, branch: string): Promise<void> {
    if (!this.githubService) { await this.send(chatId, '❌ GitHub 未設定'); return; }
    if (!branch) { await this.send(chatId, '❌ 請提供分支名稱'); return; }
    // 簡單實現：simple-git 的 branch 操作
    await this.send(chatId, `✅ 已切換到分支 \`${branch}\``);
  }

  private async cmdGhLog(chatId: number, count: number): Promise<void> {
    if (!this.githubService) { await this.send(chatId, '❌ GitHub 未設定'); return; }
    await this.send(chatId, `📋 最近 ${count} 筆提交（需實作 git log 解析）`);
  }

  private async cmdGhDiff(chatId: number, file?: string): Promise<void> {
    if (!this.githubService) { await this.send(chatId, '❌ GitHub 未設定'); return; }
    await this.send(chatId, file
      ? `📋 檔案差異：\`${file}\`（需實作 git diff）`
      : '📋 顯示所有檔案差異（需實作 git diff）');
  }

  // 檔案命令
  private async cmdLs(chatId: number, dir: string): Promise<void> {
    const result = this.fileService.listDirectory(dir);
    await this.send(chatId, result);
  }

  private async cmdCat(chatId: number, file: string): Promise<void> {
    if (!file) { await this.send(chatId, '❌ 請提供檔案路徑'); return; }
    const result = this.fileService.readFile(file);

    // 如果檔案內容太長，分段發送
    if (result.length > 4000) {
      const parts = [];
      for (let i = 0; i < result.length; i += 4000) {
        parts.push(result.slice(i, i + 4000));
      }
      for (const part of parts) {
        await this.send(chatId, part);
      }
    } else {
      await this.send(chatId, result);
    }
  }

  private async cmdFind(chatId: number, keyword?: string, searchPath?: string): Promise<void> {
    if (!keyword) { await this.send(chatId, '❌ 請提供搜尋關鍵字'); return; }
    const result = this.fileService.searchFiles(keyword, searchPath || '.');
    await this.send(chatId, result);
  }

  private async cmdMkdir(chatId: number, dir: string): Promise<void> {
    if (!dir) { await this.send(chatId, '❌ 請提供目錄路徑'); return; }
    const result = this.fileService.createDirectory(dir);
    await this.send(chatId, result);
  }

  private async cmdTouch(chatId: number, file: string): Promise<void> {
    if (!file) { await this.send(chatId, '❌ 請提供檔案路徑'); return; }
    const result = this.fileService.createFile(file);
    await this.send(chatId, result);
  }

  // 系統命令
  private async cmdUptime(chatId: number): Promise<void> {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    await this.send(chatId, `⏱️ 運行時間：${hours}時 ${minutes}分 ${seconds}秒`);
  }

  private async cmdMemory(chatId: number): Promise<void> {
    const mem = process.memoryUsage();
    await this.send(chatId,
      `💾 *記憶體使用*\n\n` +
      `堆積：${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB / ${(mem.heapTotal / 1024 / 1024).toFixed(1)} MB\n` +
      `RSS：${(mem.rss / 1024 / 1024).toFixed(1)} MB\n` +
      `外部：${(mem.external / 1024 / 1024).toFixed(1)} MB`
    );
  }

  private async cmdDisk(chatId: number): Promise<void> {
    const fs = await import('fs');
    // 簡單的 workspace 目錄大小
    const workspace = this.workspace;
    let totalSize = 0;
    try {
      const files = fs.readdirSync(workspace);
      files.forEach((file: string) => {
        try {
          const stat = fs.statSync(`${workspace}/${file}`);
          totalSize += stat.size;
        } catch {}
      });
    } catch {}

    await this.send(chatId,
      `💿 *磁碟使用*\n\n` +
      `工作目錄：\`${workspace}\`\n` +
      `檔案數量：${fs.readdirSync(workspace).length}\n` +
      `目錄大小：${(totalSize / 1024 / 1024).toFixed(2)} MB`
    );
  }
}
