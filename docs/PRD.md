# PRD: Lead-to-Cash Automation Pipeline

Owner: Ansh Kumar · Status: v1.2 built and tested (Nov 7, 2026) · Company in the scenario: Ledgerly (fictional B2B SaaS, month-end close automation)

## 1. Problem

In a small B2B company, a new lead moves from the website form to an invoice through a chain of copy-paste steps done by whoever has time: read the form, look up the company, decide if it's a fit, type the contact and deal into the CRM, copy a proposal template and personalise it, and weeks later create the invoice by hand when the deal closes.

Each hand-off adds delay and a chance of error. Fast follow-up matters most for the best leads, and they wait just as long as the worst ones.

## 2. Users

| User | Job to be done | Pain today |
| --- | --- | --- |
| Founder or first sales rep | Reply to good leads first, with something specific | Every lead looks the same in the inbox; research and proposal writing take most of the time |
| Finance or ops person | Bill closed deals correctly, once | Re-types amounts and customer details from the CRM into billing |
| The lead (a finance leader) | Get a relevant answer quickly | Generic replies days later |

## 3. Goals and success metrics

**North star:** time from form submit to a personalised proposal draft for a qualified lead.

| Metric | Target | Result (Nov 7 test run) |
| --- | --- | --- |
| Form to proposal draft, tier A | under 60 s | 6.4 to 11.2 s, median 8.2 s (CRM and Docs calls simulated) |
| Leads routed to the expected tier | 18 of 20 | 19 of 20 on v1; the miss is fixed in v1.1 |
| Proposal drafts that pass the code checks | 90% | 8 of 8 |
| Invalid or spam submissions that reach the CRM | 0 | 0 of 2 |
| Duplicate invoices for one deal | 0 | 0 (second poll skipped the invoiced deal) |
| AI cost per lead | under $0.02 | $0.0004 to $0.0007 (B and C), $0.003 to $0.011 (A) |

Guardrails: the AI never sets the total score or the tier; no invoice is created on a live Stripe key; no email or invoice is sent to a customer without a person.

## 4. Scope

**In v1**
- Website demo form (Ledgerly page) posting to an n8n webhook, with browser and server validation and a hidden spam trap
- Raw lead saved before any AI runs
- Company homepage scrape (Firecrawl), failures tolerated
- ICP score from Claude Haiku 5.5 (four sub-scores with evidence); totals, caps and tier set in code
- HubSpot contact for every lead; HubSpot deal for tiers A and B
- Tier A only: proposal intro by Claude Sonnet 5.5, checked in code, Google Doc copied from a template and linked on the deal
- Every 15 minutes: Closed-won deals become finalized Stripe test-mode invoices, once each

**Deliberately left out**
- Sending emails to leads (a person sends the proposal)
- Emailing invoices (finalized only; `auto_advance=false`)
- Live Stripe keys (the workflow stops on one)
- HubSpot company records (HubSpot links companies from the email domain itself; creating them here would duplicate companies on repeat leads)
- Multi-step forms, chat qualification, meeting booking

## 5. Requirements

| # | Requirement | Where it lives |
| --- | --- | --- |
| R1 | Reject submissions without a first name, company or valid email, or with the spam trap filled; reply 400 and save nothing | Valid Lead? |
| R2 | Save every valid lead untouched before enrichment | Save Raw Lead |
| R3 | Reply to the page within a second; slow work runs after the reply | Respond Success |
| R4 | Scraping failures must not stop scoring | Scrape Company Website (continue on error) |
| R5 | Score = sum of four clamped sub-scores; caps for students (15) and personal email (60); tier A 70+, B 45 to 69, C under 45; tier A needs role fit 20+ | Apply ICP Rules |
| R6 | If the AI output can't be parsed, the lead is marked `needs_review`, gets a contact, no deal | Apply ICP Rules |
| R7 | Customer-facing AI text: 40 to 140 words, no hype words, no numbers that aren't in the lead's form, their website or the price list; otherwise a plain fallback sentence and a note on the deal | Check Proposal Draft |
| R8 | Invoices only on a Stripe test key; one invoice per deal even after retries | Test Mode Only?, Not Invoiced Yet, idempotency keys |
| R9 | Every outcome (score, tier, IDs, tokens, errors) written back to the lead row | Record Outcome, Mark Lead Invoiced |

## 6. Risks

| Risk | Mitigation |
| --- | --- |
| Prompt injection in the form or the website | Prompt marks website text as untrusted; code owns totals and tier. Tested with both: ignored |
| AI over-scores a non-buyer | Code caps and the v1.1 decision-maker rule; evidence shown on the deal |
| Public webhook gets spammed | Validation, spam trap, bot filter on the webhook; the public demo page is not connected to the live webhook |
| Double billing | Dedupe on the lead row plus Stripe idempotency keys built from the deal id |
| Proposal invents facts | Number check in code against what the lead wrote |

## 7. Open questions

- Should low-confidence tier A scores go to a person first? (Smoke test: a placeholder website gave confidence "low" and still scored 87.)
- Real CRM and Docs latency once credentials are connected.
- Manual baseline: time it with a stopwatch (estimate in the case study is 35 minutes per qualified lead).
