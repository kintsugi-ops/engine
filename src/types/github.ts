/** GitHub에서 읽어온 파일 */
export interface FileContent {
  path: string
  content: string
  sha: string   // 파일 수정 시 GitHub API에 다시 전달 필요
}

/** 생성된 PR 정보 */
export interface CreatedPR {
  number: number
  url: string
  branchName: string
  title: string
}
