import simpleGit, { SimpleGit } from 'simple-git';
import { Octokit } from '@octokit/rest';
import { Logger } from '../utils/logger';

export class GitHubService {
  private octokit: Octokit;
  private logger: Logger;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
    this.logger = new Logger('GitHubService');
  }

  async clone(repoUrl: string, targetDir: string): Promise<string> {
    const git = simpleGit();
    const repoName = repoUrl.split('/').pop()?.replace('.git', '') || 'repo';
    const clonePath = `${targetDir}/${repoName}`;

    await git.clone(repoUrl, clonePath);
    return clonePath;
  }

  async commit(message: string): Promise<string> {
    const git = simpleGit();
    await git.add('.');
    const result = await git.commit(message);
    return `提交完成：${result.commit}`;
  }

  async push(): Promise<string> {
    const git = simpleGit();
    await git.push();
    return '推送完成';
  }

  async pull(): Promise<string> {
    const git = simpleGit();
    await git.pull();
    return '拉取完成';
  }

  async status(): Promise<string> {
    const git = simpleGit();
    const status = await git.status();

    const lines: string[] = [];
    lines.push(`分支：\`${status.current}\``);
    lines.push(`變更檔案：${status.files.length}`);

    if (status.created.length > 0) {
      lines.push(`\n🆕 *新增*`);
      status.created.forEach(f => lines.push(`  - \`${f.path}\``));
    }

    if (status.modified.length > 0) {
      lines.push(`\n✏️ *修改*`);
      status.modified.forEach(f => lines.push(`  - \`${f.path}\``));
    }

    if (status.deleted.length > 0) {
      lines.push(`\n🗑️ *刪除*`);
      status.deleted.forEach(f => lines.push(`  - \`${f.path}\``));
    }

    if (status.files.length === 0) {
      lines.push('\n✅ 工作目錄乾淨');
    }

    return lines.join('\n');
  }

  async createRepository(name: string, isPrivate: boolean = true): Promise<{ html_url: string; name: string }> {
    const response = await this.octokit.repos.createForAuthenticatedUser({
      name,
      private: isPrivate,
      auto_init: true,
    });
    return {
      html_url: response.data.html_url,
      name: response.data.name,
    };
  }

  async listRepositories(): Promise<string[]> {
    const response = await this.octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      direction: 'desc',
      per_page: 20,
    });
    return response.data.map(repo => repo.full_name);
  }

  async getUserInfo(): Promise<{ login: string; name: string | null }> {
    const response = await this.octokit.users.getAuthenticated();
    return {
      login: response.data.login,
      name: response.data.name,
    };
  }
}
