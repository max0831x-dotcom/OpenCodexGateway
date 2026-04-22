import TelegramBotAPI from 'node-telegram-bot-api';
import { CodexService } from '../codex/service';
import { GitHubService } from '../github/service';
import { SessionManager } from '../session/manager';
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
  private workspace: string;
  private logger: Logger;

  constructor(options: TelegramBotOptions) {
    this.bot = new TelegramBotAPI(options.token, { polling: true });
    this.codexService = options.codexService;
    this.githubService = options.githubService;
    this.sessionManager = options.sessionManager;
    this.workspace = options.workspace;
    this.logger = new Logger('TelegramBot');

    this.setupHandlers();
  }

  private setupHandlers() {
    // 基本命令
    this.bot.onText(/\/start/, this.handleStart.bind(this));
    this.bot.onText(/\/help/, this.handleHelp.bind(this));
    this.bot.onText(/\/setcwd (.+)/, this.handleSetCwd.bind(this));
    this.bot.onText(/\/getcwd/, this.handleGetCwd.bind(this));
    this.bot.onText(/\/reset/, this.handleReset.bind(this));
    this.bot.onText(/\/status/, this.handleStatus.bind(this));

    // GitHub 命令
    if (this.githubService) {
      this.bot.onText(/\/gh_clone (.+)/, this.handleGhClone.bind(this));
      this.bot.onText(/\/gh_commit (.+)/, this.handleGhCommit.bind(this));
      this.bot.onText(/\/gh_push/, this.handleGhPush.bind(this));
      this.bot.onText(/\/gh_pull/, this.handleGhPull.bind(this));
      this.bot.onText(/\/gh_status/, this.handleGhStatus.bind(this));
      this.bot.onText(/\/gh_create_repo (.+)/, this.handleGhCreateRepo.bind(this));
      this.bot.onText(/\/gh_list_repos/, this.handleGhListRepos.bind(this));
    }

    // 一般訊息
    this.bot.on('message', this.handleMessage.bind(this));

    // 錯誤處理
    this.bot.on('polling_error', (error: any) => {
      this.logger.error('輪詢錯誤', error);
    });
  }

  async start(): Promise<void> {
    this.logger.info('Bot 已啟動，等待訊息...');
  }

  async stop(): Promise<void> {
    this.bot.stopPolling();
    this.logger.info('Bot 已停止');
  }

  private async reply(chatId: number, text: string): Promise<void> {
    try {
      await this.bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch (error) {
      // 如果 Markdown 解析失敗，改用純文字
      try {
        await this.bot.sendMessage(chatId, text);
      } catch (e) {
        this.logger.error('發送訊息失敗', e);
      }
    }
  }

  // ===== 命令處理 =====

  private async handleStart(msg: TelegramBotAPI.Message): Promise<void> {
    const chatId = msg.chat.id;
    const userName = msg.from?.first_name || '使用者';

    await this.reply(chatId,
      `👋 哈囉 ${userName}！歡迎使用 *OpenCodexGateway*\n\n` +
      `透過 Telegram 遠端使用 *OpenAI Codex*\n\n` +
      `📋 *基本命令*\n` +
      `/help - 顯示所有命令\n` +
      `/setcwd <路徑> - 設定工作目錄\n` +
      `/getcwd - 顯示目前目錄\n` +
      `/reset - 重設會話\n` +
      `/status - 顯示狀態\n\n` +
      `🐙 *GitHub 命令*\n` +
      `/gh_clone <網址> - 克隆倉庫\n` +
      `/gh_commit <訊息> - 提交變更\n` +
      `/gh_push - 推送到遠端\n` +
      `/gh_pull - 從遠端拉取\n` +
      `/gh_status - 顯示 Git 狀態\n` +
      `/gh_create_repo <名稱> - 建立新倉庫\n` +
      `/gh_list_repos - 列出倉庫\n\n` +
      `💡 直接傳送訊息給 Codex 處理！`
    );
  }

  private async handleHelp(msg: TelegramBotAPI.Message): Promise<void> {
    await this.handleStart(msg);
  }

  private async handleSetCwd(msg: TelegramBotAPI.Message, match: RegExpExecArray | null): Promise<void> {
    const chatId = msg.chat.id;
    const rawPath = match?.[1]?.trim() || '';
    
    if (!rawPath) {
      await this.reply(chatId, '❌ 請提供路徑\n用法：/setcwd <路徑>');
      return;
    }

    // 處理相對路徑
    const path = rawPath.startsWith('/') ? rawPath : `${this.workspace}/${rawPath}`;
    this.sessionManager.setDirectory(chatId.toString(), path);
    
    await this.reply(chatId, `✅ 工作目錄設定為：\n\`${path}\``);
  }

  private async handleGetCwd(msg: TelegramBotAPI.Message): Promise<void> {
    const chatId = msg.chat.id;
    const dir = this.sessionManager.getDirectory(chatId.toString());
    
    if (dir) {
      await this.reply(chatId, `📁 目前工作目錄：\n\`${dir}\``);
    } else {
      await this.reply(chatId, `📁 預設工作目錄：\n\`${this.workspace}\``);
    }
  }

  private async handleReset(msg: TelegramBotAPI.Message): Promise<void> {
    const chatId = msg.chat.id;
    this.sessionManager.reset(chatId.toString());
    this.codexService.resetThread(chatId.toString());
    await this.reply(chatId, '✅ 會話已重設');
  }

  private async handleStatus(msg: TelegramBotAPI.Message): Promise<void> {
    const chatId = msg.chat.id;
    const session = this.sessionManager.get(chatId.toString());
    
    await this.reply(chatId,
      `📊 *目前狀態*\n\n` +
      `工作目錄：\`${session.currentDir || '預設目錄'}\`\n` +
      `Codex 會話：${session.threadId ? '✅ 活躍' : '⏸️ 無'}\n` +
      `GitHub：${this.githubService ? '✅ 已連接' : '❌ 未設定'}\n` +
      `啟動時間：${session.createdAt.toLocaleString('zh-TW')}`
    );
  }

  // ===== Codex 訊息處理 =====

  private async handleMessage(msg: TelegramBotAPI.Message): Promise<void> {
    const chatId = msg.chat.id;
    const text = msg.text || '';

    // 忽略命令
    if (text.startsWith('/')) return;

    // 傳送給 Codex 處理
    const progressMsg = await this.bot.sendMessage(chatId, '🔄 處理中...');

    try {
      const response = await this.codexService.process(
        chatId.toString(),
        text,
        this.sessionManager.getDirectory(chatId.toString())
      );

      await this.bot.deleteMessage(chatId, progressMsg.message_id);
      await this.reply(chatId, response);
    } catch (error: any) {
      this.logger.error('Codex 處理失敗', error);
      await this.bot.editMessageText(
        `❌ 處理失敗：${error.message || '未知錯誤'}`,
        {
          chat_id: chatId,
          message_id: progressMsg.message_id,
        }
      );
    }
  }

  // ===== GitHub 命令 =====

  private async handleGhClone(msg: TelegramBotAPI.Message, match: RegExpExecArray | null): Promise<void> {
    if (!this.githubService) return;
    const chatId = msg.chat.id;
    const repoUrl = match?.[1]?.trim() || '';

    if (!repoUrl) {
      await this.reply(chatId, '❌ 請提供倉庫網址\n用法：/gh_clone <網址>');
      return;
    }

    await this.reply(chatId, `🔄 正在克隆 ${repoUrl}...`);

    try {
      const result = await this.githubService.clone(repoUrl, this.workspace);
      await this.reply(chatId, `✅ 克隆完成\n\`${result}\``);
    } catch (error: any) {
      await this.reply(chatId, `❌ 克隆失敗：${error.message}`);
    }
  }

  private async handleGhCommit(msg: TelegramBotAPI.Message, match: RegExpExecArray | null): Promise<void> {
    if (!this.githubService) return;
    const chatId = msg.chat.id;
    const message = match?.[1]?.trim() || '';

    if (!message) {
      await this.reply(chatId, '❌ 請提供提交訊息\n用法：/gh_commit <訊息>');
      return;
    }

    await this.reply(chatId, '🔄 正在提交...');

    try {
      const result = await this.githubService.commit(message);
      await this.reply(chatId, `✅ ${result}`);
    } catch (error: any) {
      await this.reply(chatId, `❌ 提交失敗：${error.message}`);
    }
  }

  private async handleGhPush(msg: TelegramBotAPI.Message): Promise<void> {
    if (!this.githubService) return;
    const chatId = msg.chat.id;

    await this.reply(chatId, '🔄 正在推送到遠端...');

    try {
      const result = await this.githubService.push();
      await this.reply(chatId, `✅ ${result}`);
    } catch (error: any) {
      await this.reply(chatId, `❌ 推送失敗：${error.message}`);
    }
  }

  private async handleGhPull(msg: TelegramBotAPI.Message): Promise<void> {
    if (!this.githubService) return;
    const chatId = msg.chat.id;

    await this.reply(chatId, '🔄 正在從遠端拉取...');

    try {
      const result = await this.githubService.pull();
      await this.reply(chatId, `✅ ${result}`);
    } catch (error: any) {
      await this.reply(chatId, `❌ 拉取失敗：${error.message}`);
    }
  }

  private async handleGhStatus(msg: TelegramBotAPI.Message): Promise<void> {
    if (!this.githubService) return;
    const chatId = msg.chat.id;

    try {
      const status = await this.githubService.status();
      await this.reply(chatId, `📋 *Git 狀態*\n\n${status}`);
    } catch (error: any) {
      await this.reply(chatId, `❌ 查詢失敗：${error.message}`);
    }
  }

  private async handleGhCreateRepo(msg: TelegramBotAPI.Message, match: RegExpExecArray | null): Promise<void> {
    if (!this.githubService) return;
    const chatId = msg.chat.id;
    const name = match?.[1]?.trim() || '';

    if (!name) {
      await this.reply(chatId, '❌ 請提供倉庫名稱\n用法：/gh_create_repo <名稱>');
      return;
    }

    await this.reply(chatId, `🔄 正在建立倉庫 \`${name}\`...`);

    try {
      const result = await this.githubService.createRepository(name);
      await this.reply(chatId, `✅ 倉庫建立成功\n${result.html_url}`);
    } catch (error: any) {
      await this.reply(chatId, `❌ 建立失敗：${error.message}`);
    }
  }

  private async handleGhListRepos(msg: TelegramBotAPI.Message): Promise<void> {
    if (!this.githubService) return;
    const chatId = msg.chat.id;

    try {
      const repos = await this.githubService.listRepositories();
      const repoList = repos.map((r, i) => `${i + 1}. \`${r}\``).join('\n');
      await this.reply(chatId, `📋 *您的倉庫*\n\n${repoList}`);
    } catch (error: any) {
      await this.reply(chatId, `❌ 查詢失敗：${error.message}`);
    }
  }
}
