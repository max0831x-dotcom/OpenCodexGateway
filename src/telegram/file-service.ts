/**
 * 檔案操作服務
 * 處理檔案和目錄的讀寫操作
 */

import fs from 'fs';
import path from 'path';
import { Logger } from '../utils/logger';

export class FileService {
  private workspace: string;
  private logger: Logger;

  constructor(workspace: string) {
    this.workspace = workspace;
    this.logger = new Logger('FileService');
  }

  /**
   * 解析路徑（相對於 workspace）
   */
  resolvePath(inputPath: string): string {
    if (inputPath.startsWith('/')) {
      return inputPath;
    }
    return path.resolve(this.workspace, inputPath);
  }

  /**
   * 列出目錄內容
   */
  listDirectory(dirPath: string): string {
    const fullPath = this.resolvePath(dirPath);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`目錄不存在：${dirPath}`);
    }

    const stat = fs.statSync(fullPath);
    if (!stat.isDirectory()) {
      throw new Error(`不是目錄：${dirPath}`);
    }

    const items = fs.readdirSync(fullPath);
    const lines: string[] = [];
    lines.push(`📁 ${dirPath}\n`);

    items.forEach((item) => {
      const itemPath = path.join(fullPath, item);
      const itemStat = fs.statSync(itemPath);
      const isDir = itemStat.isDirectory();
      const size = this.formatSize(itemStat.size);
      const icon = isDir ? '📁' : '📄';
      const name = isDir ? `${item}/` : item;
      lines.push(`${icon} \`${name}\`${' '.repeat(Math.max(1, 30 - name.length))}${size}`);
    });

    if (items.length === 0) {
      lines.push('（空目錄）');
    }

    return lines.join('\n');
  }

  /**
   * 讀取檔案內容
   */
  readFile(filePath: string): string {
    const fullPath = this.resolvePath(filePath);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`檔案不存在：${filePath}`);
    }

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      throw new Error(`不是檔案：${filePath}`);
    }

    // 限制檔案大小（1MB）
    if (stat.size > 1024 * 1024) {
      throw new Error(`檔案太大（${this.formatSize(stat.size)}），無法顯示`);
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');
    const maxLines = 200;

    // 如果檔案太長，只顯示前 200 行
    if (lines.length > maxLines) {
      const truncated = lines.slice(0, maxLines).join('\n');
      return `\`${filePath}\`（${lines.length} 行，顯示前 ${maxLines} 行）\n\n${truncated}\n\n... ${lines.length - maxLines} 行已省略`;
    }

    return `\`${filePath}\`（${lines.length} 行）\n\n${content}`;
  }

  /**
   * 建立目錄
   */
  createDirectory(dirPath: string): string {
    const fullPath = this.resolvePath(dirPath);

    if (fs.existsSync(fullPath)) {
      throw new Error(`目錄已存在：${dirPath}`);
    }

    fs.mkdirSync(fullPath, { recursive: true });
    return `✅ 已建立目錄：\`${dirPath}\``;
  }

  /**
   * 建立檔案
   */
  createFile(filePath: string): string {
    const fullPath = this.resolvePath(filePath);

    if (fs.existsSync(fullPath)) {
      throw new Error(`檔案已存在：${filePath}`);
    }

    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, '', 'utf-8');
    return `✅ 已建立檔案：\`${filePath}\``;
  }

  /**
   * 搜尋檔案內容
   */
  searchFiles(keyword: string, searchPath: string = '.'): string {
    const fullPath = this.resolvePath(searchPath);
    const results: { file: string; line: number; content: string }[] = [];

    function walk(dir: string): void {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);

        // 跳過 node_modules 和 .git
        if (entry.name === 'node_modules' || entry.name === '.git') continue;

        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.isFile()) {
          try {
            const content = fs.readFileSync(full, 'utf-8');
            const lines = content.split('\n');
            lines.forEach((line, i) => {
              if (line.toLowerCase().includes(keyword.toLowerCase())) {
                results.push({
                  file: full.replace(fullPath, '').slice(1),
                  line: i + 1,
                  content: line.trim().slice(0, 100),
                });
              }
            });
          } catch {
            // 無法讀取的檔案跳過
          }
        }
      }
    }

    walk(fullPath);

    if (results.length === 0) {
      return `🔍 未找到包含「${keyword}」的檔案`;
    }

    const lines: string[] = [`🔍 找到 ${results.length} 個結果：\n`];
    results.slice(0, 30).forEach((r) => {
      lines.push(`\`${r.file}:${r.line}\``);
      lines.push(`  ${r.content}`);
    });

    if (results.length > 30) {
      lines.push(`\n... 還有 ${results.length - 30} 個結果`);
    }

    return lines.join('\n');
  }

  /**
   * 格式化檔案大小
   */
  private formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  }
}
