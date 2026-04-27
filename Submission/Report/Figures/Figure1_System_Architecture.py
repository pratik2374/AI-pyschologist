"""
Figure 1: Dr. Aria System Architecture
Editable matplotlib figure — run with: python Figure1_System_Architecture.py
Requirements: pip install matplotlib
"""
import matplotlib
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

matplotlib.rcParams['font.family'] = 'DejaVu Sans'

fig, ax = plt.subplots(figsize=(14, 9))
ax.set_xlim(0, 14)
ax.set_ylim(0, 9)
ax.axis('off')
fig.patch.set_facecolor('#F8F9FA')

# ── color palette ─────────────────────────────────────────────────────────────
C_FRONT  = '#2196F3'   # blue  – Frontend
C_BACK   = '#4CAF50'   # green – Backend / API
C_AI     = '#9C27B0'   # purple – AI layer
C_DB     = '#FF9800'   # orange – Database
C_EXT    = '#F44336'   # red   – External API
C_HEAD   = '#37474F'   # dark  – headings
C_ARROW  = '#546E7A'

def box(ax, x, y, w, h, label, sublabel='', color='#2196F3', fontsize=10):
    rect = FancyBboxPatch((x, y), w, h,
                          boxstyle="round,pad=0.08",
                          linewidth=1.5, edgecolor=color,
                          facecolor=color + '22')
    ax.add_patch(rect)
    ax.text(x + w/2, y + h/2 + (0.12 if sublabel else 0),
            label, ha='center', va='center',
            fontsize=fontsize, fontweight='bold', color=color)
    if sublabel:
        ax.text(x + w/2, y + h/2 - 0.18, sublabel,
                ha='center', va='center', fontsize=7.5, color=C_HEAD, style='italic')

def arrow(ax, x1, y1, x2, y2):
    ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle='->', color=C_ARROW, lw=1.6))

def label_arrow(ax, x, y, text):
    ax.text(x, y, text, ha='center', va='center', fontsize=7.5,
            color=C_ARROW, style='italic')

# ── title ─────────────────────────────────────────────────────────────────────
ax.text(7, 8.6, 'Dr. Aria — System Architecture',
        ha='center', va='center', fontsize=16, fontweight='bold', color=C_HEAD)

# ── TIER 1: Frontend ──────────────────────────────────────────────────────────
box(ax, 0.5, 7.0, 3.0, 0.85, 'Next.js 16 Frontend', 'React 19 · TypeScript 5 · Tailwind CSS', C_FRONT, 9)

# ── TIER 2: Backend ───────────────────────────────────────────────────────────
box(ax, 0.5, 5.5, 3.0, 0.85, 'Node.js / Express 5', 'JWT Auth · Rate Limiting · CORS · Helmet', C_BACK, 9)

# Frontend → Backend
arrow(ax, 2.0, 7.0, 2.0, 6.35)
label_arrow(ax, 2.7, 6.67, 'SSE / REST')

# ── TIER 3: AI Orchestration ─────────────────────────────────────────────────
modules = [
    (4.0, 7.0, 1.8, 0.72, 'Prompt\nAssembler', C_AI),
    (6.0, 7.0, 1.8, 0.72, 'Context\nBuilder', C_AI),
    (8.0, 7.0, 1.8, 0.72, 'GPT-4o\nStreaming', C_AI),
    (4.0, 5.9, 1.8, 0.72, 'Silent\nObserver', C_AI),
    (6.0, 5.9, 1.8, 0.72, 'Chapter\nCompressor', C_AI),
    (8.0, 5.9, 1.8, 0.72, 'Longitudinal\nProfiler', C_AI),
    (10.0, 6.45, 1.8, 0.72, 'Weekly\nReporter', C_AI),
]
for mx, my, mw, mh, ml, mc in modules:
    box(ax, mx, my, mw, mh, ml, '', mc, 8.5)

# AI section label
ax.text(7.9, 8.0, 'AI Orchestration Layer', ha='center', fontsize=10,
        fontweight='bold', color=C_AI)
rect_ai = FancyBboxPatch((3.8, 5.7), 8.3, 1.75,
                          boxstyle="round,pad=0.1",
                          linewidth=1.5, edgecolor=C_AI + '88',
                          facecolor='none', linestyle='--')
