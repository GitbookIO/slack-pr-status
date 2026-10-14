# slack-pr-status

Adds emoji reactions to Slack posts that link GitHub pull requests, based on the PRs' review status.
On each PR event it finds recent posts in the configured channels that link the PR. For each post it fetches the status of every PR the post links, works out one overall status, and sets the bot's reactions to match. Earlier status emojis are removed, so a post shows only its current status.

Posts that link PRs from more than one repository are skipped, because the workflow's `GITHUB_TOKEN` can only read its own repository.

## Usage

Add this workflow to each repository (`.github/workflows/slack-pr-status.yml`):

```yaml
name: Slack PR status
on:
  pull_request_review:
    types: [submitted, dismissed]
  pull_request:
    types: [closed, reopened]

permissions:
  pull-requests: read

jobs:
  slack-pr-status:
    # Secrets aren't available to workflows triggered from forks.
    if: github.event.pull_request.head.repo.full_name == github.repository
    runs-on: ubuntu-latest
    steps:
      - uses: GitbookIO/slack-pr-status@main
        with:
          slack-token: ${{ secrets.SLACK_PR_STATUS_BOT_TOKEN }}
          config: |
            channels: [C0123ABC]
            approvalsRequired: 1
            multiPr: aggregate
            emojis:
              commented: eyes
              merged: merged
```

## Config

| Key | Default | |
| --- | --- | --- |
| `channels` | required | Slack channel IDs to search |
| `lookbackDays` | `14` | How far back to search for posts |
| `approvalsRequired` | `1` | Approvals before a PR counts as `approved` |
| `multiPr` | `aggregate` | For posts linking several PRs from the same repository: `aggregate` combines their statuses; `skip` leaves the post alone |
| `emojis` | see below | Emoji per status. Set a status to `false` to turn it off |

| Status | Default emoji | Meaning |
| --- | --- | --- |
| `unreviewed` | off | No reviews yet |
| `commented` | `speech_balloon` | Reviewed, but nobody has approved or requested changes |
| `partiallyApproved` | off | Some approvals, fewer than `approvalsRequired` |
| `approved` | `white_check_mark` | At least `approvalsRequired` approvals |
| `changesRequested` | `x` | A reviewer's latest review requests changes |
| `merged` | `tada` | Merged |
| `closed` | `wastebasket` | Closed without merging |
| `partiallyReviewed` | `hourglass_flowing_sand` | Multi-PR posts only: some PRs are approved or merged and others aren't |

### Statuses for posts with several PRs

- If every PR has the same status, the post gets that status.
- If every PR is merged or closed, the post gets `merged`.
- If any PR has changes requested, the post gets `changesRequested`.
- If every PR is approved, merged or closed, the post gets `approved`.
- If any PR is approved or merged, the post gets `partiallyReviewed`.
- Otherwise, the post gets `commented` if any PR is commented, and `unreviewed` if not.

The rules are in `src/status.ts`.

## Slack app

The app needs a bot token with the scopes `channels:history`, `groups:history` (for private channels), `reactions:read` and `reactions:write`. Invite the bot to each channel.

## Development

Node 24 runs the TypeScript directly, so there is no build step.

```sh
npm install
npm test
npm run typecheck
```
