import { GraphqlResponseError, graphql } from '@octokit/graphql'
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
        reviews { totalCount }
        latestOpinionatedReviews(first: 100) { nodes { state } }
      }
    }
  }
`

const UNREADABLE = new Set(['NOT_FOUND', 'FORBIDDEN'])

type QueryResult = {
  repository: {
    pullRequest: {
      state: PullRequest['state']
      reviews: { totalCount: number }
      latestOpinionatedReviews: { nodes: { state: string }[] }
    }
  }
}

export function createPrFetcher(token: string) {
  const client = graphql.defaults({ headers: { authorization: `token ${token}` } })

  /** Returns null when the token can't see the repository, e.g. a private repo from another workflow. */
  return async (ref: PrRef): Promise<PullRequest | null> => {
    let result: QueryResult
    try {
      result = await client<QueryResult>(QUERY, { ...ref })
    } catch (error) {
      if (error instanceof GraphqlResponseError && error.errors?.every((e) => UNREADABLE.has(e.type))) {
        return null
      }
      throw error
    }
    const pr = result.repository.pullRequest
    const count = (state: string) => pr.latestOpinionatedReviews.nodes.filter((r) => r.state === state).length
    return {
      state: pr.state,
      reviews: pr.reviews.totalCount,
      approvals: count('APPROVED'),
      changesRequested: count('CHANGES_REQUESTED'),
    }
  }
}
