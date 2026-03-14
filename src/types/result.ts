import type { CreatedPR } from './github.js'

export type EngineResult =
  | { success: true; pr: CreatedPR }
  | { success: false; error: string }
