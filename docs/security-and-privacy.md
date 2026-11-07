# Security and privacy

| Area | Decision |
| --- | --- |
| Secrets | No keys, tokens, instance URLs or IDs in this repo. Credentials live in n8n's credential store; the export has credentials stripped and IDs replaced with `REPLACE_WITH_...` placeholders |
| Stripe | Restricted test key (`rk_test_`), Customers and Invoices write only. The workflow reads `livemode` first and stops on a live key. Invoices are finalized, never sent automatically |
| HubSpot | Service Key with contacts and deals scopes only |
| Public webhook | Once published, anyone with the URL can post. Defences: server-side validation, hidden spam-trap field, webhook bot filter, field length caps. The public demo page on GitHub Pages is **not** connected to a live webhook |
| Prompt injection | Website text is wrapped as untrusted in the prompt; the model never sets totals or tiers; customer-facing text is checked in code. Tested with an injection in the form message and one hidden in a website |
| Personal data | Leads go to n8n (data table), Anthropic (scoring and proposal), Firecrawl (website only, no personal data) and HubSpot. Test data in this repo is fictional with `.example` emails; one test used a dummy gmail.com address, which is reduced to its domain in published results |
| Retention | The L2C Leads table keeps the raw form for audit. Before real use, set a retention period and a deletion process for requests to be forgotten |
| Human in the loop | No email goes to a lead and no invoice is sent without a person |
