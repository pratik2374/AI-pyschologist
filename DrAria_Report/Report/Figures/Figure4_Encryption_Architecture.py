"""
Figure 4: Dr. Aria — AES-256-GCM Dual Encryption Architecture
Editable matplotlib figure — run with: python Figure4_Encryption_Architecture.py
Requirements: pip install matplotlib
"""
import matplotlib
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch

matplotlib.rcParams['font.family'] = 'DejaVu Sans'

fig, ax = plt.subplots(figsize=(14, 8))
ax.set_xlim(0, 14)
ax.set_ylim(0, 8)
ax.axis('off')
fig.patch.set_facecolor('#F8F9FA')

C_HEAD  = '#263238'
C_KEY   = '#4527A0'
C_MODE_A = '#1B5E20'
C_MODE_B = '#BF360C'
C_CIPHER = '#37474F'
C_ARROW  = '#546E7A'

def box(ax, x, y, w, h, title, detail='', color='#333', fontsize=9, linestyle='-'):
    rect = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.1",
                          linewidth=1.8, edgecolor=color,
                          facecolor=color + '18', linestyle=linestyle)
    ax.add_patch(rect)
    ax.text(x + w/2, y + h/2 + (0.12 if detail else 0),
            title, ha='center', va='center',
            fontsize=fontsize, fontweight='bold', color=color)
    if detail:
        ax.text(x + w/2, y + h/2 - 0.18, detail,
                ha='center', va='center', fontsize=7.5, color=C_HEAD, style='italic')

def arrow(ax, x1, y1, x2, y2, label='', color='#546E7A', style='->'):
    ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle=style, color=color, lw=1.7))
    if label:
        mx, my = (x1+x2)/2, (y1+y2)/2
        ax.text(mx + 0.05, my, label, fontsize=7.5, color=color, style='italic', va='center')

# ── Title ─────────────────────────────────────────────────────────────────────
ax.text(7.0, 7.75, 'Dr. Aria — AES-256-GCM Dual Encryption Architecture',
        ha='center', fontsize=14, fontweight='bold', color=C_HEAD)

# ── Key Hierarchy (top center) ───────────────────────────────────────────────
ax.text(7.0, 7.15, 'Two-Layer Key Hierarchy', ha='center', fontsize=10,
        fontweight='bold', color=C_KEY)

box(ax, 4.5, 6.2, 5.0, 0.72, 'MASTER ENCRYPTION KEY',
    '64-hex chars (32 bytes) · stored in .env only · never in DB', C_KEY, 9)

box(ax, 2.2, 4.9, 4.4, 0.72, 'Per-User Key (User A)',
    '32 random bytes · encrypted with Master Key', C_KEY, 8.5)
box(ax, 7.4, 4.9, 4.4, 0.72, 'Per-User Key (User B)',
    '32 random bytes · encrypted with Master Key', C_KEY, 8.5)

arrow(ax, 5.8, 6.2, 4.2, 5.62, '', C_KEY)
arrow(ax, 8.2, 6.2, 9.3, 5.62, '', C_KEY)

ax.text(3.0, 5.67, 'AES-256-GCM\nencrypt', ha='center', fontsize=7.5,
        color=C_KEY, style='italic')
ax.text(9.8, 5.67, 'AES-256-GCM\nencrypt', ha='center', fontsize=7.5,
        color=C_KEY, style='italic')

# ── MODE A ────────────────────────────────────────────────────────────────────
rect_a = FancyBboxPatch((0.3, 1.6), 5.9, 3.0, boxstyle="round,pad=0.15",
                         linewidth=2, edgecolor=C_MODE_A, facecolor='#E8F5E9',
                         linestyle='--')
ax.add_patch(rect_a)
ax.text(3.25, 4.45, 'MODE A — Server-Assisted', ha='center', fontsize=11,
        fontweight='bold', color=C_MODE_A)

box(ax, 0.6, 3.55, 5.3, 0.65, 'Server holds per-user key (decrypts on read)',
    'Observer + Weekly Reports + Context injection ENABLED', C_MODE_A, 8)

box(ax, 0.6, 2.6, 2.35, 0.72, 'Encrypt msg', 'AES-256-GCM\nper-user key', C_MODE_A, 8)
box(ax, 3.25, 2.6, 2.35, 0.72, 'Store in DB', 'iv:authTag:ciphertext\n(hex encoded)', C_CIPHER, 8)

