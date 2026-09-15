# VISION

> Version 0.1 — 2026-09-15

## Le projet en une phrase

Une webapp de gestion spatiale moderne et élégante, inspirée des mécaniques de *Deuteros: The Next Millennium* (Ian Bird, 1991), jouable directement dans le navigateur.

## Pourquoi ce projet

- L'original est un chef-d'œuvre de jeu de gestion, mais il a 35 ans : graphismes datés, UX obscure, sauvegardes fragiles.
- Aucun remake web fidèle et portable n'existe à ce jour.
- Un « spiritual successor » peut garder l'âme du jeu (exploration, exploitation, recherche, guerre) tout en corrigeant les défauts de l'original.

## Pour qui

**Le joueur cible** est un amoureux des jeux de gestion spatiale :
- joueurs de la vieille école (Deuteros, Millennium 2.2, M.U.L.E., Master of Orion) ;
- joueurs modernes de 4X et tycoons spatiaux (Factorio, Dyson Sphere Program, Surviving Mars) ;
- toute personne attirée par la SF post-apocalyptique.

Aucune compétence technique requise pour jouer : ouvrir un navigateur, cliquer, jouer.

## Ce que le jeu est

- **Un jeu de gestion solo**, temps réel avec pause et contrôle de vitesse.
- **Un système solaire** 2D à explorer et exploiter : planètes, lunes, ceinture d'astéroïdes.
- **~10 matières premières** à miner, transporter et transformer (titane, carbone, palladium, argent, iridium…).
- **Un arbre de recherche** : construction, propulsion, énergie, combat, technologies exotiques.
- **Une production automatisable** : d'artisans à automates.
- **Des vaisseaux et stations** : orbitaux, planétaires, interplanétaires, puis FTL.
- **Une menace** : les Méthanoïdes — et une fin de partie débloquable.
- **Un lore post-apocalyptique** : humanité revenue sur Terre, exode, guerre froide interstellaire.

## Ce que le jeu n'est **PAS** (non-objectifs)

- ❌ Pas un remake pixel-pour-pixel (philosophie « spiritual successor » assumée).
- ❌ Pas un MMO. Pas de multijoueur à ce stade.
- ❌ Pas de 3D WebGL (rendu 2D canvas + DOM).
- ❌ Pas de backend, pas de compte, pas de cloud (au moins pour la v1).
- ❌ Pas de micro-tâches laborieuses héritées de l'original : l'UX doit fluidifier, pas fidèlement reproduire la lenteur 1991.
- ❌ Pas de systèmes inutilement complexes pour le simple plaisir de la complexité.

## Principes de design

1. **Clarté avant nostalgie** : montrer les chiffres, expliquer les mécaniques dans le jeu.
2. **Données sur le terrain** : chaque planète a des gisements, de l'atmosphère, des besoins.
3. **Automation progressive** : toute action répétitive doit être automatisable.
4. **Pause bienveillante** : le temps s'arrête quand le joueur gère, pour permettre la réflexion.
5. **Courbe maîtrisée** : onboarding explicite, complexité dévoilée progressivement.

## Critères de succès

**V1 acceptable quand :**
- [ ] Un joueur peut miner, rechercher, produire, explorer, combattre et « gagner » (éradication des Méthanoïdes).
- [ ] Une partie complète se joue **sans recharger la page** et **sans perte de sauvegarde**.
- [ ] La boucle de gameplay principale est compréhensible sans tutoriel externe.
- [ ] Les performances restent correctes après 5h de jeu (milliers d'entités).

**V1 idéale quand :**
- [ ] Le jeu est jouable sur mobile (responsive).
- [ ] Le lore est intégré dans le jeu (encyclopédie, événements narrés).
- [ ] Le système est moddable (données hors-code).

## Métrique de succès

- Le développement est mené par un noyau de passion (ce projet), puis validé par des tests de jeu réels → la priorité reste d'avoir **un build jouable**, pas une documentation parfaite.