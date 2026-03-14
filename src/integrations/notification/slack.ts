import type { NotificationProvider } from './provider.interface.js'
import type { ParsedError } from '../../types/error.js'
import type { EngineResult } from '../../types/result.js'

export interface SlackNotifierConfig {
  webhookUrl: string
}

export class SlackNotifier implements NotificationProvider {
  private webhookUrl: string

  constructor(config: SlackNotifierConfig) {
    this.webhookUrl = config.webhookUrl
  }

  async notify(result: EngineResult, error: ParsedError): Promise<void> {
    const payload = result.success
      ? this.buildSuccessPayload(result.pr.url, result.pr.title, error)
      : this.buildFailurePayload(result.error, error)

    await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }

  private buildSuccessPayload(prUrl: string, prTitle: string, error: ParsedError) {
    return {
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '✅ Kintsugi: Fix PR Created' },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Error:*\n${error.title}` },
            { type: 'mrkdwn', text: `*Level:*\n${error.level}` },
            { type: 'mrkdwn', text: `*Environment:*\n${error.environment}` },
            { type: 'mrkdwn', text: `*PR:*\n<${prUrl}|${prTitle}>` },
          ],
        },
      ],
    }
  }

  private buildFailurePayload(errorMessage: string, error: ParsedError) {
    return {
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '❌ Kintsugi: Fix Failed' },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Error:*\n${error.title}` },
            { type: 'mrkdwn', text: `*Reason:*\n${errorMessage}` },
          ],
        },
      ],
    }
  }
}
