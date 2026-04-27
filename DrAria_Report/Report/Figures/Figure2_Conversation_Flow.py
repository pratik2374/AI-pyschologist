"""
Figure 2: Dr. Aria — Message Processing Pipeline (Conversation Flow)
Editable matplotlib figure — run with: python Figure2_Conversation_Flow.py
Requirements: pip install matplotlib
"""
import matplotlib
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch

matplotlib.rcParams['font.family'] = 'DejaVu Sans'

fig, ax = plt.subplots(figsize=(13, 10))
ax.set_xlim(0, 13)
ax.set_ylim(0, 10)
ax.axis('off')
fig.patch.set_facecolor('#F8F9FA')

C_USER   = '#1565C0'
C_SERVER = '#2E7D32'
C_AI     = '#6A1B9A'
C_ASYNC  = '#E65100'
C_DB     = '#BF360C'
C_HEAD   = '#263238'
C_GRAY   = '#78909C'

def step_box(ax, x, y, w, h, num, title, detail='', color='#2196F3'):
    rect = FancyBboxPatch((x, y), w, h,
                          boxstyle="round,pad=0.1",
                          linewidth=1.8, edgecolor=color,
                          facecolor=color + '18')
    ax.add_patch(rect)
    # step number circle
    circle = plt.Circle((x + 0.28, y + h/2), 0.22, color=color, zorder=5)
    ax.add_patch(circle)
    ax.text(x + 0.28, y + h/2, str(num), ha='center', va='center',
            fontsize=9, fontweight='bold', color='white', zorder=6)
    ax.text(x + 0.65, y + h/2 + (0.12 if detail else 0),
            title, va='center', fontsize=9.5, fontweight='bold', color=color)
    if detail:
        ax.text(x + 0.65, y + h/2 - 0.18, detail,
                va='center', fontsize=7.8, color=C_HEAD, style='italic')

def arrow_down(ax, x, y, length=0.35, color='#546E7A'):
    ax.annotate('', xy=(x, y - length), xytext=(x, y),
                arrowprops=dict(arrowstyle='->', color=color, lw=1.8))

def side_box(ax, x, y, w, h, title, detail='', color='#FF6F00'):
    rect = FancyBboxPatch((x, y), w, h,
                          boxstyle="round,pad=0.08",
                          linewidth=1.4, edgecolor=color,
                          facecolor=color + '18', linestyle='--')
    ax.add_patch(rect)
    ax.text(x + w/2, y + h/2 + (0.1 if detail else 0),
            title, ha='center', va='center',
            fontsize=8.5, fontweight='bold', color=color)
    if detail:
        ax.text(x + w/2, y + h/2 - 0.16, detail,
                ha='center', va='center', fontsize=7, color=C_HEAD, style='italic')

# ── Title ─────────────────────────────────────────────────────────────────────
ax.text(6.5, 9.6, 'Dr. Aria — Message Processing Pipeline',
        ha='center', fontsize=15, fontweight='bold', color=C_HEAD)

# ── Main pipeline (left column) ───────────────────────────────────────────────
steps = [
    (C_USER,   1, 'User sends message',          'Typed in Next.js chat interface'),
    (C_SERVER, 2, 'JWT Authentication',           'middleware/auth.js validates cookie'),
    (C_SERVER, 3, 'Context Builder',              'Recent messages + chapters + profile + weekly report'),
    (C_AI,     4, 'Prompt Assembler',             '9-section modular system prompt (Persona→Crisis)'),
    (C_AI,     5, 'GPT-4o API Call (streaming)',  'Server-Sent Events → token-by-token to client'),
    (C_USER,   6, 'Response displayed to user',  'TypingIndicator → MessageBubble component'),
    (C_DB,     7, 'Encrypt & Persist',            'AES-256-GCM → MongoDB (messages collection)'),
]

y_start = 8.8
step_h  = 0.65
gap     = 0.20
x_left  = 0.4

for i, (color, num, title, detail) in enumerate(steps):
    y = y_start - i * (step_h + gap)
    step_box(ax, x_left, y, 6.8, step_h, num, title, detail, color)
    if i < len(steps) - 1:
        arrow_down(ax, x_left + 3.4, y, length=gap, color=C_GRAY)

# ── Async branch (right column) ───────────────────────────────────────────────
ax.text(10.5, 9.15, 'Async (Background)', ha='center', fontsize=9,
        fontweight='bold', color=C_ASYNC)

