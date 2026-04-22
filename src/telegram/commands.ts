/**
 * 命令定義
 * 所有可用命令的結構定義
 */

export type CommandCategory = 'basic' | 'codex' | 'github' | 'file' | 'system';

export interface CommandDefinition {
  name: string;
  aliases?: string[];
  description: string;
  usage?: string;
  category: CommandCategory;
  adminOnly?: boolean;
}

export const COMMANDS: CommandDefinition[] = [
  // ===== 基本命令 =====
  {
    name: 'start',
    aliases: ['hello', 'hi'],
    description: '開始使用',
    usage: '/start',
    category: 'basic',
  },
  {
    name: 'help',
    aliases: ['?', 'commands'],
    description: '顯示所有命令',
    usage: '/help',
    category: 'basic',
  },
  {
    name: 'setcwd',
    description: '設定工作目錄',
    usage: '/setcwd <路徑>',
    category: 'basic',
  },
  {
    name: 'getcwd',
    aliases: ['pwd', 'cwd'],
    description: '顯示目前目錄',
    usage: '/getcwd',
    category: 'basic',
  },
  {
    name: 'reset',
    aliases: ['clear', 'new'],
    description: '重設會話',
    usage: '/reset',
    category: 'basic',
  },
  {
    name: 'status',
    aliases: ['stats', 'info'],
    description: '顯示系統狀態',
    usage: '/status',
    category: 'basic',
  },

  // ===== Codex 命令 =====
  {
    name: 'model',
    description: '切換 Codex 模型',
    usage: '/model <模型名稱>',
    category: 'codex',
  },
  {
    name: 'threads',
    description: '顯示活躍執行緒',
    usage: '/threads',
    category: 'codex',
  },
  {
    name: 'retry',
    description: '重新執行上一次請求',
    usage: '/retry',
    category: 'codex',
  },

  // ===== GitHub 命令 =====
  {
    name: 'gh_clone',
    description: '克隆 GitHub 倉庫',
    usage: '/gh_clone <倉庫網址>',
    category: 'github',
  },
  {
    name: 'gh_commit',
    description: '提交變更',
    usage: '/gh_commit <提交訊息>',
    category: 'github',
  },
  {
    name: 'gh_push',
    description: '推送到遠端',
    usage: '/gh_push',
    category: 'github',
  },
  {
    name: 'gh_pull',
    description: '從遠端拉取',
    usage: '/gh_pull',
    category: 'github',
  },
  {
    name: 'gh_status',
    aliases: ['git-status'],
    description: '顯示 Git 狀態',
    usage: '/gh_status',
    category: 'github',
  },
  {
    name: 'gh_create_repo',
    description: '建立新倉庫',
    usage: '/gh_create_repo <名稱>',
    category: 'github',
  },
  {
    name: 'gh_list_repos',
    aliases: ['gh_repos'],
    description: '列出倉庫',
    usage: '/gh_list_repos',
    category: 'github',
  },
  {
    name: 'gh_branch',
    description: '切換/建立分支',
    usage: '/gh_branch <分支名稱>',
    category: 'github',
  },
  {
    name: 'gh_log',
    description: '顯示提交歷史',
    usage: '/gh_log [數量]',
    category: 'github',
  },
  {
    name: 'gh_diff',
    description: '顯示檔案差異',
    usage: '/gh_diff [檔案]',
    category: 'github',
  },

  // ===== 檔案命令 =====
  {
    name: 'ls',
    aliases: ['dir', 'files'],
    description: '列出目錄內容',
    usage: '/ls [路徑]',
    category: 'file',
  },
  {
    name: 'cat',
    description: '顯示檔案內容',
    usage: '/cat <檔案路徑>',
    category: 'file',
  },
  {
    name: 'find',
    aliases: ['search', 'grep'],
    description: '搜尋檔案內容',
    usage: '/find <關鍵字> [路徑]',
    category: 'file',
  },
  {
    name: 'mkdir',
    description: '建立目錄',
    usage: '/mkdir <目錄路徑>',
    category: 'file',
  },
  {
    name: 'touch',
    description: '建立空檔案',
    usage: '/touch <檔案路徑>',
    category: 'file',
  },
  {
    name: 'rm',
    description: '刪除檔案或目錄',
    usage: '/rm <路徑>',
    category: 'file',
  },
  {
    name: 'mv',
    description: '移動/重新命名',
    usage: '/mv <來源> <目標>',
    category: 'file',
  },
  {
    name: 'cp',
    description: '複製檔案',
    usage: '/cp <來源> <目標>',
    category: 'file',
  },

  // ===== 系統命令 =====
  {
    name: 'uptime',
    description: '顯示系統運行時間',
    usage: '/uptime',
    category: 'system',
  },
  {
    name: 'memory',
    aliases: ['mem'],
    description: '顯示記憶體使用',
    usage: '/memory',
    category: 'system',
  },
  {
    name: 'disk',
    description: '顯示磁碟使用',
    usage: '/disk',
    category: 'system',
  },
  {
    name: 'env',
    description: '顯示環境變數（敏感資訊隱藏）',
    usage: '/env',
    category: 'system',
    adminOnly: true,
  },
];
