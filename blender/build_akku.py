"""
Der Lithium-Ionen-Akku – prozeduraler Blender-Aufbau, Export für den Three.js-Viewer und Video-Animation.

Bildsprache nach PROJEKT-UEBERGABE.md, Abschnitt 4 (Abb. 1–3 / schema.py):
Graphit links (Minuspol), Lithium-Cobalt-Oxid rechts (Pluspol), Li⁺ gelb-orange mit „+“,
Separator gestrichelt in der Mitte, Draht oben mit Lämpchen bzw. Ladegerät.

Koordinaten (Blender): +X rechts, +Y nach hinten (vom Betrachter weg), +Z oben.
glTF/Three.js: (x, y, z)_three = (x, z, -y)_blender.  Maßstab: schema.py × 2, Mitte bei x = 0.

Ausführen:
    blender -b --factory-startup --python blender/build_akku.py -- [--no-render]

Schreibt:
    web/models/akku.glb     – Modell für den Viewer (Draco)
    web/models/meta.json    – Plätze, Wege, Zeitfenster der Teilchen, Marker-Anker
    web/img/render.jpg      – Vorschaubild (Eevee)
    web/icons/icon-*.png    – App-Icons
    blender/akku.blend      – Szene mit fertig animiertem Video-Ablauf (90 s)
    video/plan.json         – Untertitel, Gleichungen und Bildschirm-Positionen für video_overlay.py
"""
import bpy, math, json, os, sys, time
import numpy as np
from mathutils import Vector

T0 = time.time()
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
DO_RENDER = "--no-render" not in ARGS
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GLB_PATH = os.path.join(ROOT, "web/models/akku.glb")
META_PATH = os.path.join(ROOT, "web/models/meta.json")
BLEND_PATH = os.path.join(ROOT, "blender/akku.blend")
RENDER_PATH = os.path.join(ROOT, "web/img/render.jpg")
ICON_DIR = os.path.join(ROOT, "web/icons")
PLAN_PATH = os.path.join(ROOT, "video/plan.json")
FRAMES_DIR = os.path.join(ROOT, "video/frames")
for p in (GLB_PATH, BLEND_PATH, RENDER_PATH, ICON_DIR + "/x", PLAN_PATH, FRAMES_DIR + "/x"):
    os.makedirs(os.path.dirname(p), exist_ok=True)

FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def log(*a):
    print(f"[akku {time.time() - T0:6.1f}s]", *a, flush=True)


bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# --------------------------------------------------------------------------------------
# Farben (Abschnitt 4 der Übergabe; auf dunklem Grund teils aufgehellt, siehe Kommentar)
# --------------------------------------------------------------------------------------
C = {
    "graphit": "#6e7680",      # Abb.: #3d3d3d – aufgehellt, sonst auf #060c18 unsichtbar
    "graphit_c": "#7c838d",    # Kohlenstoffatome in der Kristallansicht
    "oxid": "#2f6db5",         # Oxidschichten (und Co³⁺)
    "co4": "#b47cff",          # Co⁴⁺ (hellviolett)
    "c6m": "#d8665a",          # C₆⁻-Einheit: Ring mit rötlichem Ton (Elektronenüberschuss)
    "c6": "#a3aab3",           # C₆-Einheit: neutral grau
    "sauerstoff": "#dfe5ee",   # O²⁻ in der Kristallansicht (nicht rot: rot = Elektronen)
    "li": "#f2a900", "li_rand": "#9a6b00", "li_zeichen": "#5a3d00",
    "elektrolyt": "#e3f1fb", "behaelter": "#7a9cb5",
    "separator": "#98a1ae",    # Abb.: #555555 – aufgehellt
    "draht": "#aab3c0",        # Abb.: #222222 – auf dunklem Grund hell (sonst unsichtbar)
    "lampe": "#fff7c2", "wendel": "#3a3a3a",
    "lader": "#c3cad4", "lader_schrift": "#222222",
    "elektron": "#d8432f",     # Abb.: #c0392b – etwas heller
    "pfeil_e": "#e0503f", "pfeil_li": "#e39a12",
    "pol": "#c3cddb",
}


