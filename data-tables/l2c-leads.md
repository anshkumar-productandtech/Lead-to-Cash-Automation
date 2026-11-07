# n8n Data Table: L2C Leads

Create a data table named **L2C Leads** with these columns, then select it in the four data-table nodes (Save Raw Lead, Record Outcome, Find Lead for Deal, Mark Lead Invoiced). The export uses the placeholder `REPLACE_WITH_YOUR_L2C_LEADS_TABLE_ID`.

| Column | Type | Written by |
| --- | --- | --- |
| lead_id | string | Save Raw Lead |
| submitted_at | date | Save Raw Lead |
| first_name, last_name, email, company, website, job_title, company_size, plan_interest, message, source | string | Save Raw Lead |
| status | string | `new` → `processed` / `needs_review` → `invoiced` |
| raw_json | string | Save Raw Lead (the form exactly as received) |
| score | number | Record Outcome |
| tier | string | Record Outcome (A, B, C, review) |
| recommended_plan | string | Record Outcome |
| deal_amount | number | Record Outcome |
| score_breakdown | string (JSON) | Record Outcome |
| score_reasons | string | Record Outcome (the one-line note for the rep) |
| rule_flags | string | Record Outcome (flags and rule notes) |
| enrichment_status | string | Record Outcome (ok, failed, too_short, skipped_no_website) |
| ai_input_tokens, ai_output_tokens | number | Record Outcome (scoring + proposal) |
| hubspot_contact_id, hubspot_deal_id, proposal_url | string | Record Outcome |
| processed_at | date | Record Outcome |
| error | string | Record Outcome |
| stripe_invoice_id, invoice_url | string | Mark Lead Invoiced |
| invoiced_at | date | Mark Lead Invoiced |
