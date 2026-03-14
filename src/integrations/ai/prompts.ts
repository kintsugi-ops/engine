import type { ParsedError } from '../../types/error.js'
import type { FileContent } from '../../types/github.js'

// ─────────────────────────────────────────
// 1단계: 에러 분석 — 어떤 파일을 읽어야 하는지 판단
// ─────────────────────────────────────────

export const ANALYZE_SYSTEM_PROMPT = `You are a senior software engineer analyzing a production error.
Your task is to determine which source files need to be examined to diagnose and fix the error.

You will receive:
1. Error information (message, stack trace, affected files from stack trace)
2. The repository file tree (list of source file paths)

Based on the error context, select the files that are most likely relevant to diagnosing and fixing the root cause.
Consider:
- Files directly mentioned in the stack trace
- Files that might contain the root cause (e.g., auth modules, config files, service layers)
- Keep the list focused — select only files that are truly necessary

Respond in JSON format:
{
  "filePaths": ["path/to/file1.java", "path/to/file2.java"],
  "reasoning": "Brief explanation of why these files were selected"
}`

export function buildAnalyzeUserPrompt(error: ParsedError, fileTree: string[]): string {
  const parts: string[] = []

  parts.push('## Error Information')
  parts.push(`**Title:** ${error.title}`)
  parts.push(`**Message:** ${error.message}`)
  parts.push(`**Level:** ${error.level}`)
  parts.push(`**Environment:** ${error.environment}`)
  parts.push('')
  parts.push('### Stack Trace')
  parts.push('```')
  parts.push(error.stackTrace)
  parts.push('```')

  if (error.affectedFiles.length > 0) {
    parts.push('')
    parts.push('### Files from Stack Trace (hints)')
    for (const file of error.affectedFiles) {
      const line = file.lineNumber ? `:${file.lineNumber}` : ''
      parts.push(`- ${file.path}${line}`)
    }
  }

  parts.push('')
  parts.push('## Repository File Tree')
  parts.push('```')
  parts.push(fileTree.join('\n'))
  parts.push('```')

  return parts.join('\n')
}

// ─────────────────────────────────────────
// 2단계: 수정안 생성
// ─────────────────────────────────────────

export const FIX_SYSTEM_PROMPT = `You are a senior software engineer fixing a production error.
Your task is to analyze the error and the relevant source code, then generate a fix.

You will receive:
1. Error information (message, stack trace)
2. Source code of the relevant files

Generate a fix that:
- Addresses the root cause, not just the symptoms
- Makes minimal changes — only modify what's necessary
- Maintains the existing code style
- Does not introduce new bugs or break existing functionality

Respond in JSON format:
{
  "rootCause": "Clear explanation of why this error occurs",
  "explanation": "What the fix does and why",
  "changes": [
    {
      "path": "path/to/file.java",
      "newContent": "The complete updated file content with the fix applied"
    }
  ],
  "confidence": "high | medium | low"
}`

export function buildFixUserPrompt(error: ParsedError, sourceFiles: FileContent[]): string {
  const parts: string[] = []

  parts.push('## Error Information')
  parts.push(`**Title:** ${error.title}`)
  parts.push(`**Message:** ${error.message}`)
  parts.push(`**Level:** ${error.level}`)
  parts.push('')
  parts.push('### Stack Trace')
  parts.push('```')
  parts.push(error.stackTrace)
  parts.push('```')

  parts.push('')
  parts.push('## Source Files')

  for (const file of sourceFiles) {
    parts.push('')
    parts.push(`### ${file.path}`)
    parts.push('```')
    parts.push(file.content)
    parts.push('```')
  }

  return parts.join('\n')
}
