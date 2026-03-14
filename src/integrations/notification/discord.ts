import type { NotificationProvider } from './provider.interface.js'
import type { ParsedError } from '../../types/error.js'
import type { EngineResult } from '../../types/result.js'

export interface DiscordNotifierConfig {
  webhookUrl: string
}

export class DiscordNotifier implements NotificationProvider {
  private webhookUrl: string

  constructor(config: DiscordNotifierConfig) {
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
      embeds: [
        {
          title: '✅ Kintsugi: Fix PR Created',
          color: 0x2ecc71,
          fields: [
            { name: 'Error', value: error.title, inline: true },
            { name: 'Level', value: error.level, inline: true },
            { name: 'Environment', value: error.environment, inline: true },
            { name: 'Pull Request', value: `[${prTitle}](${prUrl})` },
          ],
        },
      ],
    }
  }

  private buildFailurePayload(errorMessage: string, error: ParsedError) {
    return {
      embeds: [
        {
          title: '❌ Kintsugi: Fix Failed',
          color: 0xe74c3c,
          fields: [
            { name: 'Error', value: error.title, inline: true },
            { name: 'Reason', value: errorMessage },
          ],
        },
      ],
    }
  }
}
