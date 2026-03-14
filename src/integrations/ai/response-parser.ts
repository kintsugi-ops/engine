import { z } from 'zod'
import type { FileContent } from '../../types/github.js'
import type { FixProposal } from '../../types/fix.js'

// ─────────────────────────────────────────
// AI 응답 JSON 파싱 + 검증
// ─────────────────────────────────────────

const AnalyzeResponseSchema = z.object({
  filePaths: z.array(z.string()),
  reasoning: z.string().optional(),
})

const FixResponseSchema = z.object({
  rootCause: z.string(),
  explanation: z.string(),
  changes: z.array(z.object({
    path: z.string(),
    newContent: z.string(),
  })),
  confidence: z.enum(['high', 'medium', 'low']),
})

/** AI 응답 텍스트에서 JSON 블록 추출 */
function extractJson(text: string): string {
  // ```json ... ``` 블록이 있으면 그 안의 내용만 추출
  const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)```/)
  if (jsonBlockMatch) return jsonBlockMatch[1].trim()

  // 그냥 JSON이면 그대로
  const jsonMatch = text.match(/\{[\s\S]*}/)
  if (jsonMatch) return jsonMatch[0]

  throw new Error('AI response does not contain valid JSON')
}

/** 1단계 응답 파싱: 파일 경로 목록 */
export function parseAnalyzeResponse(rawText: string): string[] {
  const json = JSON.parse(extractJson(rawText))
  const result = AnalyzeResponseSchema.parse(json)
  return result.filePaths
}

/** 2단계 응답 파싱: 수정안 → FixProposal */
export function parseFixResponse(rawText: string, sourceFiles: FileContent[]): FixProposal {
  const json = JSON.parse(extractJson(rawText))
  const result = FixResponseSchema.parse(json)

  // AI가 리턴한 changes에 originalContent 채워넣기
  const changes = result.changes.map((change) => {
    const original = sourceFiles.find((f) => f.path === change.path)
    return {
      path: change.path,
      originalContent: original?.content ?? '',
      newContent: change.newContent,
    }
  })

  return {
    rootCause: result.rootCause,
    explanation: result.explanation,
    changes,
    confidence: result.confidence,
  }
}
