# Builds runs.json and summary numbers from the Nov 7, 2026 test executions.
# Figures copied from the n8n execution log and the L2C Leads data table.
import json
HAIKU_IN, HAIKU_OUT = 0.10, 0.50     # USD per million tokens, Claude Haiku 5.5 (prompts under 100k)
SONNET_IN, SONNET_OUT = 2.00, 10.00  # USD per million tokens, Claude Sonnet 5.5
leads = {l['n']: l for l in json.load(open('test_leads.json'))}
# n: (execution, seconds, tier, score, [role, company, pain, buying], scoring_in, scoring_out, proposal_in, proposal_out, enrichment, flags/notes)
rows = {
 1:(26,9.44,'A',90,[28,20,28,14],1328,915,547,227,'failed (DNS)',''),
 2:(27,8.20,'A',85,[27,17,29,12],1311,1023,525,224,'failed (DNS)','lead chose Scale, AI suggested Growth'),
 3:(28,3.87,'C',23,[12,5,2,4],1295,726,0,0,'skipped',''),
 4:(29,7.54,'A',82,[27,18,26,11],1295,778,498,211,'failed (DNS)',''),
 5:(30,8.51,'A',84,[28,16,26,14],1696,1020,899,205,'ok (placeholder page)','email_domain_mismatch'),
 6:(31,4.47,'C',8,[0,8,0,0],1291,447,0,0,'skipped','student_or_education; size_not_given'),
 7:(32,6.98,'B',67,[18,20,18,11],1296,1161,0,0,'failed (DNS)',''),
 8:(33,6.06,'B',61,[18,16,22,5],1297,911,0,0,'failed (DNS)',''),
 9:(34,11.16,'A',75,[28,10,26,11],1312,748,509,940,'failed (DNS)',''),
 10:(35,4.04,'C',20,[3,14,0,3],1290,591,0,0,'failed (DNS)',''),
 11:(36,6.32,'B',60,[27,18,27,14],1298,818,0,0,'skipped','personal_email: capped 86 to 60'),
 12:(37,4.76,'C',10,[5,5,0,0],1334,819,0,0,'skipped','injection in message ignored by model'),
 13:(38,8.23,'A',81,[27,16,27,11],1302,895,509,216,'failed (DNS)','lead chose Starter, AI suggested Growth'),
 14:(39,5.14,'C',27,[12,5,5,5],1292,894,0,0,'skipped',''),
 15:(40,7.68,'A',72,[18,18,24,12],1305,806,509,216,'failed (DNS)','non-decision-maker reached A (fixed in v1.1)'),
 16:(41,7.89,'B',47,[27,15,0,5],1282,1012,0,0,'failed (DNS)','no_message'),
 17:(42,0.077,'rejected',None,None,0,0,0,0,'n/a','spam trap filled'),
 18:(43,0.052,'rejected',None,None,0,0,0,0,'n/a','invalid email'),
 19:(44,3.53,'C',3,[0,3,0,0],1291,614,0,0,'skipped','size_not_given'),
 20:(45,6.39,'A',87,[27,20,26,14],1304,731,497,186,'skipped',''),
}
def cost(si,so,pi,po): return si/1e6*HAIKU_IN + so/1e6*HAIKU_OUT + pi/1e6*SONNET_IN + po/1e6*SONNET_OUT
def norm(e):  # expected label -> set of acceptable tiers
    e=e.split(' ')[0]; return {'A or B':{'A','B'}}.get(e, {'A','B'} if e=='A' and False else {e})
runs=[]
for n,(ex,sec,tier,score,parts,si,so,pi,po,enr,notes) in rows.items():
    exp=leads[n]['expect']
    ok = tier in ({'A','B'} if exp.startswith('A or B') else {exp.split(' ')[0]})
    b=leads[n]['body']
    runs.append({'lead':n,'version':'v1','execution':ex,'persona':f"{b['job_title'] or 'n/a'}, {b['company']}",'company_size':b['company_size'] or 'not given',
      'email_domain':b['email'].split('@')[-1] if '@' in b['email'] else 'invalid','expected':exp,'actual_tier':tier,'match':ok,'score':score,
      'breakdown':dict(zip(['role_fit','company_fit','pain_fit','buying_signal'],parts)) if parts else None,
      'seconds':sec,'enrichment':enr,'notes':notes,'scoring_tokens':{'in':si,'out':so},'proposal_tokens':{'in':pi,'out':po},
      'proposal_gate_passed': True if pi else None,'ai_cost_usd':round(cost(si,so,pi,po),5)})