arrow(ax, 1.78, 2.6, 1.78, 2.0, '', C_MODE_A)
arrow(ax, 4.43, 2.6, 4.43, 2.0, '', C_CIPHER)

box(ax, 0.6, 1.7, 5.3, 0.65, 'Decrypt on read (Observer / Context Builder)',
    'Server decrypts → plaintext available for AI context', C_MODE_A, 8)

# ── MODE B ────────────────────────────────────────────────────────────────────
rect_b = FancyBboxPatch((7.8, 1.6), 5.9, 3.0, boxstyle="round,pad=0.15",
                         linewidth=2, edgecolor=C_MODE_B, facecolor='#FBE9E7',
                         linestyle='--')
ax.add_patch(rect_b)
ax.text(10.75, 4.45, 'MODE B — Zero-Knowledge', ha='center', fontsize=11,
        fontweight='bold', color=C_MODE_B)

box(ax, 8.1, 3.55, 5.3, 0.65, 'Client holds key · Server NEVER sees plaintext',
    'Observer + Reports DISABLED · Max privacy', C_MODE_B, 8)

box(ax, 8.1, 2.6, 2.35, 0.72, 'Encrypt msg', 'Client-side key\nnever leaves browser', C_MODE_B, 8)
box(ax, 10.75, 2.6, 2.35, 0.72, 'Store in DB', 'Ciphertext only\nserver is blind', C_CIPHER, 8)

arrow(ax, 9.28, 2.6, 9.28, 2.0, '', C_MODE_B)
arrow(ax, 11.93, 2.6, 11.93, 2.0, '', C_CIPHER)

box(ax, 8.1, 1.7, 5.3, 0.65, 'Decrypt on client only',
    'Client sends key + ciphertext → local decrypt only', C_MODE_B, 8)

# ── Ciphertext format ─────────────────────────────────────────────────────────
cipher_box = FancyBboxPatch((2.5, 0.2), 9.0, 1.1,
                             boxstyle="round,pad=0.1",
                             linewidth=1.8, edgecolor='#455A64',
                             facecolor='#ECEFF1')
ax.add_patch(cipher_box)
ax.text(7.0, 1.1, 'Ciphertext Wire Format', ha='center', fontsize=9.5,
        fontweight='bold', color=C_HEAD)
ax.text(7.0, 0.75,
        '"<hex_iv> : <hex_authTag> : <hex_ciphertext>"',
        ha='center', fontsize=10, color='#1A237E',
        fontfamily='monospace')
ax.text(7.0, 0.42,
        'IV = 12 bytes (96-bit GCM)  ·  Auth Tag = 16 bytes (128-bit)  ·  Ciphertext = variable',
        ha='center', fontsize=8, color=C_CIPHER, style='italic')

# ── Key rotation note ─────────────────────────────────────────────────────────
ax.text(7.0, 0.04,
        'Key Rotation: Re-encrypt all per-user keys with new master key — message ciphertext unchanged',
        ha='center', fontsize=7.8, color='#78909C', style='italic')

ax.text(13.7, 0.04, 'Fig. 4', ha='right', fontsize=8, color='gray', style='italic')

legend_items = [
    mpatches.Patch(facecolor=C_KEY+'22',    edgecolor=C_KEY,    label='Key Hierarchy'),
    mpatches.Patch(facecolor=C_MODE_A+'22', edgecolor=C_MODE_A, label='Mode A (Server-Assisted)'),
    mpatches.Patch(facecolor=C_MODE_B+'22', edgecolor=C_MODE_B, label='Mode B (Zero-Knowledge)'),
]
ax.legend(handles=legend_items, loc='upper left', fontsize=8.5,
          framealpha=0.9, bbox_to_anchor=(0.01, 0.99))

plt.tight_layout()
plt.savefig('Figure4_Encryption_Architecture.png', dpi=200, bbox_inches='tight',
            facecolor=fig.get_facecolor())
plt.savefig('Figure4_Encryption_Architecture.svg', format='svg', bbox_inches='tight',
            facecolor=fig.get_facecolor())
print("Saved: Figure4_Encryption_Architecture.png / .svg")
plt.show()
