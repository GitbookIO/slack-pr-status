import { graphql } from '@octokit/graphql'
import type { PullRequest } from './status.ts'

export type PrRef = { owner: string; repo: string; number: number }

const PR_URL = /https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/pull\/(\d+)/g

export function repoKey({ owner, repo }: PrRef): string {
  return `${owner}/${repo}`.toLowerCase()
}

export function prKey(ref: PrRef): string {
  return `${repoKey(ref)}#${ref.number}`
}

export function extractPrRefs(text: string): PrRef[] {
  const refs = new Map<string, PrRef>()
  for (const [, owner, repo, number] of text.matchAll(PR_URL)) {
    const ref = { owner, repo, number: Number(number) }
    if (!refs.has(prKey(ref))) refs.set(prKey(ref), ref)
  }
  return [...refs.values()]
}

const QUERY = `
  query ($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        state
        author { login }
        reviews(first: 100) { nodes { author { login } } }
        latestOpinionatedReviews(first: 100) { nodes { state } }
      }
    }
  }
`

type Author = { login: string } | null

export type PullRequestNode = {
  state: PullRequest['state']
  author: Author
  reviews: { nodes: { author: Author }[] }
  latestOpinionatedReviews: { nodes: { state: string }[] }
}

type QueryResult = { repository: { pullRequest: PullRequestNode } }

export function toPullRequest(pr: PullRequestNode): PullRequest {
  const count = (state: string) => pr.latestOpinionatedReviews.nodes.filter((r) => r.state === state).length
  return {
    state: pr.state,
    // Replies by the author to review threads are recorded as reviews by the author.
    reviews: pr.reviews.nodes.filter((r) => r.author?.login !== pr.author?.login).length,
    approvals: count('APPROVED'),
    changesRequested: count('CHANGES_REQUESTED'),
  }
}

export function createPrFetcher(token: string) {
  const client = graphql.defaults({ headers: { authorization: `token ${token}` } })

  return async (ref: PrRef): Promise<PullRequest> => {
    const { repository } = await client<QueryResult>(QUERY, { ...ref })
    return toPullRequest(repository.pullRequest)
  }
}
