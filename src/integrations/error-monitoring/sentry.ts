import { z } from 'zod'
import type { ErrorMonitoringProvider } from './provider.interface.js'
import type { ParsedError, AffectedFile } from '../../types/index.js'

// ─────────────────────────────────────────
// Sentry Error Webhook payload의 zod 스키마
// 필요한 필드만 정의 (Sentry payload는 훨씬 크지만, 우리가 쓰는 것만 검증)
// ─────────────────────────────────────────

const SentryFrameSchema = z.object({
  filename: z.string().optional(),
  abs_path: z.string().optional(),
  lineno: z.number().optional(),
  colno: z.number().optional(),
  function: z.string().optional(),
  context_line: z.string().optional(),
  pre_context: z.array(z.string()).optional(),
  post_context: z.array(z.string()).optional(),
  in_app: z.boolean().optional(),
})

const SentryExceptionValueSchema = z.object({
  type: z.string().optional(),
  value: z.string().optional(),
  stacktrace: z.object({
    frames: z.array(SentryFrameSchema),
  }).optional(),
})

const SentryErrorWebhookSchema = z.object({
  action: z.string(),
  data: z.object({
    error: z.object({
      event_id: z.string(),
      issue_id: z.string().optional(),
      title: z.string().optional(),
      web_url: z.string().optional(),
      issue_url: z.string().optional(),
      exception: z.object({
        values: z.array(SentryExceptionValueSchema),
      }).optional(),
      tags: z.array(z.tuple([z.string(), z.string()])).optional(),
      timestamp: z.number().or(z.string()),
      level: z.string().optional(),
    }),
  }),
})

type SentryFrame = z.infer<typeof SentryFrameSchema>

// ─────────────────────────────────────────
// Sentry 어댑터 구현
// ─────────────────────────────────────────

export class SentryProvider implements ErrorMonitoringProvider {

  parse(rawPayload: unknown): ParsedError {
    const payload = SentryErrorWebhookSchema.parse(rawPayload)
    const error = payload.data.error

    const exceptionValues = error.exception?.values ?? []
    const primaryException = exceptionValues[0]

    return {
      id: error.event_id,
      title: error.title ?? primaryException?.type ?? 'Unknown Error',
      message: primaryException?.value ?? '',
      stackTrace: this.buildStackTraceString(exceptionValues),
      affectedFiles: this.extractAffectedFiles(exceptionValues),
      environment: this.extractTag(error.tags, 'environment') ?? 'unknown',
      level: this.normalizeLevel(error.level),
      timestamp: String(error.timestamp),
      sourceUrl: error.web_url,
    }
  }

  /** exception values에서 스택 트레이스 텍스트 조립 */
  private buildStackTraceString(
    values: z.infer<typeof SentryExceptionValueSchema>[]
  ): string {
    const parts: string[] = []

    for (const ex of values) {
      if (ex.type || ex.value) {
        parts.push(`${ex.type ?? 'Error'}: ${ex.value ?? ''}`)
      }
      const frames = ex.stacktrace?.frames ?? []
      // Sentry frames는 역순 (가장 안쪽 호출이 마지막), 뒤집어서 사람이 읽기 쉽게
      for (const frame of [...frames].reverse()) {
        const location = frame.filename ?? frame.abs_path ?? '<unknown>'
        const line = frame.lineno ? `:${frame.lineno}` : ''
        const fn = frame.function ? ` in ${frame.function}` : ''
        parts.push(`  at ${location}${line}${fn}`)
      }
    }

    return parts.join('\n')
  }

  /** in_app: true인 frame에서 AffectedFile 추출 */
  private extractAffectedFiles(
    values: z.infer<typeof SentryExceptionValueSchema>[]
  ): AffectedFile[] {
    const seen = new Set<string>()
    const files: AffectedFile[] = []

    for (const ex of values) {
      const frames = ex.stacktrace?.frames ?? []
      for (const frame of frames) {
        if (!frame.in_app) continue

        const path = frame.filename ?? frame.abs_path
        if (!path) continue

        // 같은 파일 중복 방지
        const key = `${path}:${frame.lineno ?? 0}`
        if (seen.has(key)) continue
        seen.add(key)

        files.push({
          path,
          lineNumber: frame.lineno,
          snippet: this.buildSnippet(frame),
        })
      }
    }

    return files
  }

  /** frame의 context_line + pre/post_context로 코드 스니펫 조립 */
  private buildSnippet(frame: SentryFrame): string | undefined {
    if (!frame.context_line) return undefined

    const lines: string[] = []
    if (frame.pre_context) lines.push(...frame.pre_context)
    lines.push(frame.context_line)
    if (frame.post_context) lines.push(...frame.post_context)

    return lines.join('\n')
  }

  /** tags 배열에서 특정 key의 값 추출 */
  private extractTag(
    tags: [string, string][] | undefined,
    key: string
  ): string | undefined {
    if (!tags) return undefined
    const found = tags.find(([k]) => k === key)
    return found?.[1]
  }

  /** Sentry level을 우리 타입으로 정규화 */
  private normalizeLevel(level: string | undefined): 'fatal' | 'error' {
    if (level === 'fatal') return 'fatal'
    return 'error'
  }
}
