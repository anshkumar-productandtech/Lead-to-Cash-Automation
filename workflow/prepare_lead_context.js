// n8n Code node "Prepare Lead Context" (Run once for all items).
// One lead per execution. Combines the cleaned form fields with the website scrape
// and adds deterministic rule flags that the AI score can't override.
const lead = $('Normalize Lead').first().json;
const scrape = ($input.first() && $input.first().json) || {};

const PERSONAL_DOMAINS = ['gmail.com', 'googlemail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'live.com', 'icloud.com', 'me.com', 'aol.com', 'proton.me', 'protonmail.com', 'gmx.com', 'yandex.com', 'mail.com', 'zoho.com'];
const MAX_EXCERPT = 4000;

const emailDomain = String(lead.email || '').split('@')[1] || '';
const site = String(lead.website || '').toLowerCase().replace(/^www\./, '').split('/')[0];

function rootOf(host) {
  const parts = host.split('.').filter(Boolean);
  return parts.slice(-2).join('.');
}

let markdown = '';
let meta = {};
if (scrape.data && typeof scrape.data.markdown === 'string') { markdown = scrape.data.markdown; meta = scrape.data.metadata || {}; }
else if (typeof scrape.markdown === 'string') { markdown = scrape.markdown; meta = scrape.metadata || {}; }
const scrapeError = scrape.error ? String(scrape.error.message || scrape.error).slice(0, 300) : '';

const cleaned = markdown
  .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')        // images
  .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')       // links -> text
  .replace(/<[^>]+>/g, ' ')                      // stray html
  .replace(/[ \t]+/g, ' ')
  .replace(/\n{3,}/g, '\n\n')
  .trim();
const wordCount = cleaned ? cleaned.split(/\s+/).length : 0;

let enrichmentStatus;
if (!site) enrichmentStatus = 'skipped_no_website';
else if (scrapeError || !cleaned) enrichmentStatus = 'failed';
else if (wordCount < 40) enrichmentStatus = 'too_short';
else enrichmentStatus = 'ok';

const flags = [];
if (PERSONAL_DOMAINS.indexOf(emailDomain) !== -1) flags.push('personal_email');
if (site && emailDomain && PERSONAL_DOMAINS.indexOf(emailDomain) === -1 && rootOf(site) !== rootOf(emailDomain)) flags.push('email_domain_mismatch');
if (/\b(student|intern|course|class|homework|thesis)\b/i.test([lead.job_title, lead.message].join(' ')) || /\b(university|college|school)\b/i.test(lead.company || '')) flags.push('student_or_education');
if (!lead.message) flags.push('no_message');
if (!lead.company_size) flags.push('size_not_given');

return [{ json: {
  lead_id: lead.lead_id,
  submitted_at: lead.submitted_at,
  first_name: lead.first_name,
  last_name: lead.last_name,
  email: lead.email,
  email_domain: emailDomain,
  company: lead.company,
  website: site,
  job_title: lead.job_title,
  company_size: lead.company_size,
  plan_interest: lead.plan_interest,
  message: lead.message,
  source: lead.source,
  website_title: String(meta.title || '').slice(0, 200),
  website_description: String(meta.description || '').slice(0, 400),
  website_excerpt: enrichmentStatus === 'ok' || enrichmentStatus === 'too_short' ? cleaned.slice(0, MAX_EXCERPT) : '',
  website_words: wordCount,
  enrichment_status: enrichmentStatus,
  scrape_error: scrapeError,
  rule_flags: flags
} }];
