import assert from 'node:assert/strict'
import { test } from 'node:test'
import { extractPrRefs } from './github.ts'

test('extractPrRefs reads Slack-formatted links and dedupes', () => {
  const text =
    ':eyes: <https://github.com/GitbookIO/gitbook-x/pull/123|gitbook-x#123> and ' +
    '<https://github.com/GitbookIO/gitbook/pull/45/files> (also https://github.com/gitbookio/gitbook-x/pull/123)'
  assert.deepEqual(extractPrRefs(text), [
    { owner: 'GitbookIO', repo: 'gitbook-x', number: 123 },
    { owner: 'GitbookIO', repo: 'gitbook', number: 45 },
  ])
})
