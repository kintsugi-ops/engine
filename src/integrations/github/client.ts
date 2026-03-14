import { Octokit } from '@octokit/rest'
import type { FileContent, CreatedPR } from '../../types/index.js'

export interface GitHubClientConfig {
  token: string
  owner: string
  repo: string
  baseBranch?: string
}

export class GitHubClient {
  private octokit: Octokit
  private owner: string
  private repo: string
  private baseBranch: string

  constructor(config: GitHubClientConfig) {
    this.octokit = new Octokit({ auth: config.token })
    this.owner = config.owner
    this.repo = config.repo
    this.baseBranch = config.baseBranch ?? 'main'
  }

  /** 레포 파일 트리 가져오기 (소스코드 확장자만 필터링) */
  async getFileTree(): Promise<string[]> {
    const { data } = await this.octokit.git.getTree({
      owner: this.owner,
      repo: this.repo,
      tree_sha: this.baseBranch,
      recursive: 'true',
    })

    return data.tree
      .filter((item) => item.type === 'blob' && item.path)
      .map((item) => item.path!)
      .filter((path) => this.isSourceFile(path))
  }

  /** 특정 파일의 내용 + sha 읽기 */
  async getFileContent(path: string): Promise<FileContent> {
    const { data } = await this.octokit.repos.getContent({
      owner: this.owner,
      repo: this.repo,
      path,
      ref: this.baseBranch,
    })

    if (Array.isArray(data) || data.type !== 'file') {
      throw new Error(`Path is not a file: ${path}`)
    }

    const content = Buffer.from(data.content, 'base64').toString('utf-8')

    return {
      path,
      content,
      sha: data.sha,
    }
  }

  /** 여러 파일을 한번에 읽기 */
  async getFileContents(paths: string[]): Promise<FileContent[]> {
    return Promise.all(paths.map((path) => this.getFileContent(path)))
  }

  /** baseBranch 기준으로 새 브랜치 생성 */
  async createBranch(branchName: string): Promise<void> {
    const { data: ref } = await this.octokit.git.getRef({
      owner: this.owner,
      repo: this.repo,
      ref: `heads/${this.baseBranch}`,
    })

    await this.octokit.git.createRef({
      owner: this.owner,
      repo: this.repo,
      ref: `refs/heads/${branchName}`,
      sha: ref.object.sha,
    })
  }

  /** 브랜치에 파일 수정 커밋 */
  async updateFile(
    branchName: string,
    path: string,
    content: string,
    sha: string,
    commitMessage: string,
  ): Promise<void> {
    await this.octokit.repos.createOrUpdateFileContents({
      owner: this.owner,
      repo: this.repo,
      path,
      message: commitMessage,
      content: Buffer.from(content).toString('base64'),
      sha,
      branch: branchName,
    })
  }

  /** PR 생성 */
  async createPullRequest(
    branchName: string,
    title: string,
    body: string,
  ): Promise<CreatedPR> {
    const { data } = await this.octokit.pulls.create({
      owner: this.owner,
      repo: this.repo,
      title,
      body,
      head: branchName,
      base: this.baseBranch,
    })

    return {
      number: data.number,
      url: data.html_url,
      branchName,
      title,
    }
  }

  /** 소스코드 파일인지 확장자로 판단 */
  private isSourceFile(path: string): boolean {
    const sourceExtensions = [
      '.ts', '.tsx', '.js', '.jsx',
      '.java', '.kt',
      '.py',
      '.go',
      '.rs',
      '.rb',
      '.php',
      '.cs',
      '.swift',
      '.c', '.cpp', '.h',
    ]

    // node_modules, dist 등 제외
    if (path.includes('node_modules/')) return false
    if (path.includes('dist/')) return false
    if (path.includes('.min.')) return false

    return sourceExtensions.some((ext) => path.endsWith(ext))
  }
}
