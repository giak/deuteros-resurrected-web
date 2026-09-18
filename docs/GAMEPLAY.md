# GAMEPLAY — Règles détaillées du jeu

> Version 0.2 — 2026-09-18
> Complément chiffré du [PFD](PFD.md). Arbitrages posés : transport pods/slots (hybride UX), Hydroïdes narratifs, défaite par spirale (spec `docs/superpowers/specs/2026-09-18-gameplay-v0.2-design.md`).

---

## 1. Le temps

- Le jeu progresse en **jours** fictifs.
- Ticks de simulation : la simulation avance par pas de temps de **1 jour** à la vitesse réelle choisie (voir PFD §3.1).
- Ordre d'exécution d'un tick :
  1. Événements et scenarii
  2. Recherche (ajout de points)
  3. Production (consommation inputs → sortie outputs)
  4. Exploitation minière (extraction → stock local)
  5. Logistique (mes transferts de ressources en cours)
  6. Navigation (déplacement des vaisseaux)
  7. Combat (résolution des engagements)
  8. Entretien (maintenance, salaires, énergie)
  9. Nouvelles (génération d'événements)

---

## 2. Économie

### 2.1 Ressources de base

16 matières (enum original). Les deux carburants composés **MeH** et **HeD** sont des **produits de recette** (non minables) ; tout le reste est minable aux derricks.

| Ressource | Symbole | Dérrick/j | Survey × | Minable |
|---|---|---|---|---|
| Fer | Fe | 2 | 1 | oui |
| Titane | Ti | 2 | 1 | oui |
| Aluminium | Al | 2 | 1 | oui |
| Carbone | C | 2 | 1 | oui |
| Cuivre | Cu | 2 | 1 | oui |
| Hydrogène | H | 1 | 1 | oui |
| Deutérium | D | 1 | 1 | oui |
| Méthane | CH₄ | 1 | 1 | oui |
| Hélium | He | 1 | 4 | oui |
| Palladium | Pd | 1 | 1 | oui |
| Platine | Pt | 1 | 2 | oui |
| Argent | Ag | 1 | 2 | oui |
| Or | Au | 1 | 3 | oui |
| Silice | Si | 2 | 1 | oui |
| Carburant MeH | MeH | — | — | non (H×2 + CH₄×2, toute base) |
| Carburant HeD | HeD | — | — | non (He×2 + D×2, orbite seule) |

> Valeurs : `data/resources.json` + RESEARCH §9. `MeH` : toute base planétaire ; `HeD` : usine en orbite uniquement.

### 2.2 Production minière

- Extraction/jour = `derrickRate` (table §2.1) × nombre de derricks ; le tout soumis au gisement et à son épuisement.
- Gisement : réserve `R` (t) ; à `R=0` la mine cesse (épuisé). Stock local plafonné à **50 000 t par ressource** (RE original).
- Prospection : un scan (sonde/dérrick) révèle une ressource au survey : `SurveyTicks = aléa(0..8) × surveyMultiplier` (table §2.1).

### 2.3 Transport pods/slots

- Un vaisseau = **`capacité` (t)** + **`slots`** ; un slot porte **une cargaison homogène** `{ ressource | item, quantité, masse unitaire }`.
- Types de slots :
  - **`supply`** : ressource en vrac (Fe, Ti, MeH…) — max **250/chargement** ;
  - **`tool`** : un item ayant le flag `toolPod` (derrick, OF frame, ACC, Grapple, AMA, R Frame…) — 1 type + quantité ;
  - **`cryo`** : personnel (1 slot = 1 équipe) — débloqué par le pod Cryo.
- **Masse = contrainte de charge** : `Σ (quantité × masse unitaire) ≤ capacité`. C'est elle qui borne le passage à l'échelle, pas le nombre de slots.
- **Carburant** : consommé à chaque voyage, `coût = f(distance, masse chargée)` ; **MeH** au sol / intra-système, **HeD** en orbite et FTL.
- Temps de manœuvre de la navette : atterrissage 2 j, décollage 5 j, réparation 2 j. Durées de voyage : intra-système `max(|Δordre|, 1)` j, inter-planètes `|Δordre|×4` j (différence d'ordre des corps, RE).
- **Transducteur de masse (TMT, tech exotique)** : envoi instantané mais coûteux — items matériels transportables uniquement (pas les êtres).

### 2.4 Routage & automatisation

- **Envoi manuel** : « envoyer X de R vers corps C » → le vaisseau décolle dès chargement complet (slots et capacité respectés).
- **Routes de ravitaillement** (pré-ACC) : une station déclare « si stock ≥ seuil, transporter X de R vers C » avec vaisseau affecté ; répété chaque tick.
- **ACC** (item auto-cargo d'un vaisseau) : charge/décharge automatique des slots `supply` d'un vaisseau attitré (max 250).
- **AOC** (`autoProduce`) : la production d'une usine tourne seule (déjà dans la table items).
- Implémentation sim de ces automatismes = EPIC future (hors GAMEPLAY v0.2).

---

## 3. Recherche

- Chaque scientifique produit `PR` points/jour (base 1, modifiable par compétence).
- Pool de points accumulé ; un projet coûte `C` points.
- Liste des catégories et exemple de technologies :

| Catégorie | Exemples de techs |
|---|---|
| Construction | Chapiteaux, stations orbitales, stations planétaires, dômes |
| Propulsion | Moteur chimique, ionique, fusion, FTL |
| Énergie | Solaire, fusion, antimatière, batteries haute densité |
| Industrie | Automates, raffinerie avancée, nanofab |
| Combat | Torpilles, boucliers, drones, MAD (volé) |
| Biologie | Mutations humaines, terraformation, eugénisme contrôlé |
| Exotique | Transducteur de masse, hypernavigation |

- **Découvertes** : bonus aléatoire « Eureka ! » qui donne +X% de points pendant N jours ou crédite un projet partiellement.
- **Rétro-ingénierie** : capturer une tech Méthanoïde la débloque (coût moindre).

---

## 4. Production / Manufacture

- Recette : `inputs` → `outputs`, une unité de temps de fabrication `T` (jours).
- Atelier : produit 1 lot/`T`, coût humain (salaires, logement).
- Automate : produit 2 lots/`T`, consomme `É` énergie + `M` maintenance/jour.
- Support de production : les recettes se font dans une **structure** (station orbitale, station planétaire, usine au sol).

### Exemples de recettes (v1)

| Produit | Inputs | T (jours) |
|---|---|---|
| Composant électronique | 1 Pd + 1 TR | 2 |
| Coque de vaisseau | 4 Ti + 2 C | 6 |
| Carburant LOx | 3 H₂O | 1 |
| Panneau solaire | 1 Ag + 1 C | 2 |
| Torpille | 1 U + 1 Ir | 3 |
| Module FTL | 3 D + 1 He3 + 2 TR | 10 |

---

## 5. Constructions

### 5.1 Structures

| Structure | Coût | Prérequis | Effet |
|---|---|---|---|
| Station orbitale | 50 Ti, 20 C, 10 Pd | Tech « Station orbitale » | hub logistique, défense, recrutement |
| Station planétaire | 30 Ti, 15 C | Station orbitale | liaison sol, fabrication |
| Mine (surface) | 10 Ti, 5 C | Aucun | extraction d'un gisement |
| Champs de derricks | 15 Ti, 5 Pd | Tech « Derricks » | extraction dans les mers/gaz |
| Raffinerie | 20 Ti, 10 Pd | Tech « Raffinerie » | purification / transformation |
| Chantier spatial | 40 Ti, 20 C, 10 Pd | Station orbitale | construction de vaisseaux |

### 5.2 Vaisseaux

| Vaisseau | Coût (t) | Vitesse (UA/j) | Capacité (t) | Rôle |
|---|---|---|---|---|
| Sonde | 2 Ti, 1 C | 0,5 | 1 | exploration |
| Cargo léger | 10 Ti, 5 C | 0,35 | 100 | transport |
| Cargo lourd | 40 Ti, 15 C, 5 Pd | 0,25 | 500 | transport |
| Briseur d'astéroïde | 25 Ti, 10 Ir | 0,2 | 200 | minage ceinture |
| Frégate | 20 Ti, 10 Pd, 5 Ir | 0,4 | 50 | combat |
| Croiseur | 60 Ti, 20 Pd, 10 Ir, 5 TR | 0,3 | 150 | combat lourd |
| Vaisseau FTL | 80 Ti, 30 C, 40 D, 20 TR | 20 (systèmes) | 300 | interstellaire |

---

## 6. Combat

- **Résolution** : chaque jour de bataille, attaquant vs défenseur, stats cumulées :

```
puissance_eff = Σ(unités_i × attaque_i) × (1 + bonus_tech)
défense_eff   = Σ(unités_j × défense_j + boucliers)
pertes_att    = f(défense_eff, effectifs, random)
pertes_def    = f(puissance_eff, effectifs, random)
```

- Un camp **se replie** si ses pertes dépassent 66 %.
- **Boucliers** d'une station : dégénèrent sous feu continu, régénèrent entre les batailles.
- **Capture** : si la flotte attaquante détruit ≥ 50 % de l'ennemi sans le disperser, chance `25 % × (tech_cyborg diff)` de capturer une unité techno.
- **MAD** (Mecanisme Auto-Destruction, volé aux Méthanoïdes) : sacrifie une unité pour infliger des dégâts massifs à une cible.

---

## 7. IA Méthanoïde

- Un **niveau de menace** `M` croît si le joueur attaque les Méthanoïdes (ou les ignore pendant trop longtemps).
- La flotte Méthanoïde se renforce selon `M` : apparitions de raids, puis d'invasions.
- Si `M` dépasse un seuil, les Méthanoïdes attaquent des stations « non défendues ».
- Le joueur peut « négocier » (pacte scénarisé, via comms) pour baisser temporairement `M`.

---

## 8. Événements scénarisés (timeline v0.1)

| Jour jeu | Événement |
|---|---|
| 1 | Début de partie, Terre-Ville opérationnelle |
| 15 | Premier contact avec une colonie lointaine |
| 60 | Découverte d'artefacts Mohammed sur la Lune (indice FTL) |
| 120 | Première incursion Méthanoïde (si M positif) |
| 300 | Message des Hydroïdes |
| (variable) | Déblocage possible de la fin de partie |

---

## 9. Difficultés

| Difficulté | Start ressource | Multiplicateur IA |
|---|---|---|
| Découverte | +50 % | 0,6 |
| Commandant | +20 % | 1,0 |
| Vétéran | 0 % | 1,4 |
| Méthanoïde | -20 % | 1,8 |