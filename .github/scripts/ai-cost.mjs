import {createHash} from 'node:crypto';
import {appendFileSync, mkdirSync} from 'node:fs';
import {dirname} from 'node:path';

// Default to the existing strong reviewer. A routine lane cannot be selected by PR text.
export function selectRoute(files, env = process.env) {
  const strong = env.OPENAI_REVIEW_MODEL || 'gpt-5.4';
  const routine = env.OPENAI_ROUTINE_MODEL || 'gpt-5.4-mini';
  const docs = path => /^(?:docs\/[^\n]+\.md|wpmn-ecf-website\/docs\/[^\n]+\.md|README\.md|wpmn-ecf-website\/README\.md)$/.test(path)
    && !/(?:security|auth|payment|giving|migration|schema|agent|reviewer|secret)/i.test(path);
  const routineOnly = files.length > 0 && files.length <= 4 && files.every(f =>
    docs(f.filename) && (!f.previous_filename || docs(f.previous_filename)) &&
    f.status === 'modified' && typeof f.patch === 'string' && f.patch.includes('@@') &&
    !f.patch.includes('Binary files') && !f.patch.includes('old mode') &&
    !/```|~~~|<script|\b(?:curl|sudo|eval|exec|OPENAI_API_KEY)\b/i.test(f.patch)) &&
    files.reduce((n, f) => n + f.patch.length, 0) <= 12_000;
  return {model: routineOnly ? routine : strong, lane: routineOnly ? 'routine-docs' : 'complex',
    reason: routineOnly ? 'Small prose-only documentation change' : 'Application, sensitive, executable, large, or unknown change'};
}

export function cacheKey(repository, instructions, schema) {
  return 'review-' + createHash('sha256').update(JSON.stringify([repository, instructions, schema])).digest('hex').slice(0, 48);
}

// Standard USD prices, verified 2026-10-05. Overrides have unknown prices, not zero costs.
export const prices = {'gpt-5.4': {input: 2.5, cached: 0.25, output: 15},
  'gpt-5.4-mini': {input: 0.75, cached: 0.075, output: 4.5}};
export function usageRecord(payload, metadata, now = new Date()) {
  const u = payload.usage;
  const valid = n => Number.isSafeInteger(n) && n >= 0;
  if (!u || !valid(u.input_tokens) || !valid(u.output_tokens) ||
    !valid(u.input_tokens_details?.cached_tokens) || u.input_tokens_details.cached_tokens > u.input_tokens) {
    return {...metadata, timestamp: now.toISOString(), usageKnown: false, estimatedUsd: null};
  }
  const model = payload.model || metadata.model;
  const rate = prices[model] || (model.startsWith(metadata.model + '-') ? prices[metadata.model] : null);
  const cached = u.input_tokens_details.cached_tokens;
  const input = u.input_tokens - cached;
  return {...metadata, model, timestamp: now.toISOString(), usageKnown: true,
    inputTokens: input, cacheReadTokens: cached, cacheWriteTokens: null,
    outputTokens: u.output_tokens, estimatedUsd: rate && u.input_tokens <= 272_000 && (!payload.service_tier || payload.service_tier === 'default')
      ? (input * rate.input + cached * rate.cached + u.output_tokens * rate.output) / 1e6 : null,
    priceVerified: '2026-10-05', responseId: payload.id || null};
}
export function recordUsage(payload, metadata, path = process.env.AI_USAGE_PATH || 'ai-usage/usage.jsonl') {
  mkdirSync(dirname(path), {recursive: true});
  const row = usageRecord(payload, metadata);
  appendFileSync(path, JSON.stringify(row) + '\n', {mode: 0o600});
  return row;
}
