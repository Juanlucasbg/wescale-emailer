# Upstream updates

WeScale Emailer follows [`Notifuse/notifuse` → `main`](https://github.com/Notifuse/notifuse/tree/main). The [sync workflow](../.github/workflows/upstream-sync.yml) checks for new commits at minute 17 of every hour in UTC (`17 * * * *`) and supports `workflow_dispatch` from the Actions tab. GitHub schedules can run later than the cron time; this is hourly polling rather than an immediate webhook.

The workflow runs only in `Juanlucasbg/wescale-emailer` on `main`. It manages `updates/notifuse`, which tracks the upstream commit, and creates or refreshes a pull request into this fork's `main`. It never automatically merges the pull request or writes upstream changes directly to `main`. If upstream commits are already included in `main`, the poll leaves the managed branch and pull requests unchanged.

## Activate the workflow

1. Put the workflow on the fork's default branch (`main`). Scheduled workflows run from the default branch.
2. Enable GitHub Actions in the fork and enable **Notifuse upstream intake** if GitHub has disabled it. Forked workflows require activation; public-repository schedules may also be disabled after prolonged inactivity.
3. In **Settings → Actions → General → Workflow permissions**, enable **Allow GitHub Actions to create and approve pull requests**. The workflow declares the token permissions needed to push its managed branch and create/update the pull request. Organization policy can constrain these settings.
4. In **Actions → Notifuse upstream intake**, choose **Run workflow** on `main` to verify the first poll. Inspect the run summary and its pull request before relying on the schedule.

The workflow uses `GITHUB_TOKEN` by default. For upstream commits that modify GitHub workflow files, GitHub may reject the managed-branch push because the built-in token cannot grant `Workflows: write`. In that case, configure a fine-grained token limited to this fork with **Contents: write** and **Workflows: write** as the repository secret `UPSTREAM_SYNC_TOKEN`, then rerun the intake workflow. This optional credential is used only to push the managed branch; merged-tree validation jobs do not receive it. Normal pull-request workflows triggered by the bot’s PR creation or update require approval; a maintainer can select **Approve workflows to run** in the pull request. The sync workflow performs its own integration checks independently. See [GitHub’s automated workflow triggering rules](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow#triggering-a-workflow-from-a-workflow). GitHub documents [scheduled workflow behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule) and [repository workflow permissions](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository).

## Review an update

Review the incoming upstream commits and the resulting integration with this fork, including changes to the console, subscription preferences, brand assets, translations, and product metadata. Check that WeScale Emailer names and styles remain correct, while upstream licences, Go module paths, API contracts, environment variables, and SDK identifiers remain compatible.

When the merge is conflict-free, the sync workflow checks a temporary merge of the pinned fork `main` and upstream commit. It runs the console production build and full unit suite, the notification center build and full unit suite, and `go test -race -timeout 15m ./config ./pkg/mailer ./internal/http ./internal/service`. Conflicts are reported for manual resolution, and the integration checks are skipped until the merge can be prepared. It reports outcomes and the run link on the pull request. Check those results and any applicable repository CI before merging; a submitted pull request is not evidence that its checks passed.

Review migration changes and deployment requirements from the incoming changelog. Run broader tests when the affected code warrants them. Merge only after resolving conflicts and reviewing the final integration. Use a merge commit when accepting upstream history so later polls can recognize the integrated upstream commits.

## Resolve conflicts without losing fork changes

A conflict is reported on the pull request and in the workflow run summary. The managed `updates/notifuse` branch points to the upstream SHA and is refreshed by later polls, so keep manual fixes on a separate branch. For manual resolutions, create a separate branch from this fork's `main` and merge the pinned upstream commit into it:

```sh
git remote add upstream https://github.com/Notifuse/notifuse.git
git fetch origin main
git fetch upstream main
git switch -c review/notifuse-update origin/main
git merge --no-ff upstream/main
```

If `upstream` is already configured, skip the `git remote add` command. In a clone with different remote names, use the remote that points to `Juanlucasbg/wescale-emailer` wherever the example uses `origin`. To reproduce a particular poll exactly, merge the upstream SHA recorded on that pull request instead of the moving `upstream/main` reference.

Resolve the conflicts, preserving WeScale Emailer branding and intentional fork behavior alongside the upstream change. Run the relevant checks, commit the resolution, and open a reviewed pull request from the resolution branch into the fork's `main`. GitHub normally closes the managed update pull request once the same upstream history reaches `main`. Subsequent polls recognize those upstream commits as already integrated.

## Maintain the integration

Keep changes to this fork's update workflow and branding small and explicit so upstream conflicts are easier to review. Preserve [LICENSE](../LICENSE), [LICENSING.md](../LICENSING.md), and [the SDK licence](../web_analytics_sdk/LICENSE). The sync workflow prepares updates for review; publishing images or deploying a merged update remains a separate release action.
