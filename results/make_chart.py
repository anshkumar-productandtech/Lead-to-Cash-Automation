# Draws assets/results-lead-scores.png from results/runs.json
import json, matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager as fm
from matplotlib.patches import Patch
for f in fm.findSystemFonts():
    if 'Inter' in f: fm.fontManager.addfont(f)
plt.rcParams['font.family'] = 'Inter'
d = json.load(open('results/runs.json'))
runs = sorted([r for r in d['runs'] if r['score'] is not None], key=lambda r: r['score'])
col = {'A': '#2a78d6', 'B': '#eb6834', 'C': '#1baf7a'}
notes = {15: 'v1 miss: not a decision-maker (B in v1.1)', 11: 'capped at 60: personal email', 12: 'prompt injection ignored', 6: 'student, flagged in code'}
fig, ax = plt.subplots(figsize=(10.5, 7.2), dpi=200)
ax.axvspan(70, 100, color=col['A'], alpha=0.05, lw=0); ax.axvspan(45, 70, color=col['B'], alpha=0.05, lw=0)
y = list(range(len(runs)))
ax.barh(y, [r['score'] for r in runs], height=0.62, color=[col[r['actual_tier']] for r in runs], edgecolor='white', linewidth=2)
for i, r in zip(y, runs):
    ax.text(r['score'] + 1.2, i, str(r['score']), va='center', fontsize=9, color='#1f1f1d',
            bbox=dict(facecolor='white', edgecolor='none', pad=0.6))
    if r['lead'] in notes:
        x = r['score'] + 6 if r['score'] < 60 else 101
        ax.text(x, i, notes[r['lead']], va='center', fontsize=8.5, color='#5f5e58', clip_on=False)
ax.set_yticks(y); ax.set_yticklabels([f"#{r['lead']}  {r['persona'].split(',')[0]}" for r in runs], fontsize=9, color='#3d3d3a')
for x, l in [(45, 'B from 45'), (70, 'A from 70')]:
    ax.axvline(x, color='#8a8983', lw=1, ls=(0, (3, 3)))
    ax.text(x + 0.6, len(runs) - 0.35, l, fontsize=8.5, color='#5f5e58', va='bottom')
ax.set_xlim(0, 100); ax.set_ylim(-0.6, len(runs) + 0.4)
ax.set_xlabel('ICP score (0 to 100), total computed in code from four Claude sub-scores', fontsize=9, color='#5f5e58')
for s in ['top', 'right', 'left']: ax.spines[s].set_visible(False)
ax.spines['bottom'].set_color('#d3d1c7'); ax.tick_params(axis='x', colors='#5f5e58', labelsize=8.5); ax.tick_params(axis='y', length=0)
ax.grid(axis='x', color='#efeee9', lw=0.8); ax.set_axisbelow(True)
ax.legend(handles=[Patch(color=col[t], label=l) for t, l in [('A', 'Tier A: deal + proposal'), ('B', 'Tier B: deal'), ('C', 'Tier C: contact only')]], loc='lower right', frameon=False, fontsize=9)
fig.suptitle('18 scored test leads, November 7, 2026 (v1). 2 more were rejected at intake.', x=0.02, ha='left', fontsize=12, color='#1f1f1d')
fig.tight_layout(rect=(0, 0, 0.8, 0.96))
fig.savefig('assets/results-lead-scores.png')
