# OpenCodexGateway

Telegram ↔ OpenAI Codex 橋接器

## 功能

- 在 Telegram 中遠端使用 OpenAI Codex
- 工作目錄管理（/setcwd）
- GitHub 操作整合（clone, commit, push, PR）
- 瀏覽器自動化驗證（Browserbase 整合）
- 會話管理（多使用者、多執行緒）

## 技術堆疊

- TypeScript / Node.js
- @openai/codex-sdk（OpenAI Codex SDK）
- node-telegram-bot-api
- @octokit/rest（GitHub API）
- simple-git

## 快速開始

```bash
# 安裝依賴
npm install

# 設定環境變數
cp .env.example .env
# 編輯 .env 檔案

# 啟動
npm start
```

## 環境變數

| 變數 | 說明 | 必要 |
|------|------|------|
| TELEGRAM_BOT_TOKEN | Telegram Bot Token | ✅ |
| GH_TOKEN | GitHub Personal Access Token | ✅ |
| CODEX_ACCESS_TOKEN | Codex 存取 Token | ✅ |
| WORKING_DIR | 預設工作目錄 | ❌ |

## 命令

- `/start` - 開始使用
- `/setcwd <路徑>` - 設定工作目錄
- `/gh_clone <網址>` - 克隆倉庫
- `/gh_commit <訊息>` - 提交變更
- `/gh_push` - 推送到遠端
- `/gh_status` - 顯示 Git 狀態
- `/reset` - 重設會話

## License

MIT
