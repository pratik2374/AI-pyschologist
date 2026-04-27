"""
Figure 3: Dr. Aria — Silent Clinical Observer Pipeline & Crisis Detection Levels
Editable matplotlib figure — run with: python Figure3_Observer_Pipeline.py
Requirements: pip install matplotlib
"""
import matplotlib
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import numpy as np

matplotlib.rcParams['font.family'] = 'DejaVu Sans'

fig, axes = plt.subplots(1, 2, figsize=(14, 8))
fig.patch.set_facecolor('#F8F9FA')

# ─────────────────────────────────────────────────────────────────────────────
# LEFT: Observer Pipeline
# ─────────────────────────────────────────────────────────────────────────────
ax = axes[0]
ax.set_xlim(0, 7)
ax.set_ylim(0, 8.5)
ax.axis('off')

C_TRIG = '#1565C0'
C_PROC = '#6A1B9A'
C_OUT  = '#2E7D32'
C_DB   = '#BF360C'
C_HEAD = '#263238'

def obs_box(ax, x, y, w, h, title, detail, color):
    rect = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.1",
                          linewidth=1.6, edgecolor=color, facecolor=color + '20')
    ax.add_patch(rect)
    ax.text(x + w/2, y + h/2 + (0.11 if detail else 0),
            title, ha='center', va='center', fontsize=9, fontweight='bold', color=color)
    if detail:
        ax.text(x + w/2, y + h/2 - 0.16, detail,
                ha='center', va='center', fontsize=7.5, color=C_HEAD, style='italic')

def darrow(ax, x, y1, y2, color='#546E7A'):
    ax.annotate('', xy=(x, y2), xytext=(x, y1),
                arrowprops=dict(arrowstyle='->', color=color, lw=1.8))

ax.text(3.5, 8.2, 'Silent Clinical Observer Pipeline',
        ha='center', fontsize=12, fontweight='bold', color=C_HEAD)

obs_box(ax, 0.4, 7.1, 6.2, 0.75, 'Trigger: Every 5 user messages',
        'chunkCount % 5 === 0 → observer fires asynchronously', C_TRIG)
darrow(ax, 3.5, 7.1, 6.75)

obs_box(ax, 0.4, 5.95, 6.2, 0.75, 'GPT-4o-mini Clinical Analysis',
        'Specialized observer prompt · JSON-mode response', C_PROC)
darrow(ax, 3.5, 5.95, 5.6)

# Output fields
fields = [
    ('emotionalState', '0–10 score (0=crisis, 10=thriving)', 5.0),
    ('themes',          'e.g. work_stress, paternal_relationship', 4.4),
    ('ideationFlags',   'passive_ideation / personal_suicidal_ideation', 3.8),
    ('sessionQuality',  'productive / opening_up / resistant', 3.2),
    ('riskTrajectory',  'improving / stable / declining / acute', 2.6),
    ('breakthrough',    'bool + note → episodic memory entry', 2.0),
]
ax.text(3.5, 5.55, 'Observation JSON fields:', ha='center',
        fontsize=8.5, color=C_HEAD, fontweight='bold')
for field, desc, fy in fields:
    rect = FancyBboxPatch((0.4, fy), 6.2, 0.48,
                          boxstyle="round,pad=0.06", linewidth=1,
                          edgecolor=C_OUT, facecolor=C_OUT + '12')
    ax.add_patch(rect)
    ax.text(0.7, fy + 0.24, f'• {field}:', va='center',
            fontsize=8, fontweight='bold', color=C_OUT)
    ax.text(2.5, fy + 0.24, desc, va='center', fontsize=7.8, color=C_HEAD)

darrow(ax, 3.5, 2.0, 1.65)

obs_box(ax, 0.4, 0.9, 6.2, 0.7,
        'Store Observation → Update LongitudinalProfile',
        'CrisisFlag created if level > 0  ·  Profile synthesised every 5 chunks', C_DB)

ax.text(3.5, 0.35, 'Observer runs async — zero user-facing latency',
        ha='center', fontsize=8, color='#546E7A', style='italic')

