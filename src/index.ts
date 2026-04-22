import dotenv from 'dotenv';
dotenv.config();

import { TelegramBot } from './telegram/bot';
import { CodexService } from './codex/service';
import { GitHubService } from './github/service';
import { SessionManager } from './session/manager';
import { WebServer } from './web/server';
import { ConfigManager } from './config/manager';
import { Logger } from './utils/logger';

const logger = new Logger('Main');

function printBanner(): void {
  console.log(`
  ╔══════════════════════════════════════╗
  ║        OpenCodexGateway v0.1.0       ║
  ║   Telegram ↔ OpenAI Codex Bridge     ║
  ╚══════════════════════════════════════╝
  `);
}

async function main(): Promise<void> {
  printBanner();

  // 載入設定
  const configManager = new ConfigManager();
  const config = configManager.get();

  // 確保必要設定
  if (!config.telegram.token) {
    logger.error('❌ 缺少 TELEGRAM_BOT_TOKEN');
    logger.info('請建立 .env 檔案或設定環境變數');
    logger.info('複製 .env.example 並填入設定值');
    process.exit(1);
  }

  // 初始化會話管理
  const sessionManager = new SessionManager({
    timeoutMinutes: config.session.timeoutMinutes,
  });

  // 初始化 Codex 服務
  const codexService = new CodexService({
    timeout: config.codex.timeout,
    model: config.codex.model,
  });

  // 初始化 GitHub 服務（如果提供 token）
  let githubService: GitHubService | undefined;
  if (config.github.token) {
    githubService = new GitHubService(config.github.token);
    logger.info('🐙 GitHub 服務已連接');
  } else {
    logger.warn('⚠️ 未設定 GH_TOKEN，GitHub 功能不可用');
  }

  // 確保工作目錄存在
  const fs = await import('fs');
  if (!fs.existsSync(config.workspace)) {
    fs.mkdirSync(config.workspace, { recursive: true });
    logger.info(`📁 已建立工作目錄：${config.workspace}`);
  }

  // 啟動 Telegram Bot
  const bot = new TelegramBot({
    token: config.telegram.token,
    codexService,
    githubService,
    sessionManager,
    workspace: config.workspace,
  });
  await bot.start();
  logger.info('🤖 Telegram Bot 已啟動');

  // 啟動 Web 控制面板（可選）
  let webServer: WebServer | undefined;
  if (config.web.enabled) {
    webServer = new WebServer({
      port: config.web.port,
      sessionManager,
      codexService,
      githubService,
    });
    await webServer.start();
    logger.info(`🌐 Web 控制面板：http://localhost:${config.web.port}`);
  }

  // 定期清理會話
  const cleanupInterval = setInterval(() => {
    sessionManager.cleanup();
  }, config.session.cleanupIntervalMinutes * 60 * 1000);

  logger.info('🚀 OpenCodexGateway 啟動完成！');

  // 優雅關閉
  async function shutdown(signal: string): Promise<void> {
    logger.info(`收到 ${signal}，正在關閉...`);
    clearInterval(cleanupInterval);

    try {
      await bot.stop();
      logger.info('🤖 Telegram Bot 已停止');
    } catch (error) {
      logger.warn('停止 Telegram Bot 時出錯', error);
    }

    if (webServer) {
      try {
        await webServer.stop();
        logger.info('🌐 Web 控制面板已停止');
      } catch (error) {
        logger.warn('停止 Web 伺服器時出錯', error);
      }
    }

    logger.info('👋 再見！');
    process.exit(0);
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // 未捕獲的錯誤處理
  process.on('uncaughtException', (error) => {
    logger.error('未捕獲的例外', error);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('未處理的 Promise 拒絕', reason);
  });
}

main().catch((error) => {
  logger.error('啟動失敗', error);
  process.exit(1);
});
