import type { ParsedError } from '../../types/error.js'

/** 에러 모니터링 provider가 구현해야 하는 인터페이스 */
export interface ErrorMonitoringProvider {
  parse(rawPayload: unknown): ParsedError
}
