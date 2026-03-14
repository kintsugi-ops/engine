/** AI가 제안하는 단일 파일 변경 */
export interface FileChange {
  path: string
  originalContent: string
  newContent: string
}

/** AI가 생성한 수정 제안 전체 */
export interface FixProposal {
  rootCause: string       // 에러 원인 설명
  explanation: string     // 수정 방법 설명
  changes: FileChange[]
  confidence: 'high' | 'medium' | 'low'
}
