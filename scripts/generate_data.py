#!/usr/bin/env python3
"""Génère data/*.json à partir des données extraites du remake Deuteros-Resurrected
(branche develop, source:f53f5ba3fa — CoreData.cs, Enums.cs, BattleLogic.cs).

Sources croisées :
- docs/RESEARCH.md §9 (recettes corrigées round 2)
- /tmp/opencode/deuteros/deposits_matrix.csv (160 corps, oocities cross-check)
- CoreData.cs (items, corps, ordres, flags)

Usage : python3 scripts/generate_data.py   (idempotent)
"""
import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
DEPOSITS_CSV = Path("/tmp/opencode/deuteros/deposits_matrix.csv")
COREDATA = Path("/tmp/opencode/deuteros/remake/CoreData.cs")

# ---------------------------------------------------------------------------
# 1. Ressources (16) — enum ItemTypes 1-16 du remake
# ---------------------------------------------------------------------------
RESOURCES = [
    ("iron", "Fer", "Fe", "raw"),
    ("titanium", "Titane", "Ti", "raw"),
    ("aluminium", "Aluminium", "Al", "raw"),
    ("carbon", "Carbone", "C", "raw"),
    ("copper", "Cuivre", "Cu", "raw"),
    ("hydrogen", "Hydrogène", "H", "raw"),
    ("deuterium", "Deutérium", "D", "raw"),
    ("methane", "Méthane", "CH4", "raw"),
    ("helium", "Hélium", "He", "raw"),
    ("palladium", "Palladium", "Pd", "precious"),
    ("platinum", "Platine", "Pt", "precious"),
    ("silver", "Argent", "Ag", "precious"),
    ("gold", "Or", "Au", "precious"),
    ("silica", "Silice", "Si", "raw"),
    ("meh_fuel", "Carburant MeH", "MeH", "compound_fuel"),
    ("hed_fuel", "Carburant HeD", "HeD", "compound_fuel"),
]

