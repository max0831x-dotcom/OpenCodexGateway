import path from 'path';
import fs from 'fs';

export interface AppConfig {
  telegram: {
    token: string;
    adminUsers: string[];
  };
  github: {
    token: string;
  };
  codex: {
    timeout: number;
    model: string;
  };
  session: {
    timeoutMinutes: number;
    cleanupIntervalMinutes: number;
  };
  web: {
    port: number;
    enabled: boolean;
  };
  workspace: string;
  logLevel: string;
}

const DEFAULT_CONFIG: AppConfig = {
  telegram: {
    token: '',
    adminUsers: [],
  },
  github: {
    token: '',
  },
  codex: {
    timeout: 300000,
    model: 'gpt-5.4',
  },
  session: {
    timeoutMinutes: 60,
    cleanupIntervalMinutes: 30,
  },
  web: {
    port: 3000,
    enabled: true,
  },
  workspace: path.resolve(process.cwd(), 'workspace'),
  logLevel: 'info',
};

export class ConfigManager {
  private config: AppConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): AppConfig {
    const config = { ...DEFAULT_CONFIG };

    // 1. 從設定檔載入（如果存在）
    const configPath = path.resolve(process.cwd(), 'config.json');
    if (fs.existsSync(configPath)) {
      try {
        const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        Object.assign(config, fileConfig);
      } catch (error) {
        console.warn('⚠️ 無法讀取 config.json，使用預設值');
      }
    }

    // 2. 從環境變數覆蓋
    if (process.env.TELEGRAM_BOT_TOKEN) {
      config.telegram.token = process.env.TELEGRAM_BOT_TOKEN;
    }
    if (process.env.GH_TOKEN) {
      config.github.token = process.env.GH_TOKEN;
    }
    if (process.env.LOG_LEVEL) {
      config.logLevel = process.env.LOG_LEVEL;
    }
    if (process.env.WORKING_DIR) {
      config.workspace = path.resolve(process.env.WORKING_DIR);
    }
    if (process.env.PORT) {
      config.web.port = parseInt(process.env.PORT, 10);
    }

    // 3. 驗證必要設定
    this.validateConfig(config);

    return config;
  }

  private validateConfig(config: AppConfig): void {
    const missing: string[] = [];
    if (!config.telegram.token) missing.push('TELEGRAM_BOT_TOKEN');
    if (!config.github.token) missing.push('GH_TOKEN');

    if (missing.length > 0) {
      console.warn(`⚠️ 缺少環境變數：${missing.join(', ')}`);
      console.warn('請設定 .env 檔案或環境變數');
    }
  }

  get(): AppConfig {
    return this.config;
  }

  save(): void {
    const configPath = path.resolve(process.cwd(), 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2), 'utf-8');
    console.log(`✅ 設定已儲存到 ${configPath}`);
  }

  generateEnvExample(): void {
    const envPath = path.resolve(process.cwd(), '.env.example');
    const content = `# Telegram Bot Token（必填）
TELEGRAM_BOT_TOKEN=

# GitHub Personal Access Token（必填）
GH_TOKEN=

# Codex 設定
CODEX_ACCESS_TOKEN=
CODEX_REFRESH_TOKEN=
CODEX_ACCOUNT_ID=

# 應用設定
WORKING_DIR=./workspace
LOG_LEVEL=info
PORT=3000
`;
    fs.writeFileSync(envPath, content, 'utf-8');
    console.log(`✅ .env.example 已產生`);
  }
}
