# RECHERCHE — L'original *Deuteros* : ce que le jeu faisait vraiment

> Rapport de recherche — 2026-09-15 (round 1 web + round 2 : manuel original OCR, code source du remake, reviews magazines, walkthrough Millennium 2.2)
> Source primaire pour **concevoir** notre jeu : règles, principes, systèmes et chiffres de *Deuteros: The Next Millennium* (Ian Bird, Activision, 1991), recoupés avec les sources du remake communautaire. Ce n'est **pas** une spec : c'est de la matière factuelle à confronter à nos docs (PFD / GAMEPLAY / DATA).
> Statut de fiabilité : chaque section indique ses sources. Les valeurs chiffrées reproduites d'une page de fan sont à re-valider sur le jeu original avant de figer une règle.

---

## 1. Méthode

Fiche, gameplay, lore et chiffres croisés depuis 10+ sources (voir §16) — round 1 (web) puis round 2 (manuel original OCR, code source du remake, reviews magazines complètes, walkthrough Millennium 2.2) :

- **Wikipedia EN / FR / DE** — vue d'ensemble, scénario, conditions de victoire, réception.
- **dixiak.com/deuteros** — article d'un joueur d'époque (Atari ST) : histoire de la production, mécaniques profondes, mini-guide, captures d'écran commentées.
- **deuteros.com** — site officiel du remake *Deuteros–Resurrected* (pixel-perfect) : liste des systèmes réimplémentés (utile comme **checklist des écrans/jeux de règles du jeu original**).
- **oocities.org/yotisrx7** — tableau des **gisements par corps céleste**, tableau des **recettes de production**, liste des **8 segments** (cryptographie Hydroides).
- **Track's Mini Guide** (Wayback de amigagames.com) — chemin stratégique type et astuces connues (reconquête de bases, cheat mode).
- **Kimimi (blog)** — retour d'expérience joueur : granularité des actions (8 pièces de cadre par station, un seul emplacement de pod par navette…).
- **Manuel original** (archive.org, `source:cad8ea82ee`) — 50 pages scannées, OCR tesseract complet : lore définitif (2200→3100 AD), crédits, Master Control Panel, Departmental Control Panel, Ship Control, guide pas-à-pas usine orbitale, glossaire.
- **Code source du remake** (GitHub `tonyoddspherecom/Deuteros-Resurrected`, br. `develop`, `source:f53f5ba3fa`) — CoreData.cs (4 141 lignes) : 46 items avec BuildRequirements, ResearchItem(item, tech, order), PersonNames (~146), PlanetDistanceList, ResourceLevels_Survey_Multiplier, ResourceRate_Per_Derrick, algorithme de production.
- **Reviews magazines complètes** (5 numéros, `source:d96f254a3d`) : Amiga Format n°21 04/1991 (95 %), Amiga Power n°3 07/1991 (89 %), CU Amiga 08/1991 (70 %), Zero n°16 02/1991 (92 %), Amiga Joker 09/1991 (71 %).
- **Walkthrough Millennium 2.2** (GameFAQs, `source:28aea917b1`) : interface complete (CTR, toolbar 10 boutons, craft roster color-coded, database, combat 3D simple, 15 ressources).

---

## 2. Fiche de référence

| Champ | Valeur |
|---|---|
| Titre | *Deuteros: The Next Millennium* |
| Auteur | **Ian Bird** (design, programme), graphismes **Jai Redman**, musique **Matt Bates** (ST : **Martin Walker**), tests **Dave Cur**, manuel Marjacq Micros (crédits confirmés par OCR du manuel original, `source:cad8ea82ee`) |
| Éditeur | Activision (avec Marjacq Micros) |
| Année / plateformes | 1991 — Amiga & Atari ST (2 disques NDOS, 1 Mo RAM min.) |
| Genre | Jeu de gestion / stratégie temps réel avec pause |
| Prédécesseur | *Millennium 2.2* (1989) — Deuteros en est la suite "800 ans après" |
| Mode | Solo, temps discret, déterministe |
| Langues | Anglais, français, allemand |
| Réception visuelle | Amiga Format **95 %**, Zero **92 %**, Amiga Power **89 %**, CU Amiga **70 %**, Amiga Joker **71 %** (détails §16) |
| Particularité | Remake pixel-perfect communautaire en cours (*Deuteros-Resurrected*, repo GitHub public depuis 2024) |

Sources : Wikipedia EN/FR/DE ; dixiak ; deuteros.com ; manuel OCR ; CoreData.cs.

---

## 3. Le genre et sa promesse

> « L'objectif est d'exploiter et de gérer les ressources des planètes, d'explorer le système solaire et plus loin encore, et finalement de débarrasser la galaxie des Méthanoïdes. »

- **Gestion + exploration + guerre**, interface pointée souris, graphismes sobres (images statiques), bande-son minimaliste : la valeur est dans le **système**, pas dans le spectacle.
- La progression se lit en **3 actes** : système solaire (acte 1) → voyager vers Proxima (acte 2) → conquérir 7 autres systèmes (acte 3). Le **FTL est à mi-jeu**, pas au début — notre ROADMAP met l'emphase sur le système solaire en v1, cohérent avec l'original.
- Sources : fr.Wikipedia (réalisation, genre), en.Wikipedia (3 actes), dixiak.

---

## 4. Principes de design qui ont fait l'addiction

Ces principes sont les **invariants** à préserver dans un spiritual successor (à comparer à VISION.md) :