# ---------------------------------------------------------------------------
# 2. Items — CoreData.cs (46 items, dont 32 avec chaîne de production)
#    research = (index, techLevel) — index = n° de la liste de recherche du jeu,
#    techLevel = rang requis du chef d'équipe (1=Technician/Apprentice/Pilot,
#    2=Doctor/Engineer/Captain, 3=Professor/Expert/Admiral).
#    researchValue/multiplier : défauts ResearchItem() = 64/64, sauf overrides.
# ---------------------------------------------------------------------------
I = {
    "unknownitem": dict(name="Unknown Item", short="?", mass=2000, orbit=False, tool=False, cat="hidden", research=None),
    "derrick": dict(name="Resource Mining Rig", short="Derrick", mass=8, orbit=False, tool=True, cat="item", research=(2, 1),
                    inputs={"iron": 3, "titanium": 4, "carbon": 1}),
    "s_chassis": dict(name="Shuttle Chassis", short="S Chassis", mass=130, orbit=False, tool=False, cat="item", research=(3, 1),
                      inputs={"iron": 20, "titanium": 50, "aluminium": 35, "carbon": 10, "copper": 15}),
    "s_drive": dict(name="Shuttle Drive Unit", short="S Drive", mass=20, orbit=False, tool=False, cat="item", research=(4, 1),
                    inputs={"iron": 6, "titanium": 10, "aluminium": 4}, multiplier=96, researchValue=32),
    "meh_fuel": dict(name="Hydrogen Methanol Fuel", short="MeH Fuel", mass=3, orbit=False, tool=False, cat="resource", research=(5, 1),
                     inputs={"hydrogen": 2, "methane": 2}, autoProduce=True),
    "of_frame": dict(name="Orbital Factory Section", short="OF Frame", mass=250, orbit=False, tool=True, cat="item", research=(6, 1),
                     inputs={"iron": 55, "titanium": 80, "aluminium": 50, "carbon": 25, "copper": 40}),
    "supply_pod": dict(name="Supply Pod", short="Supply", mass=4, orbit=False, tool=False, cat="item", research=(7, 1),
                       inputs={"titanium": 2, "aluminium": 1, "copper": 1}),
    "tool_pod": dict(name="Tool and Equipment Mounting", short="Tool", mass=4, orbit=False, tool=False, cat="item", research=(8, 1),
                     inputs={"titanium": 2, "aluminium": 1, "copper": 1}),
    "cryo_pod": dict(name="Cryogenic Holding Pod", short="Cryo", mass=4, orbit=False, tool=False, cat="item", research=(9, 1),
                     inputs={"titanium": 2, "aluminium": 1, "copper": 1}),
    "pulse_blaster_laser": dict(name="Pulse Blast Laser", short="PBL", mass=750, orbit=True, tool=False, cat="item", research=(10, 3),
                                inputs={"palladium": 120, "platinum": 30, "hed_fuel": 600}),
    "i_chassis": dict(name="I.O.S Chassis", short="IOS Chassis", mass=650, orbit=True, tool=False, cat="item", research=(11, 2),
                      inputs={"iron": 100, "titanium": 250, "aluminium": 175, "carbon": 50, "copper": 75}),
    "i_drive": dict(name="I.O.S Drive Unit", short="IOS Drive", mass=95, orbit=True, tool=False, cat="item", research=(12, 2),
                    inputs={"iron": 30, "titanium": 50, "copper": 15}),
    "g_chassis": dict(name="S.C.G. Chassis", short="SCG Chassis", mass=1685, orbit=True, tool=False, cat="item", research=(13, 3),
                      inputs={"iron": 250, "titanium": 600, "aluminium": 400, "copper": 185, "platinum": 100, "silver": 100, "gold": 50}),
    "star_drive": dict(name="S.C.G. Drive Unit", short="SCG Drive", mass=265, orbit=True, tool=False, cat="item", research=(14, 3),
                       inputs={"iron": 50, "titanium": 100, "copper": 30, "palladium": 50, "platinum": 25, "silver": 10}),
    "hed_fuel": dict(name="Helium Deuterium Fuel", short="HeD Fuel", mass=3, orbit=True, tool=False, cat="resource", research=(15, 3),
                     inputs={"helium": 2, "deuterium": 2}, autoProduce=True),
    "a_c_c": dict(name="Auto Cargo Computer", short="ACC", mass=8, orbit=False, tool=True, cat="item", research=(16, 3),
                  inputs={"titanium": 2, "aluminium": 1, "carbon": 1, "copper": 1}),
    "a_o_c": dict(name="Auto Operations Computer", short="AOC", mass=8, orbit=True, tool=False, cat="item", research=(17, 3),
                  inputs={"titanium": 4, "aluminium": 1, "carbon": 2, "silver": 1}, unique=True),
    "bandaid": dict(name="Installation Repair Equip.", short="BandAid", mass=150, orbit=True, tool=True, cat="item", research=(18, 3),
                    inputs={"iron": 30, "titanium": 30, "aluminium": 30, "carbon": 30, "copper": 30}),
    "s_d_m": dict(name="Self Destruct Mechanism", short="SDM", mass=9, orbit=True, tool=False, cat="item", research=(19, 3),
                  inputs={"aluminium": 5, "copper": 1, "palladium": 1, "platinum": 2}),
    "grapple": dict(name="Hydraulic Grapple", short="Grapple", mass=5, orbit=True, tool=True, cat="item", research=(20, 3),
                    inputs={"iron": 2, "titanium": 2, "copper": 1}),
    "d_f_c_c": dict(name="Drone Fleet Control Computer", short="DFCC", mass=8, orbit=True, tool=True, cat="item", research=(21, 3),
                    inputs={"titanium": 2, "aluminium": 1, "carbon": 1, "copper": 1, "platinum": 2, "gold": 1}),
    "a_m_a": dict(name="Asteroid Mining Attachment", short="AMA", mass=124, orbit=True, tool=True, cat="item", research=(22, 3),
                  inputs={"iron": 6, "titanium": 70, "aluminium": 10, "carbon": 30, "copper": 2, "platinum": 5, "silver": 1}),
    "hyperlight": dict(name="Hyperlight Travel", short="Hyperlight", mass=124, orbit=True, tool=False, cat="item", research=(23, 3)),
    "m_t_x": dict(name="Mass Transceiver", short="MTX", mass=722, orbit=True, tool=False, cat="item", research=(24, 3),
                  inputs={"titanium": 500, "copper": 82, "palladium": 100, "gold": 40}),
    "m_f_l": dict(name="Methanoid Fusion Laser", short="MFL", mass=25, orbit=True, tool=False, cat="item", research=(25, 3),
                  inputs={"copper": 5, "palladium": 10, "platinum": 10}),
    "r_frame": dict(name="Resource Station Section", short="R Frame", mass=200, orbit=True, tool=True, cat="item", research=(26, 3),
                    inputs={"iron": 35, "titanium": 50, "aluminium": 20, "carbon": 15, "copper": 30, "platinum": 25, "silver": 10, "silica": 15}),
    "prejudice_torpedo_launcher": dict(name="Prejudice Torpedo Launcher", short="PTL", mass=151, orbit=True, tool=False, cat="item", research=(27, 3),
                                       inputs={"titanium": 96, "aluminium": 45, "copper": 10}),
    "commspod": dict(name="Communication Adapter", short="Comms", mass=5, orbit=True, tool=True, cat="item", research=(28, 3),
                     inputs={"aluminium": 2, "carbon": 1, "copper": 1, "gold": 1}),
    "ios_drone": dict(name="IOS Battle Drone", short="IOS Drone", mass=490, orbit=True, tool=False, cat="item", research=(29, 3),
                      inputs={"iron": 120, "titanium": 120, "aluminium": 120, "carbon": 15, "copper": 55, "palladium": 30, "platinum": 30}),
    "g_drone_placeholder": None,  # (pas d'item séparé : star_drone couvre le drone stellaire)
    "star_drone": dict(name="SCG Battle Drone", short="Star Drone", mass=1015, orbit=True, tool=False, cat="item", research=(30, 3),
                       inputs={"iron": 300, "titanium": 200, "aluminium": 300, "copper": 100, "palladium": 90, "platinum": 80, "silver": 95, "gold": 50}),
    "prison_pod": dict(name="Prison Pod", short="Prison", mass=7, orbit=True, tool=True, cat="item", research=(31, 3),
                       inputs={"titanium": 2, "aluminium": 1, "copper": 1, "platinum": 2}),
    "sonic_blaster": dict(name="Sonic Blaster", short="Sonic", mass=1065, orbit=True, tool=True, cat="item", research=(32, 3),
                          inputs={"titanium": 1000, "aluminium": 1500, "copper": 800, "palladium": 1200, "silver": 3000, "gold": 3000},
                          multiplier=16, researchValue=16),
}
# 14 ressources simples = items "resource" non productibles (minées)
for rid, *_ in RESOURCES[:14]:
    I.setdefault(rid, dict(name=rid.capitalize(), short=rid, mass=1, orbit=False, tool=False, cat="resource", research=None))