def srgb(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((x / 12.92) if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


MATS = {}


def make_mat(name, hexcol, rough=0.45, alpha=1.0, emit=0.0, metal=0.0, coat=0.0, trans=0.0):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    col = srgb(hexcol)
    b.inputs["Base Color"].default_value = (*col, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if coat:
        b.inputs["Coat Weight"].default_value = coat
    if emit:
        b.inputs["Emission Color"].default_value = (*col, 1)
        b.inputs["Emission Strength"].default_value = emit
    if alpha < 1:
        b.inputs["Alpha"].default_value = alpha
        m.blend_method = "BLEND"
        m.shadow_method = "NONE"
        m.show_transparent_back = False
    m.diffuse_color = (*col, alpha)
    MATS[name] = m
    return m


COLL = {}


def coll(name):
    if name not in COLL:
        c = bpy.data.collections.new(name)
        scene.collection.children.link(c)
        COLL[name] = c
    return COLL[name]


def make_object(name, V, F, mat, collection, smooth=True, loc=(0, 0, 0)):
    me = bpy.data.meshes.new(name)
    me.from_pydata(np.asarray(V, dtype=np.float64).tolist(), [], [list(map(int, f)) for f in F])
    me.update(calc_edges=True)
    me.validate()
    me.polygons.foreach_set("use_smooth", [smooth] * len(me.polygons))
    me.materials.append(mat)
    o = bpy.data.objects.new(name, me)
    o.location = loc
    coll(collection).objects.link(o)
    return o


# --------------------------------------------------------------------------------------
# Geometrie-Bausteine (numpy, ohne bpy.ops)
# --------------------------------------------------------------------------------------
def uvsphere(r, seg=24, rings=14):
    V = [(0, 0, r)]
    for i in range(1, rings):
        th = math.pi * i / rings
        for j in range(seg):
            ph = 2 * math.pi * j / seg
            V.append((r * math.sin(th) * math.cos(ph), r * math.sin(th) * math.sin(ph), r * math.cos(th)))
    V.append((0, 0, -r))
    F = []
    for j in range(seg):
        F.append((0, 1 + j, 1 + (j + 1) % seg))
    for i in range(rings - 2):
        a, b = 1 + i * seg, 1 + (i + 1) * seg
        for j in range(seg):
            F.append((a + j, b + j, b + (j + 1) % seg, a + (j + 1) % seg))
    last = len(V) - 1
    a = 1 + (rings - 2) * seg
    for j in range(seg):
        F.append((a + j, last, a + (j + 1) % seg))
    return np.array(V, float), F


def box(c, s):
    cx, cy, cz = c
    hx, hy, hz = s[0] / 2, s[1] / 2, s[2] / 2
    V = [(cx + x * hx, cy + y * hy, cz + z * hz) for x in (-1, 1) for y in (-1, 1) for z in (-1, 1)]
    F = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    return np.array(V, float), F


def rbox(c, s, r=0.12, seg=4):
    """Quader mit abgerundeten Kanten (über eine Kugel mit verschobenen Hälften)."""
    V, F = uvsphere(r, seg * 4, seg * 2 + 1)
    V = V.copy()
    for k in range(3):
        h = s[k] / 2 - r
        V[:, k] = np.where(V[:, k] > 1e-9, V[:, k] + h, np.where(V[:, k] < -1e-9, V[:, k] - h, V[:, k]))
    V += np.array(c)
    return V, F


def cyl(p0, p1, r, seg=16, caps=True):
    p0, p1 = np.array(p0, float), np.array(p1, float)
    d = p1 - p0
    L = np.linalg.norm(d)
    d /= L
    a = np.array([1, 0, 0]) if abs(d[0]) < 0.9 else np.array([0, 1, 0])
    u = np.cross(d, a); u /= np.linalg.norm(u)
    v = np.cross(d, u)
    V, F = [], []
    for k in range(seg):
        ph = 2 * math.pi * k / seg
        o = r * (math.cos(ph) * u + math.sin(ph) * v)
        V += [p0 + o, p1 + o]
    for k in range(seg):
        k2 = (k + 1) % seg
        F.append((2 * k, 2 * k2, 2 * k2 + 1, 2 * k + 1))
    if caps:
        V += [p0, p1]
        c0, c1 = 2 * seg, 2 * seg + 1
        for k in range(seg):
            k2 = (k + 1) % seg
            F.append((c0, 2 * k2, 2 * k))
            F.append((c1, 2 * k + 1, 2 * k2 + 1))
    return np.array(V, float), F


def cone(p0, p1, r, seg=24):
    p0, p1 = np.array(p0, float), np.array(p1, float)
    d = p1 - p0; d /= np.linalg.norm(d)
    a = np.array([0, 0, 1]) if abs(d[2]) < 0.9 else np.array([0, 1, 0])
    u = np.cross(d, a); u /= np.linalg.norm(u)
    v = np.cross(d, u)
    V = [p0 + r * (math.cos(2 * math.pi * k / seg) * u + math.sin(2 * math.pi * k / seg) * v) for k in range(seg)]
    V += [p1, p0]
    F = [(k, (k + 1) % seg, seg) for k in range(seg)] + [((k + 1) % seg, k, seg + 1) for k in range(seg)]
    return np.array(V, float), F


def merge(*parts):
    Vs, Fs, off = [], [], 0
    for V, F in parts:
        Vs.append(np.asarray(V, float))
        Fs += [tuple(i + off for i in f) for f in F]
        off += len(V)
    return np.concatenate(Vs), Fs


def instances(proto, positions):
    V0, F0 = proto
    return merge(*[(V0 + np.array(p), F0) for p in positions])


def text_object(name, body, size, loc, collection, mat, bold=False, extrude=0.02, rot=(math.pi / 2, 0, 0), align="CENTER"):
    cu = bpy.data.curves.new(name + "_c", "FONT")
    cu.body = body
    cu.size = size
    cu.extrude = extrude
    cu.align_x = align
    cu.align_y = "CENTER"
    fp = FONT_BOLD if bold else FONT_REG
    if os.path.exists(fp):
        cu.font = bpy.data.fonts.load(fp, check_existing=True)
    tmp = bpy.data.objects.new(name + "_tmp", cu)
    scene.collection.objects.link(tmp)
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg))
    bpy.data.objects.remove(tmp)
    bpy.data.curves.remove(cu)
    me.name = name
    me.materials.clear()
    me.materials.append(mat)
    o = bpy.data.objects.new(name, me)
    o.location = loc
    o.rotation_euler = rot
    coll(collection).objects.link(o)
    return o


# --------------------------------------------------------------------------------------
# Maße
# --------------------------------------------------------------------------------------
GX0, GX1 = -8.0, -4.0            # Graphitschichten
OX0, OX1 = 4.0, 8.0              # Oxidschichten
YD = 2.4                         # halbe Tiefe der Elektroden
LAYERS = [-3.0, -1.8, -0.6, 0.6, 1.8, 3.0]
GAPS = [(a + b) / 2 for a, b in zip(LAYERS, LAYERS[1:])]  # -2.4 … 2.4
EL = dict(x=8.6, y=2.8, z0=-4.3, z1=4.3)                    # Elektrolyt-Behälter
COLL_TOP = 4.6                   # Oberkante der Ableiter
WIRE_Z = 7.2
XL, XR = -8.15, 8.15             # Ableiter-Mitte (Draht-Anschluss)
R_LI, R_E, R_CO = 0.34, 0.17, 0.2
OX_XS = [OX0 + 0.25 + 0.5 * k for k in range(8)]
OX_YS = [-2.25 + 0.5 * k for k in range(10)]
SEP_DASH, SEP_PERIOD = 0.45, 1.25
SEP_GAPS = [EL["z0"] + SEP_DASH + (SEP_PERIOD - SEP_DASH) / 2 + SEP_PERIOD * k for k in range(7)]

# Graphit-Kristall: Bienenwaben, Li⁺ über den Sechseck-Mitten (wie in LiC₆)
HEX_B = 0.36
A1 = np.array([math.sqrt(3) * HEX_B, 0.0])
A2 = np.array([math.sqrt(3) / 2 * HEX_B, 1.5 * HEX_B])
HEX_O = np.array([-6.0, 0.0])
hex_centers = []
for i in range(-12, 13):
    for j in range(-6, 7):
        c = HEX_O + i * A1 + j * A2
        if GX0 - 0.6 < c[0] < GX1 + 0.6 and -YD - 0.6 < c[1] < YD + 0.6:
            hex_centers.append(c)
hex_centers = np.array(hex_centers)


def snap_hex(x, y):
    d = np.linalg.norm(hex_centers - np.array([x, y]), axis=1)
    c = hex_centers[int(np.argmin(d))]
    return float(c[0]), float(c[1])


# --------------------------------------------------------------------------------------
# Teilchen-Plätze: 6 wandernde Li⁺ (voll: im Graphit, leer: im Oxid) + 2 Li⁺, die im Elektrolyten bleiben
# Abb. 1/2: 3 Graphit / 2 Elektrolyt / 3 Oxid – Abb. 3: 0 / 1 / 5 → Modell: 6 wandernde + 2 ständige
# --------------------------------------------------------------------------------------
G_SITES_RAW = [(-5.0, -1.9, GAPS[4]), (-6.6, -1.6, GAPS[3]), (-5.4, -2.0, GAPS[2]),
               (-4.8, -1.5, GAPS[1]), (-6.5, -1.9, GAPS[0]), (-7.2, -1.7, GAPS[2])]
O_SITES = [(5.25, -2.25, GAPS[4]), (6.75, -1.75, GAPS[3]), (4.75, -2.25, GAPS[2]),
           (6.25, -2.25, GAPS[1]), (5.75, -1.75, GAPS[0]), (7.25, -2.25, GAPS[2])]
# Li⁺ sitzt etwas über der Lückenmitte, darunter die C₆-Einheit (Sechsring) mit dem zusätzlichen Elektron in der Mitte
G_LAYER = [z - 0.6 for x, y, z in G_SITES_RAW]                    # Graphitschicht unter dem Li⁺-Platz
G_SITES = [(*snap_hex(x, y), z + 0.12) for x, y, z in G_SITES_RAW]
C6_POS = [(x, y, zl) for (x, y, _), zl in zip(G_SITES, G_LAYER)]   # Mitte des Sechsrings (in der Schicht)
CO_POS = [(x, y, z - 0.6) for x, y, z in O_SITES]               # aktives Cobalt-Ion direkt unter dem Li⁺-Platz
E_START = [(x, y, zl + 0.12 + 0.05) for (x, y, _), zl in zip(G_SITES, G_LAYER)]  # zusätzliches Elektron in der C₆-Einheit
ELYT_LI = [(-2.1, 1.3, -1.6), (2.3, 1.1, 1.7)]
WINDOWS = [(round(0.14 * i, 3), round(0.14 * i + 0.30, 3)) for i in range(6)]


def catmull(points, samples=24):
    P = np.array(points, float)
    P = np.vstack([2 * P[0] - P[1], P, 2 * P[-1] - P[-2]])
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for t in np.linspace(0, 1, samples, endpoint=False):
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(P[-2])
    return np.array(out)


def resample(P, n):
    P = np.asarray(P, float)
    seg = np.linalg.norm(np.diff(P, axis=0), axis=1)
    s = np.concatenate([[0], np.cumsum(seg)])
    t = np.linspace(0, s[-1], n)
    return np.stack([np.interp(t, s, P[:, k]) for k in range(3)], axis=1)


def polyline(points, step=0.05):
    out = []
    for a, b in zip(points, points[1:]):
        a, b = np.array(a, float), np.array(b, float)
        k = max(2, int(np.linalg.norm(b - a) / step))
        out += [a + (b - a) * t for t in np.linspace(0, 1, k, endpoint=False)]
    out.append(np.array(points[-1], float))
    return np.array(out)


LI_PATHS, E_PATHS = [], []
U_ARRIVE, U_DEPART = [], []
for i in range(6):
    gx, gy, gz = G_SITES[i]
    ox, oy, oz = O_SITES[i]
    ym = (gy + oy) / 2
    zs = min(SEP_GAPS, key=lambda z: abs(z - (gz + oz) / 2))
    pts = [(gx, gy, gz), (GX1 + 0.15, gy, gz), (-2.2, (gy + ym) / 2, (gz + zs) / 2), (-0.7, ym, zs), (0.7, ym, zs),
           (2.2, (oy + ym) / 2, (oz + zs) / 2), (OX0 - 0.15, oy, oz), (ox, oy, oz)]
    LI_PATHS.append(resample(catmull(pts, 20), 120))
    ex, ey, ez = E_START[i]
    cx, cy, cz = CO_POS[i]
    epts = [(ex, ey, ez), (-7.78, ey, ez), (-7.78, 0, COLL_TOP - 0.15), (XL, 0, COLL_TOP + 0.25), (XL, 0, WIRE_Z),
            (XR, 0, WIRE_Z), (XR, 0, COLL_TOP + 0.25), (7.78, 0, COLL_TOP - 0.15), (7.78, cy, cz + 0.32),
            (cx + 0.25, cy, cz + 0.32), (cx, cy, cz)]
    E_PATHS.append(resample(polyline(epts), 200))


def path_u_at_distance(P, target, dist, from_end=True):
    """Anteil u des Wegs, an dem das Teilchen den Abstand dist zu target erreicht (bei Ankunft bzw. beim Verlassen)."""
    d = np.linalg.norm(np.asarray(P) - np.asarray(target), axis=1)
    n = len(P) - 1
    if from_end:
        for k in range(n, -1, -1):
            if d[k] > dist:
                return (k + 1) / n
        return 0.0
    for k in range(n + 1):
        if d[k] > dist:
            return k / n
    return 1.0


def smooth01(x):
    x = min(1.0, max(0.0, x))
    return x * x * (3 - 2 * x)


for i in range(6):
    U_ARRIVE.append(path_u_at_distance(E_PATHS[i], CO_POS[i], R_CO + R_E))                    # Elektron berührt das Cobalt-Ion
    U_DEPART.append(path_u_at_distance(E_PATHS[i], E_START[i], HEX_B + R_E, from_end=False))   # Elektron verlässt den Ring


def progress(i, s):
    a, b = WINDOWS[i]
    return smooth01((s - a) / (b - a))


def path_at(P, u):
    f = u * (len(P) - 1)
    k = min(int(f), len(P) - 2)
    t = f - k
    return P[k] * (1 - t) + P[k + 1] * t


# --------------------------------------------------------------------------------------
# Szene aufbauen
# --------------------------------------------------------------------------------------
M = {
    "Graphit": make_mat("Graphit", C["graphit"], rough=0.32, metal=0.35),
    "Kohlenstoff": make_mat("Kohlenstoff", C["graphit_c"], rough=0.4, metal=0.15),
    "Oxid": make_mat("Oxid", C["oxid"], rough=0.35, coat=0.3),
    "Sauerstoff": make_mat("Sauerstoff", C["sauerstoff"], rough=0.4),
    "Elektrolyt": make_mat("Elektrolyt", "#8cc4ee", rough=0.15, alpha=0.07),
    "Behaelter": make_mat("Behaelter", C["behaelter"], rough=0.3),
    "Separator": make_mat("Separator", C["separator"], rough=0.6),
    "Draht": make_mat("Draht", C["draht"], rough=0.3, metal=0.6),
    "Lampe": make_mat("Lampe", C["lampe"], rough=0.08, alpha=0.82, coat=1.0),
    "Wendel": make_mat("Wendel", C["wendel"], rough=0.4, metal=0.5),
    "Lader": make_mat("Lader", C["lader"], rough=0.35, coat=0.3),
    "LaderSchrift": make_mat("LaderSchrift", C["lader_schrift"], rough=0.5),
    "Pol": make_mat("Pol", C["pol"], rough=0.4, emit=0.4),
    "PfeilE": make_mat("PfeilE", C["pfeil_e"], rough=0.35, emit=0.6),
    "PfeilLi": make_mat("PfeilLi", C["pfeil_li"], rough=0.35, emit=0.6),
    "Li": make_mat("Li", C["li"], rough=0.3, coat=0.6, emit=0.15),
    "LiZeichen": make_mat("LiZeichen", C["li_zeichen"], rough=0.5),
    "Elektron": make_mat("Elektron", C["elektron"], rough=0.3, coat=0.5, emit=0.5),
    "ElektronZeichen": make_mat("ElektronZeichen", "#ffffff", rough=0.5, emit=0.3),
}

# Graphit (Minuspol)
make_object("Graphit_Schichten", *merge(*[box(((GX0 + GX1) / 2, 0, z), (GX1 - GX0, 2 * YD, 0.24)) for z in LAYERS]), M["Graphit"], "Graphit", smooth=False)
make_object("Graphit_Ableiter", *box((XL, 0, (-3.8 + COLL_TOP) / 2), (0.3, 2 * YD + 0.2, COLL_TOP + 3.8)), M["Graphit"], "Graphit", smooth=False)

# Graphit-Kristall (Bienenwaben-Schichten)
atoms, bonds = {}, set()
for c in hex_centers:
    ring = []
    for k in range(6):
        ang = math.radians(90 + 60 * k)
        p = (round(c[0] + HEX_B * math.cos(ang), 4), round(c[1] + HEX_B * math.sin(ang), 4))
        ring.append(p)
    for k in range(6):
        a, b = ring[k], ring[(k + 1) % 6]
        if all(GX0 + 0.05 <= q[0] <= GX1 and -YD <= q[1] <= YD for q in (a, b)):
            atoms[a] = 1; atoms[b] = 1
            bonds.add(tuple(sorted((a, b))))
sph_c = uvsphere(0.075, 10, 6)
atom_pos = [(x, y, z) for z in LAYERS for (x, y) in atoms]
make_object("Graphit_Kristall_C", *instances(sph_c, atom_pos), M["Kohlenstoff"], "Kristall")
make_object("Graphit_Kristall_Bindung", *merge(*[cyl((a[0], a[1], z), (b[0], b[1], z), 0.03, 6, caps=False) for z in LAYERS for a, b in bonds]),
            M["Kohlenstoff"], "Kristall")
log(f"Graphit-Kristall: {len(atoms)} C-Atome je Schicht")

# Lithium-Cobalt-Oxid (Pluspol): Schichten aus Kugelreihen
co_set = {(round(x, 3), round(y, 3), round(z, 3)) for x, y, z in CO_POS}
ox_pos = [(x, y, z) for z in LAYERS for x in OX_XS for y in OX_YS if (round(x, 3), round(y, 3), round(z, 3)) not in co_set]
make_object("Oxid_Schichten", *instances(uvsphere(R_CO, 16, 10), ox_pos), M["Oxid"], "Oxid")
make_object("Oxid_Ableiter", *box((XR, 0, (-3.8 + COLL_TOP) / 2), (0.3, 2 * YD + 0.2, COLL_TOP + 3.8)), M["Oxid"], "Oxid", smooth=False)
# Kristallansicht: Co-Ebene + O-Ebenen darüber und darunter (CoO₂-Schicht)
o_pos = [(x + 0.25 * s, y + 0.25, z + 0.24 * s) for z in LAYERS for s in (-1, 1) for x in OX_XS for y in OX_YS[:-1] if OX0 < x + 0.25 * s < OX1]
make_object("Oxid_Kristall_Co", *instances(uvsphere(0.16, 12, 8), ox_pos), M["Oxid"], "Kristall")
make_object("Oxid_Kristall_O", *instances(uvsphere(0.11, 10, 6), o_pos), M["Sauerstoff"], "Kristall")
# Die sechs „aktiven“ Cobalt-Ionen (Co⁴⁺ ↔ Co³⁺), je eigenes Objekt/Material
for i, p in enumerate(CO_POS):
    m = make_mat(f"Co_{i + 1}", C["co4"], rough=0.3, coat=0.4, emit=0.25)
    make_object(f"Co_{i + 1}", *uvsphere(R_CO, 20, 12), m, "Cobalt", loc=p)

# Die sechs C₆-Einheiten (C₆⁻ ↔ C₆): Sechsring unter jedem Li⁺-Platz; Schema = auf der Platte, Kristall = die 6 C-Atome des Gitters
def hex_ring(cx, cy, z, r_atom, r_bond):
    pts = [(cx + HEX_B * math.cos(math.radians(90 + 60 * k)), cy + HEX_B * math.sin(math.radians(90 + 60 * k)), z) for k in range(6)]
    sph = uvsphere(r_atom, 14, 8)
    parts = [(sph[0] + np.array(p), sph[1]) for p in pts]
    parts += [cyl(pts[k], pts[(k + 1) % 6], r_bond, 8, caps=False) for k in range(6)]
    return merge(*parts)


for i, (x, y, zl) in enumerate(C6_POS):
    m = make_mat(f"C6_{i + 1}", C["c6m"], rough=0.35, emit=0.35)
    make_object(f"C6s_{i + 1}", *hex_ring(x, y, zl + 0.12 + 0.05, 0.095, 0.05), m, "C6")
    make_object(f"C6k_{i + 1}", *hex_ring(x, y, zl, 0.1, 0.045), m, "Kristall")

# Elektrolyt, Behälter, Separator
make_object("Elektrolyt_Rueckwand", *box((0, EL["y"] - 0.02, 0), (2 * EL["x"], 0.04, EL["z1"] - EL["z0"])), make_mat("Rueckwand", "#16324f", rough=0.6), "Zelle", smooth=False)
make_object("Elektrolyt", *box((0, 0, 0), (2 * EL["x"], 2 * EL["y"], EL["z1"] - EL["z0"])), M["Elektrolyt"], "Zelle", smooth=False)
ex_, ey_, z0, z1 = EL["x"], EL["y"], EL["z0"], EL["z1"]
edges = []
for sy in (-1, 1):
    for sz in (z0, z1):
        edges.append(((-ex_, sy * ey_, sz), (ex_, sy * ey_, sz)))
    for sx in (-1, 1):
        edges.append(((sx * ex_, sy * ey_, z0), (sx * ex_, sy * ey_, z1)))
for sx in (-1, 1):
    for sz in (z0, z1):
        edges.append(((sx * ex_, -ey_, sz), (sx * ex_, ey_, sz)))
make_object("Behaelter", *merge(*[cyl(a, b, 0.045, 10) for a, b in edges]), M["Behaelter"], "Zelle")
dashes = []
z = z0
while z < z1 - 0.05:
    dashes.append(box((0, 0, min(z + SEP_DASH, z1) / 2 + z / 2), (0.14, 2 * ey_ - 0.1, min(SEP_DASH, z1 - z))))
    z += SEP_PERIOD
make_object("Separator", *merge(*dashes), M["Separator"], "Zelle", smooth=False)

# Äußerer Stromkreis
wire_pts = [(XL, 0, COLL_TOP), (XL, 0, WIRE_Z), (XR, 0, WIRE_Z), (XR, 0, COLL_TOP)]
parts = [cyl(a, b, 0.09, 16) for a, b in zip(wire_pts, wire_pts[1:])]
parts += [(uvsphere(0.09, 16, 8)[0] + np.array(p), uvsphere(0.09, 16, 8)[1]) for p in wire_pts[1:3]]
make_object("Draht", *merge(*parts), M["Draht"], "Stromkreis")
# Lämpchen: Glaskugel mit Kreuz (Schaltzeichen)
make_object("Lampe_Glas", *uvsphere(0.75, 32, 18), M["Lampe"], "Lampe", loc=(0, 0, WIRE_Z))
d = 0.75 * 0.72
make_object("Lampe_Wendel", *merge(cyl((-d, 0, -d), (d, 0, d), 0.055, 10), cyl((-d, 0, d), (d, 0, -d), 0.055, 10)), M["Wendel"], "Lampe", loc=(0, 0, WIRE_Z))
# Ladegerät
make_object("Ladegeraet", *rbox((0, 0, 0), (4.2, 1.6, 1.9), 0.18), M["Lader"], "Lader", loc=(0, 0, WIRE_Z + 0.15))
text_object("Ladegeraet_Schrift", "Ladegerät", 0.48, (0, -0.82, WIRE_Z + 0.55), "Lader", M["LaderSchrift"])
for nm, x in (("Ladegeraet_Buchse_L", -1.35), ("Ladegeraet_Buchse_R", 1.35)):
    make_object(nm, *box((0, 0, 0), (0.62, 0.06, 0.62)), make_mat("Buchse", "#ffffff", rough=0.5), "Lader", smooth=False, loc=(x, -0.81, WIRE_Z - 0.32))
text_object("Pol_Lader_Minus", "−", 0.62, (-1.35, -0.86, WIRE_Z - 0.3), "Lader", M["LaderSchrift"], bold=True)
text_object("Pol_Lader_Plus", "+", 0.62, (1.35, -0.86, WIRE_Z - 0.3), "Lader", M["LaderSchrift"], bold=True)
# Polzeichen des Akkus
text_object("Pol_Minus", "−", 1.5, (-9.7, 0, 5.4), "Stromkreis", M["Pol"], bold=True, extrude=0.06)
text_object("Pol_Plus", "+", 1.5, (9.7, 0, 5.4), "Stromkreis", M["Pol"], bold=True, extrude=0.06)


# Pfeile (zeigen in +x; der Viewer spiegelt sie beim Laden)
def arrow(name, L, r, head, mat, loc):
    V, F = merge(cyl((-L / 2, 0, 0), (L / 2 - head * 1.6, 0, 0), r, 16), cone((L / 2 - head * 1.7, 0, 0), (L / 2, 0, 0), head, 24))
    return make_object(name, V, F, mat, "Pfeile", loc=loc)


arrow("Pfeil_e", 10.5, 0.1, 0.32, M["PfeilE"], (0, 0, WIRE_Z + 1.55))
arrow("Pfeil_Li", 6.4, 0.1, 0.32, M["PfeilLi"], (0, 0, EL["z0"] - 0.8))


# Vorlagen für die beweglichen Teilchen (der Viewer klont sie): Zeichen liegt vorn (−Y = three +z)
def sign_mesh(plus, r, front_axis):
    w, t, dep = 0.44 * r / 0.34, 0.11 * r / 0.34, 0.06
    bars = [box((0, 0, 0), (w, dep, t))]
    if plus:
        bars.append(box((0, 0, 0), (t, dep, w)))
    V, F = merge(*bars)
    if front_axis == "-Y":
        V[:, 1] -= r * 0.98
    else:  # Zeichen in der XY-Ebene vor +Z (Track-To-Kamera im Video)
        V = V[:, [0, 2, 1]]
        V[:, 2] += r * 0.98
        F = [tuple(reversed(f)) for f in F]
    return V, F


# Instanz-Vorlagen: Kugelgitter gehen als eine Kugel + Positionen in den Viewer (kein Draco im lokalen Blender)
INSTANCES = {
    "Oxid_Schichten": ("Inst_Oxid", uvsphere(R_CO, 16, 10), M["Oxid"], ox_pos),
    "Oxid_Kristall_Co": ("Inst_Kristall_Co", uvsphere(0.16, 12, 8), M["Oxid"], ox_pos),
    "Oxid_Kristall_O": ("Inst_Kristall_O", uvsphere(0.11, 10, 6), M["Sauerstoff"], o_pos),
    "Graphit_Kristall_C": ("Inst_Kristall_C", uvsphere(0.075, 10, 6), M["Kohlenstoff"], atom_pos),
}
for grp, (proto, geo, mat, _) in INSTANCES.items():
    make_object(proto, *geo, mat, "Vorlagen")
make_object("Li_Vorlage", *uvsphere(R_LI, 28, 16), M["Li"], "Vorlagen")
make_object("Li_Zeichen", *sign_mesh(True, R_LI, "-Y"), M["LiZeichen"], "Vorlagen", smooth=False)
make_object("e_Vorlage", *uvsphere(R_E, 20, 12), M["Elektron"], "Vorlagen")
make_object("e_Zeichen", *sign_mesh(False, R_E, "-Y"), M["ElektronZeichen"], "Vorlagen", smooth=False)


# --------------------------------------------------------------------------------------
# Export für den Viewer
# --------------------------------------------------------------------------------------
def to_three(p):
    return [round(float(p[0]), 4), round(float(p[2]), 4), round(float(-p[1]), 4)]


ANCHORS = {
    "graphit": (-6.0, -YD, 3.6), "oxid": (6.0, -YD, 3.6), "elektrolyt": (2.6, -EL["y"], -3.2),
    "separator": (0, -EL["y"], 3.9), "lampe": (0, 0, WIRE_Z + 0.75), "ladegeraet": (0, -0.8, WIRE_Z + 1.1),
    "draht": (-4.0, 0, WIRE_Z), "ableiter_g": (XL, -YD, 4.2), "ableiter_o": (XR, -YD, 4.2),
    "eq_links": (-4.4, 0, 5.75), "eq_rechts": (4.4, 0, 5.75),
    "pol_minus": (-9.7, 0, 5.4), "pol_plus": (9.7, 0, 5.4),
}

stats = {"blender": bpy.app.version_string, "objects": sum(1 for o in bpy.data.objects if o.type == "MESH"),
         "triangles": sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in bpy.data.objects if o.type == "MESH")}
