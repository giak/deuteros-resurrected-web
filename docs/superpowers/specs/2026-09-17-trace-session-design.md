# Design — Trace de session (journal de partie pour diagnostic)

> Date : 2026-09-17
> Statut : validé (brainstorming complété — décisions utilisateur enregistrées, approche A « trace dédiée + simulation enrichie par retours purs » retenue)
> Contexte : playtest v0 échoué (800+ jours sans victoire) — le jeu ne rapporte rien entre les grands événements, et rien ne permet de relire une partie pour comprendre pourquoi. Objectif : rendre la boîte noire visible.
> Sources : `docs/DECISIONS.md` (ADR-002/014/018), moteur `src/simulation/` (engine.ts, mining.ts, research.ts, production.ts), `src/actions/` (facade ADR-018), `src/ui/app.ts` (boucle + pushNews).

---

## 1. Objectif

Fournir un **journal texte brut** de chaque partie : **actions joueur** (avec raison d'échec) + **journal journalier du moteur** (minage par matière, recherche en cours, production, formation, ennemis, combat). Écrit dans les **DevTools sous `console.group` replié par jour** et dans un **buffer mémoire FIFO (~3000 lignes)** consultable via `window.__TRACE__.getTrace()`.

Le trace permet de répondre à : *« qu'est-ce que je vois ? où en est chaque système ? pourquoi rien ne progresse ? »* — exactement la panne du playtest v0. Aucun usage gameplay, aucune persistance save, aucun impact UI.

## 2. Décisions validées (brainstorming)

| Décision | Choix |
|---|---|
| Objectif | Diagnostiquer un blocage / comprendre une partie |
| Granularité | Actions joueur (résultat + raison) **et** journal journalier complet du moteur |
| Support | Console DevTools + buffer mémoire (pas de panneau in-game, pas d'export, pas de localStorage) |
| Activation | Toujours active ; buffer FIFO plafonné (~3000 lignes) |
| Format | Texte brut lisible par humain, préfixé `[J<jour>]` |
| Échecs | Tracés avec la raison exacte (`ValidationResult.reason`) |
| Volume à ×20 | Tout tracer ; `console.group` **replié** par jour |
| Approche | **A — trace dédiée** (`src/trace/`) + simulation enrichie par retours purs (ADR-002 préservé) |
| Tracé des actions | **Option 1** — logger injecté en option dans `runAction` (paramètre 4, unique point de vérité) |
| Rejeté | B (logger callback propagé à tous les services — fragilise ADR-002) ; C (diff d'état avant/après — incapable de dire *pourquoi*) |

## 3. Architecture

### 3.1 Nouveau module `src/trace/` (UI-adjacent, hors `src/simulation/`)

**`src/trace/trace.ts`** — le seul code qui touche `console` :

- `traceBuffer: string[]` — FIFO cap 3000 (`TRACE_BUFFER_CAP`).
- `initTrace(): void` — banner de démarrage (`DEUTEROS TRACE — seed X, J1`).
- `traceDay(result: DayTickResult): void` — ouvre `console.group` **repliée** (titre `[J<day>] · n lignes`), écrit chaque ligne de `result.journal` avec `console.log`, puis ferme ; remplit le buffer.
- `traceActionLine(day: number, label: string, outcome: string): void` — écrit + buffer une ligne d'action.
- `clearTrace(): void` ; `getTrace(): string[]` (copie du buffer).
- Exposition : `window.__TRACE__ = { getTrace, clearTrace }` pour relecture/partage depuis la DevTools.

**Contraintes** : aucun import depuis `src/simulation/` (la simulation **retourne** les lignes, ne les écrit pas) ; aucun état de jeu ; au plus un `import.meta.env.DEV` pour ne pas exposer le banner en prod (le reste fonctionne toujours — décision « toujours active »).

### 3.2 Simulation enrichie par retours purs (ADR-002 préservé)

Les services **retournent plus de données** ; ils n'écrivent jamais dans la console. `engine.dayTick` agrège tout dans un nouveau champ `DayTickResult.journal: string[]` (lignes **déjà préfixées `[J<day>]`** — la simulation produit du texte brut lisible en sortie, sans état, sans console).

Changements de signature :

| Fonction | Avant | Après |
|---|---|---|
| `updateMining(planet, day, rng)` | `Partial<Record<string, number>>` | inchangé (déjà le détail par matière) — `engine` formate les lignes |
| `updateResearch(state, staff)` | `string \| null` | `ResearchDayResult { finished: string \| null; progress: { itemId, percentage } \| null; blocked: boolean }` |
| `updateProduction(planet)` | `string \| null` | `ProductionDayResult { finished: string \| null; itemId: string \| null; value: number; wraps: number }` |
| `updateEnemyBuild(state)` | `number` | inchangé — `engine` formate la ligne si `> 0` |
| `updateTraining(state, cb)` | `void` (callback) | inchangé — `engine` formate via le callback existant |
| `dayTick(state)` | `DayTickResult` | `DayTickResult` **+ `journal: string[]`** |

L'**ordre des lignes** suit l'ordre des phases d'`engine.dayTick` (recherche → production → minage → formation → ennemis → combat — cf. GameCore.cs).

### 3.3 Actions : logger injecté (option 1)

`runAction` gagne un 4e paramètre **optionnel** :

```ts
runAction(action, state, args, traceWay?: { log: (day: number, label: string, outcome: string) => void })
```

- Si présent (le call site UI passe le hook du module trace), `runAction` émet **systématiquement** une ligne, que la validation réussisse ou échoue :
  - succès → `[J<day>] action <label> → ok`
  - échec → `[J<day>] action <label> → échec (raison)` — la raison brute de `ValidationResult`
- **Aucun changement** pour les tests existants (paramètre optionnel) et pour les call sites qui ne fournissent pas le hook.
- Pas de dépendance `actions → trace` : le hook est injecté, le module actions reste découplé (validé option 1).

### 3.4 Raccordement `src/ui/app.ts`

- **Boucle** (`startLoop`) : après chaque `dayTick(getState())`, appel `traceDay(result)` (à côté de `pushNews`).
- **Le hook actions** est fourni par le module trace dans les call sites UI (`earth-screen.ts`), pas dans `app.ts`.
- Init : `initTrace()` dans `mountApp`.

Aucun autre changement UI ; aucun changement gameplay ; les tests existants de `dayTick` ne changent pas de comportement (le champ `journal` est additionnel).

## 4. Format des lignes (texte brut, préfixé `[J<jour>]`)

Exemples (Français, lisible) :

```
[J1]  action selectResearch derrick → ok
[J5]  action queueItem derrick → ok
[J15] action queueItem of_frame → échec (insufficient_resources)
[J23] recherche of_frame — 63%
[J23] production derrick → terminée (wraps 4, valeur 0)
[J23] minage terre iron +4
[J23] minage terre titanium +2
[J23] formation production : +100 recrues
[J40] ennemis : 7 drones construits
[J42] combat : flotte méthanoïde détruite
```

Règles :
- **Recherche** : ligne **chaque jour** quand un projet est actif (`recherche <item> — <pct>%`) ; ligne événement à 100 % (`recherche achevée : <item>`).
- **Production** : ligne **chaque jour** quand un item est en cours (`production <item> — valeur <v>/<seuil> wrap <n>`), ligne événement à la fin (`production terminée : <item>`).
- **Minage** : une ligne **par matière** minée ce jour ; **pas de ligne** si rien (jour impair, pas de derrick…). Les sondages peuvent être tracés (`sondage <matière> : N j restants`).
- **Formation** : ligne événement à la fin des 24 j (déjà fourni par le callback).
- **Ennemis/combat** : ligne si `updateEnemyBuild > 0` ; ligne par combat résolu.
- Volume typique : ~10 lignes/jour (Terre active 9 matières + 1 recherche + 1 production) — absorbé par le group replié et le FIFO.

## 5. Stratégie de tests

1. **Tests moteur (purs)** : `dayTick` produit `journal` en ordre de phases ; `updateResearch`/`updateProduction` retournent leur nouvel objet ; valeurs exactes vérifiées (63 %, valeur/wraps, minage par matière) — une méforme de formatage casse la CI.
2. **Tests actions + trace** : `runAction` avec hook capturant → ligne `ok` / ligne `échec (raison)` ; sans hook → rien émis (régression signature optionnelle).
3. **Tests trace** : `traceDay` ouvre/ferme un group et écrit N lignes ; buffer FIFO (débordement au-delà de 3000) ; `getTrace` retourne une copie.
4. **Smoke UI headless (existant)** : inchangé ; vérifie qu'aucun changement de comportement visuel.

## 6. Hors périmètre (explicite)

Panneau in-game, export fichier, localStorage/IndexedDB, replay, persistance save (la trace ne fait pas partie de `GameState`), rétro-action (tracer le passé avant activation), événements UI de navigation (onglets/clics sans mutation d'état).

## 7. Risques

| Risque | Mitigation |
|---|---|
| Volume console à ×20 (20 jours/s) | `console.group` repliée par jour ; buffer cap 3000 ; DevTools peuvent supprimer le log au-delà d'un seuil (acceptable — le buffer garde les 3000 dernières lignes) |
| Coupler la simulation au format d'affichage | La simulation produit du texte brut pur (retours, pas de console) ; le module `src/trace/` concentre l'écriture ; formatage centralisé, pas dans les services |
| Cycle d'imports (`actions` ↔ `trace`) | Évité : le hook est injecté dans `runAction`, jamais importé |
| Régression des tests existants | Changements de signature effectués par ajout d'objets de retour + champ additionnel `journal` ; tests existants inchangés ou adaptés à la marge |