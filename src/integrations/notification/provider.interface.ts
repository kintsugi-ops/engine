import type { ParsedError } from '../../types/error.js'
import type { EngineResult } from '../../types/result.js'

/** 알림 provider가 구현해야 하는 인터페이스 */
export interface NotificationProvider {
  notify(result: EngineResult, error: ParsedError): Promise<void>
}
