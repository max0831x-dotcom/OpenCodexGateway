# OpenCodexGateway 設定說明

## 設定系統概覽

OpenCodexGateway 使用三層設定系統，優先順序從高到低：

1. **環境變數**（最高優先級）
2. **config.json** 設定檔
3. **程式預設值**（最低優先級）

## 設定檔結構

### 主要設定檔：config.json
```json
{
  "telegram": {
    "token": "your_bot_token_here",
    "adminUsers": ["123456789", "987654321"]
  },
  "github": {
    "token": "ghp_your_github_token_here"
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

### 環境變數檔：.env
```bash
# Telegram Bot 設定
TELEGRAM_BOT_TOKEN=your_bot_token_here

# GitHub 設定
GH_TOKEN=ghp_your_github_token_here

# Codex 設定（可選）
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

## 設定選項詳解

### Telegram 設定
| 選項 | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| `telegram.token` | `string` | `""` | **必填**。Telegram Bot Token，從 @BotFather 取得 |
| `telegram.adminUsers` | `string[]` | `[]` | 管理員使用者 ID 列表，可存取特殊命令 |

**取得 Telegram Bot Token：**
1. 在 Telegram 中搜尋 `@BotFather`
2. 傳送 `/newbot` 命令
3. 輸入機器人名稱
4. 輸入機器人使用者名稱（必須以 `bot` 結尾）
5. 複製取得的 Token

### GitHub 設定
| 選項 | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| `github.token` | `string` | `""` | **必填**。GitHub Personal Access Token |

**建立 GitHub Token：**
1. 前往 https://github.com/settings/tokens
2. 點擊 "Generate new token (classic)"
3. 選擇權限：
   - ✅ `repo`（完整倉庫控制）
   - ✅ `workflow`（可選，用於 CI/CD）
4. 複製產生的 token

### Codex 設定
| 選項 | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| `codex.timeout` | `number` | `300000` | Codex 請求超時時間（毫秒） |
| `codex.model` | `string` | `"gpt-5.4"` | 使用的 Codex 模型名稱 |

**Codex SDK 安裝：**
```bash
npm install @openai/codex-sdk
```

**Codex 認證設定：**
1. 前往 OpenAI Codex 控制台
2. 建立新的 API 金鑰
3. 設定環境變數：
   ```bash
   CODEX_ACCESS_TOKEN=your_access_token
   CODEX_REFRESH_TOKEN=your_refresh_token
   CODEX_ACCOUNT_ID=your_account_id
   ```

### 會話設定
| 選項 | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| `session.timeoutMinutes` | `number` | `60` | 會話閒置超時時間（分鐘） |
| `session.cleanupIntervalMinutes` | `number` | `30` | 會話清理間隔（分鐘） |

**會話管理：**
- 使用者閒置超過 `timeoutMinutes` 後，會話會被標記為過期
- 每 `cleanupIntervalMinutes` 會自動清理過期會話
- 使用 `/reset` 命令可手動重設會話

### Web 控制面板設定
| 選項 | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| `web.port` | `number` | `3000` | Web 控制面板埠口 |
| `web.enabled` | `boolean` | `true` | 是否啟用 Web 控制面板 |

**Web 控制面板功能：**
- 狀態監控：`http://localhost:3000/api/status`
- 會話列表：`http://localhost:3000/api/sessions`
- 健康檢查：`http://localhost:3000/health`

### 工作目錄設定
| 選項 | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| `workspace` | `string` | `./workspace` | 工作目錄路徑 |

**工作目錄結構：**
```
workspace/
├── user1/          # 使用者 1 的工作目錄
│   ├── project1/   # 專案 1
│   └── project2/   # 專案 2
├── user2/          # 使用者 2 的工作目錄
└── shared/         # 共享目錄
```

### 日誌設定
| 選項 | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| `logLevel` | `string` | `"info"` | 日誌等級：debug, info, warn, error |

**日誌等級說明：**
- `debug`: 詳細除錯資訊（開發用）
- `info`: 一般資訊（預設）
- `warn`: 警告訊息
- `error`: 錯誤訊息

## 設定範例

### 開發環境設定
```json
// config.json
{
  "telegram": {
    "token": "your_telegram_bot_token_here",
    "adminUsers": ["5877548123"]
  },
  "github": {
    "token": "ghp_your_github_token_here"
  },
  "codex": {
    "timeout": 120000,
    "model": "gpt-5.4"
  },
  "session": {
    "timeoutMinutes": 30,
    "cleanupIntervalMinutes": 15
  },
  "web": {
    "port": 3000,
    "enabled": true
  },
  "workspace": "./workspace",
  "logLevel": "debug"
}
```

