# Design — v0 « Boucle Terre » (sandbox économie, Terre seule)

> Date : 2026-09-15
> Statut : validé (brainstorming complété — décisions utilisateur enregistrées, approche 1 retenue)
> Décisions cadrées : **boucle minimale Terre seule** · menace Méthanoïde **absente** · **aucune sauvegarde** · stories à **contrat chiffré**.
> Sources : `docs/RESEARCH.md` (§14c mécaniques du code), spec tables v1 (`2026-09-15-tables-v1-design.md`), moteur implémenté (`src/simulation/`, 42 tests verts, commit `4d198e9`).

---

## 1. Objectif & objectif terminal

v0 est un **sandbox économie Terre-seule** : miner → produire → rechercher → former. La simulation tables-v1 est réutilisée telle quelle, vue depuis la Terre uniquement.

**Objectif terminal mesurable : produire 1 OF Frame** (Fe 55, Ti 80, Al 50, C 25, Cu 40 — le plus gros item constructible au sol). Il couvre toute la boucle : miner chaque matière, produire des derricks pour scaler, faire la recherche OF Frame, tenir la durée. Victoire v0 = bulletin + récap chiffré (jour, unités produites cumulées, rang d'équipe).

**Critère de réussite global** : un joueur qui suit une stratégie raisonnable (derricks → intermédiaires → OF Frame) termine en **≤ 250 jours de jeu** (≈ 12 min réelles à ×20). Si le playtest dépasse, l'ajustement porte sur l'état de boot (nombre de derricks initial, tailles d'équipes) — **jamais sur les formules** (fidélité au remake).

## 2. Décisions validées (brainstorming)

| Décision | Choix |
|---|---|
| Périmètre | Terre seule (A) — pas de Lune, pas de navette |
| Menace | Méthanoïdes absents (A) — zéro code ennemi actif |
| Persistence | Aucune (A) — session mémoire |
| Approche | **1 — slice verticale** : moteur mutable conservé, mutations canalisées par facade d'actions, ADR-007 |
| Contractualisation | Contrats chiffrés par story (tests paramétrés + playtest) |
| Rejeté | Approche 2 (purification immutable d'abord : 1-2 j de refactor, zéro valeur visible v0 — reportée derrière ADR-007) ; Approche 3 (wiring direct : couplage UI↔moteur rejeté) |

## 3. Architecture — ADR-007 + facade d'actions

**Contradiction existante à trancher** : ARCHITECTURE §3 promet un state *immutable par tick* ; le moteur implémenté *mute* le `GameState` (choix documenté tables v1, tests verts). 

**ADR-007 (à écrire)** : « Moteur de simulation mutable ; toute mutation passe par la facade d'actions ; le rendu ne fait que lire. » 

- **Trigger de revisit explicite** : le jour où on implémente la sauvegarde (EPIC v1), on réévalue la purification (`tick(state) → newState`). Derrière la facade, la bascule est confinée au moteur — l'UI n'a pas à changer.
- **Nouveau `src/actions/`** — la seule porte d'entrée des mutations. Chaque action suit le contrat :

```ts
interface Action<TArgs> {
  validate(state: GameState, args: TArgs): { ok: true } | { ok: false; reason: string };
  execute(state: GameState, args: TArgs): ActionResult;  // mutation + effets (news, flags)
}
```

- L'UI ne parle **jamais** directement au moteur. `engine.ts` (tick) est inchangé.
- Actions v0 : `queueItem`, `cancelQueueItem`, `selectResearch`, `trainStaff`, `assignFactoryTeam`, `assignResearchTeam`, `installDerrick`.

## 4. Écran Terre — panneaux DOM

Un seul écran, 5 panneaux (DOM vanilla, un module par panneau dans `src/ui/panels/`, un fichier `earth-screen.ts` assemble). Le canvas système reste en fond (décor v0). HUD (jour/vitesse/pause) conservé.

| Panneau | Contenu | Actions |
|---|---|---|
| **Production** | 9 items constructibles au sol (les autres grisés « orbite requise »), file, v/jour estimé, barre de progression | `queueItem`, `cancelQueueItem` |
| **Recherche** | 31 items : 8 sélectionnables au boot, autres verrouillés ; rang requis vs rang équipe ; % ; 1 projet actif | `selectResearch` |
| **Personnel** | réservoir (5 550 au boot), 2 équipes (production 200, recherche 250), formation 24 j, seuils de rang, progression vers prochain rang | `trainStaff`, `assign*` |
| **Minage & stocks** | 8 gisements Terre : état du sondage, ground restant, derricks, rendement/j, stock (cap 50 000) | `installDerrick` |
| **Bulletins** | existant (8 derniers) | — |

## 5. Simplifications marquées (déviations fidélité, assumées)

1. **Équipes pré-assignées au boot** : production **200 apprentis** + recherche **250 techniciens** (tailles de référence du remake : `ReferenceTeamSize = 250`, max 200/250). Fidèle = aucune équipe avant 24 j de formation ; ici on skip le tunnel initial, la formation reste jouable pour scaler.
2. **`installDerrick` direct** : consomme 1 derrick des stores → `derricks + 1`. L'écran de construction de base de l'original est reporté.
3. **Pas de navette/Lune** : `s_chassis`/`s_drive` produisibles mais sans usage (économie de test).
4. **MeH fuel queueable usine** (déviation) : dans le remake il est en auto-production (3/2 j) hors usine ; l'auto-produce n'existe pas encore dans notre moteur, et le fuel n'a aucun consommateur v0 → traité comme item d'usine normal. L'auto-produce réel est reporté (note moteur).
5. **AOC hors v0** (orbit-only de toute façon).

## 6. Contrats chiffrés (verrouillés par tests paramétrés)

Toutes les valeurs dérivées des formules du remake (RESEARCH.md §14c, moteur `src/simulation/`). Division entière (`floor`) partout.

### 6.1 Minage (Terre)

| Contrat | Valeur |
|---|---|
| Gisements Terre | 8 matières : Fe, Ti, Al, C, Cu, H, D, CH₄ (aucune avec surveyMult ≠ 1) |
| Survey initial | `surveyTicks = rand(0,8)` — quirk remake : re-tiré tant que 0 ; décompte **jours pairs seulement** |
| Ground au sondage | `rand(0,32768) & 0x7FFF` → 0..32 767 |
| Extraction | `derricks × rate` par jour miné (pair) ; rate = 2 (Fe/Ti/Al/C/Cu), 1 (H/D/CH₄) |
| Cap stock | 50 000 par matière |
| Boot | 1 derrick (CoreData) ; premier miner extrait entre **J4 et J18** (survey 1-7 ticks × jours pairs, re-tirage si 0) |
| `installDerrick` | coût 1 derrick produit ; cumulable sans limite |

### 6.2 Production

| Contrat | Valeur |
|---|---|
| Formule | `v = floor((count << rank) × multiplier / 801)`, mult défaut 64 |
| Démarrage item | `productionValue = 64`, `productionComplete = 1` → **3 wraps effectifs** |
| Régimes (equipes Terre) | 200 apprentis (r1) = **31/j** · 200 ingénieurs (r2) = **63/j** · 200 experts (r3) = **127/j** |
| Durée item type | mult 64, départ (64, c=1) : **≈ 23 j à 31/j** (supply_pod, derrick…) · **≈ 12 j à 63/j** |
| Durée OF Frame (63/j, r2) | 12 j de cycle + le temps d'accumulation des 250 t d'intrants (le vrai goulot : ~9-10 derricks à produire) |
| Changement d'item | travail perdu (retour 64 / complete 1) |
| Gates | `orbitOnly` → refus au sol ; `techLevel` > rang chef → refus |
| Items au sol (9) | derrick, s_chassis, s_drive, of_frame, supply_pod, tool_pod, cryo_pod, a_c_c, meh_fuel (déviation §5.4) |

### 6.3 Recherche

| Contrat | Valeur |
|---|---|
| Formule | `v = floor((teamSize << rank) × mult / 801)` ; wrap 255 → **+11 %** (cap 100) ; départ value 64, pct 1 |
| Régimes | 250 techniciens (r1) = **39/j** · 250 docteurs (r2) = 79/j · 250 professeurs (r3) = 159/j |
| Premier item (39/j) | 9 wraps → **58 j** (vérifié arithmétiquement) ; 79/j (r2) → 29 j |
| Sélectionnables au boot | 8 items (derrick, s_chassis, s_drive, meh_fuel, of_frame, supply_pod, tool_pod, cryo_pod) — tous techLevel 1 |
| Gate | rang chef ≥ `techLevel` du projet ; 1 seul projet à la fois |

### 6.4 Formation & rangs

| Contrat | Valeur |
|---|---|
| Durée | **24 j** exact |
| Caps simultanés | 100 (recherche) / 100 (production) / 41 (marines, n/a v0) ; **un seul type à la fois** |
| Réservoir | 6 000 − 450 assignés au boot = **5 550** |
| Seuils rang | production 6/12 actions → Engineer/Expert ; recherche 6/9 → Doctor/Professor |
| `actionsTaken` | +1 par item produit (équipe) ou recherche achevée |

### 6.5 Script de playtest (cible, à valider en C5/C6)

| Jalon | Cible |
|---|---|
| J4-J18 | Premier miner extrait (survey × jours pairs) |
| J~23 | Premier item produit (supply_pod, 31/j) |
| J~58 | Première recherche achevée (OF Frame) |
| J~140 | Équipe production rang Engineer (6 items ≈ 6 × 23 j) |
| J160-250 | OF Frame produit (cycle 12 j à 63/j + intrants) → **victoire v0** |

Dépendance critique : la vitesse réelle dépend du rythme d'accumulation des 250 t d'intrants OF Frame (9-10 derricks nécessaires) — c'est le point à observer en playtest, ajustable via l'état de boot seulement (§1).

## 7. Stratégie de tests

1. **Tests actions** (par action) : `validate` (refus orbit-only, refus rang, refus stock insuffisant, refus double projet) + `execute` (mutation exacte) + effet (bulletin).
2. **Tests contrats** : paramétrés sur les tables §6 (31/j, 39/j, 24 j, +11 %, cap 50 000, etc.) — une valeur qui dérive casse la CI.
3. **Test boucle intégrée** : simulation 250 jours avec actions scriptées (stratégie raisonnable) → assertions : OF Frame produit ≤ J250, stocks toujours bornés, rangs monotones croissants, **déterminisme** (même seed → même jour de victoire).
4. **Smoke UI headless** (existant) étendu : panneaux rendus, queue d'item visible, jour qui avance à ×20.

## 8. Découpage EPIC / Stories (aperçu — le plan détaillé suit via writing-plans)

| EPIC | Stories (aperçu) | Livrable |
|---|---|---|
| **A — Fondations techniques** | A1 ADR-007 + squelette facade (validate/execute/notify) · A2 actions production · A3 action recherche · A4 action formation · A5 assignations + installDerrick · A6 audit déterminisme | mutations canalisées, tests verts |
| **B — Écran Terre** | B1 layout/assemblage · B2 panneau production · B3 panneau recherche · B4 panneau personnel · B5 panneau minage/stocks · B6 bulletins + déclencheur victoire | boucle jouable au clavier/souris |
| **C — Contrats & équilibrage** | C1-C4 tests paramétrés (minage/production/recherche/formation) · C5 test boucle intégrée 250 j · C6 playtest réel + ajustement boot si besoin | contrats verrouillés en CI |
| **D — Clôture v0** | D1 écran victoire + récap · D2 smoke UI étendu · D3 docs (TRACE, DASHBOARD, README, ADR-007 final) | v0 taguée |

Estimation : ~12-18 jours-agent. Les EPICs v1+ (transport/Lune, menace, save, usine orbitale, astéroïdes) seront listés dans le plan comme « bloqués par v0 » sans détail.

## 9. Hors périmètre v0 (explicite)

Navette/Lune/transport, ennemis/combat/guerre, save & migrations, astéroïdes, MTX, AOC/auto-produce réel, écrans PFD §2.7+ (bay/dock, flottes, combat, news avancé, global), systèmes extrasolaires, FTL, segments/victoire complète.

## 10. Risques

| Risque | Mitigation |
|---|---|
| Boucle économiquement injouable (OF Frame > 250 j) | Contrat §1 : ajustement par l'état de boot uniquement ; formules intouchables |
| La facade devient un passe-plat verbeux | Contrat Action minimal (validate/execute) ; helpers partagés ; revue à chaque story |
| Dérive des chiffres pendant l'UI | Tests contrats (§7.2) en CI avant toute story B |
| UI DOM qui gonfle | 1 module par panneau, pas de framework, re-évaluation fin v0 (décision Session 1 conservée) |
