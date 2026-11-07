// Runs the exact Code-node scripts from workflow/ against synthetic inputs.
// Usage: node tests/run_tests.js   (Node 18+)
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const src = f => fs.readFileSync(path.join(__dirname, '..', 'workflow', f), 'utf8');
const CTX = src('prepare_lead_context.js');
const ICP = src('apply_icp_rules.js');
const PROP = src('build_proposal_fields.js');

function run(code, nodes, input) {
  const $ = name => { if (!(name in nodes)) throw new Error('no node ' + name); return { first: () => ({ json: nodes[name] }) }; };
  const $input = { first: () => ({ json: input }) };
  return new Function('$', '$input', code)($, $input)[0].json;
}
const baseLead = { lead_id: 'L-test', submitted_at: '2026-11-07T00:00:00Z', first_name: 'Priya', last_name: 'Shah', email: 'priya@northwind.example', company: 'Northwind', website: 'northwind.example', job_title: 'Head of Finance', company_size: '51-200', plan_interest: 'Growth', message: 'Close takes 9 days on NetSuite.', source: 'test' };
const longPage = { data: { markdown: '# Northwind\n' + 'We move freight for B2B shippers across Europe. '.repeat(10) + '![logo](x.png) [About](/about)', metadata: { title: 'Northwind', description: 'Freight' } } };
const claude = obj => ({ content: [{ type: 'text', text: typeof obj === 'string' ? obj : JSON.stringify(obj) }], usage: { input_tokens: 1000, output_tokens: 400 }, model: 'claude-haiku-5-5', stop_reason: 'end_turn' });
const good = { role_fit: { score: 28, evidence: 'Head of Finance' }, company_fit: { score: 22, evidence: '51-200' }, pain_fit: { score: 25, evidence: '9-day close' }, buying_signal: { score: 10, evidence: 'chose Growth' }, recommended_plan: 'Growth', pain_points: ['9-day close', 'NetSuite'], summary: 'Strong fit.', confidence: 'high' };

let pass = 0;
const check = (name, fn) => { fn(); pass++; console.log('ok  ' + name); };

// Prepare Lead Context
check('scrape ok: links and images stripped, status ok', () => {
  const r = run(CTX, { 'Normalize Lead': baseLead }, longPage);
  assert.strictEqual(r.enrichment_status, 'ok');
  assert.ok(!/png|\]\(/.test(r.website_excerpt));
  assert.deepStrictEqual(r.rule_flags, []);
});
check('scrape error -> failed, excerpt empty', () => {
  const r = run(CTX, { 'Normalize Lead': baseLead }, { error: { message: 'ENOTFOUND' } });
  assert.strictEqual(r.enrichment_status, 'failed');
  assert.strictEqual(r.website_excerpt, '');
});
check('no website -> skipped', () => {
  const r = run(CTX, { 'Normalize Lead': Object.assign({}, baseLead, { website: '' }) }, baseLead);
  assert.strictEqual(r.enrichment_status, 'skipped_no_website');
});
check('personal email flagged, not as domain mismatch', () => {
  const r = run(CTX, { 'Normalize Lead': Object.assign({}, baseLead, { email: 'p@gmail.com' }) }, longPage);
  assert.ok(r.rule_flags.includes('personal_email'));
  assert.ok(!r.rule_flags.includes('email_domain_mismatch'));
});
check('subdomain website matches email root domain', () => {
  const r = run(CTX, { 'Normalize Lead': Object.assign({}, baseLead, { website: 'www.app.northwind.example' }) }, longPage);
  assert.ok(!r.rule_flags.includes('email_domain_mismatch'));
});
check('student flagged from job title', () => {
  const r = run(CTX, { 'Normalize Lead': Object.assign({}, baseLead, { job_title: 'Student' }) }, longPage);
  assert.ok(r.rule_flags.includes('student_or_education'));
});

