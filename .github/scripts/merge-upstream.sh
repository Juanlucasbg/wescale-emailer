#!/usr/bin/env bash
# Used only in read-only validation jobs against the exact snapshot offered in the PR.
set -euo pipefail
: "${BASE_SHA:?Pinned branded main SHA is required}"
: "${UPSTREAM_SHA:?Pinned upstream SHA is required}"
if [[ ! "$BASE_SHA" =~ ^[0-9a-f]{40}$ || ! "$UPSTREAM_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo 'Invalid pinned commit SHA.' >&2
  exit 1
fi
if [[ "$(git rev-parse HEAD)" != "$BASE_SHA" ]]; then
  echo 'Checkout does not match the main snapshot used for this update PR.' >&2
  exit 1
fi
git fetch --no-tags https://github.com/Notifuse/notifuse.git "$UPSTREAM_SHA"
git -c user.name='github-actions[bot]' -c user.email='41898282+github-actions[bot]@users.noreply.github.com' merge --no-commit --no-ff "$UPSTREAM_SHA"
