#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { Command } from 'commander'
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

function createNotificationProvider(
  slackUrl?: string,
  discordUrl?: string,
): NotificationProvider | undefined {
  if (slackUrl) return new SlackNotifier({ webhookUrl: slackUrl })
  if (discordUrl) return new DiscordNotifier({ webhookUrl: discordUrl })
  return undefined
}

// ─────────────────────────────────────────
// stdin에서 JSON 읽기
// ─────────────────────────────────────────

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    process.stdin.on('data', (chunk) => chunks.push(chunk))
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
    process.stdin.on('error', reject)
  })
}

// ─────────────────────────────────────────
// CLI 정의
// ─────────────────────────────────────────

const program = new Command()
  .name('kintsugi')
  .description('Self-healing engine that automatically analyzes errors and creates fix PRs')
  .requiredOption('--owner <owner>', 'GitHub repository owner', process.env.GITHUB_OWNER)
  .requiredOption('--repo <repo>', 'GitHub repository name', process.env.GITHUB_REPO)
  .option('--ai-provider <provider>', 'AI provider (claude, openai, gemini)', process.env.AI_PROVIDER ?? 'claude')
  .option('--ai-api-key <key>', 'AI API key', process.env.AI_API_KEY)
  .option('--ai-model <model>', 'AI model name (optional)', process.env.AI_MODEL)
  .option('--github-token <token>', 'GitHub token', process.env.GITHUB_TOKEN)
  .option('--slack-webhook-url <url>', 'Slack webhook URL', process.env.SLACK_WEBHOOK_URL)
  .option('--discord-webhook-url <url>', 'Discord webhook URL', process.env.DISCORD_WEBHOOK_URL)
  .option('--payload <file>', 'Path to JSON payload file (reads from stdin if omitted)')

program.action(async (opts) => {
  const aiApiKey = opts.aiApiKey
  if (!aiApiKey) {
    console.error('Error: --ai-api-key or AI_API_KEY environment variable is required')
    process.exit(1)
  }

  const githubToken = opts.githubToken
  if (!githubToken) {
    console.error('Error: --github-token or GITHUB_TOKEN environment variable is required')
    process.exit(1)
  }

  // payload 읽기: --payload 파일 경로 또는 stdin
  let rawJson: string
  if (opts.payload) {
    rawJson = readFileSync(opts.payload, 'utf-8')
  } else {
    rawJson = await readStdin()
  }

  const payload = JSON.parse(rawJson)

  // 엔진 조립
  const engine = new KintsugiEngine({
    ai: createAIProvider(opts.aiProvider, aiApiKey, opts.aiModel),
    errorMonitoring: new SentryProvider(),
    notification: createNotificationProvider(opts.slackWebhookUrl, opts.discordWebhookUrl),
    github: {
      token: githubToken,
      owner: opts.owner,
      repo: opts.repo,
    },
  })

  // 실행
  const result = await engine.run(payload)

  if (result.success) {
    console.log(`✅ Fix PR created: ${result.pr.url}`)
  } else {
    console.error(`❌ Fix failed: ${result.error}`)
    process.exit(1)
  }
})

program.parse()