async_boxes = [
    (8.2, 7.85, 3.5, 0.60, 'Silent Observer', 'GPT-4o-mini · every 5 msgs', C_ASYNC),
    (8.2, 6.85, 3.5, 0.60, 'Observation stored', 'emotions · themes · ideation flags', C_ASYNC),
    (8.2, 5.85, 3.5, 0.60, 'Crisis Check', 'Level 1-4 · CrisisFlag created if needed', C_ASYNC),
    (8.2, 4.85, 3.5, 0.60, 'Profile Synthesis', 'Every 5 chunks → LongitudinalProfile update', C_ASYNC),
]
for bx, by, bw, bh, bt, bd, bc in async_boxes:
    side_box(ax, bx, by, bw, bh, bt, bd, bc)
    if by > 4.85:
        arrow_down(ax, bx + bw/2, by, length=0.25, color=C_ASYNC)

# Arrow from step 7 to async branch
ax.annotate('', xy=(8.15, 7.7), xytext=(7.25, 7.05),
            arrowprops=dict(arrowstyle='->', color=C_ASYNC, lw=1.6, linestyle='dashed'))
ax.text(7.7, 7.4, 'async\nfire', ha='center', fontsize=7.5, color=C_ASYNC, style='italic')

# ── Memory tier labels ────────────────────────────────────────────────────────
ax.text(0.5, 2.55, 'Memory Hierarchy:', fontsize=8.5, fontweight='bold', color=C_HEAD)

tier_boxes = [
    (0.4, 1.85, 3.3, 0.58, 'Tier 1: Verbatim History', '~50 recent messages (direct context)', '#1565C0'),
    (3.9, 1.85, 3.3, 0.58, 'Tier 2: Chapter Summaries', 'Compressed every 50 msgs (GPT-4o-mini)', '#1B5E20'),
    (7.4, 1.85, 3.3, 0.58, 'Tier 3: Longitudinal Profile', 'Synthesised every 5 observer chunks', '#4A148C'),
    (10.9, 1.85, 1.9, 0.58, 'Weekly Report', 'Sunday digest (Mode A)', '#BF360C'),
]
for bx, by, bw, bh, bt, bd, bc in tier_boxes:
    side_box(ax, bx, by, bw, bh, bt, bd, bc)

# Arrow from context builder to memory tiers
ax.annotate('', xy=(6.5, 2.43), xytext=(3.8, 6.5),
            arrowprops=dict(arrowstyle='->', color=C_GRAY, lw=1.2,
                            connectionstyle='arc3,rad=0.3'))
ax.text(5.8, 4.3, 'feeds into\ncontext', ha='center', fontsize=7.5, color=C_GRAY, style='italic')

# ── Performance callout ───────────────────────────────────────────────────────
perf = FancyBboxPatch((0.4, 0.3), 12.2, 1.2,
                       boxstyle="round,pad=0.1",
                       linewidth=1.2, edgecolor='#455A64',
                       facecolor='#ECEFF1')
ax.add_patch(perf)
ax.text(6.5, 1.17, 'Performance Targets (GPT-4o)',
        ha='center', fontsize=9, fontweight='bold', color=C_HEAD)
stats = [
    ('Median TTFT', '843 ms', 1.0),
    ('Target TTFT', '< 2 s', 3.5),
    ('Streaming Speed', '20.7 tok/s', 6.0),
    ('Observer Latency', '1185 ms (async)', 8.7),
    ('Encryption Overhead', '< 1 ms/msg', 11.2),
]
for label, val, lx in stats:
    ax.text(lx + 0.15, 0.75, label + ':', fontsize=7.8, color=C_GRAY, va='center')
    ax.text(lx + 0.15, 0.52, val, fontsize=8.5, fontweight='bold', color=C_HEAD, va='center')

ax.text(12.7, 0.2, 'Fig. 2', ha='right', fontsize=8, color='gray', style='italic')

plt.tight_layout()
plt.savefig('Figure2_Conversation_Flow.png', dpi=200, bbox_inches='tight',
            facecolor=fig.get_facecolor())
plt.savefig('Figure2_Conversation_Flow.svg', format='svg', bbox_inches='tight',
            facecolor=fig.get_facecolor())
print("Saved: Figure2_Conversation_Flow.png / .svg")
plt.show()