meta = {
    "units": "schema.py × 2; three.js: +x rechts, +y oben, +z zum Betrachter",
    "li": [{"path": [to_three(p) for p in P[::2]] + [to_three(P[-1])]} for P in LI_PATHS],
    "e": [{"path": [to_three(p) for p in P[::2]] + [to_three(P[-1])]} for P in E_PATHS],
    "co": [to_three(p) for p in CO_POS],
    "elyt": [to_three(p) for p in ELYT_LI],
    "windows": WINDOWS,
    "instances": {g: {"proto": v[0], "pos": [to_three(p) for p in v[3]]} for g, v in INSTANCES.items()},
    "c6": [to_three(p) for p in C6_POS],
    "u_arrive": [round(u, 4) for u in U_ARRIVE], "u_depart": [round(u, 4) for u in U_DEPART],
    "colors": {"co4": C["co4"], "co3": C["oxid"], "c6m": C["c6m"], "c6": C["c6"]},
    "anchors": {k: to_three(v) for k, v in ANCHORS.items()},
    "stats": stats,
}
with open(META_PATH, "w") as fh:
    json.dump(meta, fh, ensure_ascii=False, separators=(",", ":"))
log(f"{stats['objects']} Objekte, {stats['triangles']} Dreiecke")

for o in bpy.data.objects:
    o.select_set(o.type == "MESH" and o.name not in INSTANCES)
