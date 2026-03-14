import { GoogleGenAI } from '@google/genai'
import type { AIProvider } from './provider.interface.js'
import type { ParsedError } from '../../types/error.js'
import type { FileContent } from '../../types/github.js'
import type { FixProposal } from '../../types/fix.js'
import { ANALYZE_SYSTEM_PROMPT, FIX_SYSTEM_PROMPT, buildAnalyzeUserPrompt, buildFixUserPrompt } from './prompts.js'
import { parseAnalyzeResponse, parseFixResponse } from './response-parser.js'

export interface GeminiProviderConfig {
  apiKey: string
  model?: string
}

export class GeminiProvider implements AIProvider {
  private client: GoogleGenAI
  private model: string

  constructor(config: GeminiProviderConfig) {
    this.client = new GoogleGenAI({ apiKey: config.apiKey })
    this.model = config.model ?? 'gemini-2.0-flash'
  }

  async analyzeError(error: ParsedError, fileTree: string[]): Promise<string[]> {
    const response = await this.client.models.generateContent({
      model: this.model,
      config: {
        systemInstruction: ANALYZE_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
      },
      contents: buildAnalyzeUserPrompt(error, fileTree),
    })

    const text = response.text ?? ''
    return parseAnalyzeResponse(text)
  }

  async generateFix(error: ParsedError, sourceFiles: FileContent[]): Promise<FixProposal> {
    const response = await this.client.models.generateContent({
      model: this.model,
      config: {
        systemInstruction: FIX_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
      },
      contents: buildFixUserPrompt(error, sourceFiles),
    })

    const text = response.text ?? ''
    return parseFixResponse(text, sourceFiles)
  }
}
