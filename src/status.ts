export const STATUSES = [
  'unreviewed',
  'commented',
  'changesRequested',
  'partiallyApproved',
  'approved',
  'partiallyReviewed',
  'merged',
  'closed',
] as const

export type Status = (typeof STATUSES)[number]

export type PullRequest = {
  state: 'OPEN' | 'CLOSED' | 'MERGED'
  reviews: number
  approvals: number
  changesRequested: number
}

export function computeStatus(pr: PullRequest, approvalsRequired: number): Status {
  if (pr.state === 'MERGED') return 'merged'
  if (pr.state === 'CLOSED') return 'closed'
  if (pr.changesRequested > 0) return 'changesRequested'
  if (pr.approvals >= approvalsRequired) return 'approved'
  if (pr.approvals > 0) return 'partiallyApproved'
  if (pr.reviews > 0) return 'commented'
  return 'unreviewed'
}

export function aggregate(statuses: Status[]): Status {
  const every = (...allowed: Status[]) => statuses.every((s) => allowed.includes(s))
  const some = (...wanted: Status[]) => statuses.some((s) => wanted.includes(s))

  if (every(statuses[0])) return statuses[0]
  if (every('merged', 'closed')) return 'merged'
  if (some('changesRequested')) return 'changesRequested'
  if (every('approved', 'merged', 'closed')) return 'approved'
  if (some('approved', 'partiallyApproved', 'merged')) return 'partiallyReviewed'
  if (some('commented')) return 'commented'
  return 'unreviewed'
}
