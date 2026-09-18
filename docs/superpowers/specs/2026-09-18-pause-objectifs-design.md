# Pause automatique sur objectif atteint — Design (K11)

> Décision K11, vote suite au commentaire du playtest v0 : « je n'ai pas de pause d'avancement du temps quand un objectif est fini (recherches, productions, formations) ».

## §1 Objectif

Sur découverte en situation réelle (gameplay à ×20), la partie avance sans s'arrêter quand un objectif productif se termine : recherche achevée, item produit, formation arrivée à échéance. Le joueur rate l'événement. L'objectif de cette décision est d'**interrompre l'écoulement du temps à chaque objectif terminé** et d'afficher un **signal visible** jusqu'à ce que le joueur reprenne.

Seul le **temps** est interrompu : le mécanisme existant de pause (vitesse `0`) est réutilisé, la boucle de tick n'est pas modifiée.

## §2 Décisions (relevé des réponses utilisateur)

| Question | Choix retenu |
|---|---|
| Périmètre | Pause sur **recherche achevée + item produit + formation terminée** (pas les drones ennemis, pas le minage) |
| Retour visuel | **Bannière signal** + bouton de reprise |
| Comportement de la bannière | Reste affichée jusqu'à la reprise ; bouton « Reprendre (Espace) » |
| Activable ? | **Toujours active** (pas de toggle en v0, KISS) |
| Approche | **A — signaux purs du moteur** (cohérent K10/ADR-002) : la formation est le seul cas sans signal structuré → on l'ajoute |

## §3 Architecture

### 3.1 Moteur — `DayTickResult.trainingFinished`

`DayTickResult` (src/simulation/types.ts) gagne :

```ts
/** Formations arrivées à échéance ce jour (durées résolues — 24 j). */
trainingFinished: Array<{ type: StaffType; count: number }>;
```

`dayTick` (src/simulation/engine.ts) :
- initialise `trainingFinished: []` ;
- dans le callback passé à `updateTraining` (l'endroit qui produit déjà `[J<n>] formation ${type} : +${count} recrues.`), pousse `result.trainingFinished.push({ type, count })`.

Retour pur, aucune mutation supplémentaire. La logique de `staff.ts` ne change pas.

### 3.2 UI — helpers purs (`app.ts`, exportés)

Patron `productionRows`/`researchRows` (earth-screen.ts) : helpers purs exportés, testables sans DOM.

```ts
export interface ObjectiveCompletion {
  kind: 'recherche' | 'production' | 'formation';
  label: string; // français, lisible
}

export function completedObjectives(result: DayTickResult): ObjectiveCompletion[]
export function shouldAutoPause(result: DayTickResult): boolean
```

- `shouldAutoPause` : vrai si `researchFinished` non nul **ou** `produced.length > 0` **ou** `trainingFinished.length > 0`.
- Libellés :
  - recherche : `Recherche achevée : <itemId>.`
  - production : `Production terminée : <itemId> (<planète>).` — planète `Terre` si `earth`, sinon l'id brut.
  - formation : `Formation terminée : <count> <rôle> disponibles.` — production → `producteurs`, research → `chercheurs`, marines → `marines`.

### 3.3 Boucle `startLoop` — pause agrégée par frame

- À ×20, plusieurs ticks peuvent avancer dans la même frame : on **agrège** toutes les complétions de la frame en **une seule pause**.
- Si au moins une complétion et pas encore de victoire → `setSpeed(0)` + affichage de la bannière (liste des objectifs de la frame).
- **Priorité victoire** : si `v0_victory` est posé dans cette frame, seule l'overlay de victoire s'affiche (bannière supprimée).
- `pushNews` et la trace restent inchangés (`[J<n>] … achèvement/terminée` déjà tracés).

### 3.4 Bannière & reprise

- DOM : élément `#pause-banner` top d'écran (patron visuel overlay victoire), classes `.pause-banner` (CSS à ajouter près de `.victory-overlay`).
- Contenu : titre « Objectif atteint », `<ul>` des libellés de la frame, bouton « Reprendre (Espace) ».
- **Mémoire de vitesse** : `prevSpeed = time.speedIndex` à la pause. Reprendre → `setSpeed(prevSpeed)` (retour à la vitesse d'avant, ex. ×20).
- **Espace** : si bannière visible → reprend (retour `prevSpeed`) ; sinon toggle actuel (0 ↔ ×1).
- La bannière reste affichée jusqu'à la reprise.

### 3.5 Trace

Aucun ajout (YAGNI) : la ligne journal du moteur `[J<n>] recherche achevée / production … terminée / formation …` est déjà le marqueur de l'événement dans le buffer/console.

## §4 Format (exemples)

- `✓ [pause] Objectif atteint — Recherche achevée : derrick.`
- `✓ [pause] Objectif atteint — Production terminée : supply_pod (Terre).`
- `✓ [pause] Objectif atteint — Formation terminée : 100 chercheurs disponibles.`

## §5 Stratégie de test

1. **Moteur** (tests/simulation.test.ts) : formation en cours avec échéance passée (24 j) → un `dayTick` produit `result.trainingFinished` = `[{ type, count }]` **et** la ligne journal « formation … ».
2. **Helpers purs** (tests/ui.test.ts, sans DOM) : `completedObjectives` renvoie les 3 libellés français attendus (recherche/production/formation) ; `shouldAutoPause` vrai selon chaque signal, faux si aucun.
3. Suite complète, lint, tsc, build : verts.

## §6 Hors périmètre (YAGNI)

- Pas de toggle pause-auto.
- Pas de pause sur drones ennemis / autres événements.
- Pas de son / flash / animation.
- Pas de changement de `startTraining`/`updateTraining`/boucle de tick.
- Pas de ligne de trace dédiée à la pause.