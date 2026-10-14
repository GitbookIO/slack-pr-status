import assert from 'node:assert/strict'
import { test } from 'node:test'
import { aggregate, computeStatus, type PullRequest } from './status.ts'

const pr = (overrides: Partial<PullRequest>): PullRequest => ({
  state: 'OPEN',
  reviews: 0,
  approvals: 0,
  changesRequested: 0,
  ...overrides,
})

test('computeStatus', () => {
  assert.equal(computeStatus(pr({}), 2), 'unreviewed')
  assert.equal(computeStatus(pr({ reviews: 1 }), 2), 'commented')
  assert.equal(computeStatus(pr({ reviews: 1, approvals: 1 }), 2), 'partiallyApproved')
  assert.equal(computeStatus(pr({ reviews: 2, approvals: 2 }), 2), 'approved')
  assert.equal(computeStatus(pr({ reviews: 2, approvals: 2, changesRequested: 1 }), 2), 'changesRequested')
  assert.equal(computeStatus(pr({ state: 'MERGED', changesRequested: 1 }), 2), 'merged')
})

test('aggregate', () => {
  assert.equal(aggregate(['approved']), 'approved')
  assert.equal(aggregate(['merged', 'merged']), 'merged')
  assert.equal(aggregate(['merged', 'closed']), 'merged')
  assert.equal(aggregate(['merged', 'approved']), 'approved')
  assert.equal(aggregate(['approved', 'unreviewed']), 'partiallyReviewed')
  assert.equal(aggregate(['merged', 'commented']), 'partiallyReviewed')
  assert.equal(aggregate(['approved', 'changesRequested']), 'changesRequested')
  assert.equal(aggregate(['commented', 'unreviewed']), 'commented')
})