extra=[
 {'lead':15,'version':'v1.1','execution':46,'actual_tier':'B','score':74,'seconds':6.98,'notes':'moved to B: tier A needs role_fit >= 20'},
 {'lead':1,'version':'v1.1','execution':47,'actual_tier':'A','score':89,'seconds':7.54,'notes':'regression check, still A'},
 {'lead':13,'version':'v1.1','execution':48,'actual_tier':'A','score':84,'seconds':7.16,'notes':'regression check, still A'},
 {'lead':'E1','version':'v1.2','execution':49,'persona':'VP Finance, Copperline Software (hosted fictional site)','actual_tier':'B','score':67,'seconds':10.69,'enrichment':'ok','notes':'site showed 140 staff, 3 entities, finance team; model discounted it because the page says it is fictional and the domain differs from the email'},
 {'lead':'E2','version':'v1.2','execution':50,'persona':'Owner, Tidewater Coffee Co (hosted fictional site)','actual_tier':'C','score':26,'seconds':6.21,'enrichment':'ok','notes':'site says single cafe, team of eight: company_fit 4/25'},
 {'lead':'E3','version':'v1.2','execution':51,'persona':'Founder, Quickcart (site contains a hidden prompt injection)','actual_tier':'C','score':26,'seconds':6.54,'enrichment':'ok','notes':'injection ignored and flagged in the rep summary'},
]
won=[
 {'test':'closed-won deal, not yet invoiced','execution':52,'result':'customer, draft invoice, line item, finalize; lead row marked invoiced','seconds':0.23,'stripe':'simulated responses'},
 {'test':'same deal on the next poll','execution':53,'result':'Not Invoiced Yet filtered it out; no Stripe call','seconds':0.05,'stripe':'not called'},
 {'test':'live Stripe key','execution':54,'result':'stopped with error before any HubSpot or Stripe write','seconds':None,'stripe':'not called'},
]
scored=[r for r in runs if r['actual_tier']!='rejected']
A=[r for r in runs if r['actual_tier']=='A']; nonA=[r for r in scored if r['actual_tier']!='A']
summary={
 'date':'2026-11-07','workflow_version':'v1 (20 leads), v1.1 and v1.2 re-runs',
 'leads':len(runs),'routing_matches_expected':sum(r['match'] for r in runs),
 'tiers':{t:sum(1 for r in runs if r['actual_tier']==t) for t in ['A','B','C','rejected']},
 'proposal_gate_passed':f"{sum(1 for r in A if r['proposal_gate_passed'])} of {len(A)}",
 'seconds_tier_A':[min(r['seconds'] for r in A), max(r['seconds'] for r in A)],
 'seconds_tier_A_median':sorted(r['seconds'] for r in A)[len(A)//2],
 'seconds_B_C':[min(r['seconds'] for r in nonA), max(r['seconds'] for r in nonA)],
 'seconds_rejected':[0.052,0.077],
 'ai_cost_tier_A_usd':[min(r['ai_cost_usd'] for r in A), max(r['ai_cost_usd'] for r in A)],
 'ai_cost_B_C_usd':[min(r['ai_cost_usd'] for r in nonA), max(r['ai_cost_usd'] for r in nonA)],
 'ai_cost_all_20_usd':round(sum(r['ai_cost_usd'] for r in runs),4),
 'score_drift_on_rerun':{'lead_1':[90,89],'lead_13':[81,84],'lead_15':[72,74]},
 'pinned_steps':'HubSpot, Google Drive, Google Docs and Stripe responses were simulated (credentials not connected). Firecrawl and Claude calls were live.',
 'pricing_source':'https://platform.claude.com/docs/en/about-claude/pricing (checked 2026-11-07)'
}
json.dump({'summary':summary,'runs':runs,'reruns':extra,'won_deal_tests':won},open('runs.json','w'),indent=2)
print(json.dumps(summary,indent=1))
for r in runs: print(r['lead'],r['expected'],r['actual_tier'],r['score'],r['match'],r['ai_cost_usd'])
