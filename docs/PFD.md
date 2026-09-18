# PFD — Plan Fonctionnel Détaillé

> Version 0.2 — 2026-09-18
> Statut : **document-cadre** (à affiner au fil des phases)

Ce document décrit **chaque écran et chaque système** du jeu, à un niveau fonctionnel. Il sert de référence pour l'implémentation (voir [ROADMAP.md](ROADMAP.md)) et se lit comme une spécification produit.

Légende des statuts : 🔲 non démarré · 🟨 en cours · 🟢 fait · 🟠 à revoir

---

## 1. Vue d'ensemble du jeu

### 1.1 Boucle de gameplay principale

```
Gérer le temps
   ├─ Produire (miner, raffiner, assembler)
   ├─ Rechercher (débloquer des technologies)
   ├─ Explorer (envoyer des sondes / vaisseaux)
   ├─ Coloniser (stations orbitales puis planétaires)
   ├─ Défendre (boucliers, missiles, flottes)
   └─ Conquérir les 8 systèmes & récupérer les 8 segments Hydroïdes → VICTOIRE
```

### 1.2 Cadre narratif (spiritual successor)

En 2200, un astéroïde détruit la civilisation terrienne. Des survivants sur la Lune recolonisent la Terre. Trois siècles plus tard, l'Humanité redémarre le programme spatial (opération **Deuteros**). Entre-temps, les colonies lointaines (Méthanoïdes, Hydroïdes…) se sont développées et se font la guerre. Le joueur est le nouveau commandant de la mission spatiale.

---

## 2. Écrans (UI)

### 2.1 Écran principal / Vue du système 🇫🇷

```txt
┌───────────────────────────────────────────────────────────────┐
│ Barre de statut globale (fond, ressources, date, vitesse, ⏸) │
├────────────────────────────────────────────┬──────────────────┤
│                                            │  SIDEBAR        │
│   CANVAS 2D : vue du système solaire       │  - Planètes     │
│   - planètes, orbites, ceinture            │  - Stations     │
│   - vaisseaux en transit                   │  - Flottes      │
│   - zoom / pan                             │  - Événements   │
│                                            │  - Journal      │
├────────────────────────────────────────────┴──────────────────┤
│ Barre de navigation principale (onglets des écrans de gestion) │
└───────────────────────────────────────────────────────────────┘
```

**Fonctions :**
- 🌍 Vue cartographique du système solaire en 2D (canvas), sélection des corps.
- 🔭 Zoom / pan (molette, drag), saturne tournante, distances réelles à l'échelle non linéaire.
- 🕐 Contrôle du temps : pause, normal, accéléré (x1, x2, x4, x8).
- 📌 Marqueurs : bâtiments, flottes, événements (exclamations).

### 2.2 Écran PLANÈTE (detail d'un corps)

**Fonctions :**
- Infos planète : atmosphère, gravité, température, gisements (liste + quantité restante), habitabilité.
- Actions : construire station orbitale, poser une sonde, envoyer une colonie, établir mine.
- Vue des installations présentes (si colonisée) : mines, champs de derricks, raffineries, stockage.
- Onglets changent selon l'état (inconnu / exploré / colonisé).

### 2.3 Écran MINES / EXPLOITATION 🟨

**Fonctions :**
- Liste des sites miniers (planète + position + ressource exploitée + rendement).
- Contrôle : construire/déconstruire une mine, définir l'export (vers quelle station).
- Automatisation : « export automatique » si ligne ouverte.

### 2.4 Écran RECHERCHE

**Fonctions :**
- Arbre de technologies (catégories : Construction, Propulsion, Énergie, Industrie, Combat, Biologie, Exotique).
- ÆArbre visuel (noeuds + prérequis), surbrillance des déblocables.
- Un seul projet courant ; progression `v = (équipe × 2^rang) × multiplicateur / 801`, wrap à 100 % (GAMEPLAY §3).
- Découvertes aléatoires (« brainstorm ») qui boostent la recherche.
- Rétro-ingénierie des technologies Méthanoïdes capturées (ex : MAD, transducteur de masse).

