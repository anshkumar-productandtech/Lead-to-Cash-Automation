# Setup guide

About 45 minutes. You need an n8n Cloud account (or self-hosted n8n 1.x with the Firecrawl community node), a HubSpot account, a Google account and a Stripe account in test mode.

## 1. Data table
Create **L2C Leads** with the columns in [`data-tables/l2c-leads.md`](../data-tables/l2c-leads.md).

## 2. Proposal template
Create a Google Doc from [`templates/proposal-template.md`](../templates/proposal-template.md) (File → Open the markdown file in Google Docs, or paste it). Keep the `[[PLACEHOLDERS]]` exactly as written. Copy the doc ID from its URL.

## 3. Import the workflow
In n8n: **Create workflow → ⋯ → Import from file** → [`workflow/lead-to-cash-pipeline.n8n.json`](../workflow/lead-to-cash-pipeline.n8n.json). Then:
- In Save Raw Lead, Record Outcome, Find Lead for Deal and Mark Lead Invoiced, pick the **L2C Leads** table (replaces `REPLACE_WITH_YOUR_L2C_LEADS_TABLE_ID`).
- In Copy Proposal Template, paste your template doc ID (replaces `REPLACE_WITH_YOUR_PROPOSAL_TEMPLATE_DOC_ID`).

## 4. Credentials (add them in n8n, never in the workflow or this repo)

| Credential | Used by | How |
| --- | --- | --- |
| HubSpot App Token | 5 HubSpot nodes | HubSpot → Settings → Integrations → **Service Keys** (new accounts can no longer create legacy private apps). Scopes: `crm.objects.contacts.read/write`, `crm.objects.deals.read/write`. If n8n's HubSpot credential rejects a Service Key, use an existing private app token. |
| Stripe API | 5 HTTP Request nodes (credential type "Stripe API") | Stripe → test mode → Developers → API keys → **restricted key** with write access to Customers and Invoices. It starts `rk_test_`. The workflow refuses to run on a live key. |
| Google Drive OAuth2, Google Docs OAuth2 | Copy Proposal Template, Fill Proposal | n8n's Google sign-in |
| Anthropic, Firecrawl | Score Lead, Write Proposal Intro, Scrape | n8n AI credits, or your own keys. On AI credits, `claude-haiku-5-5` and `claude-sonnet-5-5` worked |

HubSpot setting to check: **Settings → Objects → Companies → Automatically create and associate companies with contacts** should be on, so contacts get a company from their email domain.

## 5. Test before publishing
1. Open the workflow, click **Execute workflow** (the webhook listens for 2 minutes).
2. Open `site/index.html` locally and set `WEBHOOK_URL` to the **test** URL shown on the Website Lead Form node.
3. Submit a sample lead. Check the execution and the L2C Leads row.
4. In HubSpot, move the test deal to **Closed won**, then run the workflow from **Every 15 Minutes**. Check Stripe test mode for the invoice.
5. Run `node tests/run_tests.js` (Node 18+) after any change to the Code nodes.

## 6. Go live
- Publish the workflow. The production webhook URL is now public: anyone who knows it can post leads into your CRM. Keep the validation and spam trap; consider header authentication on the webhook if the form is server-rendered.
- Set `WEBHOOK_URL` in `site/index.html` to the production URL only on a site you control.
- Watch the first week of `error` and `needs_review` rows.
