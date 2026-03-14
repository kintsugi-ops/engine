import { readFileSync } from 'node:fs'
import { KintsugiEngine } from '../core/engine.js'
import { ClaudeProvider } from '../integrations/ai/claude.js'
import { OpenAIProvider } from '../integrations/ai/openai.js'
import { GeminiProvider } from '../integrations/ai/gemini.js'
import { SentryProvider } from '../integrations/error-monitoring/sentry.js'
import { SlackNotifier } from '../integrations/notification/slack.js'
import { DiscordNotifier } from '../integrations/notification/discord.js'
import type { AIProvider } from '../integrations/ai/provider.interface.js'
import type { NotificationProvider } from '../integrations/notification/provider.interface.js'

// ─────────────────────────────────────────
// GitHub Actions 환경변수 읽기
// action.yml의 inputs가 INPUT_* 환경변수로 매핑됨
// 예: ai-provider → INPUT_AI-PROVIDER
// ─────────────────────────────────────────

function getInput(name: string): string | undefined {
  const envKey = `INPUT_${name.toUpperCase().replace(/-/g, '_')}`
  return process.env[envKey] || undefined
}

function getRequiredInput(name: string): string {
  const value = getInput(name)
  if (!value) {
    throw new Error(`Required input "${name}" is not set`)
  }
  return value
}

// ─────────────────────────────────────────
// AI provider 팩토리
// ─────────────────────────────────────────

function createAIProvider(provider: string, apiKey: string, model?: string): AIProvider {
  switch (provider) {
    case 'claude':
      return new ClaudeProvider({ apiKey, model })
    case 'openai':
      return new OpenAIProvider({ apiKey, model })
    case 'gemini':
      return new GeminiProvider({ apiKey, model })
    default:
      throw new Error(`Unknown AI provider: ${provider}. Supported: claude, openai, gemini`)
  }
}

// ─────────────────────────────────────────
// Notification provider 팩토리
// ─────────────────────────────────────────

function createNotificationProvider(): NotificationProvider | undefined {
  const slackUrl = getInput('SLACK-WEBHOOK-URL')
  const discordUrl = getInput('DISCORD-WEBHOOK-URL')

  if (slackUrl) return new SlackNotifier({ webhookUrl: slackUrl })
  if (discordUrl) return new DiscordNotifier({ webhookUrl: discordUrl })
  return undefined
}

// ─────────────────────────────────────────
// 메인 실행
// ─────────────────────────────────────────

async function run(): Promise<void> {
  const aiProvider = getInput('AI-PROVIDER') ?? 'claude'
  const aiApiKey = getRequiredInput('AI-API-KEY')
  const aiModel = getInput('AI-MODEL')
  const githubToken = getRequiredInput('GITHUB-TOKEN')

  // GITHUB_REPOSITORY = "owner/repo"
  const [owner, repo] = (process.env.GITHUB_REPOSITORY ?? '').split('/')
  if (!owner || !repo) {
    throw new Error('GITHUB_REPOSITORY environment variable is not set or invalid')
  }

  // repository_dispatch 이벤트 payload 읽기
  const eventPath = process.env.GITHUB_EVENT_PATH
  if (!eventPath) {
    throw new Error('GITHUB_EVENT_PATH environment variable is not set')
  }

  const event = JSON.parse(readFileSync(eventPath, 'utf-8'))
  const payload = event.client_payload

  if (!payload) {
    throw new Error('No client_payload found in repository_dispatch event')
  }

  // 엔진 조립
  const engine = new KintsugiEngine({
    ai: createAIProvider(aiProvider, aiApiKey, aiModel),
    errorMonitoring: new SentryProvider(),
    notification: createNotificationProvider(),
    github: { token: githubToken, owner, repo },
  })

  // 실행
  const result = await engine.run(payload)

  if (result.success) {
    console.log(`✅ Fix PR created: ${result.pr.url}`)
  } else {
    console.error(`❌ Fix failed: ${result.error}`)
    process.exitCode = 1
  }
}

run().catch((err) => {
  console.error('Fatal error:', err instanceof Error ? err.message : err)
  process.exitCode = 1
})