ITEM_ORDER = ["unknownitem", "derrick", "s_chassis", "s_drive", "meh_fuel", "of_frame", "supply_pod", "tool_pod",
              "cryo_pod", "pulse_blaster_laser", "i_chassis", "i_drive", "g_chassis", "star_drive", "hed_fuel",
              "a_c_c", "a_o_c", "bandaid", "s_d_m", "grapple", "d_f_c_c", "a_m_a", "hyperlight", "m_t_x", "m_f_l",
              "r_frame", "prejudice_torpedo_launcher", "commspod", "ios_drone", "star_drone", "prison_pod",
              "sonic_blaster"] + [r[0] for r in RESOURCES[:14]]
assert None not in [I[k] for k in ITEM_ORDER if k != "g_drone_placeholder"]

# ---------------------------------------------------------------------------
# 3. Corps célestes — parse CoreData.cs + deposits_matrix.csv
# ---------------------------------------------------------------------------
SYSTEMS = [
    ("the_sun", "Soleil", 1), ("proxima", "Proxima", 2), ("centauri", "Centauri", 3),
    ("barnard", "Barnard", 4), ("lalande", "Lalande", 5), ("sirius", "Sirius", 6),
    ("cygni", "Cygni", 7), ("procyon", "Procyon", 8), ("tau_ceti", "Tau Ceti", 9),
]
# Corps porteurs de segment Hydroïde (condition de victoire) — RESEARCH.md §8
SEGMENTS = {"atlantic": 1, "chloe": 2, "babylon": 3, "hadrian": 4, "romulus": 5, "caesius": 6, "pliocene": 7, "alpha": 8}
# Colonies Méthanoïdes actives au démarrage d'une partie (CoreData.cs, ActiveMethanoid = true)
METHANOID_START = ["jupiter", "uranus", "titania", "neptune", "triton", "pluto"]
# Noms affichables (remake + oocities)
NAMES = {
    "the_sun": "Soleil", "mercury": "Mercure", "venus": "Vénus", "earth": "Terre", "the_moon": "Lune",
    "mars": "Mars", "phobos": "Phobos", "deimos": "Deimos", "ceres": "Cérès", "asteroids": "Ceinture",
    "jupiter": "Jupiter", "io": "Io", "europa": "Europe", "ganymede": "Ganymède", "callisto": "Callisto",
    "amalthea": "Amalthée", "himalia": "Himalia", "elara": "Elara", "pasiphae": "Pasiphaé", "sinope": "Sinopé",
    "lysithea": "Lysithéa", "carme": "Carmé", "ananke": "Ananké", "leda": "Léda", "thespian": "Thespian",
    "thebe": "Thébé", "adastea": "Adrastée", "metis": "Métis",
    "saturn": "Saturne", "titan": "Titan", "rhea": "Rhéa", "iapetus": "Japet", "dione": "Dioné",
    "tethys": "Téthys", "enceladus": "Encelade", "mimas": "Mimas", "hyperion": "Hypérion", "phoebe": "Phœbé",
    "janus": "Janus", "epimetheus": "Épiméthée", "prometheus": "Prométhée", "pandora": "Pandore",
    "atlas": "Atlas", "pan": "Pan", "ymir": "Ymir", "albiorix": "Albiorix",
    "uranus": "Uranus", "titania": "Titania", "oberon": "Oberon", "umbriel": "Umbriel", "ariel": "Ariel",
    "miranda": "Miranda", "puck": "Puck", "portia": "Portia", "juliet": "Juliet", "cressida": "Cressida",
    "desdemona": "Desdémone", "rosalind": "Rosalinde", "belinda": "Belinda", "cordelia": "Cordélia",
    "ophelia": "Ophélie", "bianca": "Bianca", "caliban": "Caliban", "sycorax": "Sycorax", "prospero": "Prospero",
    "setebos": "Setebos", "stephano": "Stephano", "trinculo": "Trinculo",
    "neptune": "Neptune", "triton": "Triton", "nereid": "Néréide", "proteus": "Protée", "larissa": "Larissa",
    "galatea": "Galatée", "despina": "Despina", "thalassa": "Thalassa", "naiad": "Naïad", "halimede": "Halimède",
    "psamathe": "Psamathé", "sao": "Sao", "laomedeia": "Laomédéia", "hippocamp": "Hippocamp",
    "pluto": "Pluton", "charon": "Charon", "nix": "Nix", "hydra": "Hydra", "kerberos": "Kerbéros", "styx": "Styx",
    "decuria": "Decuria",
    "atlantic": "Atlantic", "pacific": "Pacific", "barent": "Barent", "baltic": "Baltic",
    "chiron": "Chiron", "cercops": "Cercops", "cerberus": "Cerberus", "creon": "Creon", "chloe": "Chloé",
    "mycenae": "Mycènes", "tyre": "Tyr", "thebes": "Thèbes", "pompeii": "Pompéi", "jericho": "Jéricho",
    "crete": "Crète", "mari": "Mari", "babylon": "Babylone", "ur": "Ur", "nippur": "Nippur", "lashish": "Lachish",
    "akkad": "Akkad", "sumeria": "Sumeria", "nero": "Néron", "julius": "Julius", "hadrian": "Hadrien",
    "romulus": "Romulus", "remus": "Remus", "helios": "Helios", "lithos": "Lithos", "burah": "Burah",
    "sulfurum": "Sulfurum", "titanes": "Titanes", "zargun": "Zargun", "osme": "Osme", "radius": "Radius",
    "caesius": "Césius", "cambrian": "Cambrian", "cainozoic": "Cainozoic", "paleozoic": "Paleozoic",
    "pliocene": "Pliocène", "miocene": "Miocène", "oligocene": "Oligocène", "eocene": "Éocène",
    "alpha": "Alpha", "beta": "Bêta", "gamma": "Gamma", "delta": "Delta", "epsilon": "Epsilon",
    "zeta": "Zêta", "eta": "Êta", "theta": "Thêta", "iota": "Iota", "kappa": "Kappa", "lambda": "Lambda",
    "mu": "Mu", "nu": "Nu", "xi": "Xi", "omicron": "Omicron", "pi": "Pi", "rho": "Rho", "sigma": "Sigma",
    "tau": "Tau", "upsilon": "Upsilon", "phi": "Phi", "chi": "Chi", "psi": "Psi", "omega": "Oméga",
    "asteroid_1": "Astéroïde 1", "asteroid_2": "Astéroïde 2", "asteroid_3": "Astéroïde 3", "asteroid_4": "Astéroïde 4",
    "asteroid_5": "Astéroïde 5", "asteroid_6": "Astéroïde 6", "asteroid_7": "Astéroïde 7", "asteroid_8": "Astéroïde 8",
}