### 2.5 Écran PRODUCTION / MANUFACTURE

**Fonctions :**
- Liste des recettes (élément → coût → produit).
- Ateliers vs automates : productivité, coût, maintenance.
- Files de production rondôrdes (queue d'ordres, priorités).
- Liens : où partent les produits (station orbitale, planète, vaisseau).

### 2.6 Écran EFFORTS / PERSONNEL

**Fonctions :**
- Listes : scientifiques, ingénieurs, équipages, recrues.
- Formation (coût + durée) ; mutations humaines (génome) pour adapter aux environnements.
- Affectation par projet / station / vaisseau.

### 2.7 Écran BAY & DOCK (chantiers et docks)

**Fonctions :**
- Chantiers de construction : station orbitale, vaisseau, sonde, module.
- Liste des vaisseaux (type, position, destination, carburant, capacité).
- Dock : amarrer/désamarrer, transférer des cargaisons, réparer.

### 2.8 Écran FLOTTES / NAVIGATION

**Fonctions :**
- Créer une flotte, assigner une route (aller-retour ou one-shot).
- Itinéraires planifiés, consommation carburant, vitesse.
- Voyages FTL (au-delà du système solaire) une fois la technologie débloquée.
- Transferts longue distance (transducteur de masse).

### 2.9 Écran COMBAT

**Fonctions :**
- Active si bataille en cours.
- Liste des engagements, résolution automatique + visualisation simplifiée.
- Résultats : pertes, captures (récupération de technologies).
- Logique simulée : portée, torpilles, drones, boucliers, point de rupture.

### 2.10 Écran NEWS / LOGS / COMMS

**Fonctions :**
- Fil de nouvelles du jeu (événements scénarisés + aléatoires).
- Journal de bord (notes automatiques + notes joueur).
- Communications avec les colonies / factions (dieges dirigées).

### 2.11 Écran GLOBAL / GESTION GLOBALE

**Fonctions :**
- Répartition des ressources entre stations (offre/demande).
- Statistiques : production, consommation, flotte, exploration, victimes.
- Paramètres de partie (difficulté, vitesse, seed).

---

## 3. Systèmes du jeu

### 3.1 Temps et vitesse

| Vitesse | 1 tick réel | Effet |
|---|---|---|
| Pause | — | le monde est figé, on peut préparer les ordres |
| Normal | 1 s = 1 jour jeu | rythme casual |
| Accéléré | 1 s = 8 jours jeu | fermes/industrie |
| Rapide | 1 s = 32 jours jeu | voyages longs |

- Le jeu tourne sur un **tick discret** (pas de boucle frame-dépendante pour la simulation).
- Les ordres sont donnés en pause → résolus au prochain tick (déterministe).

### 3.2 Ressources

16 matières (enum original) — valeurs `data/resources.json` + GAMEPLAY §2.1 :

| Ressource | Symbole | Dérrick/j | Minable |
|---|---|---|---|
| Fer | Fe | 2 | oui |
| Titane | Ti | 2 | oui |
| Aluminium | Al | 2 | oui |
| Carbone | C | 2 | oui |
| Cuivre | Cu | 2 | oui |
| Hydrogène | H | 1 | oui |
| Deutérium | D | 1 | oui |
| Méthane | CH₄ | 1 | oui |
| Hélium | He | 1 | oui |
| Palladium | Pd | 1 | oui |
| Platine | Pt | 1 | oui |
| Argent | Ag | 1 | oui |
| Or | Au | 1 | oui |
| Silice | Si | 2 | oui |
| Carburant MeH | MeH | — | non (H×2 + CH₄×2, toute base) |
| Carburant HeD | HeD | — | non (He×2 + D×2, orbite seule) |

- Chaque gisement a une **quantité restante** → épuisable ; stock local plafonné à **50 000 t par ressource** (GAMEPLAY §2.2).
- Le transport se fait par **pods/slots** (GAMEPLAY §2.3) : un vaisseau = `capacité` (t) + `slots` portant chacun une cargaison homogène ; la masse (Σ quantité × masse unitaire ≤ capacité) borne le passage à l'échelle. **Navette** 1 slot · 100 t · MeH · intra-système — **IOS** 3 slots · 2 500 t · MeH · inter-planètes — **SCG** 3 slots · 5 000 t · HeD · inter-systèmes (FTL) (GAMEPLAY §5.2).
- Transfert instantané (**items matériels uniquement**) via **transducteur de masse** (tech exotique, débloquable).

### 3.3 Recherche

- Un seul **projet courant** (géré depuis la Terre) ; progression `v = (équipe × 2^rang) × multiplicateur / 801`, wrap à 100 % (GAMEPLAY §3).
- **Milestones** : certains contenus (Hyperlight, TMT, SCG…) ne sont débloquables que par les événements temporels (timeline), pas par les seuls points.
- Rétro-ingénierie : capturer une tech Méthanoïde la débloque à coût moindre (inversement, la vôtre peut être volée s'ils gagnent).
- Prérequis : arbre à graphe acyclique. 4-6 niveaux de profondeur.

### 3.4 Production

- Recettes à `inputs` → `outputs` (ex : 2 titane + 1 carbone → 1 coque).
- Bornes : ateliers (humains, lents, fiables) → automates (rapides, consomment énergie, maintenance).
- Files de fabrication ordonnées par priorité du joueur.

### 3.5 Véhicules & structures

| Type | Rôle |
|---|---|
| Station orbitale | émetteur, acte de commerce, défense |
| Station planétaire | liaison au sol, production |
| Sonde | exploration passive d'un corps |
| Navette | transport intra-système (pods/slots) |
| IOS | transport interplanétaire (pods/slots) |
| SCG | transport interstellaire FTL |
| Vaisseau d'assaut | combat |
| Briseur d'astéroïde | minage de la ceinture |

### 3.6 Combat

- Simulé en résolution automatique (logarithmique) avec visualisation.
- Facteurs : puissance d'attaque, boucliers, speed, effectifs, morale, formations.
- Si défense (station) : l'attaquant doit percer les boucliers en continu.
- Capture : si un vaisseau ennemi est endommagé sans destruction → chance de capture (technologie).

### 3.7 Événements & scénario

- Événements scriptés (timeline 1991 revisitée) + événements dynamiques (sondes extraterrestres, épidémies, raz-de-marée…).
- Système de « danger » global Méthanoïde qui monte si on les ignore.
- Quête de fin de partie : **8 segments Hydroïdes** révélés par leur message crypto (jour 300) et éparpillés un par système extrasolaire → victoire lorsqu'ils sont tous récupérés.

### 3.8 Fin de partie

**Victoire** : 8 systèmes conquis + **8 segments Hydroïdes récupérés** (Atlantic, Chloé, Babylone, Hadrien, Romulus, Césius, Pliocène, Alpha) → clip de victoire.

**Défaite** (l'une des deux conditions) :
1. Perte de la Terre-Ville (invasion réussie) ;
2. Effondrement économique et militaire : plus aucune installation de production ni unité de combat opérationnelle.

Écran récap (partie, durée, statistiques).

### 3.9 Sauvegarde

- Autosave toutes les X minutes + sauvegardes manuelles.
- Export/import de sauvegarde en JSON (portabilité).
- Multi-slots horodatés avec mini-capteur d'état.

---

## 4. Accessibilité & UX

- Tout est cliquable, tout est affiché (pas de secret obscur volontaire).
- Tooltips systématiques sur les entrées chiffrées.
- Raccourcis clavier.
- Notifications non bloquantes (toasts) + centre de notifications.
- Mode daltonien pour les couleurs de factions.
- Responsive : bureau d'abord, mobile en compatibilité (zoom).

---

## 5. Non-fonctionnels

- Charge < 10 s sur connexion moyenne (bundle Vite optimisé).
- 1 save/5 min < 200 KB.
- Déterministe (même seed → même déroulé si mêmes actions).
- Pas de dépendance réseau obligatoire (offline-first).

---

## 6. Hors périmètre v1

- Multijoueur — IA avancée des factions autres que Méthanoïdes — Marché entre joueurs — Mods externes — Mobile natif (mais responsive visé).