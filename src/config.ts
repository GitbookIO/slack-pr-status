import { parse } from 'yaml'
import { STATUSES, type Status } from './status.ts'

export type Config = {
  channels: string[]
  lookbackDays: number
  approvalsRequired: number
  multiPr: 'aggregate' | 'skip'
  emojis: Record<Status, string | false>
}

const DEFAULT_EMOJIS: Record<Status, string | false> = {
  unreviewed: false,
  commented: 'speech_balloon',
  changesRequested: 'x',
  partiallyApproved: false,
  approved: 'white_check_mark',
  partiallyReviewed: 'hourglass_flowing_sand',
  merged: 'tada',
  closed: 'wastebasket',
}

export function parseConfig(text: string): Config {
  const raw = parse(text) ?? {}

  const { channels } = raw
  if (!Array.isArray(channels) || channels.length === 0 || !channels.every((c) => typeof c === 'string')) {
    throw new Error('config: "channels" must be a non-empty list of Slack channel IDs')
  }

  const multiPr = raw.multiPr ?? 'aggregate'
  if (multiPr !== 'aggregate' && multiPr !== 'skip') {
    throw new Error('config: "multiPr" must be "aggregate" or "skip"')
  }

  const emojis = { ...DEFAULT_EMOJIS }
  for (const [status, emoji] of Object.entries(raw.emojis ?? {})) {
    if (!STATUSES.includes(status as Status)) {
      throw new Error(`config: unknown status "${status}" in "emojis", expected one of ${STATUSES.join(', ')}`)
    }
    if (emoji !== false && typeof emoji !== 'string') {
      throw new Error(`config: emoji for "${status}" must be an emoji name or false`)
    }
    emojis[status as Status] = emoji === false ? false : emoji.replace(/^:|:$/g, '')
  }

  return {
    channels,
    lookbackDays: raw.lookbackDays ?? 14,
    approvalsRequired: raw.approvalsRequired ?? 1,
    multiPr,
    emojis,
  }
}