// Apply ICP Rules
const ctxOk = run(CTX, { 'Normalize Lead': baseLead }, longPage);
check('total is computed in code and sets tier A', () => {
  const r = run(ICP, { 'Prepare Lead Context': ctxOk }, claude(Object.assign({ total: 99 }, good)));
  assert.strictEqual(r.score, 85);
  assert.strictEqual(r.tier, 'A');
  assert.ok(r.rule_notes.some(n => /model total 99 ignored/.test(n)));
  assert.strictEqual(r.deal_amount, 18000);
  assert.strictEqual(r.deal_stage, 'qualifiedtobuy');
});
check('out-of-range sub-score is clamped', () => {
  const r = run(ICP, { 'Prepare Lead Context': ctxOk }, claude(Object.assign({}, good, { role_fit: { score: 45, evidence: 'x' } })));
  assert.strictEqual(r.score_breakdown.role_fit.score, 30);
  assert.strictEqual(r.score, 87);
});
check('code fences around JSON still parse', () => {
  const r = run(ICP, { 'Prepare Lead Context': ctxOk }, claude('```json\n' + JSON.stringify(good) + '\n```'));
  assert.strictEqual(r.tier, 'A');
});
check('unparseable output -> review tier, no deal', () => {
  const r = run(ICP, { 'Prepare Lead Context': ctxOk }, claude('Sorry, I cannot score this.'));
  assert.strictEqual(r.tier, 'review');
  assert.strictEqual(r.needs_deal, false);
  assert.strictEqual(r.score, null);
});
check('API error item -> review tier', () => {
  const r = run(ICP, { 'Prepare Lead Context': ctxOk }, { error: { message: '529 overloaded' } });
  assert.strictEqual(r.tier, 'review');
  assert.ok(r.rule_notes.some(n => /ai_error/.test(n)));
});
check('student cap holds even when the AI scores high', () => {
  const c = Object.assign({}, ctxOk, { rule_flags: ['student_or_education'] });
  const r = run(ICP, { 'Prepare Lead Context': c }, claude(good));
  assert.strictEqual(r.score, 15);
  assert.strictEqual(r.tier, 'C');
});
check('personal email caps at 60 (tier B, never A)', () => {
  const c = Object.assign({}, ctxOk, { rule_flags: ['personal_email'] });
  const r = run(ICP, { 'Prepare Lead Context': c }, claude(good));
  assert.strictEqual(r.score, 60);
  assert.strictEqual(r.tier, 'B');
});
check('lead plan choice wins over AI suggestion, noted', () => {
  const r = run(ICP, { 'Prepare Lead Context': ctxOk }, claude(Object.assign({}, good, { recommended_plan: 'Scale' })));
  assert.strictEqual(r.recommended_plan, 'Growth');
  assert.ok(r.rule_notes.some(n => /AI suggested Scale/.test(n)));
});
check('no plan chosen -> AI plan; invalid AI plan -> Growth default', () => {
  const c = Object.assign({}, ctxOk, { plan_interest: '' });
  assert.strictEqual(run(ICP, { 'Prepare Lead Context': c }, claude(Object.assign({}, good, { recommended_plan: 'Starter' }))).recommended_plan, 'Starter');
  const r = run(ICP, { 'Prepare Lead Context': c }, claude(Object.assign({}, good, { recommended_plan: 'Enterprise' })));
  assert.strictEqual(r.recommended_plan, 'Growth');
  assert.strictEqual(r.plan_source, 'default');
});
check('tier boundaries: 70 is A, 69 is B, 45 is B, 44 is C', () => {
  const mk = t => claude({ role_fit: { score: Math.min(30, t) }, company_fit: { score: Math.max(0, Math.min(25, t - 30)) }, pain_fit: { score: Math.max(0, Math.min(30, t - 55)) }, buying_signal: { score: Math.max(0, t - 85) } });
  const tierOf = t => run(ICP, { 'Prepare Lead Context': ctxOk }, mk(t)).tier;
  assert.deepStrictEqual([tierOf(70), tierOf(69), tierOf(45), tierOf(44)], ['A', 'B', 'B', 'C']);
});

check('v1.1: high total but non-decision-maker role is B, not A', () => {
  const r = run(ICP, { 'Prepare Lead Context': ctxOk }, claude(Object.assign({}, good, { role_fit: { score: 18, evidence: 'Senior Accountant' }, pain_fit: { score: 30, evidence: 'x' }, buying_signal: { score: 15, evidence: 'x' } })));
  assert.strictEqual(r.score, 85);
  assert.strictEqual(r.tier, 'B');
  assert.ok(r.rule_notes.some(n => /decision-maker/.test(n)));
});

// Check Proposal Draft
const icpA = run(ICP, { 'Prepare Lead Context': ctxOk }, claude(good));
const intro = n => 'Priya, you told us your close takes 9 days on NetSuite and that your team rebuilds the same spreadsheets each month. Ledgerly pulls the trial balance, reconciles it and explains every variance in plain English, so your team reviews instead of rebuilding. The Growth plan covers up to five entities and drafts your board pack. ' + n;
check('clean intro passes and fills all fields', () => {
  const r = run(PROP, { 'Apply ICP Rules': icpA }, claude({ intro: intro(''), pain_points: ['9-day close', 'NetSuite'] }));
  assert.strictEqual(r.proposal_gate_passed, true, r.proposal_gate_notes);
  assert.strictEqual(Object.keys(r.fields).length, 10);
  assert.strictEqual(r.fields['[[PRICE]]'], '$18,000');
});
check('invented number triggers fallback text', () => {
  const r = run(PROP, { 'Apply ICP Rules': icpA }, claude({ intro: intro('Customers save 40% of close time.'), pain_points: ['x'] }));
  assert.strictEqual(r.proposal_gate_passed, false);
  assert.match(r.proposal_gate_notes, /numbers not in lead data: 40%/);
  assert.match(r.fields['[[INTRO]]'], /^Thank you for asking about Ledgerly/);
});
check('hype word triggers fallback', () => {
  const r = run(PROP, { 'Apply ICP Rules': icpA }, claude({ intro: intro('It will unlock real value.'), pain_points: ['x'] }));
  assert.match(r.proposal_gate_notes, /banned word: unlock/);
});
check('AI failure still produces a usable proposal', () => {
  const r = run(PROP, { 'Apply ICP Rules': icpA }, { error: { message: 'timeout' } });
  assert.strictEqual(r.proposal_gate_passed, false);
  assert.ok(r.fields['[[PAIN_POINTS]]'].startsWith('- '));
});

console.log('\n' + pass + ' tests passed');
