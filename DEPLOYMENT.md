# OpenCodexGateway 部署指南

## 系統需求

### 最低需求
- **Node.js**: v18.0.0 或更高版本
- **npm**: v8.0.0 或更高版本
- **記憶體**: 至少 512 MB RAM
- **儲存空間**: 至少 1 GB 可用空間
- **網路**: 可訪問 Telegram API 和 GitHub API

### 推薦需求
- **Node.js**: v20.0.0 或更高版本
- **記憶體**: 1 GB RAM 或更多
- **儲存空間**: 5 GB 可用空間（用於工作目錄）
- **作業系統**: Linux (Ubuntu 22.04+), macOS, Windows (WSL2 推薦)

## 快速開始

### 1. 克隆倉庫
```bash
git clone https://github.com/max0831x-dotcom/OpenCodexGateway.git
cd OpenCodexGateway
```

### 2. 安裝依賴
```bash
npm install
```

### 3. 設定環境變數
```bash
# 複製範例設定檔
cp .env.example .env

# 編輯 .env 檔案
nano .env
```

### 4. 建立設定檔（可選）
```bash
# 建立 config.json（會自動從 .env 載入設定）
echo '{}' > config.json
```

### 5. 建置專案
```bash
npm run build
```

### 6. 啟動服務
```bash
npm start
```

### 7. 開發模式（熱重載）
```bash
npm run dev
```

## 部署方式

### Docker 部署（推薦）

#### 使用 Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  opencodexgateway:
    image: node:20-alpine
    container_name: opencodexgateway
    restart: unless-stopped
    working_dir: /app
    volumes:
      - ./:/app
      - ./workspace:/app/workspace
      - ./data:/app/data
    environment:
      - NODE_ENV=production
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - GH_TOKEN=${GH_TOKEN}
      - LOG_LEVEL=info
    ports:
      - "3000:3000"
    command: ["npm", "start"]
```

啟動服務：
```bash
docker-compose up -d
```

#### 使用 Dockerfile
```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

# 複製依賴檔案
COPY package*.json ./
RUN npm ci --only=production

# 複製原始碼
COPY . .

# 建立工作目錄
RUN mkdir -p workspace data

# 設定環境變數
ENV NODE_ENV=production
ENV PORT=3000

# 暴露埠口
EXPOSE 3000

# 啟動應用程式
CMD ["npm", "start"]
```

建置並執行：
```bash
docker build -t opencodexgateway .
docker run -d \
  --name opencodexgateway \
  -p 3000:3000 \
  -v $(pwd)/workspace:/app/workspace \
  -v $(pwd)/data:/app/data \
  -e TELEGRAM_BOT_TOKEN=your_token \
  -e GH_TOKEN=your_github_token \
  opencodexgateway
