# Reprise manuelle après pause auto — Design (K12, révise K11)

> Retour de playtest (2026-09-18) : « quand la pause se met en place, on reset aussi les ticks en mode pause. l'utilisateur choisit l'avancement pour reprendre. » La K11 restaurait automatiquement la vitesse d'avant à la reprise ; ce n'est pas le comportement voulu.

## §1 Objectif

Faire de la pause automatique sur objectif un **arrêt net** dont la **reprise est un choix explicite de vitesse** par le joueur. Fermer la bannière ne relance pas ; seul le choix d'une vitesse (×1/×2/×5/×20) relance.

## §2 Décisions (relevé utilisateur)

| Question | Choix retenu |
|---|---|
| Action de « Reprendre » | **Fermer la bannière en restant en pause** (ne relance pas) |
| Relance | **Clic sur un bouton de vitesse** ×1/×2/×5/×20 (l'utilisateur choisit l'avancement) |
| Libellé du bouton | **« Fermer (Espace) »** |
| Espace | Bannière visible → ferme (reste en pause) ; sinon → toggle pause/×1 existant |

## §3 Comportement cible

| Évènement | Effet |
|---|---|
| Objectif terminé (recherche/production/formation) | `setSpeed(0)` (accumulateur remis à 0, ⏸ actif) + bannière |
| Clic ×1/×2/×5/×20 pendant la bannière | La bannière se ferme **et** la partie relance à cette vitesse |
| Clic ⏸ pendant la bannière | Inchangé : bannière conservée, reste en pause |
| Bouton « Fermer (Espace) » | Retire la bannière, reste en pause |
| Espace (bannière visible) | Retire la bannière, reste en pause (pas de toggle) |
| Espace (sans bannière) | Toggle pause/×1 existant (inchangé) |

## §4 Architecture (delta K11)

- `src/ui/app.ts` :
  - **Suppression** de l'état `const pause = { prevSpeed: 0 }` et de la capture de vitesse — plus de mémoire de vitesse (YAGNI).
  - `pauseForObjectives(labels)` : conserve `setSpeed(0)` + insertion de la bannière, **sans** capturer `prevSpeed`.
  - `resumeAfterPause()` → renommée **`dismissPauseBanner()`** : retire `#pause-banner`, **aucun** `setSpeed`.
  - Handler Espace : si `#pause-banner` présent → `dismissPauseBanner()` + return ; sinon toggle existant.
  - `setSpeed(index)` : la ligne `if (index > 0) document.querySelector('#pause-banner')?.remove();` (fix K11) est **conservée** — c'est elle qui réalise « choisir une vitesse = reprendre ».
- Aucun changement dans `src/simulation/`, `src/actions/`, `src/trace/`, ni sur les helpers `completedObjectives`/`shouldAutoPause`.
- CSS : aucun changement (le sélecteur `.pause-resume` reste utilisé pour le bouton).

## §5 Tests

- Aucun nouveau test (comportement DOM dans la boucle `frame`, sans harnais — même précédent que `checkVictory`/K9/K11).
- Vérification : `npm run test:run` (111/111 attendus), `npm run lint`, `npm run build` verts.
- Validation d'usage : playtest manuel (bannière → bouton/Espace reste en pause ; clic vitesse relance).

## §6 Hors périmètre (YAGNI)

- Pas de test DOM/harnais.
- Pas de changement moteur/helpers/CSS.
- Pas de changement du toggle Espace hors bannière.
- Pas de réglage de la vitesse de reprise par défaut.
