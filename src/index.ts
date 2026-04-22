import dotenv from 'dotenv';
dotenv.config();

import { TelegramBot } from './telegram/bot';
import { CodexService } from './codex/service';
import { GitHubService } from './github/service';
import { SessionManager } from './session/manager';
import { Logger } from './utils/logger';

async function main() {
  const logger = new Logger('Main');
  
  // 檢查必要環境變數
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  const githubToken = process.env.GH_TOKEN;
  
  if (!telegramToken) {
    logger.error('請設定 TELEGRAM_BOT_TOKEN 環境變數');
    process.exit(1);
  }
  
  // 初始化服務
  const sessionManager = new SessionManager();
  const codexService = new CodexService();
  const githubService = githubToken ? new GitHubService(githubToken) : undefined;
  
  // 啟動 Telegram Bot
  const bot = new TelegramBot(
    telegramToken,
    codexService,
    githubService,
    sessionManager
  );
  
  await bot.start();
  logger.info('🚀 OpenCodexGateway 已啟動');
  
  // 優雅關閉
  process.on('SIGINT', async () => {
    logger.info('正在關閉...');
    await bot.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    logger.info('正在關閉...');
    await bot.stop();
    process.exit(0);
  });
}

main().catch(console.error);
