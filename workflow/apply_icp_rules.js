// n8n Code node "Apply ICP Rules" (Run once for all items).
// Claude proposes sub-scores with evidence. Code clamps them, adds them up,
// applies hard caps and sets the tier. The AI never sets the total or the tier.
const ctx = $('Prepare Lead Context').first().json;
const res = ($input.first() && $input.first().json) || {};

const RANGES = { role_fit: 30, company_fit: 25, pain_fit: 30, buying_signal: 15 };
const PLANS = { Starter: 6000, Growth: 18000, Scale: 40000 };
const TIER_A = 70; // hot: deal + proposal
const TIER_B = 45; // warm: deal, no proposal
const CAPS = { student_or_education: 15, personal_email: 60 };
const A_MIN_ROLE = 20; // v1.1: tier A (proposal sent) needs a decision-maker

function textOf(r) {
  if (Array.isArray(r.content)) return r.content.map(function (c) { return c.type === 'text' ? (c.text || '') : ''; }).join('');
  return String(r.text || r.output || '');
}
function parse(text) {
  const t = text.replace(/^\s*```(json)?/i, '').replace(/```\s*$/, '').trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('no JSON object in model output');
  return JSON.parse(t.slice(start, end + 1));
}

const usage = res.usage || {};
const raw = textOf(res);
const notes = [];
let parsed = null;
try { parsed = parse(raw); } catch (e) { notes.push('parse_failed: ' + e.message); }
if (res.error) notes.push('ai_error: ' + String(res.error.message || res.error).slice(0, 200));

let breakdown = null;
let total = null;
let tier = 'review';
if (parsed) {
  breakdown = {};
  total = 0;
  Object.keys(RANGES).forEach(function (k) {
    const part = parsed[k] || {};
    let s = Number(part.score);
    if (!isFinite(s)) { s = 0; notes.push(k + ': missing score, set to 0'); }
    const clamped = Math.max(0, Math.min(RANGES[k], Math.round(s)));
    if (clamped !== Math.round(s)) notes.push(k + ': ' + s + ' clamped to ' + clamped);
    breakdown[k] = { score: clamped, max: RANGES[k], evidence: String(part.evidence || 'not stated').slice(0, 300) };
    total += clamped;
  });
  if (parsed.total !== undefined && Number(parsed.total) !== total) notes.push('model total ' + parsed.total + ' ignored, code total ' + total);
  (ctx.rule_flags || []).forEach(function (f) {
    if (CAPS[f] !== undefined && total > CAPS[f]) { notes.push(f + ': capped ' + total + ' to ' + CAPS[f]); total = CAPS[f]; }
  });
  tier = total >= TIER_A ? 'A' : total >= TIER_B ? 'B' : 'C';
  if (tier === 'A' && breakdown.role_fit.score < A_MIN_ROLE) { tier = 'B'; notes.push('tier A needs role_fit >= ' + A_MIN_ROLE + ' (decision-maker); moved to B'); }
}

const aiPlan = parsed && PLANS[parsed.recommended_plan] ? parsed.recommended_plan : '';
const formPlan = PLANS[ctx.plan_interest] ? ctx.plan_interest : '';
const plan = formPlan || aiPlan || 'Growth';
const planSource = formPlan ? 'lead_choice' : aiPlan ? 'ai_recommendation' : 'default';
if (formPlan && aiPlan && formPlan !== aiPlan) notes.push('lead chose ' + formPlan + ', AI suggested ' + aiPlan);

const painPoints = parsed && Array.isArray(parsed.pain_points) ? parsed.pain_points.map(String).filter(Boolean).slice(0, 4) : [];

const lifecycle = { A: 'salesqualifiedlead', B: 'marketingqualifiedlead', C: 'lead', review: 'lead' }[tier];
const stage = { A: 'qualifiedtobuy', B: 'appointmentscheduled' }[tier] || '';

const summaryLine = tier === 'review'
  ? 'Needs manual review: AI score unavailable.'
  : 'ICP score ' + total + '/100, tier ' + tier + '. ' + String((parsed && parsed.summary) || '').slice(0, 300);

const description = [
  summaryLine,
  breakdown ? Object.keys(breakdown).map(function (k) { return k + ' ' + breakdown[k].score + '/' + breakdown[k].max + ': ' + breakdown[k].evidence; }).join('\n') : '',
  ctx.rule_flags && ctx.rule_flags.length ? 'Flags: ' + ctx.rule_flags.join(', ') : '',
  'Plan: ' + plan + ' (' + planSource + '). Lead ' + ctx.lead_id + '.'
].filter(Boolean).join('\n');

return [{ json: Object.assign({}, ctx, {
  score: total,
  tier: tier,
  needs_deal: tier === 'A' || tier === 'B',
  hot: tier === 'A',
  deal_stage: stage,
  lifecycle_stage: lifecycle,
  recommended_plan: plan,
  plan_source: planSource,
  deal_amount: PLANS[plan],
  score_breakdown: breakdown,
  score_summary: (parsed && parsed.summary) || '',
  pain_points: painPoints,
  confidence: (parsed && parsed.confidence) || '',
  rule_notes: notes,
  deal_description: description.slice(0, 2000),
  ai_model: res.model || '',
  ai_stop_reason: res.stop_reason || '',
  ai_input_tokens: usage.input_tokens || 0,
  ai_output_tokens: usage.output_tokens || 0,
  ai_raw: raw.slice(0, 3000)
}) }];
