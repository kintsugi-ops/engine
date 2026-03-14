import type { ParsedError } from '../../types/error.js'
import type { FileContent } from '../../types/github.js'
import type { FixProposal } from '../../types/fix.js'

/** AI provider가 구현해야 하는 인터페이스 */
export interface AIProvider {
  /** 1단계: 에러 + 파일 트리 → 읽어야 할 파일 경로 목록 */
  analyzeError(error: ParsedError, fileTree: string[]): Promise<string[]>

  /** 2단계: 에러 + 소스코드 → 수정안 생성 */
  generateFix(error: ParsedError, sourceFiles: FileContent[]): Promise<FixProposal>
}
