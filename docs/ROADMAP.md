# ROADMAP — Phases d'implémentation

> Version 0.1 — 2026-09-15
> Du MVP jouable au jeu complet. Chaque phase se termine par **un build jouable**.

---

## Phase 0 — Fondations (en cours) ✅

- [x] Documents de cadrage (VISION, PFD, GAMEPLAY, DATA, ARCHITECTURE, TECH_STACK, ADR)
- [ ] Init projet Vite + TS strict
- [ ] CI minimale : `npm run lint`, `npm run typecheck`, `npm run test`
- [ ] Skeleton : store, `tick()` vide, écran blanc avec barre de temps
- **Livrable** : `npm run dev` affiche un canvas + une barre de statut.

---

## Phase 1 — MVP jouable (cible : cœur de boucle)

> Objectif : miner, produire, rechercher, voir la carte bouger.

- [ ] Simulation : temps & ticks (§3.1 PFD)
- [ ] Ressources : stock, production, gisements épuisables
- [ ] Vue système (canvas) : planètes statiques, zoom/pan, sélection
- [ ] Écran planète : infos, construction mine
- [ ] Écran recherche : pool de points, 1<sup>re</sup> tech
- [ ] Production : 1 recette, atelier
- [ ] Sauvegarde : autosave + reload
- **Livrable** : on peut jouer la boucle minière de base et sauvegarder.

---

## Phase 2 — Expansion & logistique

- [ ] Vaisseaux : cargo, sonde ; navigation interplanétaire
- [ ] Stations orbitales et chantiers
- [ ] Routes de ravitaillement
- [ ] Recrutement & formation (scientifiques, équipages)
- [ ] Automatisation des mines et fabriques
- **Livrable** : on explore les planètes, on ravitaille, on agrandit.

---

## Phase 3 — Recherche complète & industrie

- [ ] Arbre tech complet (catégories + prérequis graphiques)
- [ ] Production multirecette, files de priorité
- [ ] Transducteur de masse (post-FTL)
- [ ] Vue globale (stats, répartition)
- **Livrable** : industrie riche, arbre tech visible.

---

## Phase 4 — Combat & menace

- [ ] Résolution de combat automatique + écran d'engagement
- [ ] Boucliers, torpilles, drones, MAD
- [ ] IA Méthanoïde : menace, raids, invasions
- [ ] Commcations/comms diplomatiques (pactes scénarisés)
- **Livrable** : partie complète gagnable (victoire/défaite).

---

## Phase 5 — Contenu & polish

- [ ] Événements dynamiques + timeline complète
- [ ] Enfin de partie (récap) 
- [ ] Enclyclopédie in-game du lore
- [ ] Notifications, tooltips, raccourcis clavier
- [ ] Mode daltonien, responsive
- [ ] Balance system : playtests + ajustements
- **Livrable** : v1 publique.

---

## Phase 6 — Post-v1 (optionnel)

- [ ] Export/import de sauvegardes
- [ ] Modding : loader JSON custom insurré dans l'UI
- [ ] Nouveaux systèmes stellaires générés procéduralement
- [ ] Factions secondaires jouables ou avancées

---

## Ordre de priorité non-négociable

> **Un build jouable avant du polish. Le contenu avant la complexité.**
> Chaque phase est terminée seulement quand on peut y jouer et que la sauvegarde est intacte.

---

## État courant

Voir [DASHBOARD.md](DASHBOARD.md) pour le statut détaillé des phases.