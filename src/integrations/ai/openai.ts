import OpenAI from 'openai'
import type { AIProvider } from './provider.interface.js'
import type { ParsedError } from '../../types/error.js'
import type { FileContent } from '../../types/github.js'
import type { FixProposal } from '../../types/fix.js'
import { ANALYZE_SYSTEM_PROMPT, FIX_SYSTEM_PROMPT, buildAnalyzeUserPrompt, buildFixUserPrompt } from './prompts.js'
import { parseAnalyzeResponse, parseFixResponse } from './response-parser.js'

export interface OpenAIProviderConfig {
  apiKey: string
  model?: string
}

export class OpenAIProvider implements AIProvider {
  private client: OpenAI
  private model: string

  constructor(config: OpenAIProviderConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey })
    this.model = config.model ?? 'gpt-4o'
  }

  async analyzeError(error: ParsedError, fileTree: string[]): Promise<string[]> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: ANALYZE_SYSTEM_PROMPT },
        { role: 'user', content: buildAnalyzeUserPrompt(error, fileTree) },
      ],
    })

    const text = response.choices[0]?.message?.content ?? ''
    return parseAnalyzeResponse(text)
  }

  async generateFix(error: ParsedError, sourceFiles: FileContent[]): Promise<FixProposal> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: FIX_SYSTEM_PROMPT },
        { role: 'user', content: buildFixUserPrompt(error, sourceFiles) },
      ],
    })

    const text = response.choices[0]?.message?.content ?? ''
    return parseFixResponse(text, sourceFiles)
  }
}