CSV_RES = ["Iron", "Titanium", "Aluminium", "Carbon", "Copper", "Hydrogen", "Deuterium", "Methane", "Helium",
           "Paladium", "Platinum", "Silver", "Gold", "Silica", "MeH Fuel", "HeD Fuel"]
CSV_TO_ID = {"Iron": "iron", "Titanium": "titanium", "Aluminium": "aluminium", "Carbon": "carbon",
             "Copper": "copper", "Hydrogen": "hydrogen", "Deuterium": "deuterium", "Methane": "methane",
             "Helium": "helium", "Paladium": "palladium", "Platinum": "platinum", "Silver": "silver",
             "Gold": "gold", "Silica": "silica", "MeH Fuel": "meh_fuel", "HeD Fuel": "hed_fuel"}


def slug(name: str) -> str:
    s = name.strip().lower()
    s = s.replace("é", "e").replace("è", "e").replace("ê", "e").replace("ë", "e")
    s = s.replace("à", "a").replace("â", "a").replace("ù", "u").replace("û", "u").replace("ô", "o")
    s = s.replace("ç", "c").replace("ï", "i").replace("î", "i").replace("ÿ", "y").replace("æ", "ae").replace("œ", "oe")
    return re.sub(r"[^a-z0-9]+", "_", s).strip("_")


