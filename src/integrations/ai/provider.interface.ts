import type { ParsedError } from '../../types/error.js'
import type { FileContent } from '../../types/github.js'
import type { FixProposal } from '../../types/fix.js'

/** AI provider가 구현해야 하는 인터페이스 */
export interface AIProvider {
  generateFix(error: ParsedError, sourceFiles: FileContent[]): Promise<FixProposal>
}