bpy.ops.export_scene.gltf(filepath=GLB_PATH, export_format="GLB", use_selection=True, export_apply=True, export_yup=True,
                          export_cameras=False, export_lights=False, export_animations=False, export_extras=False,
                          export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7,
                          export_draco_position_quantization=14, export_draco_normal_quantization=10)
log(f"GLB geschrieben: {os.path.getsize(GLB_PATH) / 1e6:.2f} MB")

# --------------------------------------------------------------------------------------
# Licht, Welt, Kamera (Eevee)
# --------------------------------------------------------------------------------------
world = bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes["Background"]
bg.inputs["Color"].default_value = (*srgb("#060c18"), 1)
bg.inputs["Strength"].default_value = 1.0


def light(name, kind, loc, energy, color, size=10.0, target=(0, 0, 1.5)):
    ld = bpy.data.lights.new(name, kind)
    ld.energy = energy
    ld.color = srgb(color)
    if kind == "AREA":
        ld.size = size
    lo = bpy.data.objects.new(name, ld)
    scene.collection.objects.link(lo)
    lo.location = loc
    lo.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    return lo


light("Key", "AREA", (-16, -26, 22), 9000, "#fff0da", 16)
light("Rim", "AREA", (18, 20, 14), 5000, "#6fb6ff", 14)
light("Fill", "AREA", (6, -22, -10), 1500, "#cfe2ff", 14)
lamp_light = light("Lampenlicht", "POINT", (0, 0, WIRE_Z), 0, "#ffe9a8")
lamp_light.data.shadow_soft_size = 0.6