def parse_coredata_planets():
    """Extrait (body_id, parent_star, order, is_moon, moon_parent, resources[], moonlist) de CoreData.cs."""
    src = COREDATA.read_text(encoding="utf-8")
    bodies = {}
    # Planets.Add(Enum, new Planet/Earth(Enum, order) { ... });
    pat = re.compile(
        r"Planets\.Add\(Enums\.StellarBodies\.(\w+), new (?:Objects\.)?(Earth|Planet|Asteroid)\("
        r"Enums\.StellarBodies\.(\w+), (\d+)\)\s*\{(.*?)\n\s{4}\}\);",
        re.S)
    for m in pat.finditer(src):
        enum_name, cls, pid, order, body = m.group(1), m.group(2), m.group(3), int(m.group(4)), m.group(5)
        is_moon = re.search(r"IsMoon\s*=\s*true", body) is not None
        moon_parent = re.search(r"MoonParentPlanetId\s*=\s*Enums\.StellarBodies\.(\w+)", body)
        parent = re.search(r"ParentStar\s*=\s*Enums\.StellarBodies\.(\w+)", body)
        base = re.search(r"BaseBuildParts\s*=\s*(\d+)", body)
        damaged = re.search(r"BaseDamaged\s*=\s*true", body) is not None
        mats = re.findall(r"new Objects\.Material\(Enums\.ItemTypes\.(\w+), (\d+)\)", body)
        derricks = re.search(r"Derricks\s*=\s*(\d+)", body)
        moonlist = re.search(r"MoonList = new List<int> \{([^}]*)\}", body)
        bodies[pid] = dict(
            enum=pid, cls=cls, order=order, is_moon=is_moon,
            moon_parent=moon_parent.group(1) if moon_parent else None,
            parent_star=parent.group(1) if parent else None,
            base_build_parts=int(base.group(1)) if base else 0,
            base_damaged=damaged,
            materials={t: int(q) for t, q in mats},
            derricks=int(derricks.group(1)) if derricks else 0,
            moonlist=[int(x) for x in moonlist.group(1).split(",") if x.strip()] if moonlist else [],
        )
    return bodies


