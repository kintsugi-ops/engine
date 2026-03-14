// ─────────────────────────────────────────
// npm 패키지 공개 진입점
// 사용자가 import { KintsugiEngine, ClaudeProvider, ... } from 'kintsugi-ops' 로 사용
// ─────────────────────────────────────────

// Core
export { KintsugiEngine } from './core/engine.js'
export type { EngineConfig } from './core/engine.js'

// Types
export type { ParsedError, AffectedFile } from './types/error.js'
export type { FixProposal, FileChange } from './types/fix.js'
export type { FileContent, CreatedPR } from './types/github.js'
export type { EngineResult } from './types/result.js'

// AI Providers
export { ClaudeProvider } from './integrations/ai/claude.js'
export type { ClaudeProviderConfig } from './integrations/ai/claude.js'
export { OpenAIProvider } from './integrations/ai/openai.js'
export type { OpenAIProviderConfig } from './integrations/ai/openai.js'
export { GeminiProvider } from './integrations/ai/gemini.js'
export type { GeminiProviderConfig } from './integrations/ai/gemini.js'

// AI Interface
export type { AIProvider } from './integrations/ai/provider.interface.js'

// Error Monitoring
export { SentryProvider } from './integrations/error-monitoring/sentry.js'
export type { ErrorMonitoringProvider } from './integrations/error-monitoring/provider.interface.js'

// Notification
export { SlackNotifier } from './integrations/notification/slack.js'
export type { SlackNotifierConfig } from './integrations/notification/slack.js'
export { DiscordNotifier } from './integrations/notification/discord.js'
export type { DiscordNotifierConfig } from './integrations/notification/discord.js'
export type { NotificationProvider } from './integrations/notification/provider.interface.js'

// GitHub
export { GitHubClient } from './integrations/github/client.js'
export type { GitHubClientConfig } from './integrations/github/client.js'
