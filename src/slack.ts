import type { ConversationsHistoryResponse, WebClient } from '@slack/web-api'

export type SlackMessage = { channel: string; ts: string; text: string }

export async function findMessages(
  slack: WebClient,
  channel: string,
  oldest: number,
  matches: (text: string) => boolean,
): Promise<SlackMessage[]> {
  const found: SlackMessage[] = []
  for await (const page of slack.paginate('conversations.history', { channel, oldest: String(oldest), limit: 200 })) {
    for (const { ts, text } of (page as ConversationsHistoryResponse).messages ?? []) {
      if (ts && text && matches(text)) found.push({ channel, ts, text })
    }
  }
  return found
}

export async function setReactions(
  slack: WebClient,
  botUserId: string,
  { channel, ts }: SlackMessage,
  managed: Set<string>,
  desired: Set<string>,
): Promise<void> {
  const { message } = await slack.reactions.get({ channel, timestamp: ts, full: true })
  const current = new Set(
    (message?.reactions ?? []).filter((r) => r.users?.includes(botUserId)).map((r) => r.name),
  )

  for (const name of managed) {
    if (desired.has(name) && !current.has(name)) {
      await ignoringSlackError('already_reacted', slack.reactions.add({ channel, timestamp: ts, name }))
    } else if (!desired.has(name) && current.has(name)) {
      await ignoringSlackError('no_reaction', slack.reactions.remove({ channel, timestamp: ts, name }))
    }
  }
}

// Another run for a PR linked in the same post may have just made the same change.
async function ignoringSlackError(code: string, call: Promise<unknown>): Promise<void> {
  try {
    await call
  } catch (error) {
    if ((error as { data?: { error?: string } }).data?.error !== code) throw error
  }
}