def load_deposits():
    """Retourne {slug(body): {res_id: 1}} depuis deposits_matrix.csv (160 corps)."""
    out = {}
    with DEPOSITS_CSV.open(encoding="utf-8") as f:
        for row in csv.DictReader(f):
            body = slug(row["body"])
            deps = {CSV_TO_ID[c]: 1 for c in CSV_RES if c in row and row[c].strip() == "1"}
            out[body] = deps
    return out


# Noms d'enum CoreData.cs → ids de ressources (seul écart : 'paladium')
ENUM_TO_RES = {rid: rid for rid, *_ in RESOURCES}
ENUM_TO_RES["paladium"] = "palladium"
# Les carburants composés ne sont jamais des gisements (spec tables v1 §3 :
# « Carburants non minables — produits à l'usine ») ; la matrice oocities
# les liste par erreur sur certains corps (RESEARCH.md §15, 15 vs 16).
FUELS = {"meh_fuel", "hed_fuel"}


def deposits_from_materials(enum_names) -> dict:
    deps = {}
    for enum_name in enum_names:
        rid = ENUM_TO_RES.get(enum_name)
        if rid is None or rid in FUELS:
            continue
        deps[rid] = 1
    return deps


def main():
    DATA.mkdir(exist_ok=True)

    # --- resources.json ---
    resources = {
        "meta": {"version": 1, "source": "Deuteros-Resurrected develop (source:f53f5ba3fa), Enums.cs ItemTypes 1-16"},
        "resources": [
            {"id": rid, "name": name, "symbol": sym, "type": typ,
             "minable": typ in ("raw", "precious"),
             "derrickRate": 2 if rid in ("iron", "titanium", "aluminium", "carbon", "copper", "silica") else 1,
             "surveyMultiplier": {"helium": 4, "platinum": 2, "silver": 2, "gold": 3}.get(rid, 1)}
            for rid, name, sym, typ in RESOURCES
        ],
    }
    (DATA / "resources.json").write_text(json.dumps(resources, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # --- items.json ---
    items = []
    for key in ITEM_ORDER:
        if key == "g_drone_placeholder":
            continue
        d = I[key]
        research = d.get("research")
        item = {
            "id": key,
            "name": d["name"],
            "shortName": d["short"],
            "category": d["cat"],
            "mass": d["mass"],
            "orbitOnly": bool(d["orbit"]),
            "toolPod": bool(d["tool"]),
            "autoProduce": bool(d.get("autoProduce", False)),
            "unique": bool(d.get("unique", False)),
        }
        if research:
            item["researchIndex"] = research[0]
            item["techLevel"] = research[1]
            item["researchMultiplier"] = d.get("multiplier", 64)
            item["researchValue"] = d.get("researchValue", 64)
        if d.get("inputs"):
            item["inputs"] = d["inputs"]
        items.append(item)
    items_doc = {
        "meta": {"version": 1, "source": "CoreData.cs (source:f53f5ba3fa), recettes corrigées RESEARCH.md §9",
                 "counts": {"total": len(items), "researchable": sum(1 for i in items if "researchIndex" in i)}},
        "items": items,
    }
    (DATA / "items.json").write_text(json.dumps(items_doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # --- planets.json + astronomical.json ---
    bodies = parse_coredata_planets()
    deposits = load_deposits()
    # alias slug -> enum id (les slugs oocities ≠ enums du remake pour certains corps)
    star_of = {sid: {"id": sid, "name": nm, "index": idx} for sid, nm, idx in SYSTEMS}
    planets = []
    for pid, b in sorted(bodies.items(), key=lambda kv: (kv[1]["parent_star"] or "", kv[1]["order"])):
        sl = slug(pid)
        # gisements : CoreData.cs fait foi (noms d'enum) ; fallback matrice oocities sans carburants
        deps = deposits_from_materials(b["materials"].keys())
        if not deps:
            deps = {rid: 1 for rid in deposits.get(sl, {}) if rid not in FUELS}
        if b["cls"] == "Asteroid":
            continue  # les astéroïdes sont générés à la volée (astronomical.json)
        star = b["parent_star"] or "the_sun"
        planets.append({
            "id": sl,
            "name": NAMES.get(sl, sl.replace("_", " ").title()),
            "starId": star,
            "order": b["order"],
            "type": "moon" if b["is_moon"] else "planet",
            "moonParentId": slug(b["moon_parent"]) if b["moon_parent"] else None,
            "deposits": sorted(deps.keys()),
            "baseBuildParts": b["base_build_parts"],
            "baseDamaged": b["base_damaged"],
            "derricks": b["derricks"],
            "segment": SEGMENTS.get(sl),
            "methanoidColony": sl in METHANOID_START,   # état de départ du scénario (CoreData.cs)
        })
    # corps de la matrice absents du remake (ex. lunes oocities non modélisées) — ajoutés pour fidélité matrice
    known = {p["id"] for p in planets}
    for sl, deps in deposits.items():
        if sl not in known and not sl.startswith("asteroid"):
            planets.append({
                "id": sl, "name": NAMES.get(sl, sl.replace("_", " ").title()),
                "starId": "the_sun", "order": 99, "type": "planet", "moonParentId": None,
                "deposits": sorted(rid for rid in deps if rid not in FUELS), "baseBuildParts": 0, "baseDamaged": False,
                "derricks": 0, "segment": SEGMENTS.get(sl), "methanoidColony": sl in METHANOID_START,
            })
    planets_doc = {
        "meta": {"version": 1, "source": "CoreData.cs + deposits_matrix.csv (cross-check RESEARCH.md §8)",
                 "v1Scope": "the_sun", "segmentBearers": SEGMENTS,
                 "scenario": {"methanoidStartBodies": METHANOID_START}},
        "systems": list(star_of.values()),
        "bodies": planets,
    }
    (DATA / "planets.json").write_text(json.dumps(planets_doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # --- astronomical.json (astéroïdes : classes du remake Asteroid.cs) ---
    astro = {
        "meta": {"version": 1, "source": "Asteroid.cs (source:f53f5ba3fa)"},
        "asteroidTypes": ["titanium", "aluminium", "carbon", "palladium", "platinum", "silver", "silica"],
        "asteroidMassClasses": [
            {"mass": 50, "name": "Small"}, {"mass": 100, "name": "Small"}, {"mass": 250, "name": "Small"},
            {"mass": 1000, "name": "Medium"}, {"mass": 5000, "name": "Medium"}, {"mass": 10000, "name": "Large"},
            {"mass": 25000, "name": "Large"}, {"mass": 60000, "name": "Large"},
        ],
        "asteroidScanRegenerates": True,
        "maxAsteroidsPerBody": 8,
    }
    (DATA / "astronomical.json").write_text(json.dumps(astro, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # --- difficulties.json (DATA.md §1.7) ---
    difficulties = {
        "meta": {"version": 1, "source": "docs/DATA.md §1.7"},
        "difficulties": [
            {"id": "discovery", "label": "Découverte", "startBonus": 0.5, "iaMult": 0.6},
            {"id": "commander", "label": "Commandant", "startBonus": 0.2, "iaMult": 1.0},
            {"id": "veteran", "label": "Vétéran", "startBonus": 0.0, "iaMult": 1.4},
            {"id": "methanoid", "label": "Méthanoïde", "startBonus": -0.2, "iaMult": 1.8},
        ],
    }
    (DATA / "difficulties.json").write_text(json.dumps(difficulties, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # --- events.json (timeline minimale v1 — RESEARCH.md §12, GAMEPLAY §8) ---
    events = {
        "meta": {"version": 1, "source": "docs/GAMEPLAY.md §8 + RESEARCH.md §12"},
        "events": [
            {"id": "first_contact", "trigger": {"day": 15}, "title": "Premier contact",
             "body": "Une signature inconnue détectée au-delà de Neptune. Les Méthanoïdes se disent « ouverts au commerce ».",
             "effects": [{"type": "message", "value": "methanoid_contact"}], "choices": []},
            {"id": "methanoid_trade_offer", "trigger": {"day": 40}, "title": "Offre d'échange",
             "body": "Les Méthanoïdes proposent d'échanger des matériaux minés contre de l'équipement.",
             "effects": [{"type": "flag", "value": "trade_available"}], "choices": []},
            {"id": "war_declared", "trigger": {"event": "sixth_orbital_factory"}, "title": "Guerre",
             "body": "La 6e usine orbitale est en service. Les Méthanoïdes assemblaient une flotte.",
             "effects": [{"type": "flag", "value": "at_war"}], "choices": []},
            {"id": "hydroid_message", "trigger": {"day": 300}, "title": "Message des Hydroïdes",
             "body": "« Nous avons transmuté un don aux Méthanoïdes. Ils l'ont démonté — les segments sont éparpillés dans 8 étoiles. »",
             "effects": [{"type": "flag", "value": "victory_path_revealed"}], "choices": []},
        ],
    }
    (DATA / "events.json").write_text(json.dumps(events, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # --- rapport ---
    n_sys = len({p["starId"] for p in planets})
    sun = [p for p in planets if p["starId"] == "the_sun"]
    seg = [p["id"] for p in planets if p["segment"]]
    print(f"resources.json : {len(resources['resources'])} ressources")
    print(f"items.json     : {len(items)} items ({items_doc['meta']['counts']['researchable']} recherchables)")
    print(f"planets.json   : {len(planets)} corps / {n_sys} systèmes (v1 scope: {len(sun)} corps Soleil)")
    print(f"segments       : {seg}")
    print(f"astronomical/difficulties/events : OK")


if __name__ == "__main__":
    main()
