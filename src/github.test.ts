import assert from 'node:assert/strict'
import { test } from 'node:test'
import { extractPrRefs, toPullRequest, type PullRequestNode } from './github.ts'

test('extractPrRefs reads Slack-formatted links and dedupes', () => {
  const text =
    ':eyes: <https://github.com/GitbookIO/gitbook-x/pull/123|gitbook-x#123> and ' +
    '<https://github.com/GitbookIO/gitbook/pull/45/files> (also https://github.com/gitbookio/gitbook-x/pull/123)'
  assert.deepEqual(extractPrRefs(text), [
    { owner: 'GitbookIO', repo: 'gitbook-x', number: 123 },
    { owner: 'GitbookIO', repo: 'gitbook', number: 45 },
  ])
})

test('toPullRequest ignores the author\'s own reviews', () => {
  const node = (reviewers: (string | null)[]): PullRequestNode => ({
    state: 'OPEN',
    author: { login: 'alice' },
    reviews: { nodes: reviewers.map((login) => ({ author: login ? { login } : null })) },
    latestOpinionatedReviews: { nodes: [] },
  })
  assert.equal(toPullRequest(node(['alice', 'alice'])).reviews, 0)
  assert.equal(toPullRequest(node(['alice', 'bob'])).reviews, 1)
  // A deleted reviewer account still counts.
  assert.equal(toPullRequest(node([null])).reviews, 1)
})