```

### PM2 部署（生產環境）

#### 安裝 PM2
```bash
npm install -g pm2
```

#### 啟動應用程式
```bash
# 使用 ecosystem 設定檔
pm2 start ecosystem.config.js
```

#### ecosystem.config.js
```javascript
module.exports = {
  apps: [{
    name: 'opencodexgateway',
    script: 'dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

#### 常用 PM2 命令
```bash
# 查看日誌
pm2 logs opencodexgateway

# 監控狀態
pm2 monit

# 重啟應用程式
pm2 restart opencodexgateway

# 停止應用程式
pm2 stop opencodexgateway

# 設定開機自啟
pm2 startup
pm2 save
```

### 系統服務部署（Systemd）

#### 建立服務檔案
```bash
sudo nano /etc/systemd/system/opencodexgateway.service
```

#### 服務設定
```ini
[Unit]
Description=OpenCodexGateway Service
After=network.target

[Service]
Type=simple
User=node
WorkingDirectory=/opt/opencodexgateway
Environment="NODE_ENV=production"
Environment="TELEGRAM_BOT_TOKEN=your_token"
Environment="GH_TOKEN=your_github_token"
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

#### 啟用服務
```bash
sudo systemctl daemon-reload
sudo systemctl enable opencodexgateway
sudo systemctl start opencodexgateway
sudo systemctl status opencodexgateway
```

## 環境設定

### 必要環境變數
```bash
# Telegram Bot Token（從 @BotFather 取得）
TELEGRAM_BOT_TOKEN=your_bot_token_here

# GitHub Personal Access Token（classic token）
GH_TOKEN=ghp_your_token_here
```

### 可選環境變數
```bash
# Codex 設定（如果使用 OpenAI Codex）
CODEX_ACCESS_TOKEN=
CODEX_REFRESH_TOKEN=
CODEX_ACCOUNT_ID=

# 應用設定
WORKING_DIR=./workspace
LOG_LEVEL=info
PORT=3000
NODE_ENV=production

# Web 控制面板
WEB_ENABLED=true
WEB_PORT=3000
```

## 設定檔說明

### config.json（優先於環境變數）
```json
{
  "telegram": {
    "token": "your_bot_token",
    "adminUsers": ["123456789"]
  },
  "github": {
    "token": "your_github_token"
  },
  "codex": {
    "timeout": 300000,
    "model": "gpt-5.4"
  },
  "session": {
    "timeoutMinutes": 60,
    "cleanupIntervalMinutes": 30
  },
  "web": {
    "port": 3000,
    "enabled": true
  },
  "workspace": "/path/to/workspace",
  "logLevel": "info"
}
```

### 設定載入順序
1. **預設值**：程式內建的預設設定
2. **config.json**：JSON 設定檔（如果存在）
3. **環境變數**：.env 檔案或系統環境變數

## 監控與維護

### 健康檢查
```bash
# Web 控制面板
curl http://localhost:3000/health

# API 狀態
curl http://localhost:3000/api/status
```

### 日誌位置
- **標準輸出**：應用程式日誌
- **PM2 日誌**：~/.pm2/logs/
- **Systemd 日誌**：journalctl -u opencodexgateway

### 備份建議
```bash
# 備份工作目錄
tar -czf workspace-backup-$(date +%Y%m%d).tar.gz workspace/

# 備份設定檔
cp config.json config-backup-$(date +%Y%m%d).json
```

## 故障排除

### 常見問題

#### 1. Telegram Bot 無法啟動
```
❌ 錯誤：缺少 TELEGRAM_BOT_TOKEN
✅ 解決：檢查 .env 檔案或環境變數
```

#### 2. GitHub API 權限不足
```
❌ 錯誤：Resource not accessible by personal access token
✅ 解決：使用 classic token 而非 fine-grained token
```

#### 3. 記憶體不足
```
❌ 錯誤：JavaScript heap out of memory
✅ 解決：增加記憶體限制
export NODE_OPTIONS="--max-old-space-size=1024"
```

#### 4. 埠口被佔用
```
❌ 錯誤：EADDRINUSE
✅ 解決：變更 PORT 環境變數或停止佔用程式
```

### 日誌等級設定
```bash
# 設定日誌等級
export LOG_LEVEL=debug  # debug, info, warn, error

# 查看詳細日誌
LOG_LEVEL=debug npm start
```

## 安全性建議

### 1. 使用環境變數而非硬編碼
```bash
# ❌ 不要這樣做
token: "hardcoded_token"

# ✅ 應該這樣做
token: process.env.TELEGRAM_BOT_TOKEN
```

### 2. 限制存取權限
```bash
# 設定檔案權限
chmod 600 .env
chmod 700 workspace

# 使用非 root 使用者執行
useradd -r -s /bin/false opencodex
```

### 3. 定期更新
```bash
# 更新依賴
npm audit
npm update

# 更新 Node.js
nvm install node --reinstall-packages-from=node
```

### 4. 監控日誌
```bash
# 監控錯誤日誌
tail -f /var/log/opencodexgateway/error.log

# 設定日誌輪替
logrotate /etc/logrotate.d/opencodexgateway
```

## 擴展與自訂

### 新增命令
1. 在 `src/telegram/commands.ts` 新增命令定義
2. 在 `src/telegram/bot.ts` 實作命令處理
3. 重新建置並部署

### 自訂服務
1. 建立新的服務類別在 `src/services/`
2. 在 `src/index.ts` 中初始化
3. 在 Telegram Bot 中整合

### 修改設定
1. 更新 `src/config/manager.ts` 中的設定介面
2. 更新 `config.json` 或環境變數
3. 重新啟動應用程式

## 支援與貢獻

### 問題回報
- GitHub Issues: https://github.com/max0831x-dotcom/OpenCodexGateway/issues
- 提供詳細錯誤訊息和重現步驟

### 貢獻程式碼
1. Fork 倉庫
2. 建立功能分支
3. 提交 Pull Request
4. 確保通過測試

### 聯絡方式
- 專案維護者：max0831x-dotcom
- 文件：https://github.com/max0831x-dotcom/OpenCodexGateway

---

**版本**: 0.1.0  
**最後更新**: 2026-04-22  
**授權**: MIT License