ax.add_patch(rect_ai)

# Backend → AI
arrow(ax, 3.5, 5.9, 3.95, 6.45)
label_arrow(ax, 3.62, 6.22, 'Context\nRequest')

# ── TIER 4: MongoDB ───────────────────────────────────────────────────────────
collections = [
    (0.4,  3.8, 'users'),
    (2.1,  3.8, 'messages'),
    (3.8,  3.8, 'observations'),
    (5.5,  3.8, 'longitudinal_profiles'),
    (7.5,  3.8, 'chapter_summaries'),
    (9.3,  3.8, 'crisis_flags'),
    (11.0, 3.8, 'weekly_reports'),
]
for cx, cy, cl in collections:
    w = max(1.5, len(cl) * 0.13 + 0.5)
    box(ax, cx, cy, w, 0.55, cl, '', C_DB, 7.5)

ax.text(7.0, 4.7, 'MongoDB 7.0 — Collections', ha='center',
        fontsize=10, fontweight='bold', color=C_DB)
rect_db = FancyBboxPatch((0.3, 3.65), 12.8, 0.85,
                          boxstyle="round,pad=0.1",
                          linewidth=1.5, edgecolor=C_DB + '88',
                          facecolor='none', linestyle='--')
ax.add_patch(rect_db)

# AI → DB
arrow(ax, 7.0, 5.7, 7.0, 4.5)
label_arrow(ax, 7.6, 5.1, 'AES-256-GCM\nEncrypted R/W')

# ── External API ───────────────────────────────────────────────────────────────
box(ax, 10.5, 7.0, 2.8, 0.85, 'OpenAI API', 'GPT-4o · GPT-4o-mini', C_EXT, 9)

# AI → OpenAI
arrow(ax, 9.8, 6.8, 10.45, 7.3)
label_arrow(ax, 10.12, 7.1, 'API calls')

# ── Email ─────────────────────────────────────────────────────────────────────
box(ax, 10.5, 5.5, 2.8, 0.85, 'Resend Email API', 'Weekly Reports', C_EXT, 9)
arrow(ax, 10.9, 5.9, 10.9, 5.85)

# ── Encryption modes ──────────────────────────────────────────────────────────
box(ax, 0.5, 2.5, 5.8, 0.85, 'Mode A — Server-Assisted Encryption',
    'Server holds per-user key · Observer + Reports enabled', '#607D8B', 8.5)
box(ax, 6.8, 2.5, 5.8, 0.85, 'Mode B — Zero-Knowledge Encryption',
    'Client holds key · Server sees only ciphertext · Max privacy', '#607D8B', 8.5)

ax.text(7.0, 1.9, 'AES-256-GCM · Two-Layer Key Hierarchy · iv:authTag:ciphertext format',
        ha='center', fontsize=8.5, color='#607D8B', style='italic')

# ── Legend ────────────────────────────────────────────────────────────────────
legend_items = [
    mpatches.Patch(facecolor=C_FRONT+'22', edgecolor=C_FRONT, label='Frontend'),
    mpatches.Patch(facecolor=C_BACK+'22',  edgecolor=C_BACK,  label='Backend'),
    mpatches.Patch(facecolor=C_AI+'22',   edgecolor=C_AI,   label='AI Orchestration'),
    mpatches.Patch(facecolor=C_DB+'22',   edgecolor=C_DB,   label='Database'),
    mpatches.Patch(facecolor=C_EXT+'22',  edgecolor=C_EXT,  label='External APIs'),
]
ax.legend(handles=legend_items, loc='lower left', fontsize=8.5,
          framealpha=0.9, bbox_to_anchor=(0.01, 0.01))

ax.text(13.8, 0.15, 'Fig. 1', ha='right', fontsize=8, color='gray', style='italic')

plt.tight_layout()
plt.savefig('Figure1_System_Architecture.png', dpi=200, bbox_inches='tight',
            facecolor=fig.get_facecolor())
plt.savefig('Figure1_System_Architecture.svg', format='svg', bbox_inches='tight',
            facecolor=fig.get_facecolor())
print("Saved: Figure1_System_Architecture.png / .svg")
plt.show()
