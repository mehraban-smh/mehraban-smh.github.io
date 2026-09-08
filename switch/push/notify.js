/* SWITCH comfort study - tells the research team about new registrations.
 * Runs every hour from .github/workflows/push-reminders.yml, straight after send.js.
 *
 * Nobody can check in until the team has approved them on the dashboard (see the participants section
 * of switch/supabase-setup.sql). This script finds the participants nobody has been told about yet
 * (notified_at is null) and, if any of them are still waiting, opens ONE issue in this repository with
 * the gh CLI listing their codes and registration times, assigned to the repository owner so GitHub
 * emails them. It stamps notified_at only for the rows the issue covers, and only once the issue
 * exists, so a run that could not open it tries again next hour; participants who were approved
 * before the run only get the stamp. At most 25 rows are handled per run, the rest wait for the next.
 *
 * The repository is public, so the issue carries only the participant codes, the registration times
 * and the dashboard link: never the name or the email. The script does not even read those columns.
 *
 * Secrets / environment (set by the workflow, see switch/README.md):
 *   SUPABASE_SERVICE_ROLE_KEY  a Supabase secret key (sb_secret_...)
 *   GH_TOKEN                   the workflow's own GITHUB_TOKEN (the workflow grants "issues: write")
 *   GH_REPO                    owner/repository, filled in from github.repository
 * The project URL is public and is read from ../config.js.
 * Optional:
 *   DRY_RUN=1                  log what would happen and change nothing
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const config = fs.readFileSync(path.join(__dirname, '..', 'config.js'), 'utf8');
const cfgVal = k => (config.match(new RegExp(k + ':\\s*"([^"]*)"')) || [])[1] || '';
const cleanUrl = u => (u || '').trim().replace(/\/+$/, '').replace(/\/(rest|auth)\/v1$/, '');
const looksLikeProject = u => /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(u);
const envUrl = cleanUrl(process.env.SUPABASE_URL);
const URL_ = looksLikeProject(envUrl) ? envUrl : cleanUrl(cfgVal('supabaseUrl'));

// Secrets are trimmed and normalised so a copy-paste slip gives a clear message instead of a mystery.
const rawKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const KEY = (rawKey.match(/sb_secret_[A-Za-z0-9_-]+/) || rawKey.match(/eyJ[A-Za-z0-9_.-]+/) || [rawKey])[0];
const GH_TOKEN = (process.env.GH_TOKEN || '').trim();
const GH_REPO = (process.env.GH_REPO || '').trim();
const DRY = process.env.DRY_RUN === '1';
const DASHBOARD = 'https://mehraban.uk/switch/dashboard/';
const LIMIT = 25;   // rows handled per run; anything beyond waits for the next hour

function fail(msg) { console.error('ERROR: ' + msg); process.exit(1); }
const mask = s => s ? s.slice(0, 12) + '...(' + s.length + ' chars)' : '(empty)';
console.log(`Supabase URL: ${URL_ || '(empty)'}`);
console.log(`Secret key:   ${mask(KEY)}`);
console.log(`Repository:   ${GH_REPO || '(empty)'}${GH_TOKEN ? '' : ', no GH_TOKEN'}${DRY ? ' (dry run)' : ''}`);
if (!URL_) fail('supabaseUrl is empty in switch/config.js');
if (!looksLikeProject(URL_)) fail(`supabaseUrl in switch/config.js does not look like a project URL: "${URL_}"`);
if (!KEY) fail('SUPABASE_SERVICE_ROLE_KEY secret is empty. Create a secret key under Settings > API Keys > Secret keys');
if (KEY.startsWith('sb_publishable_')) fail('SUPABASE_SERVICE_ROLE_KEY contains the publishable key. It needs a secret key (sb_secret_...) from Settings > API Keys > Secret keys');
if (!DRY && !GH_TOKEN) fail('GH_TOKEN is empty. The workflow passes secrets.GITHUB_TOKEN to the "Notify about new participants" step');
if (!DRY && !/^[\w.-]+\/[\w.-]+$/.test(GH_REPO)) fail(`GH_REPO should be owner/repository, got "${GH_REPO}". The workflow passes github.repository`);

// New-style secret keys (sb_secret_...) go in the apikey header only; legacy service_role JWTs also need Bearer.
const headers = KEY.startsWith('sb_secret_')
  ? { apikey: KEY, 'Content-Type': 'application/json' }
  : { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };
const rest = q => `${URL_}/rest/v1/participants${q}`;

/* ---- the GitHub side: one issue per run listing everyone waiting, through the gh CLI on the runner ---- */
const gh = args => execFileSync('gh', args, { env: { ...process.env, GH_TOKEN, GH_REPO }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const codes = list => list.map(p => p.code).join(', ');
const title = n => `${n} new participant${n === 1 ? '' : 's'} waiting for approval`;
const when = iso => { const d = new Date(iso || ''); return isNaN(d) ? 'unknown time' : d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC'; };
const issueBody = list => [
  'Waiting for approval:',
  '',
  ...list.map(p => `- ${p.code}, registered ${when(p.created_at)}`),
  '',
  `Open the dashboard at ${DASHBOARD}, check who they are, and click Approve so they can start checking in (or Remove for anyone you do not recognise), then close this issue.`
].join('\n');
// Guards against a second email if a previous run opened the issue but could not record it: the
// codes already mentioned in an approval issue (open or closed) are not listed again.
function codesAlreadyListed() {
  const seen = new Set();
  try {
    const out = gh(['issue', 'list', '--repo', GH_REPO, '--state', 'all', '--search', '"waiting for approval" in:title', '--json', 'body', '--limit', '100']);
    for (const issue of JSON.parse(out || '[]')) for (const c of String(issue.body || '').match(/\bP\d{2,3}\b/g) || []) seen.add(c);
  } catch (e) { /* treated as "none found": at worst one extra email */ }
  return seen;
}
function openIssue(list) {
  const args = ['issue', 'create', '--repo', GH_REPO, '--title', title(list.length), '--body', issueBody(list)];
  // Assigning the owner makes GitHub email them even if they do not watch the repository. An
  // organisation cannot be an assignee, so fall back to a plain issue in that case.
  try { return gh([...args, '--assignee', GH_REPO.split('/')[0]]); }
  catch (e) { return gh(args); }
}
const ghError = e => (e && e.code === 'ENOENT') ? 'the gh CLI is not installed on this runner' : String((e && (e.stderr || e.message)) || e).trim();

async function main() {
  const now = new Date();
  // Only the columns needed: the name and email never leave the database.
  const r = await fetch(rest('?select=code,approved,created_at&notified_at=is.null&order=code'), { headers });
  if (r.status === 401 || r.status === 403) fail(`Supabase refused the secret key (${r.status}). Check the SUPABASE_SERVICE_ROLE_KEY secret: ${await r.text()}`);
  if (r.status === 404) fail(`table participants was not found. Run supabase-setup.sql again in the SQL editor: ${await r.text()}`);
  if (!r.ok) {
    const text = await r.text();
    if (r.status === 400 && /notified_at|approved/.test(text)) fail(`participants has no approval columns yet. Run supabase-setup.sql again in the SQL editor: ${text}`);
    fail(`could not read participants (${r.status}): ${text}`);
  }
  const all = await r.json();
  const people = all.slice(0, LIMIT);
  if (all.length > LIMIT) console.log(`${all.length} participant(s) not yet notified: handling the first ${LIMIT} now, the other ${all.length - LIMIT} on the next run`);
  const waiting = people.filter(p => !p.approved);
  const approved = people.filter(p => !waiting.includes(p));
  let opened = 0, marked = 0, failed = 0;
  const toMark = [];   // rows the team has now been told about (or never needed to be)

  for (const p of approved) {
    if (DRY) console.log(`[dry run] ${p.code} is already approved; would only mark it as notified`);
    else toMark.push(p);
  }
  if (waiting.length) {
    if (DRY) {
      console.log(`[dry run] would open one issue "${title(waiting.length)}" listing ${waiting.map(p => `${p.code} (registered ${when(p.created_at)})`).join(', ')} and mark them as notified`);
    } else {
      const seen = codesAlreadyListed();
      const listed = waiting.filter(p => seen.has(p.code)), fresh = waiting.filter(p => !seen.has(p.code));
      if (listed.length) { console.log(`${codes(listed)}: already listed in an issue, not opening another`); toMark.push(...listed); }
      if (fresh.length) {
        try { const url = openIssue(fresh); opened++; console.log(`opened ${url || 'an issue'} for ${codes(fresh)}`); toMark.push(...fresh); }
        catch (e) {
          const why = ghError(e);
          if (/not installed/.test(why)) fail(why);
          // Not stamped, so the next run lists them again.
          failed++; console.error(`could not open an issue for ${codes(fresh)}, will try again next hour: ${why}`);
        }
      }
    }
  }
  for (const p of toMark) {
    const u = await fetch(rest(`?code=eq.${encodeURIComponent(p.code)}`), { method: 'PATCH', headers: { ...headers, Prefer: 'return=minimal' }, body: JSON.stringify({ notified_at: now.toISOString() }) });
    if (u.ok) marked++;
    else { failed++; console.error(`${p.code}: could not record the notification (${u.status}): ${await u.text()}`); }
  }
  console.log(`${now.toISOString()} - ${all.length} participant(s) not yet notified, opened ${opened} issue(s), marked ${marked} as notified${failed ? `, ${failed} failed` : ''}`);
  if (failed) process.exitCode = 1;
}
main().catch(err => fail(err.message));
