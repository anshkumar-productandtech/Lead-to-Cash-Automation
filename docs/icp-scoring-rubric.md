# ICP scoring rubric

Ideal customer: a finance leader (CFO, VP Finance, Head of Finance, Controller) at a B2B company with 51 to 500 employees whose month-end close or board reporting is slow and manual.

Claude Haiku 5.5 scores four parts and quotes its evidence. The code in [`workflow/apply_icp_rules.js`](../workflow/apply_icp_rules.js) then clamps each part to its range, adds them up, applies caps and sets the tier. The model's own total, if it gives one, is ignored and logged.

| Part | Max | High band | Middle band | Low band |
| --- | --- | --- | --- | --- |
| Role fit | 30 | 25-30: CFO, VP Finance, Head of Finance, Finance Director, Controller | 15-22: FP&A manager, accounting lead, senior accountant. 10-18: founder or owner under 50 people | 0-8: outside finance. 0: students, job seekers |
| Company fit | 25 | 20-25: 51-500 employees, B2B, finance team | 15-20: 501-1,000. 8-14: 1,000+ or size unknown | 3-10: 1-50 |
| Pain fit | 30 | 20-30: close length in days, board pack, variance commentary, reconciliations, multi-entity or intercompany, named ERP/GL | 5-12: general interest | 0-4: none or unrelated |
| Buying signal | 15 | 10-15: timeline or trigger (audit, fundraise, board meeting, new entity), or chosen plan plus a specific problem | 3-7: browsing, pricing curiosity | 0: templates, coursework, job seeking, spam |

## Rules applied in code

| Rule | Effect | Why |
| --- | --- | --- |
| Clamp | Each part forced into 0 to max | A model can return 45 out of 30 |
| Student or education flag | Total capped at 15 | Students asking for templates are never buyers |
| Personal email (gmail.com and 14 others) | Total capped at 60, so never tier A | Proposals go to work addresses only; a person checks first |
| Decision-maker rule (v1.1) | Tier A needs role fit 20+, otherwise tier B | Test lead 15, a Senior Accountant, reached tier A and got a proposal |
| Parse failure or API error | Tier `review`, contact only | Never guess a score |
| Plan choice | The plan the lead picked wins; a different AI suggestion is noted on the deal | Respect what the buyer said; let the rep decide |

## Tiers

| Tier | Score | What happens |
| --- | --- | --- |
| A | 70+ and role fit 20+ | HubSpot contact (Sales qualified lead), deal at "Qualified to buy", proposal doc |
| B | 45 to 69, or 70+ without a decision-maker | Contact (Marketing qualified lead), deal at "Appointment scheduled" |
| C | under 45 | Contact (Lead) only |
| review | AI output unusable | Contact (Lead), row marked `needs_review` |

Plan prices used for the deal amount: Starter $6,000, Growth $18,000, Scale $40,000 per year.