scene.render.engine = "BLENDER_EEVEE"
ee = scene.eevee
ee.taa_render_samples = 48
ee.use_gtao = True
ee.gtao_distance = 1.2
ee.use_bloom = True
ee.bloom_threshold = 1.1
ee.bloom_intensity = 0.06
ee.use_soft_shadows = True
scene.view_settings.view_transform = "AgX" if "AgX" in [i.identifier for i in scene.view_settings.bl_rna.properties["view_transform"].enum_items] else "Filmic"
scene.view_settings.look = "None"

cam_data = bpy.data.cameras.new("Kamera")
cam_data.lens = 50
cam_data.clip_end = 400
cam = bpy.data.objects.new("Kamera", cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
cam_target = bpy.data.objects.new("Kameraziel", None)
scene.collection.objects.link(cam_target)
tc = cam.constraints.new("TRACK_TO")
tc.target = cam_target
tc.track_axis = "TRACK_NEGATIVE_Z"
tc.up_axis = "UP_Y"


def orbit(az, el, d, target):
    """az: Drehung um die Hochachse (0 = frontal), el: Höhenwinkel, d: Abstand."""
    t = Vector(target)
    a, e = math.radians(az), math.radians(el)
    return t + Vector((d * math.cos(e) * math.sin(a), -d * math.cos(e) * math.cos(a), d * math.sin(e)))


def set_view(az, el, d, target):
    cam_target.location = target
    cam.location = orbit(az, el, d, target)


# Kristallansicht im Video/Vorschaubild ausblenden, Vorlagen ebenfalls
for c_ in ("Kristall", "Vorlagen", "Pfeile", "Lader"):
    for o in COLL[c_].objects:
        o.hide_render = True
        o.hide_viewport = c_ in ("Kristall", "Vorlagen")

# --------------------------------------------------------------------------------------
# Video-Teilchen (nur in der .blend, nicht im GLB)
# --------------------------------------------------------------------------------------
li_objs, e_objs = [], []
li_sign_proto = sign_mesh(True, R_LI, "+Z")
e_sign_proto = sign_mesh(False, R_E, "+Z")


def particle(name, r, mat, sign_proto, sign_mat):
    o = make_object(name, *uvsphere(r, 24, 14), mat, "Teilchen")
    s = make_object(name + "_Zeichen", *sign_proto, sign_mat, "Teilchen", smooth=False)
    s.parent = o
    t = s.constraints.new("TRACK_TO")
    t.target = cam
    t.track_axis = "TRACK_Z"
    t.up_axis = "UP_Y"
    return o


for i in range(8):
    li_objs.append(particle(f"Li_{i + 1}", R_LI, M["Li"], li_sign_proto, M["LiZeichen"]))
for i in range(6):
    e_objs.append(particle(f"e_{i + 1}", R_E, M["Elektron"], e_sign_proto, M["ElektronZeichen"]))

# --------------------------------------------------------------------------------------
# Drehbuch des Videos (25 fps, 90 s). s = Entladefortschritt (0 = voll, 1 = leer)
# --------------------------------------------------------------------------------------
FPS = 25
DUR = 90.0
NF = int(FPS * DUR)
scene.render.fps = FPS
scene.frame_start, scene.frame_end = 1, NF

# (t, s) Stützstellen – linear dazwischen
S_KEYS = [(0, 0), (14, 0), (34, 1), (46, 1), (66, 0), (73, 0), (80.5, 1), (81.5, 1), (89, 0), (90, 0)]
# Gerät: 'lampe' oder 'lader'; Umschalten mit kurzer Blende
DEVICE = [(0, "lampe"), (43, "lader"), (73, "lampe"), (81, "lader")]
# Kameraeinstellungen (t, az, el, d, target)
CAM_KEYS = [
    (0, -28, 16, 48, (0, 0, 2.0)), (7, 6, 5, 40, (0, 0, 2.0)),
    (9.5, 14, 8, 16, (-5.8, 0, 0.6)), (13, 18, 7, 15, (-5.8, 0, 0.6)),
    (17, 4, 5, 40, (0, 0, 2.0)), (25, -6, 5, 40, (0, 0, 2.0)),
    (28, -16, 8, 16, (5.6, 0, 0.4)), (34, -22, 7, 15.5, (5.6, 0, 0.4)),
    (37, 0, 5, 40, (0, 0, 2.0)), (46, 4, 6, 40, (0, 0, 2.0)),
    (56, 14, 8, 40, (0, 0, 2.0)), (66, -4, 5, 40, (0, 0, 2.0)),
    (73, 0, 5, 40, (0, 0, 2.0)), (90, 10, 7, 42, (0, 0, 2.0)),
]

# Einblendungen für video_overlay.py (Zeiten in s)
CAPTIONS = [
    (0.4, 3.9, "Der Lithium-Ionen-Akku", "Was passiert beim Entladen und beim Laden?", "title"),
    (7.4, 14.0, "Der geladene Akku", "In der Graphit-Halbzelle sind Lithium-Ionen eingelagert. Für jedes Li⁺ trägt eine C₆-Einheit ein zusätzliches Elektron (C₆⁻). Zusammen: LiC₆.", ""),
    (14.3, 27.5, "Entladen – freiwillig (exergonisch)", "Die C₆⁻-Einheiten geben Elektronen ab. Der Akku arbeitet wie eine galvanische Zelle: chemische Energie → elektrische Energie.", ""),
    (27.8, 34.5, "Am Pluspol", "Ein Co⁴⁺-Ion nimmt ein Elektron auf und wird zu Co³⁺. Die Halbzelle wird negativer – ein Li⁺ lagert sich ein und gleicht die Ladung aus.", ""),
    (34.8, 42.6, "Der Akku ist leer", "Gesamtreaktion beim Entladen:  C₆⁻ + Co⁴⁺ → C₆ + Co³⁺", ""),
    (43.0, 66.0, "Laden – erzwungen (endergonisch)", "Das Ladegerät pumpt die Elektronen zurück. Der Akku arbeitet wie eine Elektrolysezelle: elektrische Energie → chemische Energie.", ""),
    (66.3, 72.6, "Der Akku ist wieder voll", "Gesamtreaktion beim Laden:  C₆ + Co³⁺ → C₆⁻ + Co⁴⁺", ""),
    (73.0, 86.5, "Das Schaukelstuhl-Prinzip", "Die Lithium-Ionen pendeln zwischen den Elektroden hin und her – immer dorthin, wohin auch die Elektronen fließen. Die Elektronen nehmen immer den Weg über den Draht.", ""),
    (86.8, 90.0, "Merke", "Lithium liegt im Akku nie als Metall vor – nur als Lithium-Ion Li⁺.", ""),
]
EQUATIONS = [  # (t0, t1, links, rechts)
    (16.0, 34.5, ("Minuspol · Oxidation", "C₆⁻ → C₆ + e⁻"), ("Pluspol · Reduktion", "Co⁴⁺ + e⁻ → Co³⁺")),
    (47.0, 66.0, ("Minuspol · Reduktion", "C₆ + e⁻ → C₆⁻"), ("Pluspol · Oxidation", "Co³⁺ → Co⁴⁺ + e⁻")),
]
LABELS = [  # (t0, t1, Text, Anker-Art, Index/Anker)
    (4.1, 7.2, "Minuspol: Graphit-Halbzelle", "anchor", "graphit"), (4.1, 7.2, "Pluspol: Cobalt-Oxid-Halbzelle", "anchor", "oxid"),
    (4.5, 7.2, "Elektrolyt", "anchor", "elektrolyt"), (4.5, 7.2, "Separator", "anchor", "separator"),
    (4.9, 7.2, "Lämpchen", "anchor", "lampe"), (4.9, 7.2, "Lithium-Ion", "li", 6),
    (9.5, 14.0, "Li⁺", "li", 0), (9.5, 14.0, "C₆⁻-Einheit mit zusätzlichem e⁻", "c6", 0),
    (28.5, 34.5, "Co", "co", -1),
    (43.5, 50.0, "Ladegerät", "anchor", "ladegeraet"),
]
ARROWS_ON = [(17.0, 34.0, 1), (48.0, 66.0, -1)]


def interp_keys(keys, t):
    for (t0, v0), (t1, v1) in zip(keys, keys[1:]):
        if t0 <= t <= t1:
            k = (t - t0) / (t1 - t0) if t1 > t0 else 0
            return v0 + (v1 - v0) * k
    return keys[-1][1]


def s_at(t):
    return interp_keys(S_KEYS, t)


def device_at(t):
    dv = DEVICE[0][1]
    for t0, d_ in DEVICE:
        if t >= t0:
            dv = d_
    return dv


def cam_at(t):
    for a, b in zip(CAM_KEYS, CAM_KEYS[1:]):
        if a[0] <= t <= b[0]:
            k = smooth01((t - a[0]) / (b[0] - a[0]))
            az, el, d_ = [a[i] + (b[i] - a[i]) * k for i in (1, 2, 3)]
            tg = Vector(a[4]).lerp(Vector(b[4]), k)
            return az, el, d_, tg
    a = CAM_KEYS[-1]
    return a[1], a[2], a[3], Vector(a[4])


def state_at(t):
    s = s_at(t)
    ds = s_at(min(DUR, t + 0.2)) - s_at(max(0, t - 0.2))
    st = {"s": s, "dir": 1 if ds > 1e-4 else (-1 if ds < -1e-4 else 0), "li": [], "e": [], "co": [], "eon": []}
    for i in range(6):
        u = progress(i, s)
        st["li"].append(path_at(LI_PATHS[i], u))
        st["e"].append(path_at(E_PATHS[i], u))
        ua, ud = U_ARRIVE[i], U_DEPART[i]
        st["eon"].append(u < ua + 0.4 * (1 - ua))                 # Elektron verschwindet im Cobalt-Ion
        st["co"].append(smooth01((u - ua) / max(1e-3, 0.8 * (1 - ua))))   # 0 = Co⁴⁺, 1 = Co³⁺ – erst bei Ankunft
        st.setdefault("c6", []).append(smooth01(u / max(1e-3, ud)))       # 0 = C₆⁻, 1 = C₆ – wenn das Elektron den Ring verlässt
    for k, p in enumerate(ELYT_LI):
        ph = t * 0.9 + k * 2.1
        st["li"].append(np.array(p) + 0.22 * np.array([math.sin(ph), 0.6 * math.sin(ph * 0.7 + 1), math.cos(ph * 1.3)]))
    return st


def key_hide(o, frame, hidden):
    o.hide_render = hidden
    o.keyframe_insert("hide_render", frame=frame)


if True:  # Video-Animation immer anlegen
    co4, co3 = np.array(srgb(C["co4"])), np.array(srgb(C["oxid"]))
    c6m, c6n = np.array(srgb(C["c6m"])), np.array(srgb(C["c6"]))
    lamp_bsdf = M["Lampe"].node_tree.nodes["Principled BSDF"]
    lamp_bsdf.inputs["Emission Color"].default_value = (*srgb("#ffe08a"), 1)
    lader_objs = list(COLL["Lader"].objects)
    lampe_objs = list(COLL["Lampe"].objects)
    pfeil_e, pfeil_li = bpy.data.objects["Pfeil_e"], bpy.data.objects["Pfeil_Li"]
    prev = {}
    glow = 0.0
    plan_frames = []
    for f in range(1, NF + 1):
        t = (f - 1) / FPS
        st = state_at(t)
        for i, o in enumerate(li_objs):
            o.location = st["li"][i]
            o.keyframe_insert("location", frame=f)
        for i, o in enumerate(e_objs):
            o.location = st["e"][i]
            o.keyframe_insert("location", frame=f)
            sc = 1.0 if st["eon"][i] else 0.0
            if prev.get(o.name) != sc:
                o.scale = (sc, sc, sc)
                o.keyframe_insert("scale", frame=f)
                if f > 1:
                    o.scale = (1 - sc,) * 3
                    o.keyframe_insert("scale", frame=f - 1)
                    o.scale = (sc,) * 3
                prev[o.name] = sc
        for i in range(6):
            m = MATS[f"C6_{i + 1}"]
            key = f"c6{i}"
            if prev.get(key) is None or abs(prev[key] - st["c6"][i]) > 1e-3 or f == NF:
                col = c6m * (1 - st["c6"][i]) + c6n * st["c6"][i]
                bsdf = m.node_tree.nodes["Principled BSDF"]
                bsdf.inputs["Base Color"].default_value = (*col, 1)
                bsdf.inputs["Base Color"].keyframe_insert("default_value", frame=f)
                bsdf.inputs["Emission Strength"].default_value = 0.35 * (1 - st["c6"][i])
                bsdf.inputs["Emission Strength"].keyframe_insert("default_value", frame=f)
                prev[key] = st["c6"][i]
        for i in range(6):
            m = MATS[f"Co_{i + 1}"]
            col = co4 * (1 - st["co"][i]) + co3 * st["co"][i]
            key = f"co{i}"
            if prev.get(key) is None or abs(prev[key] - st["co"][i]) > 1e-3 or f == NF:
                bsdf = m.node_tree.nodes["Principled BSDF"]
                bsdf.inputs["Base Color"].default_value = (*col, 1)
                bsdf.inputs["Base Color"].keyframe_insert("default_value", frame=f)
                bsdf.inputs["Emission Strength"].default_value = 0.25 * (1 - st["co"][i])
                bsdf.inputs["Emission Strength"].keyframe_insert("default_value", frame=f)
                prev[key] = st["co"][i]
        # Lämpchen leuchtet, solange beim Entladen Elektronen fließen
        dev = device_at(t)
        target_glow = 1.0 if (st["dir"] > 0 and dev == "lampe") else 0.0
        glow += (target_glow - glow) * (1 - math.exp(-6 / FPS))
        if f % 2 == 1 or f == NF:
            lamp_bsdf.inputs["Emission Strength"].default_value = 6.0 * glow
            lamp_bsdf.inputs["Emission Strength"].keyframe_insert("default_value", frame=f)
            lamp_light.data.energy = 120 * glow
            lamp_light.data.keyframe_insert("energy", frame=f)
        if prev.get("dev") != dev:
            for o in lader_objs:
                key_hide(o, f, dev != "lader")
            for o in lampe_objs:
                key_hide(o, f, dev != "lampe")
            if f > 1:
                for o in lader_objs:
                    key_hide(o, f - 1, dev == "lader")
                for o in lampe_objs:
                    key_hide(o, f - 1, dev == "lampe")
                for o in lader_objs:
                    o.hide_render = dev != "lader"
                for o in lampe_objs:
                    o.hide_render = dev != "lampe"
            prev["dev"] = dev
        # Pfeile
        adir = 0
        for t0, t1, dd in ARROWS_ON:
            if t0 <= t <= t1:
                adir = dd
        if prev.get("arrow") != adir:
            for o in (pfeil_e, pfeil_li):
                o.scale = (adir if adir else 1, 1, 1)
                o.keyframe_insert("scale", frame=f)
                key_hide(o, f, adir == 0)
            prev["arrow"] = adir
        # Kamera
        az, el, d_, tg = cam_at(t)
        cam_target.location = tg
        cam_target.keyframe_insert("location", frame=f)
        cam.location = orbit(az, el, d_, tg)
        cam.keyframe_insert("location", frame=f)
        plan_frames.append({"t": round(t, 3), "s": round(st["s"], 4), "dir": st["dir"], "dev": dev, "glow": round(glow, 3)})
    # Konstante Interpolation für Sichtbarkeit/Skalierung, linear für Positionen
    for o in bpy.data.objects:
        ad = o.animation_data
        if ad and ad.action:
            for fc in ad.action.fcurves:
                const = fc.data_path in ("hide_render", "scale")
                for kp in fc.keyframe_points:
                    kp.interpolation = "CONSTANT" if const else "LINEAR"
    for m in list(MATS.values()) + [lamp_light.data]:
        nt = getattr(m, "node_tree", None)
        for owner in (nt, m):
            ad = getattr(owner, "animation_data", None) if owner else None
            if ad and ad.action:
                for fc in ad.action.fcurves:
                    for kp in fc.keyframe_points:
                        kp.interpolation = "LINEAR"
    log("Animation gesetzt:", NF, "Bilder")

    # Bildschirm-Positionen der Beschriftungen für das Overlay
    from bpy_extras.object_utils import world_to_camera_view
    W, H = 1920, 1080
    scene.render.resolution_x, scene.render.resolution_y = W, H
    scene.render.resolution_percentage = 100

    def screen(p):
        v = world_to_camera_view(scene, cam, Vector(p))
        return [round(v.x * W, 1), round((1 - v.y) * H, 1), round(v.z, 2)]

    labels_out = []
    for (t0, t1, text, kind, ref) in LABELS:
        labels_out.append({"t0": t0, "t1": t1, "text": text, "kind": kind, "ref": ref})
    for k, fr in enumerate(plan_frames):
        if not any(L["t0"] - 0.1 <= fr["t"] <= L["t1"] + 0.1 for L in labels_out):
            continue
        scene.frame_set(k + 1)
        st = state_at(fr["t"])
        pos = {}
        for L in labels_out:
            if not (L["t0"] - 0.1 <= fr["t"] <= L["t1"] + 0.1):
                continue
            if L["kind"] == "anchor":
                pos[L["text"]] = screen(ANCHORS[L["ref"]])
            elif L["kind"] == "li":
                pos[L["text"]] = screen(st["li"][L["ref"]] + np.array([0, 0, R_LI]))
            elif L["kind"] == "e":
                pos[L["text"]] = screen(st["e"][L["ref"]] + np.array([0, 0, R_E]))
            elif L["kind"] == "c6":
                pos[L["text"]] = screen(np.array(C6_POS[L["ref"]]) + np.array([HEX_B, -HEX_B * 0.5, 0.17]))
            elif L["kind"] == "co":
                for i in range(6):
                    pos[f"co{i}"] = screen(np.array(CO_POS[i]) + np.array([0, -R_CO, -0.05])) + [round(st["co"][i], 3)]
        fr["pos"] = pos
    scene.frame_set(1)
    plan = {"fps": FPS, "frames": NF, "size": [W, H], "captions": CAPTIONS, "equations": EQUATIONS, "labels": labels_out, "per_frame": plan_frames}
    with open(PLAN_PATH, "w") as fh:
        json.dump(plan, fh, ensure_ascii=False, separators=(",", ":"))
    log("Overlay-Plan geschrieben")

scene.render.filepath = os.path.join(FRAMES_DIR, "f_")
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGB"

# --------------------------------------------------------------------------------------
# Vorschaubild + Icons
# --------------------------------------------------------------------------------------
if DO_RENDER:
    # Zustand „beim Entladen“ (wie Abb. 1): Bild 14 s + 5 s
    f_prev = int((22.5) * FPS)
    scene.frame_set(f_prev)
    keep = (cam.location.copy(), cam_target.location.copy())
    cam.animation_data_clear()
    cam_target.animation_data_clear()
    set_view(-14, 14, 36, (0, 0, 1.4))
    scene.render.resolution_x, scene.render.resolution_y = 1600, 1000
    scene.render.image_settings.file_format = "JPEG"
    scene.render.image_settings.quality = 88
    scene.render.filepath = RENDER_PATH
    bpy.ops.render.render(write_still=True)
    log("Vorschaubild gerendert")
    set_view(-18, 16, 19, (-4.6, 0, 0.9))
    scene.render.resolution_x = scene.render.resolution_y = 1024
    scene.render.image_settings.file_format = "PNG"
    icon_master = os.path.join(ICON_DIR, "icon-1024.png")
    scene.render.filepath = icon_master
    bpy.ops.render.render(write_still=True)
    for sz in (512, 192, 180):
        img = bpy.data.images.load(icon_master)
        img.scale(sz, sz)
        img.filepath_raw = os.path.join(ICON_DIR, f"icon-{sz}.png")
        img.file_format = "PNG"
        img.save()
        bpy.data.images.remove(img)
    log("Icons gerendert")
    # Kamera-Animation wiederherstellen
    for f in range(1, NF + 1):
        az, el, d_, tg = cam_at((f - 1) / FPS)
        cam_target.location = tg
        cam_target.keyframe_insert("location", frame=f)
        cam.location = orbit(az, el, d_, tg)
        cam.keyframe_insert("location", frame=f)

scene.render.resolution_x, scene.render.resolution_y = 1920, 1080
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = os.path.join(FRAMES_DIR, "f_")
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH, compress=True)
log("fertig:", BLEND_PATH)
