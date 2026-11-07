# Decision log

| Date | Decision | Why | Trade-off |
| --- | --- | --- | --- |
| Nov 4 | Use a fictional company (Ledgerly, month-end close SaaS) | Gives a real ICP, real price points and realistic leads to test against | Results come from synthetic leads |
| Nov 4 | Own landing page posting to a webhook instead of Tally or the n8n form | A real company would have its own "Book a demo" page; shows front-end work | Must validate on the server as well as in the browser |
| Nov 4 | Save the raw lead before any AI step | A failure later never loses a lead | One more write per lead |
| Nov 7 | AI gives sub-scores with evidence; code sets totals, caps and tiers | The tier decides whether a proposal goes out, so it must be predictable and testable | Rubric changes need code changes |
| Nov 7 | Haiku for scoring, Sonnet only for tier A proposal text | Scoring runs on every lead; writing quality matters only for proposals | Two models to monitor |
| Nov 7 | Check AI proposal text in code, with a plain fallback | A customer must never read an invented number | Some proposals will be plainer |
| Nov 7 | Lead's own plan choice beats the AI suggestion; disagreement noted | Respect what the buyer said; the rep decides | Some deals start at the wrong plan |
| Nov 7 | No HubSpot company records from the workflow | HubSpot links companies by email domain; creating them here would duplicate companies on repeat leads unless every lead searched first | Company data depends on that HubSpot setting |
| Nov 7 | Poll for Closed-won every 15 minutes instead of a HubSpot webhook | HubSpot webhooks need a developer app; polling works with a Service Key | Up to 15 minutes delay |
| Nov 7 | Idempotency keys built from the deal id, plus a dedupe column | A retry or crash must never bill twice | Re-invoicing the same deal needs a manual step |
| Nov 7 | Stop on a live Stripe key | This is a portfolio build; real money must be impossible by construction | One extra API call per poll |
| Nov 7 | v1.1: tier A needs role fit 20+ | Test lead 15 (Senior Accountant) got a proposal | Some strong champions wait for a rep |
| Nov 7 | v1.2: lowercase only the domain of the website | Lowercasing the path broke a case-sensitive URL in testing | None |
| Nov 7 | Public demo page replays recorded results instead of calling the live webhook | Publishing the webhook would let strangers write into the CRM | Visitors see recorded, not live, results |
