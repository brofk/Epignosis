import {readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

export function weeklyReport(records, start, end) {
  if (!Number.isFinite(+start) || !Number.isFinite(+end) || +start >= +end) throw new Error('Invalid report window');
  const latest = new Map(), groups = new Map();
  for (const r of records) latest.set(JSON.stringify([r.repository, r.runId, r.attempt, r.batch]), r);
  for (const r of latest.values()) {
    const timestamp = Date.parse(r.timestamp);
    if (!Number.isFinite(timestamp)) throw new Error('Invalid usage timestamp');
    if (timestamp < +start || timestamp >= +end) continue;
    // Only trusted reviewer telemetry is supported. No prompts or code enter the report.
    if (!/^[a-zA-Z0-9._-]+$/.test(r.model) || r.workflow !== 'ai-production-review') throw new Error('Invalid usage identity');
    const key = `${r.workflow} / ${r.model}`;
    const g = groups.get(key) || {calls: 0, input: 0, cached: 0, output: 0, usd: 0, unknown: 0, unpriced: 0};
    g.calls++;
    if (!r.usageKnown) g.unknown++;
    else {
      for (const k of ['inputTokens', 'cacheReadTokens', 'outputTokens']) if (!Number.isSafeInteger(r[k]) || r[k] < 0) throw new Error('Invalid token count');
      g.input += r.inputTokens; g.cached += r.cacheReadTokens; g.output += r.outputTokens;
      if (r.estimatedUsd === null) g.unpriced++;
      else if (!Number.isFinite(r.estimatedUsd) || r.estimatedUsd < 0) throw new Error('Invalid cost');
      else g.usd += r.estimatedUsd;
    }
    groups.set(key, g);
  }
  const rows = [...groups].sort(([a], [b]) => a.localeCompare(b));
  const markdown = [
    '# Weekly AI cost report', '', `${start.toISOString()} to ${end.toISOString()} (end exclusive).`,
    'Schedule: Monday 09:00 Asia/Manila. Window: previous seven days ending Monday 00:00 Asia/Manila.', '',
    'Scope: this repository’s direct OpenAI production reviewer. GitHub Copilot credits, ChatGPT usage and Actions minutes are excluded.', '',
    '| Workflow / model | Calls | Uncached input | Cache reads | Cache writes | Output | Estimated USD subtotal | Unknown usage | Unpriced calls |',
    '|---|---:|---:|---:|---|---:|---:|---:|---:|',
    ...rows.map(([key,g]) => `| ${key} | ${g.calls} | ${g.input} | ${g.cached} | Not separately reported | ${g.output} | ${g.usd.toFixed(6)} | ${g.unknown} | ${g.unpriced} |`), '',
    rows.length ? '' : 'No recorded calls in this window. This does not establish zero billed spending.',
    'USD figures are standard-price estimates, not invoices. Unknown usage and unpriced calls are excluded from the subtotal. Responses API cache writes are not separately exposed by this implementation; they are never reported as zero.',
    'Cache read rate: ' + (()=>{const input=rows.reduce((n,[,g])=>n+g.input+g.cached,0);const cached=rows.reduce((n,[,g])=>n+g.cached,0);return input ? (100*cached/input).toFixed(1)+'% of measured input tokens.' : 'unavailable.';})(),
    'Review the largest model/workflow subtotal first. Low cache reads can reflect short prefixes, changed inputs, expiry, or routing; they do not prove an architectural fault.',
    'Routing preserves strong review for application and sensitive changes. Cheaper documentation review is a scoped policy, not proof of equivalent model quality.',
    'Telemetry starts at activation. Missing, expired, cancelled-before-upload, or pre-activation artifacts limit coverage. Compare against the provider bill before treating the subtotal as complete.'
  ].filter(x=>x!==undefined).join('\n')+'\n';
  return {markdown, groups: Object.fromEntries(rows), start: start.toISOString(), end: end.toISOString()};
}
export function reportWindow(now = new Date()) {
  const end = new Date(now); end.setUTCHours(16,0,0,0);
  if (+end > +now) end.setUTCDate(end.getUTCDate()-1);
  end.setUTCDate(end.getUTCDate()-end.getUTCDay());
  return {start: new Date(+end-7*86400000), end};
}
function files(dir) {return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):e.name.endsWith('.jsonl')?[join(dir,e.name)]:[]);}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const end = process.env.REPORT_END ? new Date(process.env.REPORT_END) : reportWindow().end;
  const start = new Date(+end - 7*86400000);
  const records=files(process.argv[2] || 'telemetry').flatMap(p=>readFileSync(p,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l)));
  const report=weeklyReport(records,start,end);
  writeFileSync('weekly-ai-cost.md', report.markdown);
  writeFileSync('weekly-ai-cost.json', JSON.stringify(report,null,2)+'\n');
  if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY,report.markdown,{flag:'a'});
}
