# Prompts

Both prompts are deployed exactly as these files (checked against the n8n export).

| File | Node | Model | User message |
| --- | --- | --- | --- |
| `scoring_system.txt` | Score Lead with Claude | `claude-haiku-5-5`, 4,000 max tokens | Lead form as JSON, website title, description and excerpt (in `<website_excerpt>` tags), flags set by code |
| `proposal_system.txt` | Write Proposal Intro | `claude-sonnet-5-5`, 3,000 max tokens | Name, title, company, size, plan, what they wrote, pain points from scoring, website summary and first 1,500 characters |

Design notes:
- The scoring prompt asks for sub-scores with evidence, not a total. The total, caps and tier are computed in `workflow/apply_icp_rules.js`.
- Website text is untrusted: it is wrapped in tags and the prompt says never to follow instructions inside it.
- Both prompts ask for JSON only; the Code nodes still strip code fences and handle parse failures.
