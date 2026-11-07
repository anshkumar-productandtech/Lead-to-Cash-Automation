// n8n Code node "Check Proposal Draft" (Run once for all items).
// Checks Claude's proposal intro in code before it goes into a customer-facing doc.
// If a check fails, a plain template sentence is used instead and the deal is flagged.
const ctx = $('Apply ICP Rules').first().json;
const res = ($input.first() && $input.first().json) || {};

const BANNED = ['game-changer', 'game changer', 'revolutioniz', 'unlock', 'supercharge', 'delve', 'leverage', 'cutting-edge', 'seamless', 'world-class', 'best-in-class'];
const PRICES = { Starter: '$6,000', Growth: '$18,000', Scale: '$40,000' };

function textOf(r) {
  if (Array.isArray(r.content)) return r.content.map(function (c) { return c.type === 'text' ? (c.text || '') : ''; }).join('');
  return String(r.text || r.output || '');
}
const raw = textOf(res);
const notes = [];
let draft = null;
try {
  const t = raw.replace(/^\s*```(json)?/i, '').replace(/```\s*$/, '').trim();
  draft = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
} catch (e) { notes.push('proposal JSON did not parse'); }

let intro = draft && typeof draft.intro === 'string' ? draft.intro.trim() : '';
let pains = draft && Array.isArray(draft.pain_points) ? draft.pain_points.map(String).map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 4) : [];

const words = intro ? intro.split(/\s+/).length : 0;
if (intro && (words < 40 || words > 140)) notes.push('intro is ' + words + ' words (40 to 140 allowed)');
const lower = intro.toLowerCase();
BANNED.forEach(function (b) { if (lower.indexOf(b) !== -1) notes.push('banned word: ' + b); });
if (intro.indexOf('—') !== -1) notes.push('em dash');

// Every number in the intro must come from what the lead wrote, the website, or the price list.
const allowed = [ctx.message, ctx.website_excerpt, ctx.company_size, Object.keys(PRICES).map(function (k) { return PRICES[k]; }).join(' '), '30'].join(' ').replace(/,/g, '').toLowerCase();
const nums = (intro.match(/\d[\d,.]*%?/g) || []).map(function (n) { return n.replace(/,/g, '').replace(/[.]$/, ''); });
const unknown = nums.filter(function (n) { return allowed.indexOf(n.toLowerCase()) === -1; });
if (unknown.length) notes.push('numbers not in lead data: ' + unknown.join(', '));

const passed = !!intro && notes.length === 0;
if (!passed) {
  intro = 'Thank you for asking about Ledgerly, ' + ctx.first_name + '. Based on what you shared about ' + ctx.company + ', we recommend the ' + ctx.recommended_plan + ' plan. This proposal sets out what is included, the price and how the first 30 days would run.';
}
if (!pains.length) pains = ctx.pain_points && ctx.pain_points.length ? ctx.pain_points : [ctx.message || 'You asked for a demo of Ledgerly.'];

const today = new Date();
const valid = new Date(today.getTime() + 30 * 86400000);
function fmt(d) { return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); }

return [{ json: {
  lead_id: ctx.lead_id,
  doc_name: 'Ledgerly proposal - ' + ctx.company + ' - ' + ctx.lead_id,
  proposal_gate_passed: passed,
  proposal_gate_notes: notes.join('; '),
  fields: {
    '[[COMPANY]]': ctx.company,
    '[[CLIENT_NAME]]': (ctx.first_name + ' ' + (ctx.last_name || '')).trim(),
    '[[JOB_TITLE]]': ctx.job_title || 'Finance lead',
    '[[DATE]]': fmt(today),
    '[[LEAD_ID]]': ctx.lead_id,
    '[[INTRO]]': intro,
    '[[PAIN_POINTS]]': pains.map(function (p) { return '- ' + p; }).join('\n'),
    '[[PLAN]]': ctx.recommended_plan,
    '[[PRICE]]': PRICES[ctx.recommended_plan] || '$18,000',
    '[[VALID_UNTIL]]': fmt(valid)
  },
  ai_input_tokens: (res.usage && res.usage.input_tokens) || 0,
  ai_output_tokens: (res.usage && res.usage.output_tokens) || 0
} }];
