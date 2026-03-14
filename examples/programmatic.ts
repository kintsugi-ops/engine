/**
 * Example: Using Kintsugi Ops Engine programmatically
 *
 * Install:
 *   npm install kintsugi-ops @anthropic-ai/sdk   # for Claude
 *   npm install kintsugi-ops openai               # for GPT
 *   npm install kintsugi-ops @google/genai        # for Gemini
 */

import {
  KintsugiEngine,
  ClaudeProvider,
  SentryProvider,
  SlackNotifier,
} from 'kintsugi-ops'

// --- Basic usage with Claude + Slack ---

const engine = new KintsugiEngine({
  ai: new ClaudeProvider({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    // model: 'claude-sonnet-4-20250514',  // optional override
  }),
  errorMonitoring: new SentryProvider(),
  notification: new SlackNotifier({
    webhookUrl: process.env.SLACK_WEBHOOK_URL!,
  }),
  github: {
    token: process.env.GITHUB_TOKEN!,
    owner: 'your-org',
    repo: 'your-repo',
  },
})

// Pass a Sentry error webhook payload
const sentryPayload = {
  /* ... Sentry error webhook JSON ... */
}

const result = await engine.run(sentryPayload)

if (result.success) {
  console.log(`Fix PR created: ${result.pr.url}`)
} else {
  console.error(`Fix failed: ${result.error}`)
}

// --- Alternative: GPT + Discord ---

// const engine = new KintsugiEngine({
//   ai: new OpenAIProvider({
//     apiKey: process.env.OPENAI_API_KEY!,
//   }),
//   errorMonitoring: new SentryProvider(),
//   notification: new DiscordNotifier({
//     webhookUrl: process.env.DISCORD_WEBHOOK_URL!,
//   }),
//   github: {
//     token: process.env.GITHUB_TOKEN!,
//     owner: 'your-org',
//     repo: 'your-repo',
//   },
// })
