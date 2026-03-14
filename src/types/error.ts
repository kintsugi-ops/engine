/** 에러가 발생한 파일 정보 */
export interface AffectedFile {
  path: string        // e.g. "src/controllers/UserController.java"
  lineNumber?: number
  snippet?: string    // 에러 주변 코드 일부
}

/** 에러 모니터링 도구(Sentry 등)에서 파싱된 정규화된 에러 */
export interface ParsedError {
  id: string
  title: string
  message: string
  stackTrace: string            // 항상 존재
  affectedFiles: AffectedFile[] // 파싱 성공 시 채워짐, 실패 시 빈 배열
  environment: string
  level: 'fatal' | 'error'
  timestamp: string
  sourceUrl?: string            // Sentry 이슈 링크 등
}
