import Anthropic from '@anthropic-ai/sdk'
import type { AIProvider } from './provider.interface.js'
import type { ParsedError } from '../../types/error.js'
import type { FileContent } from '../../types/github.js'
import type { FixProposal } from '../../types/fix.js'
import { ANALYZE_SYSTEM_PROMPT, FIX_SYSTEM_PROMPT, buildAnalyzeUserPrompt, buildFixUserPrompt } from './prompts.js'
import { parseAnalyzeResponse, parseFixResponse } from './response-parser.js'

export interface ClaudeProviderConfig {
  apiKey: string
  model?: string
}

export class ClaudeProvider implements AIProvider {
  private client: Anthropic
  private model: string

  constructor(config: ClaudeProviderConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey })
    this.model = config.model ?? 'claude-sonnet-4-20250514'
  }

  async analyzeError(error: ParsedError, fileTree: string[]): Promise<string[]> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: ANALYZE_SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: buildAnalyzeUserPrompt(error, fileTree) },
      ],
    })

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')

    return parseAnalyzeResponse(text)
  }

  async generateFix(error: ParsedError, sourceFiles: FileContent[]): Promise<FixProposal> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 8192,
      system: FIX_SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: buildFixUserPrompt(error, sourceFiles) },
      ],
    })

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')

    return parseFixResponse(text, sourceFiles)
  }
}
