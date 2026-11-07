# LinkedIn post draft (for Monday, Nov 9, 2026)

I timed how long one good lead waits for a proposal at a small B2B company. My estimate: about 29 minutes of copy-paste work, plus however long it sits in the queue.

So I automated the whole path from website form to invoice.

What I built:
→ A demo-request page that posts into one n8n workflow
→ Claude scores each lead on four parts of an ICP rubric, with evidence
→ Code, not the AI, adds up the score and decides the tier
→ Hot leads get a HubSpot deal and a personalised proposal in Google Docs
→ When the deal is marked won, a Stripe invoice is created once, even if the job runs twice

What happened on 20 test leads:
→ Proposal draft 6 to 11 seconds after submit (real AI calls; CRM steps simulated)
→ 19 of 20 routed to the tier I wrote down before the run
→ 2 prompt-injection attempts ignored
→ $0.043 in AI cost for all 20

The one miss taught me the most. A Senior Accountant scored 72 and got a proposal. The number was fine. The routing wasn't: she can't sign. Now the top tier needs a decision-maker, and it's a rule in code with a test.

The PM lesson: check who receives the AI's output, not just whether the number looks right.

Would you let an AI send the first proposal, or only draft it?

#AIAutomation #ProductManagement #n8n

---
First comment: Case study, live demo and the n8n workflow: https://github.com/anshkumar-productandtech/Lead-to-Cash-Automation