# ─────────────────────────────────────────────────────────────────────────────
# RIGHT: Crisis Detection Levels
# ─────────────────────────────────────────────────────────────────────────────
ax2 = axes[1]
ax2.set_xlim(0, 7)
ax2.set_ylim(0, 8.5)
ax2.axis('off')

ax2.text(3.5, 8.2, 'Four-Level Crisis Detection Framework',
         ha='center', fontsize=12, fontweight='bold', color=C_HEAD)

levels = [
    (1, '#43A047', 'LEVEL 1 — Mild Distress',
     'Elevated emotional language, passive fatigue,\n"I\'m exhausted", repeated negative framing',
     'Dr. Aria: Validates, stays present, deepens inquiry'),
    (2, '#FB8C00', 'LEVEL 2 — Passive Ideation',
     '"I don\'t want to be here", "I wish things were different",\nfatigue without plan',
     'Dr. Aria: Acknowledges pain explicitly, asks gently\nabout safety, weaves in warmth'),
    (3, '#E53935', 'LEVEL 3 — Active Ideation',
     'Expressed desire to end life, no specific plan,\n"I want to die", "I can\'t go on"',
     'Dr. Aria: Stays present, natural crisis resource\ninjected in-body (never as rejection)'),
    (4, '#880E4F', 'LEVEL 4 — Imminent Risk',
     'Specific method/timeline/intent OR repeated\nLevel 3 signals within session',
     'Dr. Aria: Emergency contact triggered, clear resource\nwith warmth, no therapeutic cutoff'),
]

y_pos = 7.1
for lvl, color, title, signals, response in levels:
    # outer container
    outer = FancyBboxPatch((0.3, y_pos - 1.5), 6.4, 1.45,
                           boxstyle="round,pad=0.1",
                           linewidth=2, edgecolor=color, facecolor=color + '12')
    ax2.add_patch(outer)

    # level badge
    badge = plt.Circle((0.75, y_pos - 0.77), 0.28, color=color, zorder=5)
    ax2.add_patch(badge)
    ax2.text(0.75, y_pos - 0.77, str(lvl),
             ha='center', va='center', fontsize=10, fontweight='bold', color='white', zorder=6)

    ax2.text(1.15, y_pos - 0.38, title,
             fontsize=9, fontweight='bold', color=color, va='center')
    ax2.text(1.15, y_pos - 0.72, 'Signals: ' + signals,
             fontsize=7.5, color=C_HEAD, va='top')
    ax2.text(1.15, y_pos - 1.22, 'Response: ' + response,
             fontsize=7.5, color='#37474F', va='top', style='italic')

    # arrow between levels
    if lvl < 4:
        ax2.annotate('', xy=(3.5, y_pos - 1.55), xytext=(3.5, y_pos - 1.5),
                     arrowprops=dict(arrowstyle='->', color='#90A4AE', lw=1.4))

    y_pos -= 1.72

# Key principle box
principle = FancyBboxPatch((0.3, 0.25), 6.4, 0.75,
                            boxstyle="round,pad=0.1",
                            linewidth=1.8, edgecolor='#1565C0',
                            facecolor='#E3F2FD')
ax2.add_patch(principle)
ax2.text(3.5, 0.85, 'Core Design Principle',
         ha='center', fontsize=9, fontweight='bold', color='#1565C0')
ax2.text(3.5, 0.52,
         'Crisis resources are NEVER a rejection gateway.\nDr. Aria stays present, warm, and therapeutic at every risk level.',
         ha='center', fontsize=8, color='#1A237E', va='center', style='italic')

ax2.text(6.7, 0.1, 'Fig. 3', ha='right', fontsize=8, color='gray', style='italic')

plt.tight_layout(pad=1.5)
plt.savefig('Figure3_Observer_Pipeline.png', dpi=200, bbox_inches='tight',
            facecolor=fig.get_facecolor())
plt.savefig('Figure3_Observer_Pipeline.svg', format='svg', bbox_inches='tight',
            facecolor=fig.get_facecolor())
print("Saved: Figure3_Observer_Pipeline.png / .svg")
plt.show()
