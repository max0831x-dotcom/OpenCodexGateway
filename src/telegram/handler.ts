/**
 * Telegram 命令處理器
 * 管理所有命令的解析、驗證和處理
 */

import { Logger } from '../utils/logger';
import { CommandDefinition, CommandCategory, COMMANDS } from './commands';

export interface CommandContext {
  chatId: number;
  userId: string;
  userName: string;
  messageId: number;
  args: string[];
  rawText: string;
}

export interface CommandResult {
  text: string;
  options?: {
    parse_mode?: 'Markdown' | 'HTML';
    reply_to_message_id?: number;
  };
}

export class CommandHandler {
  private logger: Logger;
  private commands: Map<string, CommandDefinition> = new Map();

  constructor() {
    this.logger = new Logger('CommandHandler');
    this.registerCommands();
  }

  private registerCommands(): void {
    COMMANDS.forEach((cmd) => {
      this.commands.set(cmd.name, cmd);
      cmd.aliases?.forEach((alias) => {
        this.commands.set(alias, cmd);
      });
    });
  }

  /**
   * 解析命令
   */
  parse(text: string): { command: string; args: string[] } | null {
    if (!text.startsWith('/')) return null;

    const parts = text.slice(1).split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    return { command, args };
  }

  /**
   * 取得命令定義
   */
  getDefinition(name: string): CommandDefinition | undefined {
    return this.commands.get(name);
  }

  /**
   * 取得命令分類列表
   */
  getCommandsByCategory(): Map<CommandCategory, CommandDefinition[]> {
    const categorized = new Map<CommandCategory, CommandDefinition[]>();

    this.commands.forEach((cmd) => {
      // 跳過別名
      if (cmd.aliases?.includes(cmd.name)) return;

      const list = categorized.get(cmd.category) || [];
      list.push(cmd);
      categorized.set(cmd.category, list);
    });

    return categorized;
  }

  /**
   * 取得幫助文字
   */
  getHelpText(): string {
    const categorized = this.getCommandsByCategory();
    const lines: string[] = ['📋 *可用命令*\n'];

    const categoryNames: Record<CommandCategory, string> = {
      basic: '基本',
      codex: 'Codex',
      github: 'GitHub',
      file: '檔案',
      system: '系統',
    };

    categorized.forEach((cmds, category) => {
      const name = categoryNames[category] || category;
      lines.push(`*${name}*`);
      cmds.forEach((cmd) => {
        const usage = cmd.usage || `/${cmd.name}`;
        lines.push(`  \`${usage}\` - ${cmd.description}`);
      });
      lines.push('');
    });

    lines.push('💡 直接傳送訊息給 Codex 處理！');
    return lines.join('\n');
  }
}
