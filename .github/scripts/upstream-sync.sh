#!/usr/bin/env bash
# Maintain only the automated intake branch. Never push a merged tree or write main.
set -euo pipefail

readonly expected_repository='Juanlucasbg/wescale-emailer'
readonly base_branch='main'
readonly sync_branch='updates/notifuse'
readonly upstream_url="${UPSTREAM_URL:-https://github.com/Notifuse/notifuse.git}"

if [[ "${GITHUB_REPOSITORY:-}" != "$expected_repository" ]]; then
  echo "This workflow is restricted to $expected_repository." >&2
  exit 1
fi
: "${GITHUB_OUTPUT:?GitHub Actions output file is required}"

# Fetch complete histories so ancestor detection and the simulated merge are accurate.
git fetch --no-tags origin "refs/heads/$base_branch:refs/remotes/origin/$base_branch"
git fetch --no-tags "$upstream_url" '+refs/heads/main:refs/remotes/notifuse/main'
base_sha=$(git rev-parse "refs/remotes/origin/$base_branch")
upstream_sha=$(git rev-parse refs/remotes/notifuse/main)
printf 'base_sha=%s\nupstream_sha=%s\n' "$base_sha" "$upstream_sha" >> "$GITHUB_OUTPUT"

if git merge-base --is-ancestor "$upstream_sha" "$base_sha"; then
  printf 'updates=false\nmergeable=true\nconflicts_json=[]\ncommit_count=0\n' >> "$GITHUB_OUTPUT"
  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
    # shellcheck disable=SC2016 # Backticks are literal Markdown in the printf format.
    printf '## Upstream intake\n\nFork main already contains Notifuse main `%s`. No branch or PR was changed.\n' "$upstream_sha" >> "$GITHUB_STEP_SUMMARY"
  fi
  exit 0
fi

if ! git merge-base "$base_sha" "$upstream_sha" > /dev/null; then
  echo 'Fork main and upstream main have no shared history. Refusing to push an unrelated update branch.' >&2
  exit 1
fi
commit_count=$(git rev-list --count "$base_sha..$upstream_sha")

# Record the advertised managed-branch SHA. A lease protects against a concurrent update.
old_sha=''
if advertised=$(git ls-remote --exit-code --heads origin "refs/heads/$sync_branch"); then
  old_sha=${advertised%%$'\t'*}
else
  status=$?
  if [[ "$status" -ne 2 ]]; then
    echo 'Could not inspect the managed branch; refusing to push.' >&2
    exit "$status"
  fi
fi
if [[ "$old_sha" != "$upstream_sha" ]]; then
  if [[ -z "$old_sha" ]]; then
    git push "--force-with-lease=refs/heads/$sync_branch:" origin "$upstream_sha:refs/heads/$sync_branch"
  else
    git fetch --no-tags origin "refs/heads/$sync_branch:refs/remotes/origin/$sync_branch"
    if git merge-base --is-ancestor "$old_sha" "$upstream_sha"; then
      git push origin "$upstream_sha:refs/heads/$sync_branch"
    else
      git push "--force-with-lease=refs/heads/$sync_branch:$old_sha" origin "$upstream_sha:refs/heads/$sync_branch"
    fi
  fi
fi

# Inspect integration separately: conflict detection cannot alter the checkout or managed branch.
merge_dir=$(mktemp -d "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/upstream-sync-merge.XXXXXX")
cleanup() {
  git worktree remove --force "$merge_dir" >/dev/null 2>&1 || true
  rm -rf "$merge_dir"
}
trap cleanup EXIT
git worktree add --detach "$merge_dir" "$base_sha"
mergeable=true
conflicts_json='[]'
if ! git -C "$merge_dir" -c user.name='github-actions[bot]' -c user.email='41898282+github-actions[bot]@users.noreply.github.com' merge --no-commit --no-ff "$upstream_sha"; then
  conflicts_json=$(git -C "$merge_dir" diff --name-only --diff-filter=U -z | python3 -c 'import json,sys; print(json.dumps([path.decode("utf-8", "replace") for path in sys.stdin.buffer.read().split(b"\0") if path]))')
  if [[ "$conflicts_json" == '[]' ]]; then
    echo 'The simulated merge failed without producing conflict paths; see the Git log above.' >&2
    exit 1
  fi
  mergeable=false
fi
printf 'updates=true\nmergeable=%s\nconflicts_json=%s\ncommit_count=%s\n' "$mergeable" "$conflicts_json" "$commit_count" >> "$GITHUB_OUTPUT"
if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  # shellcheck disable=SC2016 # Backticks are literal Markdown in the printf format.
  printf '## Upstream intake\n\n%s upstream commits need review.\n\n- Branded main: `%s`\n- Upstream main: `%s`\n- Managed branch: `%s`\n- Clean merge: `%s`\n' "$commit_count" "$base_sha" "$upstream_sha" "$sync_branch" "$mergeable" >> "$GITHUB_STEP_SUMMARY"
fi
