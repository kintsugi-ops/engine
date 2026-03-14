# Kintsugi Ops Engine

Self-healing engine that automatically analyzes server errors with AI and creates fix PRs.

When an error occurs in production, Kintsugi analyzes the root cause using AI, generates a code fix, and opens a pull request — all without human intervention. Developers review and merge.

## How It Works

```
Server error → Sentry detects → Webhook relay → GitHub Actions triggers Kintsugi
                                                          │
                                                          ├─ 1. Parse error from Sentry payload
                                                          ├─ 2. Fetch repo file tree from GitHub
                                                          ├─ 3. AI selects which files to examine
                                                          ├─ 4. Fetch source code of selected files
                                                          ├─ 5. AI generates fix proposal
                                                          ├─ 6. Create branch + open PR
                                                          └─ 7. Send notification (Slack/Discord)
```

## Key Principles

- **Human-in-the-loop** — AI creates the PR. Developers decide whether to merge.
- **Zero-server** — Runs entirely in your GitHub Actions. No central server.
- **Provider-agnostic** — Plug in your own AI, error monitoring, and notification tools.

## Quick Start (GitHub Actions)

### 1. Add the workflow to your repo

```yaml
# .github/workflows/kintsugi.yml
name: Kintsugi Ops

on:
  repository_dispatch:
    types: [sentry-error]

jobs:
  fix:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - uses: kintsugi-ops/engine@v1
        with:
          ai-provider: claude
          ai-api-key: ${{ secrets.AI_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          slack-webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}       # optional
          discord-webhook-url: ${{ secrets.DISCORD_WEBHOOK_URL }}   # optional
```

### 2. Set up secrets

| Secret | Required | Description |
|--------|----------|-------------|
| `AI_API_KEY` | Yes | API key for your chosen AI provider |
| `GITHUB_TOKEN` | Yes | GitHub token (auto-provided in Actions) |
| `SLACK_WEBHOOK_URL` | No | Slack incoming webhook URL |
| `DISCORD_WEBHOOK_URL` | No | Discord webhook URL |

### 3. Connect Sentry to GitHub Actions

Sentry webhooks can't directly trigger `repository_dispatch`. You need a lightweight relay (e.g., Cloudflare Worker or AWS Lambda) that receives Sentry's webhook and calls the GitHub API.

```
Sentry webhook → Relay (Worker/Lambda) → GitHub repository_dispatch
```

## Programmatic Usage (npm)

Install the package along with the AI SDK you want to use:

```bash
npm install kintsugi-ops @anthropic-ai/sdk  # Claude
npm install kintsugi-ops openai              # GPT
npm install kintsugi-ops @google/genai       # Gemini
```

```typescript
import {
  KintsugiEngine,
  ClaudeProvider,
  SentryProvider,
  SlackNotifier,
} from 'kintsugi-ops'

const engine = new KintsugiEngine({
  ai: new ClaudeProvider({ apiKey: process.env.ANTHROPIC_API_KEY! }),
  errorMonitoring: new SentryProvider(),
  notification: new SlackNotifier({ webhookUrl: process.env.SLACK_WEBHOOK_URL! }),
  github: {
    token: process.env.GITHUB_TOKEN!,
    owner: 'myorg',
    repo: 'myrepo',
  },
})

const result = await engine.run(sentryPayload)
```

## CLI

```bash
# From a file
kintsugi --owner myorg --repo myrepo --payload event.json

# From stdin
cat event.json | kintsugi --owner myorg --repo myrepo

# All options support environment variables
export AI_API_KEY=sk-...
export GITHUB_TOKEN=ghp_...
export AI_PROVIDER=claude
kintsugi --owner myorg --repo myrepo --payload event.json
```

| Option | Env Variable | Default | Description |
|--------|-------------|---------|-------------|
| `--owner` | `GITHUB_OWNER` | — | Repository owner (required) |
| `--repo` | `GITHUB_REPO` | — | Repository name (required) |
| `--ai-provider` | `AI_PROVIDER` | `claude` | `claude`, `openai`, or `gemini` |
| `--ai-api-key` | `AI_API_KEY` | — | AI provider API key |
| `--ai-model` | `AI_MODEL` | — | Model override (uses provider default) |
| `--github-token` | `GITHUB_TOKEN` | — | GitHub token |
| `--slack-webhook-url` | `SLACK_WEBHOOK_URL` | — | Slack webhook URL |
| `--discord-webhook-url` | `DISCORD_WEBHOOK_URL` | — | Discord webhook URL |
| `--payload` | — | stdin | Path to JSON payload file |

## Supported Providers

### AI

| Provider | SDK | Default Model |
|----------|-----|---------------|
| Claude | `@anthropic-ai/sdk` | `claude-sonnet-4-20250514` |
| GPT | `openai` | `gpt-4o` |
| Gemini | `@google/genai` | `gemini-2.0-flash` |

### Error Monitoring

| Provider | Input |
|----------|-------|
| Sentry | Error webhook payload |

### Notifications

| Provider | Method |
|----------|--------|
| Slack | Incoming webhook |
| Discord | Webhook |

## Adding Custom Providers

Implement the interface and pass it to the engine:

```typescript
import type { AIProvider } from 'kintsugi-ops'

class MyCustomAI implements AIProvider {
  async analyzeError(error, fileTree) {
    // Return file paths to examine
  }
  async generateFix(error, sourceFiles) {
    // Return fix proposal
  }
}

const engine = new KintsugiEngine({
  ai: new MyCustomAI(),
  // ...
})
```

Available interfaces: `AIProvider`, `ErrorMonitoringProvider`, `NotificationProvider`

## Architecture

```
src/
├── types/          # Pure data types (ParsedError, FixProposal, etc.)
├── integrations/
│   ├── ai/         # AI providers (Claude, OpenAI, Gemini)
│   ├── error-monitoring/  # Error parsers (Sentry)
│   ├── notification/      # Notifiers (Slack, Discord)
│   └── github/     # GitHub API client (Octokit)
├── core/           # Engine orchestration (depends only on interfaces)
├── cli/            # CLI entry point (commander)
├── action/         # GitHub Actions entry point
└── index.ts        # npm package entry point
```

The core engine depends only on interfaces, never on concrete implementations. Entry points (CLI, Action, npm) assemble the concrete providers and inject them into the engine.

## Requirements

- Node.js >= 22

## License

MIT
