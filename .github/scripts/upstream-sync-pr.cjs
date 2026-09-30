const MARKER = '<!-- wescale-upstream-sync -->'
const BRANCH = 'updates/notifuse'
const BASE = 'main'

function renderBody({ baseSha, upstreamSha, commitCount, conflicts, runUrl, results }) {
  const lines = [
    MARKER,
    'This PR brings the latest `Notifuse/notifuse` main into the branded WeScale main branch. It requires manual review and merge; this workflow never merges or writes to main.',
    '',
    `- Upstream: [\`${upstreamSha}\`](https://github.com/Notifuse/notifuse/commit/${upstreamSha})`,
    `- Validation base: \`${baseSha}\``,
    `- New upstream commits: ${commitCount}`,
    `- Independent integration checks: [workflow run](${runUrl})`,
    '',
    '### Integration checks',
    '',
  ]
  if (conflicts.length) {
    lines.push('**Merge conflicts require resolution.** Build and test jobs were skipped because a clean merged tree could not be prepared.', '', ...conflicts.map(path => `- \`${path.replace(/`/g, '\\`').replace(/[\r\n]/g, ' ')}\``))
  } else if (results) {
    lines.push('| Check | Result |', '| --- | --- |', `| Console production build and unit tests | ${results.console} |`, `| Notification center build and unit tests | ${results.notifications} |`, `| Go config, mailer, HTTP, and service tests | ${results.go} |`)
    if (!Object.values(results).every(result => result === 'success')) {
      lines.push('', '**Do not merge until the failing or incomplete checks have been resolved.**')
    }
  } else {
    lines.push('A clean merge was detected. This workflow is validating the pinned branded main + upstream snapshot; results will appear here when the jobs finish.')
  }
  lines.push(
    '',
    'These checks run here independently of bot-created PR workflow approvals. They validate the exact base and upstream commits listed above; review the latest run if main moves.',
    '',
    '### Review guidance',
    '',
    '- Review UI, assets, translation catalogs, and email templates for changes that affect WeScale branding.',
    '- Resolve conflicts on a separate review branch. `updates/notifuse` is an automatically managed mirror and may be refreshed on the next scheduled run.',
    '- Use a merge commit to retain upstream ancestry. Squashing the PR does not record the upstream commits as integrated and can cause the same updates to be offered again.',
    '- No releases, tags, deployments, or automatic merges are performed.'
  )
  return lines.join('\n')
}

module.exports = async ({ github, context, core }) => {
  if (context.repo.owner !== 'Juanlucasbg' || context.repo.repo !== 'wescale-emailer') {
    throw new Error('Upstream intake can only manage Juanlucasbg/wescale-emailer.')
  }
  const { BASE_SHA: baseSha, UPSTREAM_SHA: upstreamSha, COMMIT_COUNT: commitCount, CONFLICTS_JSON, CHECK_RESULTS } = process.env
  const conflicts = JSON.parse(CONFLICTS_JSON || '[]')
  const results = CHECK_RESULTS ? JSON.parse(CHECK_RESULTS) : null
  const runUrl = `${process.env.GITHUB_SERVER_URL}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`
  const body = renderBody({ baseSha, upstreamSha, commitCount, conflicts, runUrl, results })
  const title = `chore: review Notifuse upstream updates (${upstreamSha.slice(0, 7)})`
  let number = Number(process.env.PR_NUMBER || 0)
  if (!number) {
    const { data: existing } = await github.rest.pulls.list({ ...context.repo, state: 'open', base: BASE, head: `${context.repo.owner}:${BRANCH}` })
    if (existing.length > 1) throw new Error('Multiple open PRs use the managed branch; resolve the ambiguity manually.')
    if (existing[0]) {
      if (!existing[0].body?.includes(MARKER)) {
        throw new Error('Existing PR is not marked as workflow-managed. Refusing to overwrite its description.')
      }
      number = existing[0].number
    }
  }
  let pull
  if (number) {
    const { data: current } = await github.rest.pulls.get({ ...context.repo, pull_number: number })
    if (current.state !== 'open' || current.head.ref !== BRANCH || current.base.ref !== BASE || !current.body?.includes(MARKER)) {
      throw new Error('The managed PR changed or closed during validation. Refusing to update it.')
    }
    // Avoid reporting an older run against a branch that a maintainer has moved.
    if (current.head.sha !== upstreamSha) throw new Error('The update branch no longer matches this run; refusing to attach stale results.')
    ;({ data: pull } = await github.rest.pulls.update({ ...context.repo, pull_number: number, title, body }))
  } else {
    ;({ data: pull } = await github.rest.pulls.create({ ...context.repo, title, body, base: BASE, head: BRANCH, maintainer_can_modify: false }))
    number = pull.number
  }
  core.setOutput('pr_number', number)
  await core.summary.addHeading(results ? 'Upstream integration results' : 'Upstream update PR').addLink(`Review PR #${number}`, pull.html_url).addRaw('\n\n').addRaw(body).write()
}
module.exports.renderBody = renderBody
