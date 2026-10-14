import { readFile } from 'node:fs/promises'
import { WebClient } from '@slack/web-api'
import { parseConfig } from './config.ts'
import { createPrFetcher, extractPrRefs, prKey, repoKey } from './github.ts'
import { findMessages, setReactions } from './slack.ts'
import { aggregate, computeStatus } from './status.ts'

function env(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable ${name}`)
  return value
}

const config = parseConfig(env('CONFIG'))
const event = JSON.parse(await readFile(env('GITHUB_EVENT_PATH'), 'utf8'))
const [trigger] = extractPrRefs(event.pull_request?.html_url ?? '')
if (!trigger) {
  console.log('Event has no pull request, nothing to do')
  process.exit(0)
}

const fetchPr = createPrFetcher(env('GH_TOKEN'))
const slack = new WebClient(env('SLACK_TOKEN'))
const { user_id: botUserId } = await slack.auth.test()
if (!botUserId) throw new Error('Could not resolve the Slack bot user')

const oldest = Date.now() / 1000 - config.lookbackDays * 24 * 60 * 60
const managed = new Set(Object.values(config.emojis).filter((emoji) => emoji !== false))

for (const channel of config.channels) {
  const messages = await findMessages(slack, channel, oldest, (text) =>
    extractPrRefs(text).some((ref) => prKey(ref) === prKey(trigger)),
  )

  for (const message of messages) {
    const refs = extractPrRefs(message.text)
    const label = `${channel}/${message.ts} (${refs.map(prKey).join(', ')})`
    // The workflow's GITHUB_TOKEN can only read PRs in its own repository.
    if (refs.some((ref) => repoKey(ref) !== repoKey(trigger))) {
      console.log(`${label}: skipped, links PRs from another repository`)
      continue
    }
    if (refs.length > 1 && config.multiPr === 'skip') {
      console.log(`${label}: skipped, links several PRs`)
      continue
    }

    const statuses = await Promise.all(
      refs.map(async (ref) => computeStatus(await fetchPr(ref), config.approvalsRequired)),
    )
    const status = aggregate(statuses)
    const emoji = config.emojis[status]
    console.log(`${label}: ${status} → ${emoji ? `:${emoji}:` : 'no emoji'}`)
    await setReactions(slack, botUserId, message, managed, new Set(emoji ? [emoji] : []))
  }
}
