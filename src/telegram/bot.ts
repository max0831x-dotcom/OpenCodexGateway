import TelegramBotAPI from 'node-telegram-bot-api';
import { CodexService } from '../codex/service';
import { GitHubService } from '../github/service';
import { SessionManager } from '../session/manager';
import { Logger } from '../utils/logger';

export class TelegramBot {
  private bot: TelegramBotAPI;
  private codexService: CodexService;
  private githubService?: GitHubService;
  private sessionManager: SessionManager;
  private logger: Logger;

  constructor(
    token: string,
    codexService: CodexService,
    githubService?: GitHubService,
    sessionManager?: SessionManager
  ) {
    this.bot = new TelegramBotAPI(token, { polling: true });
    this.codexService = codexService;
    this.githubService = githubService;
    this.sessionManager = sessionManager || new SessionManager();
    this.logger = new Logger('TelegramBot');

    this.setupHandlers();
  }

  private setupHandlers() {
    this.bot.onText(/\/start/, this.handleStart.bind(this));
    this.bot.onText(/\/setcwd (.+)/, this.handleSetCwd.bind(this));
    this.bot.onText(/\/reset/, this.handleReset.bind(this));
    this.bot.onText(/\/status/, this.handleStatus.bind(this));

    if (this.githubService) {
      this.bot.onText(/\/gh_clone (.+)/, this.handleGhClone.bind(this));
      this.bot.onText(/\/gh_commit (.+)/, this.handleGhCommit.bind(this));
      this.bot.onText(/\/gh_push/, this.handleGhPush.bind(this));
      this.bot.onText(/\/gh_status/, this.handleGhStatus.bind(this));
      this.bot.onText(/\/gh_create_repo (.+)/, this.handleGhCreateRepo.bind(this));
    }

    this.bot.on('message', this.handleMessage.bind(this));
  }

  async start() {
    this.logger.info('Bot started, polling for messages...');
  }

  async stop() {
    this.bot.stopPolling();
    this.logger.info('Bot stopped');
  }

  private async handleStart(msg: TelegramBotAPI.Message) {
    const chatId = msg.chat.id;
    await this.bot.sendMessage(
      chatId,
      '👋 歡迎使用 OpenCodexGateway\n\n' +
      '透過 Telegram 遠端使用 OpenAI Codex\n\n' +
      '📋 可用命令：\n' +
      '/setcwd <路徑> - 設定工作目錄\n' +
      '/gh_clone <網址> - 克隆倉庫\n' +
      '/gh_commit <訊息> - 提交變更\n' +
      '/gh_push - 推送到遠端\n' +
      '/gh_status - 顯示 Git 狀態\n' +
      '/gh_create_repo <名稱> - 建立倉庫\n' +
      '/reset - 重設會話\n' +
      '/status - 顯示狀態\n\n' +
      '💡 直接傳送訊息給 Codex 處理'
    );
  }

  private async handleSetCwd(msg: TelegramBotAPI.Message, match: RegExpExecArray | null) {
    const chatId = msg.chat.id;
    const path = match?.[1] || '';
    this.sessionManager.setDirectory(chatId.toString(), path);
    await this.bot.sendMessage(chatId, `✅ 工作目錄設定為：${path}`);
  }

  private async handleReset(msg: TelegramBotAPI.Message) {
    const chatId = msg.chat.id;
    this.sessionManager.reset(chatId.toString());
    this.codexService.resetThread(chatId.toString());
    await this.bot.sendMessage(chatId, '✅ 會話已重設');
  }

  private async handleStatus(msg: TelegramBotAPI.Message) {
    const chatId = msg.chat.id;
    const session = this.sessionManager.get(chatId.toString());
    await this.bot.sendMessage(
      chatId,
      `📊 目前狀態\n\n` +
      `工作目錄：${session.currentDir || '未設定'}\n` +
      `Codex 會話：${session.threadId ? '活躍' : '無'}\n` +
      `GitHub：${this.githubService ? '已連接' : '未設定'}`
    );
  }

  private async handleMessage(msg: TelegramBotAPI.Message) {
    const chatId = msg.chat.id;
    const text = msg.text || '';

    if (text.startsWith('/')) return;

    await this.bot.sendMessage(chatId, '🔄 處理中...');

    try {
      const response = await this.codexService.process(
        chatId.toString(),
        text,
        this.sessionManager.getDirectory(chatId.toString())
      );
      await this.bot.sendMessage(chatId, response);
    } catch (error: any) {
      this.logger.error('Codex 處理失敗', error);
      await this.bot.sendMessage(
        chatId,
        `❌ 處理失敗：${error.message || '未知錯誤'}`
      );
    }
  }

  private async handleGhClone(msg: TelegramBotAPI.Message, match: RegExpExecArray | null) {
    if (!this.githubService) return;
    const chatId = msg.chat.id;
    const repoUrl = match?.[1] || '';
    await this.bot.sendMessage(chatId, `🔄 正在克隆 ${repoUrl}...`);
    try {
      const result = await this.githubService.clone(repoUrl);
      await this.bot.sendMessage(chatId, `✅ 克隆完成\n${result}`);
    } catch (error: any) {
      await this.bot.sendMessage(chatId, `❌ 克隆失敗：${error.message}`);
    }
  }

  private async handleGhCommit(msg: TelegramBotAPI.Message, match: RegExpExecArray | null) {
    if (!this.githubService) return;
    const chatId = msg.chat.id;
    const message = match?.[1] || '';
    await this.bot.sendMessage(chatId, '🔄 正在提交...');
    try {
      const result = await this.githubService.commit(message);
      await this.bot.sendMessage(chatId, `✅ 提交完成\n${result}`);
    } catch (error: any) {
      await this.bot.sendMessage(chatId, `❌ 提交失敗：${error.message}`);
    }
  }

  private async handleGhPush(msg: TelegramBotAPI.Message) {
    if (!this.githubService) return;
    const chatId = msg.chat.id;
    await this.bot.sendMessage(chatId, '🔄 正在推送...');
    try {
      const result = await this.githubService.push();
      await this.bot.sendMessage(chatId, `✅ 推送完成\n${result}`);
    } catch (error: any) {
      await this.bot.sendMessage(chatId, `❌ 推送失敗：${error.message}`);
    }
  }

  private async handleGhStatus(msg: TelegramBotAPI.Message) {
    if (!this.githubService) return;
    const chatId = msg.chat.id;
    try {
      const status = await this.githubService.status();
      await this.bot.sendMessage(chatId, `📋 Git 狀態\n\n${status}`);
    } catch (error: any) {
      await this.bot.sendMessage(chatId, `❌ 查詢失敗：${error.message}`);
    }
  }

  private async handleGhCreateRepo(msg: TelegramBotAPI.Message, match: RegExpExecArray | null) {
    if (!this.githubService) return;
    const chatId = msg.chat.id;
    const name = match?.[1] || '';
    await this.bot.sendMessage(chatId, `🔄 正在建立倉庫 ${name}...`);
    try {
      const result = await this.githubService.createRepository(name);
      await this.bot.sendMessage(chatId, `✅ 倉庫建立成功\n${result.html_url}`);
    } catch (error: any) {
      await this.bot.sendMessage(chatId, `❌ 建立失敗：${error.message}`);
    }
  }
}