1. **Timers entrecroisés** — « À n'importe quel moment, plusieurs choses étaient en attente : un chantier orbital à 2 jours d'un croiseur, des chercheurs à 6 jours d'une nouvelle propulsion, un transport à 4 jours de Titan avec du titane. Rarement un point d'arrêt propre. » → le rythme du jeu = plusieurs horizons simultanés.
2. **Progression à enjeu réel** — population fixe de **6 000 citoyens** ; équipages expérimentés = des heures de jeu. Perdre une station pleine d'experts est un vrai coup dur.
3. **Courbe d'automatisation** — le joueur commence en **navetteur manuel** (charger/décharger à la main), puis les automates, ordinateurs et le TMT prennent le relais progressivement.
4. **Contenu révélé en continu** — le jeu « grandit » (le système solaire n'était pas la fin) et la bascule manuel→automatique « faire tourner ce qu'on a construit à la main » est le plaisir de fin de partie.
5. **Pas de filet de sécurité** — partie perdable, erreur précoce = déclin lent et irréversible des heures plus tard. Difficulté volontaire, sans instructions ligne à ligne.
6. **Milestones** déclenchent la recherche → l'histoire **pilote** l'arbre tech, pas seulement les coûts.

Sources : dixiak ; Kimimi.

---

## 5. Le système de temps

- Jeu à **ticks discrets** (pas de boucle frame-dépendante pour la simulation ; le monde avance par pas de **jour**).
- Plusieurs **compteurs simultanés** (constructions, recherche, transport) — les journées avancent au pas choisi par le joueur (le jeu a des vitesses réglables + pause).
- Pause utile pour préparer les ordres ; les ordres sont donnés en pause et résolus ensuite (notre ADR-002 reprend ce principe).
- Sources : en.Wikipedia ("interlocking timers"), PFD original §3.1 de nos docs (déjà aligné), dixiak.

---

## 6. Population & équipages (l'élément "humain")

- **Piscine fixe de 6 000 citoyens** : on **entraîne** des équipes dans 3 catégories :
  - **Producers** (Producteurs) — fabriquent, exploitent, construisent ;
  - **Researchers** (Chercheurs/Scientifiques) — font avancer la recherche ;
  - **Marines** (Pilotes/combattants) — opèrent les vaisseaux.
- **Expérience & niveaux** : plus une équipe est utilisée, plus elle monte en niveau (3 niveaux). Conditions :
  - certaines inventions ne se fabriquent qu'avec un producteur au rang **Expert** ;
  - un pilote **Admiral** change significativement l'issue des batailles.
- **Équipage = ressource rare** : recruter/former prend du temps réel ; les équipages expérimentés sont précieux et ne se remplacent pas.
- Une nouvelle base planétaire exige **d'y loger des équipes** de producteurs pour y fabriquer navettes et derricks.
- Astuce connue de l'époque : « il suffit en pratique d'1 équipe de production pour tenir le jeu » — la preuve que **l'automatisation est le vrai sujet économique**.

Sources : en.Wikipedia ; dixiak ; Track's Mini Guide.

---

## 7. Économie : ressources

L'original comporte **16 ressources/matériaux** (une colonne SQL conservée par les fans) :

`Iron, Titanium, Aluminium, Carbon, Copper, Hydrogen, Deuterium, Methane, Helium, Palladium, Platinum, Silver, Gold, Silica, MeH Fuel, HeD Fuel`

- **2 carburants composés** : **MeH Fuel** (méthane + hydrogène) et **HeD Fuel** (hélium + deutérium).
- « N'importe quelle planète ou lune peut produire du carburant si elle a en stock les matières adéquates » → la production de carburant est **locale et conditionnelle**.
- Les gisements sont **répartis par corps céleste** (voir §8) : toutes les matières ne sont pas partout → le transport et le séquençage de l'exploitation sont le cœur du jeu.
- Ressources "exotiques" hors-Zone-Terre (platine, argent…) en ceinture et systèmes lointains (cf. section « asteroids not found on Earth (silver, platinum) »).

> ⚠️ **Écart avec nos docs** : GAMEPLAY §2.1 liste 10 ressources (Ti, C, Pd, Ag, Ir, H₂O, D, U, He3, TR). L'original utilise fer, aluminium, cuivre, hydrogène, méthane, platine, or, silice et deux carburants composés. **Décision à prendre au moment de figer DATA.md** : garder notre modèle épuré ou se rapprocher des 16 de l'original.

---

## 8. Corps célestes & gisements

L'original modélise **160 corps** répartis en **9 systèmes stellaires** (Soleil + 8 extrasolaires), chacun avec un nombre variable de planètes et de lunes. La matrice de gisements a été transcrite à partir de `source:db8832c1ad` (oocities/Wayback) puis vérifiée en croisant avec le code du remake (`source:f53f5ba3fa`) : sur 151 corps communs, les dépôts concordent à l'exception des carburants (MeH/HeD non modélisés dans le remake) et 3 écarts réels minimes.

**Dépôts par système** (16 ressources, présence notée) :

| Système | Nb corps | Nb avec gisements | Remarque |
|---|---|---|---|
| Soleil | 42 | 42 | Complet : Mercure→Charon + Astéroïdes + Decuria |
| Proxima | 4 | 4 | Atlantic, Pacific, Barent, Baltic (segment Atlantic) |
| Centauri | 12 | 12 | Chiron→Cadmus (segment Chloé) |
| Barnard | 28 | 28 | Mycenae→Cuzco (segment Babylone) |
| Lalande | 6 | 6 | Nero→Hadrian (segment Hadrian) |
| Sirius | 2 | 2 | Romulus, Remus (segment Romulus) |
| Cygni | 34 | 34 | Helios→Plasios (segment Césius) — le plus gros système |
| Procyon | 10 | 10 | Cambrian→Silurian (segment Pliocène) |
| Tau Ceti | 22 | 22 | Alpha→Psi (segment Alpha) |

**Corps les plus riches** (> 9 ressources) : Uranus (10 : Fe, Ti, Cu, H, D, CH₄, He, Si, MeH, HeD), Selene / Cygni (10), Earth (9), Triton (9), Titania (9), Tethys (9), Phoebe (9), Oberon (9), Neptune (9), Leda (9).

**8 colonies Méthanoïdes** : un par système extrasolaire, détectable par le compteur `methanoid_colony` dans la matrice.

**8 segments Hydroïdes** : chaque système extrasolaire contient **exactement un corps porteur de segment** (condition de victoire) :

| Corps | Système | Segment n° |
|---|---|---|
| Atlantic | Proxima | 1 |
| Chloé | Centauri | 2 |
| Babylone | Barnard | 3 |
| Hadrian | Lalande | 4 |
| Romulus | Sirius | 5 |
| Césius | Cygni | 6 |
| Pliocène | Procyon | 7 |
| Alpha | Tau Ceti | 8 |

> Tous les corps n'ont pas de gisement de chaque matière → c'est cette rareté qui structure la boucle logistique. Le système Cygni (34 corps) est le plus vaste et offre la plus grande diversité de ressources ; Sirius (2 corps) est le plus restreint.

> *Note : la nomenclature de Core Data CS utilise des lunes comme corps indépendants (parentisé via `ParentStar`). Le « MOON INDEX » dans Notes.txt du remake (`source:f53f5ba3fa`) ne correspond pas directement aux indices de la matrice oocities pour Jupiter/Saturne, Ur/Neptune/Pluton — les deux systèmes de numérotation coexistent.*

---

## 9. Production : il y a des vrais coûts et masses

L'original attribue à chaque item un **coût en ressources** (16 colonnes) et une **masse** (charge transportable) — le passage à l'échelle n'est pas qu'une question de recette mais de **capacité de transport** (pods, châssis, carburant).

Transcription **vérifiée croisée** contre le code source du remake (`CoreData.cs`, branche `develop`) — les marques ~~texte~~ indiquent des corrections apportées par le cross-check. Coûts et masses du remake concordent avec la description originale en cas de divergence :

| # | Item | Tech | Orbite | Coût (X N = quantité) | Masse | Flag |
|---|---|---|---|---|---|---|
| 1 | Unknown Item | 1 | — | — | 2 000 | — |
| 2 | Derrick (Resource Mining Rig) | 2, ord. 1 | non | Fe×3, Ti×4, ~~C×1~~ (≠ Cu) | 8 | ToolPod |
| 3 | S Chassis | 3, ord. 1 | non | Fe×20, Ti×50, Al×35, C×10, Cu×15 | 130 | — |
| 4 | S Drive | 4, ord. 1 | non | Fe×6, Ti×10, ~~Al×4~~ (≠ Cu) | 20 | — |
| 5 | MeH Fuel | 5, ord. 1 | non | H×2, CH₄×2 | 3 | — |
| 6 | OF Frame | 6, ord. 1 | non | Fe×55, Ti×80, Al×50, C×25, Cu×40 | 250 | ToolPod |
| 7 | Supply Pod | 7, ord. 1 | non | ~~Ti×2~~, Al×1, Cu×1 | 4 | — |
| 8 | Tool Pod | 8, ord. 1 | non | ~~Ti×2~~, Al×1, Cu×1 | 4 | — |
| 9 | Cryo Pod | 9, ord. 1 | non | ~~Ti×2~~, Al×1, Cu×1 | 4 | — |
| 10 | Pulse Blast Laser | 10, ord. 3 | **oui** | Pd×120, Pt×30, HeD×600 | 750 | — |
| 11 | IOS Chassis | 11, ord. 2 | **oui** | Fe×100, Ti×250, Al×175, C×50, Cu×75 | 650 | — |
| 12 | IOS Drive | 12, ord. 2 | **oui** | Fe×30, Ti×50, Cu×15 | 95 | — |
| 13 | SCG Chassis | 13, ord. 3 | **oui** | Fe×250, Ti×600, Al×400, Cu×185, Pt×100, Ag×100, Au×50 | 1 685 | — |
| 14 | SCG Drive | 14, ord. 3 | **oui** | Fe×50, Ti×100, Cu×30, Pd×50, Pt×25, Ag×10 | 265 | — |
| 15 | HeD Fuel | 15, ord. 3 | **oui** | He×2, D×2 | 3 | — |
| 16 | ACC (Auto Cargo Computer) | 16, ord. 3 | non | ~~Fe×2~~, Ti×2, Al×1, C×1, Cu×1 | 8 | ToolPod |
| 17 | AOC (Auto Operations Computer) | 17, ord. 3 | **oui** | ~~Fe×4~~, Ti×4, Al×1, C×2, Ag×1 | 8 | — |
| 18 | BandAid | 18, ord. 3 | **oui** | Fe×30, Ti×30, Al×30, C×30, Cu×30 | 150 | ToolPod |
| 19 | SDM (Self Destruct) | 19, ord. 3 | **oui** | Al×5, Cu×1, Pd×1, Pt×2 | 9 | — |
| 20 | Grapple (Hydraulic) | 20, ord. 3 | **oui** | Fe×2, Ti×2, Cu×1 | 5 | ToolPod |
| 21 | DFCC | 21, ord. 3 | **oui** | Ti×2, Al×1, C×1, Cu×1, Pt×2, Au×1 | 8 | ToolPod |
| 22 | AMA (Asteroid Mining Attach.) | 22, ord. 3 | **oui** | Fe×6, Ti×70, Al×10, C×30, Cu×2, Pt×5, Ag×1 | 124 | ToolPod |
| 23 | Hyperlight | 23, ord. 3 | **oui** | — (coût 0) | 124 | — |
| 24 | MTX (Mass Transceiver) | 24, ord. 3 | **oui** | Ti×500, Cu×82, Pd×100, Au×40 | 722 | — |
| 25 | MFL (Methanoid Fusion Laser) | 25, ord. 3 | **oui** | Cu×5, Pd×10, Pt×10 | 25 | — |
| 26 | R Frame (Resource Station) | 26, ord. 3 | **oui** | Fe×35, Ti×50, Al×20, C×15, Cu×30, Pt×25, Ag×10, Si×15 | 200 | ToolPod |
| 27 | Prejudice Torpedo Launcher | 27, ord. 3 | **oui** | Ti×96, Al×45, Cu×10 | 151 | — |
| 28 | COMMSPOD | 28, ord. 3 | **oui** | Al×2, C×1, Cu×1, Au×1 | 5 | ToolPod |
| 29 | IOS Drone | 29, ord. 3 | **oui** | Fe×120, Ti×120, Al×120, C×15, Cu×55, Pd×30, Pt×30 | 490 | — |
| 30 | SCG Drone (Star Drone) | 30, ord. 3 | **oui** | Fe×300, Ti×200, Al×300, Cu×100, Pd×90, Pt×80, Ag×95, Au×50 | 1 015 | — |
| 31 | Prison Pod | 31, ord. 3 | **oui** | Ti×2, Al×1, Cu×1, Pt×2 | 7 | ToolPod |
| 32 | Sonic Blaster | 32, ord. 3 | **oui** | Ti×1 000, Al×1 500, Cu×800, Pd×1 200, Ag×3 000, Au×3 000 | 1 065 | ToolPod |

**Rappel des 16 ressources** (enum `ItemTypes`, valeurs 1-16) : Iron, Titanium, Aluminium, Carbon, Copper, Hydrogen, Deuterium, Methane, Helium, Palladium, Platinum, Silver, Gold, Silica, MeH Fuel, HeD Fuel.

**Règles de production (carburants)** — confirmées par le walkthrough Millennium 2.2 (`source:28aea917b1`) et le manuel OCR (`source:cad8ea82ee`) :
- **MeH Fuel** (H×2 + CH₄×2) : produit sur **n'importe quelle base planétaire** (non orbital) ; tout corps peut en produire s'il a les matières adéquates en stock.
- **HeD Fuel** (He×2 + D×2) : produit **uniquement en orbite** (usine orbitale) ; nécessite accès à hélium + deutérium.
- Les deux carburants sont **consommés à la construction** et non utilisés comme « réservoir réutilisable » — ils driver la logistique d'approvisionnement de chaque usine.

**Corrections apportées** (source `source:f53f5ba3fa` — `CoreData.cs` br. `develop`) :
- Item 2 (Derrick) : cuivre → **carbone**.
- Item 4 (S Drive) : cuivre → **aluminium**.
- Items 7-9 (Pods) : fer → **titanium**.
- Item 16 (ACC) : fer → **titanium** ; +carbone ; masse 8 (≠ 5).
- Item 17 (AOC) : fer → **titanium** ; +carbone ; +argent.
- Item 26 (R Frame) : ~~H 25, D 10, *15*~~ → **Pt 25, Ag 10, Silica 15**.
- Item 30 (Star Drone) : Ti 300→200, Al 100→300, Cu 80→100, Pd 95→90, +Pt 80, Ag 95 (confirmé).
- Items 25 (MFL), 31 (Prison Pod), 32 (Sonic Blaster) **ajoutés** (absents de la table d'origine).

**Algorithme de production** (Factory.cs, corrigé round 2 — remplace la valeur `/321` consignée avant lecture du code) : `v = (num_engineers << rank) × object_multiplier / 801`. Le facteur « engineers » est non-linéaire (bitshift) — un expert produit exponentiellement plus qu'un débutant. Détails du cycle, voir §14c.

**Variables de simulation** extraites du code :
- `ResourceLevels_Survey_Multiplier` : He=4, Pt=2, Ag=2, Au=3, toutes les autres=1.
- `ResourceRate_Per_Derrick` (liste complète, CoreData.cs lignes 1115-1130) : Fe=2, Ti=2, Al=2, C=2, Cu=2, silica=2, H=1, D=1, CH₄=1, He=1, Pd=1, Pt=1, Ag=1, Au=1.
- `ResearchMultiplier` : défaut **64** (uniquement items « drivés » par la recherche).

Enseignements de design utiles (indépendants des valeurs exactes) :

- **2 paliers de construction** : « usine au sol / toute » vs « **orbite seule** » — tout ce qui est gros (châssis I et G, drives stellaires, drones) **ne se construit qu'en orbite**.
- Les **vaisseaux sont des drones** (IOS = Interplanetary Ops, Star Drone = stellaire) — le combat est drôné, pas piloté en 3D (rejoint PFD : drones).
- **Pods modulaires** : Supply / Tool / Cryo / Comms (+ Prison) — un vaisseau transporte des pods, un seul dans l'emplacement outil à la fois selon Kimimi.
- Le **T.M.T.** (transducteur de masse) coûte très cher (Ti 500+, masse 722) → c'est une grosse étape d'infrastructure, à la cohérence de GAMEPLAY §2.3.
- L'item **Hyperlight** (coût 0) évoque une **tech-recherche** en soi (§ "recherche par milestone").

Sources : oocities ; Kimimi ; Track's Mini Guide.

---

## 10. Transport & logistique

- Le joueur ferraille d'abord **à la main** : ordonner chaque pièce, la charger dans la navette, la déployer, revenir… (ex. Kimimi : **8 cadres de cadre d'usine orbitale**, chargés un par un dans l'unique emplacement pod de la navette).
- Toute la phase médiane = **répartir la production** entre planètes et usines avec navettes + vaisseaux longue portée.
- De grandes infrastructes (bases planétaires) exigent **équipages expérimentés** transportés + matériaux ferraillés.
- **TMT** : téléporte la production **des champs de derricks à la station orbitale, puis n'importe où** — met fin au ferraillage manuel (items transportables uniquement, pas les êtres).
- **Carburant** requis par masse/distance ; deux mélanges (MeH, HeD) selon la propulsion.

> ⚠️ **Écart avec nos docs** : GAMEPLAY §2.3 prévoit des cargos par tonnage. L'original pense en **pods + châssis + carburant** (items physiques empilés dans des slots, pas des tonnes abstraites). À arbitrer : nombre de pods, slots, et la masse comme contrainte dominante ou accessoire.

---

## 11. Recherche

- La recherche produit des **plans** pour la production ; le joueur peut **booster** la recherche par des **découvertes** (notre §3 GAMEPLAY a déjà « Eureka! »).
- Des événements « **milestones** » déclenchent les nouvelles technologies à rechercher → **l'Histoire gate la tech**, pas seulement les points (à comparer PFD §3.3).
- La **rétro-ingénierie Méthanoïde** est un levier majeur : on ne *recherche* pas tout, on **capture** aussi (MAD, TMT).
- Les **chercheurs expérimentés** sont indispensables aux projets avancés (rang Expert).

Sources : en.Wikipedia ; fr.Wikipedia ; dixiak.

---

## 12. Factions & narration

**Arrière-plan (résumé fr.**) :
- En **2200**, un astéroïde s'écrase dans le Pacifique, anéantit la civilisation ; survit une colonie de chercheurs sur la **Lune**.
- Millénaires plus tard : la Terre est re-colonisable ; colonies/mutations **humaines** créées pour d'autres mondes sont oubliées.
- Les deux grandes races mutantes évoluées : **Hydroïdes** (aspect repoussant, « les traits les plus déplaisants de l'homme ») et **Méthanoïdes** (calmes, intelligents, passionnés de musique). Prétexte du conflit : un concert de **Ulta ben-Cthug** que l'ambassade hydroïde fuit (« souffrance physique ») → guerre d'un siècle → les Hydroïdes sont acculés et probablement exterminés.
- Sur Terre : **Docteur Darrill Trout** (née XXIXe s.) publie *« Principes »*, thèse en **26 volumes** sur la conception de vaisseaux ; projet « Terre-Ville » ; en **3100 ap. J.-C.** la Ville est terminée → l'opération **Deuteros** commence.
- Le manuel confirme la chronologie (OCR p.2, 5, 6, 50, `source:cad8ea82ee`) : astéroïde 2200 AD → Lune re-peuplée vers 2400 → « By the year 3100 AD the City was complete ». Trois annexes du manuel : Addendum A « Principles » (Vol XXI), Addendum B « Glossary », Addendum C (loading/install). L'opération Deuteros = reconquérir les systèmes d'où les Méthanoïdes ont chassé l'humanité.
- **Interface du manuel** (équivalent anglais) : Master Control Panel (Advance Time, Disk Access, News Bulletins, Earth City, Master Control, Deposit Analysis, Stocktaker) ; Departmental Control Panel (Production, Stores, Resource, Training, Research, Service Bays, Shuttle) ; Ship Control (Service Ship, Dock/Land/Launch, Pod Controls, Switch View, Engage/Disengage Drive, Set Course avec satellite/system charts + ETA estimée, vitesse max 0.3c) ; raccourci « right mouse button » = icône Master Control.

**En jeu** :
- Les **Méthanoïdes** dominent l'espace trans-neptunien ; au contact ils **se disent ouverts au commerce**, mais éconduisent vos vaisseaux (« il nous faut la place » — en fait ils **assemblent une flotte**).
- Leur commerce = **échanger des matériaux minés** contre ce dont vous avez besoin (laser…).
- Vérité de joueur d'époque : les Méthanoïdes **gagnent vos deux premières parties** ; perdre est intégré au scénario.
- Les **Hydroïdes** contactent le joueur (crypto-affichée) : « Nous avons transmuté un don aux Méthanoïdes. Ils l'ont démonté, les segments sont éparpillés dans 8 étoiles. »

> ⚠️ **Écart/scénario** : nos docs PFD §1.2 et GAMEPLAY §8 ont déjà une timeline (jour 15 « premier contact », jour 300 « message des Hydroïdes ») compatible, mais **les Hydroïdes n'existent quasiment pas** dans notre GAMEPLAY (une ligne). C'est un fil narratif à travailler si on veut le garder.

Sources : fr.Wikipedia ; oocities (cryptographiques) ; dixiak ; en.Wikipedia.

---

## 13. Guerre, victoire et défaite

**Déclenchement** :
- La guerre Méthanoïde est **déclenchée** par l'acteur : **6ᵉ usine orbitale** construite, **ou** obtention du laser Méthanoïde par le commerce.
- C'est une **conséquence lisible** de vos choix → tension gérée, pas aléatoire.

**Conduite** :
- Fabriquer des **drones de combat** ; copier le **mécanisme d'auto-destruction** ennemi ; le joueur peut se le faire **voler en retour**.
- Les bases ennemies capturées se **reconquièrent** (chemin du mini-guide : assaut → base explose → récupérer la destruction → nouvelle base → poser pied, désactiver le « panic button », 2 leviers, Stores → développer le TMT). Les vaisseaux capturés / bases reconquises donnent de la **technologie**.
- L'ordre d'explosion : attaquer une base ennemie = elle **se fait sauter** ; il faut ensuite récupérer/installer les mesures anti-destruction.
- Le **TMT** devient crucial pour **évacuer argent & palladium** avant la capture de planètes.
- Les Méthanoïdes « remplacent systématiquement vos 8 derricks d'un corps par 2 derricks en ruine » quand ils prennent une planète (détail mémorisé par les vétérans → la « perte de productivité » est l'essence de la défaite).

**Victoire** :
- Après reconquête du système solaire : messages extraterrestres + plan **FTL** → **SCG (Star-Class Galleons)**, aller à **Proxima** puis **7 autres systèmes** ; tech « Hyperspace travel » acquise en route.
- **8 systèmes conquis + 8 pièces de la machine mystère récupérées** (segments en orbite autour de : **Atlantic, Chloé, Babylone, Hadrien, Romulus, Césius, Pliocène, Alpha**) → victoire + clip final.

> ⚠️ **Écart avec nos docs** : notre GAMEPLAY §6 prévoit « MAD » (que l'original nomme S.D.M. en anglais / MAD en fr) et le « retrait à 66 % de pertes ». Nos docs ont déjà « capture techno » et « boucliers ». La **contrainte de défaite par perte d'infrastructure** (pas seulement perte de vaisseaux) est absente — à intégrer à la définition de la défaite (§3.8 PFD).

Sources : en.Wikipedia ; fr.Wikipedia ; dixiak ; oocities ; Track's Mini Guide.

---

## 14. Écrans & systèmes du jeu original (checklist)

D'après le remake pixel-perfect (deuteros.com), le jeu original contient (statut de réimplémentation du remake porté ici) :

| Système / écran | Remake | Équivalent dans nos docs PFD |
|---|---|---|
| System Menus | ✓ | §2.1 + barres |
| Data Storage / Save-Load | ✓ | §3.9 |
| Base Management | ✓ | §2.2 Planète |
| Mining | ✓ | §2.3 Mines |
| Personnel / Training | ✓ | §2.6 Efforts/Personnel |
| Research | ✓ | §2.4 Recherche |
| Manufacturing / Production | ✓ | §2.5 Production |
| Global Management |  | §2.11 Global |
| Bay & Dock |  | §2.7 Bay & Dock |
| Flight & Navigation |  | §2.8 Flottes |
| Vehicles & Logistics |  | §2.8 |
| Long-Range Transfers |  | §2.4 Transmissions |
| News System |  | §2.10 News |
| Combat / Combat Simulation |  | §2.9 Combat |
| Comms & Logs |  | §2.10 |
| Time & Events System |  | §3.1 + §3.7 |
| World Map |  | §2.1 Vue système |
| Game Over Win/Loss |  | §3.8 |

**Alignement global** : la cartographie écran-par-écran est en réalité **très proche** de notre PFD — notre découpe (Vue système, Planète, Mines, Recherche, Production, Personnel, Dock, Flottes, Combat, News, Global, Time) reflète déjà la structure de l'original.

---

## 14b. Reviews magazines & interface originale (round 2)

> Toutes les valeurs ci-dessous sont issues de la lecture intégrale des pages originales (`source:d96f254a3d`, `source:28aea917b1`) — première source primaire validée après le manuel OCR.

**Réception critique détaillée** :

| Magazine | Date | Score | Auteur | Pages | Remarques |
|---|---|---|---|---|---|
| Amiga Format n°21 | 04/1991 | **95 %** | Trenton Webb | 54-56 | £24.99, « addicting stuff », très complet |
| Zero n°16 | 02/1991 | **92 %** | Tim Ponting | 36-37 | ACC/AOC détaillés, icônes Master/Orbital, référence à « 3100 AD » |
| Amiga Power n°3 | 07/1991 | **89 %** | Colin Campbell | 30-31 | « seven systems » (erreur → 8), 8 rigs max, « iron and oil », ~70h |
| CU Amiga | 08/1991 | **70 %** | — | 105 | Graphics 60/Sound 50/Last. 50/Playability 75, « lacking depth » |
| Amiga Joker | 09/1991 | **71 %** | — | 80 | Grafik 61/Sound 22/Handhabung 75/Idee 73/Dauer 71/Preis 63, ~99 DM |

→ Le score le plus bas (CU Amiga, 70 %) pénalise la durée de vie perçue (Lastability 50), pas le système en soi (Playability 75). Le jeu « profond mais exigeant » → notre audience cible est la même.

**Interface héritée de Millennium 2.2** (confirmation walkthrough, `source:28aea917b1`) :
- **CTR (C&T Rating)** : indicateur de résistance de la station, barre verte→rouge → risque d'auto-destruction si trop basse.
- **Toolbar** : 10 boutons (Moon Base, Colonies, Craft Roster coloré vert/jaune/rouge selon état, Database rouge/jaune).
- **Derniers 8 bulletins** : « last eight announcements » à tout moment, importance vitale pour piloter sans scatter.
- **Combat** : mini-jeu 3D simple (pas de fond noir, vaisseau au centre, cibles virevoltantes) — notre « pas arcade » est cohérent.
- **15 ressources** (contrairement à 16 du tableau oocities) : seule manque le MeH Fuel ou HeD Fuel en minable ; seuls silver, uranium (D ?) et chromium ne sont pas minables sur Lune/Ceinture.

---

## 14c. Mécaniques de simulation extraites du code du remake (round 2, passe code)

> Valeurs lues dans le code source du remake (`branche develop`, fichiers `Objects/` + `Platform/Screens/` — même repo `source:f53f5ba3fa`). Ce sont les **règles exactes** du moteur derrière l'original ; à re-flouter/doser dans notre sim.

**Jourée / boucle de temps** (`GameCore.cs`) :
- Tick minimal **500 ms** ; un écran ouvert ne bloque pas le monde (les usines tournent même écran de production ouvert).
- Abonnés à `DayPassed` : `Production.UpdateProduction`, `ShipInterior.UpdateShips`, `Research.UpdateResearch`, `EnemyDroneBuilder.BuildDrones`, `MTX.UpdateMTX`.
- La base terrestre se construit en **2 pièces** (`BaseBuildParts == 2` = base pleinement érigée, condition du minage et des drillers).

**Production — cycle complet** (`Factory.cs` + `Production.cs`) :
- Départ : `Production_Value = ResearchValue` (charge initiale), item `Active = true`.
- Par jour, `v = (Builder.Count << Builder.GetLevel()) * Object_Multiplier / 801` ; si AOC : `v = 128` (pas d'ingénieurs).
- `Production_Value += v` ; **wraparound 8 bits** à 255 (`& 0xFF`) → à chaque wrap, `Production_Complete++` ; **terminé à `Production_Complete == 4`** → item produit, `ProdCycle = 0`, `ActionsTaken++` de l'équipe.
- Recettes vérifiées par item courant vs **côté du stock** (1 seul item « actif » par usine à la fois ; bascule cliquable).
- **Changement d'item en cours de prod** : le travail en cours est **perdu** (la charge retourne à son `ResearchValue`, item désactivé).
- **AOC** (`Auto Operations Computer`) : produit **sans ingénieurs ni ressources requises**, mais **1 seul exemplaire** (reproduction AOC impossible) ; une fois l'item AOC produit, l'usine passe en mode automatique et l'équipe est libérée.
- **Auto-produce** (ex. ETFs) : produit **3 unités / 2 jours** (flip toggle) dès que les matières sont là.
- Blocage par **OrbitOnly** (technologie construisible seulement en orbite) et par **rang d'équipe** (`Builder.GetLevel() < TechLevel` → refus « Team Leader Must Be Rated »).

**Recherche** (`Research.cs` + `ResearchItem.cs`) :
- Jamais en parallèle sur Terre : **1 seul projet courant** (`Earth.CurrentResearchItem`), mené par `Earth.ResearchStaff`.
- Déblocage : `ResearchStaff.GetLevel() >= TechLevel` de l'item.
- Progression : `v = (teamSize << level) * ResearchMultiplier / 801`, additionnée à `ResearchValue`, **wraparound 8 bits** ; à chaque wrap `ResearchPercentageComplete += 11` (plafonné 100). → ~10 wraps ≈ 100 %, d'où `ResearchValue` initial (255 max) comme compteur de jours-cadence.
- Terminé à 100 % : `Researched = true`, l'item devient `Locked = false` (disponible en production), `ResearchOrder` attribué dans l'ordre.
- L'équipe recherche **perd ses skills** si on la retire ? (à vérifier : `ActionsTaken` incrémenté à fin, rang calculé sur `ActionsTaken`, pas de dégradation au maintien en place).

**Combat** (`BattleLogic.cs` — 712 lignes, mode combat 2D) :
- `Power = (Pilot.Level + 4) * DroneCount` côté joueur ; côté ennemi dérivé de ses drones.
- Résolution par **ratio de puissance** avec table de facteurs (`battleFactors`) : rapports ≥ min(7, ratio oppose) → **victoire quasi certaine** ; ratio faible → défaite / retraite.
- **`AttackTrigger`** : l'ennemi engage quand ses drones ≥ seuil ; ~`travel + rand(63)+1` jours.
- **PTL** (Prejudice Torpedo Launcher) : **coût 100 Fuel HeD** au tir ; dégâts massifs asymétriques contre les concentrations ennemies.
- Sortie de combat : perte de drones côté battu ; retraite possible (l'ennemi « flee » sous un seuil de flotte).

**Minage** (`Planet.cs` + `Earth.cs` + `Asteroid.cs`) :
- Prerequis : `Derricks > 0 && BaseBuildParts == 2 && !BaseDamaged` ; la **Terre ne mine que les jours pairs**.
- **Survey** (nouvelle ressource par scan) : `SurveyTicks = random(0,8) × ResourceLevels_Survey_Multiplier` puis `GroundAmount = random(0,32768) × multiplier & 0x7FFF`.
- Rétro : `mine = Derricks × ResourceRate_Per_Derrick[mat]` par jour ; **plafond de stock 50 000** par matière ; capacité redirigée vers le MTX si installé, sinon stock de la planète.
- **Astéroïdes** : types minables = Ti, Al, C, Pd, Pt, Ag, Silica ; classes de masse 50/100/250/1000/5000/10000/25000/60000 ; **le scan régénère** la composition (pas d'épuisement permanent : on peut toujours exploiter tant que la masse le permet).

**Voyage / transport** (`InterStellarShip.cs` + `Shuttle.cs`) :
- Intra-système : `max(|Ordre_A − Ordre_B|, 1)` jours ; inter-planètes : `|Ordre| × 4` jours.
- Navette : Land = 2 j, TakeOff = 5 j, réparation = 2 j ; carburant requis proportionnel à la distance.
- Modules transportables : **Tool / Supply / Cryo** ; slots uniques (`ItemStored`, `ItemCount`, `StaffStored`).

**Staff & formation** (`Staff.cs` + `CoreData.cs`) :
- Rangs `Enums`: Researchers Technician(0-5)/Doctor(6-8)/Professor(9+) ; Production Apprentice(0-5)/Engineer(6-11)/Expert(12+) ; Marines Captain(10-39)/Admiral(40+).
- Capacité initiale (CoreData): **6000 disponibles** (réservoir), max 250 chercheurs / 200 producteurs / 41 marines ; **100 / 100 / 41** en formation simultanée ; durées **24 j** par type.
- **Formation verrouillée à un type à la fois** (`Training.cs`).

**Ennemis** (`EnemyDroneBuilder.cs` + `EnemyFleets.cs`) :
- flottes par étoile : fréquences hex `{0x2bc, 0x3e8, 0x3b6, 0x384, 0x384, 0x320, 0x2bc, 0x2bc, 0x320}` ; **plafond 200 drones** actifs.
- **Capture** : §13 → la station cible `MtxInstalled = true`, `SdmInstalled = true`, stock ⇒ `iOS Drone 50`, staff supprimé, `Derricks = random(0..7)`, base entière (`BaseBuildParts = 2`), **AOC activée** sur son usine ; les vaisseaux du joueur sur place sont **détruits**.

**MTX** (`MTX.cs`) : transfert par couche d'items matériels (`SendItems`/`BalanceItems`) — pas de téléportation de l'existant ; coût énergétique à statuer côté design (desaccuracy).

---

## 15. Synthèse : ce qu'on garde, ce qu'on arbitre

**Conserver tel quel (principe fort) :**
- Timers entrecroisés → boucle temps multi-horizons.
- Drones + automa → la guerre et le transport ne sont pas arcades.
- Progression 3 actes : Système solaire → FTL → 8 systèmes.
- Montes en level d'équipages avec gates Expert/Amiral.
- Milestones qui déclenchent la recherche.
- Déclenchement de guerre par vos actes (6ᵉ usine / laser).
- Victoire = 8 systèmes conquis + 8 segments récupérés (Atlantic/Chloé/Babylone/Hadrian/Romulus/Césius/Pliocène/Alpha).
- Interface largement héritée de Millennium 2.2 (CTR, toolbar, 8 derniers bulletins, mini-jeu 3D simple).
- 16 ressources dont 2 carburants composés (MeH/HeD) ; la restriction « uniquement en orbite » pour le HeD structure la progression.

**Arbitrages déjà tranchés par le croisement des sources :**
- ✅ **Segments** : 8 au total, 1 par système extrasolaire (confirmé oocities + CoreData.cs, corps nommés dans la matrice).
- ✅ **Recettes** : corrigées via `CoreData.cs` — le cuivre (Derrick/Pods) était erroné dans la source OCR d'origine (carbone/titane).
- ✅ **Chronologie** : 3100 AD (pas 3000) pour la fin de la Terre-Ville (confirmé manuel OCR : « By the year 3100 AD the City was complete »).
- ✅ **Algorithme de production** : `v = (engineers << rank) × multiplier / 801` (et non `/321` — valeur corrigée après lecture de `Factory.cs`), wrap 8 bits, 4 cycles, AOC=128 → croissance non-linéaire de l'expérience.

**À décider dans nos docs :**
- **Ressources** : notre liste (10, exotiques) vs liste originale (16, dont fer/aluminium/cuivre + carburants composés). → DATA.md est à affiner ici.
- **Transport** : masses + pods + slots vs tonnage abstrait. → GAMEPLAY §2.3.
- **Hydroïdes** : les mettre au premier plan narratif ou laisser de côté. → GAMEPLAY §8.
- **Défaite = perte d'infra** (productivité détruite, pas seulement flotte perdue) vs défaite = Terre détruite. → PFD §3.8.
- **TMT** : instantané mais coûteux en énergie vs catégorie rare.
- **« Seven systems » (Amiga Power, 1991)** : erreur du reviewer ; la source canonique est 8 systèmes (+ Soleil) → 8 segments = victoire.
- **15 vs 16 ressources** : le walkthrough cite 15 ; la table oocities/code source en listent 16. À vérifier in-game : le MeH Fuel (item 5) est-il un matériau minable ou uniquement un produit crafté ? Les deux sources disent « productible sur tout corps avec les matières ».

---

## 16. Sources

| # | Source | URL | Consulté | Fiabilité |
|---|---|---|---|---|
| S1 | Wikipedia EN | https://en.wikipedia.org/wiki/Deuteros | 2026-09-15 | haute (recoupée) |
| S2 | Wikipedia FR | https://fr.wikipedia.org/wiki/Deuteros:_The_Next_Millennium | 2026-09-15 | haute (lore) |
| S3 | Wikipedia DE | https://de.wikipedia.org/wiki/Deuteros | 2026-09-15 | moyenne |
| S4 | dixiak.com (fan, Atari ST) | http://www.dixiak.com/deuteros | 2026-09-15 | élevée (témoignage + captures) |
| S5 | Deuteros-Resurrected (remake) | https://www.deuteros.com/ | 2026-09-15 | élevée (liste des systèmes) |
| S6 | Tables gisements + recettes + crypto (fan) | http://www.oocities.org/yotisrx7/Deuteros.html (+ `.mdb`) | 2026-09-15 | moyenne (données brutes, OCR) |
| S7 | Track's Mini Guide (Wayback) | https://web.archive.org/web/20060118094754/http://www.amigagames.com/gage/d/deuteros.html | 2026-09-15 | élevée (mini-guide + cheat) |
| S8 | Kimimi — retour de jeu détaillé | https://kimimithegameeatingshemonster.com/2022/01/14/turning-quick-goes-into-all-nighters-since-1991 | 2026-09-15 | élevée (gameplay fin) |
| S9 | MobyGames (fiche) | https://www.mobygames.com/game/deuteros-the-next-millennium | — | référence |
| S10 | Manuel original (scan PDF, archive.org) | https://archive.org/download/amiga_games_manual/Deuteros%20-%20The%20next%20Millennium%20-%20Manual-ENG.zip | 2026-09-15 | **primaire** (OCR tesseract 50 p.) — `source:cad8ea82ee` |
| S11 | Reviews magazines complètes (Amigareviews Wayback) | https://web.archive.org/web/20090621002256/http://amigareviews.classicgaming.gamespy.com/deuteros.htm | 2026-09-15 | élevée (5 magazines) — `source:d96f254a3d` |
| S12 | Code source du remake (GitHub) | https://raw.githubusercontent.com/tonyoddspherecom/Deuteros-Resurrected/develop/Godot/Code/CoreData.cs + Enums.cs + Objects/*.cs + Platform/Screens/*.cs (production, recherche, combat, minage, formation, ennemis) | 2026-09-15 | élevée (données chiffrées + mécaniques) — `source:f53f5ba3fa` |
| S13 | Walkthrough Millennium 2.2 (GameFAQs) | https://gamefaqs.gamespot.com/ast/947438-millennium-22/faqs/62865 | 2026-09-15 | élevée (interface, ressources) — `source:28aea917b1` |
| S14 | Remake — clone local de référence (br. `develop`) | `git clone --branch develop https://github.com/tonyoddspherecom/Deuteros-Resurrected.git` → `/home/giak/projects/Deuteros-Resurrected` — HEAD `d252446f079fc4e7de766f28a22509bd71ed1023` (2026-09-16) ; ~31 Mo, 82 commits, licence CC0 | 2026-09-18 | élevée (code complet par écran : Production, Research, Training, ShipBay, ShipInterior, StarMap, Store, MTX, ACC, BattleLogic, EnemyDroneBuilder + CoreData.cs). Repo plus avancé que `source:f53f5ba3fa` |
| S15 | Remake — `SourceMaterials/Notes.txt` | https://raw.githubusercontent.com/tonyoddspherecom/Deuteros-Resurrected/develop/SourceMaterials/Notes.txt | 2026-09-18 | **primaire** (notes de reverse engineering : production `v = (engineers << rank) × multiplier / $321` (hex 0x321 = 801 déc.) ; `v = 128` si auto operations computer ; `production_value` reseté à la re-sélection ; MOON INDEX ; items hors Tool pod = Bandaid, Grapple, AMA, RFrame, CommsPod) |
| S16 | Remake — manuels originaux PDF (`SourceMaterials/GameManuals/`) | `Manual.pdf` + `Deuteros_old.pdf` dans le repo — **Git LFS** (`oid sha256:9e6081…`, 4 425 767 octets) ; non téléchargés ici (pas de `git-lfs`), alternative équivalente = S10 (archive.org) | 2026-09-18 | **primaire** (scans du manuel dans le repo) |

> Complément 2026-09-18 : contre-vérification des sources internes du jeu. **Un seul remake public** responsable existe : `Deuteros-Resurrected` (Tony Cheetham, Darren Coles) — c'est le « PC remake in beta » cité par Wikipedia EN. Aucune autre réimplémentation publique trouvée (candidats écartés : `deuteros76.itch.io`, `destec-2026`, `deusXmachina-dev/DEStiny`). Le `Notes.txt` (S15) recoupe l'algorithme de production déjà corrigé en §15 (`/801`).

Prochaines étapes suggérées : télécharger le build du remake (password « Birdy99 ») pour valider les valeurs chiffrées ; confronter ce fichier à DATA / GAMEPLAY lors de la conception des tables v1.