### 生產環境設定
```json
// config.json
{
  "telegram": {
    "token": "從環境變數載入",
    "adminUsers": ["管理員ID"]
  },
  "github": {
    "token": "從環境變數載入"
  },
  "codex": {
    "timeout": 300000,
    "model": "gpt-5.4"
  },
  "session": {
    "timeoutMinutes": 120,
    "cleanupIntervalMinutes": 60
  },
  "web": {
    "port": 8080,
    "enabled": true
  },
  "workspace": "/var/lib/opencodexgateway/workspace",
  "logLevel": "info"
}
```

```bash
# .env
TELEGRAM_BOT_TOKEN=生產環境_token
GH_TOKEN=生產環境_github_token
WORKING_DIR=/var/lib/opencodexgateway/workspace
LOG_LEVEL=info
PORT=8080
NODE_ENV=production
```

## 設定驗證

### 自動驗證
應用程式啟動時會自動驗證必要設定：
```javascript
// 必要設定檢查
if (!config.telegram.token) {
  logger.error('❌ 缺少 TELEGRAM_BOT_TOKEN');
  process.exit(1);
}

if (!config.github.token) {
  logger.warn('⚠️ 未設定 GH_TOKEN，GitHub 功能不可用');
}
```

### 手動驗證
```bash
# 檢查設定檔語法
npx jsonlint config.json

# 檢查環境變數
node -e "require('dotenv').config(); console.log(process.env.TELEGRAM_BOT_TOKEN ? '✅ Telegram token 已設定' : '❌ Telegram token 未設定')"
```

## 動態設定更新

### 重新載入設定
```bash
# 傳送 SIGHUP 信號重新載入設定
kill -HUP $(pidof node)
```

### 設定變更監控
應用程式會監控 `config.json` 檔案變更，自動重新載入設定（開發模式）。

## 安全性設定

### 敏感資訊保護
```json
// ❌ 不要將敏感資訊寫在 config.json 中
{
  "telegram": {
    "token": "硬編碼的_token"  // 不安全！
  }
}

// ✅ 使用環境變數
{
  "telegram": {
    "token": "從環境變數載入"  // 安全
  }
}
```

### 檔案權限設定
```bash
# 設定適當的檔案權限
chmod 600 .env
chmod 644 config.json
chmod 700 workspace

# 使用非 root 使用者
useradd -r -s /bin/false opencodex
chown -R opencodex:opencodex /opt/opencodexgateway
```

### 網路安全設定
```json
{
  "web": {
    "port": 3000,
    "enabled": true,
    "host": "127.0.0.1"  // 只監聽本地迴圈
  }
}
```

## 故障排除

### 常見設定問題

#### 1. Token 無效
```
❌ 錯誤：Unauthorized
✅ 解決：檢查 token 是否過期或權限不足
```

#### 2. 設定檔語法錯誤
```
❌ 錯誤：Unexpected token in JSON
✅ 解決：使用 jsonlint 驗證 JSON 語法
```

#### 3. 環境變數未載入
```
❌ 錯誤：環境變數為 undefined
✅ 解決：確認 .env 檔案存在且格式正確
```

#### 4. 工作目錄權限不足
```
❌ 錯誤：EACCES: permission denied
✅ 解決：檢查工作目錄讀寫權限
```

### 除錯模式
```bash
# 啟用詳細日誌
export LOG_LEVEL=debug
npm start

# 檢查載入的設定
curl http://localhost:3000/api/status | jq
```

## 進階設定

### 自訂命令別名
```json
{
  "commands": {
    "aliases": {
      "ll": "ls -la",
      "code": "cat"
    }
  }
}
```

### 外掛系統設定
```json
{
  "plugins": {
    "enabled": ["github", "codex", "filesystem"],
    "github": {
      "apiUrl": "https://api.github.com",
      "timeout": 10000
    }
  }
}
```

### 速率限制設定
```json
{
  "rateLimit": {
    "telegram": {
      "messagesPerMinute": 30,
      "commandsPerMinute": 10
    },
    "github": {
      "requestsPerHour": 5000
    }
  }
}
```

## 設定最佳實踐

### 1. 使用版本控制
```bash
# 將設定範例加入版本控制
git add .env.example config.example.json

# 忽略實際設定檔
echo ".env" >> .gitignore
echo "config.json" >> .gitignore
```

### 2. 分離環境設定
```bash
# 建立不同環境的設定檔
.env.development
.env.staging
.env.production

# 根據環境載入
NODE_ENV=production npm start
```

### 3. 定期備份設定
```bash
# 自動備份設定檔
cp config.json config-backup-$(date +%Y%m%d).json
cp .env .env-backup-$(date +%Y%m%d)
```

### 4. 設定審查
定期審查設定檔：
- 移除未使用的設定
- 更新過期的 token
- 檢查安全性設定

---

**相關文件**：
- [部署指南](./DEPLOYMENT.md)
- [API 文件](./API.md)
- [命令參考](./COMMANDS.md)

**更新記錄**：
- v0.1.0 (2026-04-22): 初始版本