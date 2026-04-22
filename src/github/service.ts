import simpleGit, { SimpleGit } from 'simple-git';
import { Octokit } from '@octokit/rest';
import { Logger } from '../utils/logger';

export class GitHubService {
  private git: SimpleGit;
  private octokit: Octokit;
  private logger: Logger;
  private workingDir: string;

  constructor(token: string, workingDir: string = process.cwd()) {
    this.workingDir = workingDir;
    this.git = simpleGit(workingDir);
    this.octokit = new Octokit({ auth: token });
    this.logger = new Logger('GitHubService');
  }

  async clone(repoUrl: string): Promise<string> {
    await this.git.clone(repoUrl, this.workingDir);
    return `倉庫已克隆到 ${this.workingDir}`;
  }

  async commit(message: string): Promise<string> {
    await this.git.add('.');
    const result = await this.git.commit(message);
    return `提交完成：${result.commit}`;
  }

  async push(): Promise<string> {
    await this.git.push();
    return '推送完成';
  }

  async pull(): Promise<string> {
    await this.git.pull();
    return '拉取完成';
  }

  async status(): Promise<string> {
    const status = await this.git.status();
    return [
      `分支：${status.current}`,
      `變更檔案：${status.files.length}`,
      `新增：${status.created.length}`,
      `修改：${status.modified.length}`,
      `刪除：${status.deleted.length}`,
    ].join('\n');
  }

  async createRepository(name: string, isPrivate: boolean = true): Promise<{ html_url: string }> {
    const response = await this.octokit.repos.createForAuthenticatedUser({
      name,
      private: isPrivate,
      auto_init: true,
    });
    return { html_url: response.data.html_url };
  }

  async listRepositories(): Promise<string[]> {
    const response = await this.octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      direction: 'desc',
      per_page: 20,
    });
    return response.data.map(repo => repo.full_name);
  }
}
