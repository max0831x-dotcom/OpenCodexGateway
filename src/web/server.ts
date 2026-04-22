import express from 'express';
import http from 'http';
import { SessionManager } from '../session/manager';
import { CodexService } from '../codex/service';
import { GitHubService } from '../github/service';
import { Logger } from '../utils/logger';

export interface WebServerOptions {
  port: number;
  sessionManager: SessionManager;
  codexService: CodexService;
  githubService?: GitHubService;
}

export class WebServer {
  private app: express.Application;
  private server: http.Server;
  private port: number;
  private sessionManager: SessionManager;
  private codexService: CodexService;
  private githubService?: GitHubService;
  private logger: Logger;

  constructor(options: WebServerOptions) {
    this.port = options.port;
    this.sessionManager = options.sessionManager;
    this.codexService = options.codexService;
    this.githubService = options.githubService;
    this.logger = new Logger('WebServer');

    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.server = http.createServer(this.app);
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use((req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      next();
    });
  }

  private setupRoutes(): void {
    // 儀表板
    this.app.get('/api/status', (req, res) => {
      const sessionStats = this.sessionManager.getStats();
      res.json({
        status: 'running',
        uptime: process.uptime(),
        sessions: sessionStats,
        codex: {
          activeThreads: this.codexService.getActiveThreads(),
        },
        github: {
          connected: !!this.githubService,
        },
        memory: process.memoryUsage(),
      });
    });

    // 會話列表
    this.app.get('/api/sessions', (req, res) => {
      const sessions = this.sessionManager.getActiveSessions();
      res.json(sessions);
    });

    // 健康檢查
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // 根路徑
    this.app.get('/', (req, res) => {
      res.json({
        name: 'OpenCodexGateway',
        version: '0.1.0',
        description: 'Telegram ↔ OpenAI Codex Bridge',
        endpoints: {
          status: '/api/status',
          sessions: '/api/sessions',
          health: '/health',
        },
      });
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, '127.0.0.1', () => {
        this.logger.info(`Web 控制面板運行在 http://127.0.0.1:${this.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        resolve();
      });
    });
  }
}
