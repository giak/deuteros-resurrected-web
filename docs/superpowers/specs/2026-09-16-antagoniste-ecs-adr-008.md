# Recension antagoniste — ADR-008 « ECS pur » (2026-09-16)

> Challenge du choix « cœur de simulation en ECS pur » pour **deuteros-resurrected-web**.
> Seul l'ADR-008 est visé. Le reste du design (tick pur ADR-002, tickPhases ADR-009,
> config ADR-012, erreurs ADR-011, zod frontières ADR-010) n'est PAS contesté.
> Mémoire mnémo : `7fe5f2e8-e3fb-4b24-b652-8a960efed40b` (statut VERIFIE, verifie-2026-09-16).

---

## 1. Résumé du choix

ADR-008 (approuvé 2026-09-16) pose un **ECS pur** :

```ts
type EntityId = number;                         // 0 = null
interface Component { [key: string]: unknown }  // data pure
interface World {
  components: Record<ComponentType, Map<EntityId, unknown>>;
  tags: Map<EntityId, Set<ComponentType>>;
  prng: PrngState; day: number; entityCount: number;
}
type System = (world: World, simConfig: SimConfig) => void;
```

composition > héritage, systèmes regroupés **par domaine** (mitigation ADR-008),
tick = liste ordonnée de phases (`tickPhases`, ADR-009).
Le tout **contre la recommandation de la recherche** (ARCHITECTURE_RESEARCH §2.2 :
« nombre d'entités faible (< 10⁴)… alternative plus légère : OO + services »), qui
recommandait des services OO. Le choix utilisateur a inversé la recommandation.

Contexte chiffré : ~160 corps + ~46 items + flottes + staff + combat par tour,
tick discret (1 jour), sim déterministe mono-thread, offline, save local.

---

## 2. Points faibles détaillés

### 2.1 L'échelle ne justifie pas l'ECS — le consensus est quasi unanime
Sous ~200 entités, aucun gain mesurable ; au-dessus de ~1 000–10 000+ avec logique
par frame, l'ECS peut aider (MojoLabs 2025 ; Unity ECS vs GameObject : parité à
1 000 objets, écart à partir de 10 000 ; Reddit UE ~100 NPCs : « don't »). Notre
plafond (~200–400 entités, dont une fraction active à chaque tick) est **deux
ordres de grandeur** sous le point où le gain existe, et le jeu ticke **par jour**,
pas par frame : aucune hot loop de masse.

### 2.2 Entités bespoke/hétérogènes = contre-indication directe
Planètes, stations, usines, flottes, staff, combat : entités de **types très
différents**, à comportement propre. Les conditions qui font gagner l'ECS
(archétypal) sont explicitement (Moonside 2023) : masse d'entités de structure
quasi identique + structure quasi statique + pas de références externes. Aucune
n'est réunie ici. Chaque « système » n'itère que sur une poignée d'entités.

### 2.3 Le design n'embarque même pas le mécanisme qui justifie l'ECS
Le World du design = `Record<ComponentType, Map<EntityId, unknown>>`. Des Maps :
hash + indirection, **zéro localité mémoire**. Le bénéfice data-oriented (SoA,
TypedArrays, archetypes — cf. bitECS) n'existe pas dans la spec. On paie donc la
taxe d'indirection d'un ECS sans le carburant qui le rend utile. Pour ce volume,
un tableau de POJO/records est plus rapide et plus direct (Voxagon 2025 ;
Schoellgen 2025 : à ce volume une « megastruct » tient en cache).

### 2.4 La charge de travail réelle est « événementielle », pas « par lot »
Le tick original = Research → Production → UpdateShips → BuildDrones → MTX →
Navigation → Combat : une **liste ordonnée de passes domaine**, pas des queries
de masse. Les actions joueur = commandes ciblées (`Result<World, DomainError>`).
C'est exactement le modèle « services appelés dans l'ordre » que l'ECS n'améliore
pas (LopezRuiz 2026 : éviter l'ECS quand le workload est event-driven et que la
velocity dev prime).

### 2.5 L'ordre des systèmes est une dette cachée
« Systems are very dependent on their ordering. Introducing new systems in
between already existing Systems can be a challenge » (StackOverflow 2020).
Debugging d'un comportement : « chasing data across five system files »,
implicit ordering dependencies (Moonjump 2026). ADR-009 (tickPhases configurable)
externalise l'ordre sans rendre le traçage plus simple. À 200 entités on résout
le problème avec un `update()` par service.

### 2.6 Sérialisation & déterminisme : pas gratuits en ECS
- Réifier « World → SaveDto » (ADR-008 §4.4) = re-mapper des Maps vers un DTO
  versionné : c'est de la plomberie (bitECS : serializer dédié + remap des
  entity IDs au restore ; Asteroides : schema de clés triées + sort des EIDs
  pour stabiliser le déterminisme). Des records/POJO sérialisent nativement.
- L'itération de Maps suit l'ordre d'insertion : rejouabilité et golden tests
  dépendent de la stabilité de création/réutilisation des IDs. Fragile, à
  surveiller constamment.
- Déterminisme JS : floats IEEE-754 divergent selon les moteurs (V8/Bun/Zig) ;
  un ECS déterministe impose fixed-point/entiers uniquement (OECES). Notre jeu
  est déjà en entiers (wrap /801, 8 bits) — faisable, mais l'ECS n'apporte rien
  à ce contrat, il le complique.

### 2.7 Debug & testabilité : le revers
- Debug : indirection systématique, « memory blob with no debug info » (Voxagon
  2025) ; témoignage chiffré : 3 semaines perdues en réécriture de stockage,
  5 FPS vs 300–500 FPS avant (Moonside 2023).
- Testabilité : les systèmes purs sont testables, **mais** il faut construire des
  mondes fixtures (DSL `worldOf`… cérémonie). Le gisement réel de testabilité
  vient du **tick pur déterministe (ADR-002)**, pas de l'ECS. Un service sur
  POJO se teste au moins aussi bien, sans l'échafaudage.

### 2.8 Tension avec ADR-011 (Result : « monde inchangé sur erreur »)
Les systèmes ECS mutent les composants **en place**. Garantir « monde inchangé
sur erreur» exige de valider toutes les préconditions avant la première mutation,
puis de composer ~15 passes sans erreur — le crash d'une passe en cours de tick
laisse le monde partiellement muté (contre crash-loud ADR-011). Avec des
services `const world = runX(world) : Result<World, DomainError>` le contrat est
naturellement respecté. Friction réelle, non adressée par la spec.

---

## 3. Arguments contre + sources

| # | Source (URL) | Position |
|---|---|---|
| 1 | Michelle Cooper, *ECS for Humans: When You Actually Need It* (2025-12) — https://mojolabs.nz/entity-component-system-for-humans-when-you-actually-need-it/ | « If it's 50–200, you almost certainly don't need ECS for performance. If it's 1,000–10,000+ with per-frame logic, ECS might help. » « Add extra indirection […]. Make simple features harder to implement […]. Burn time on architecture. » |
| 2 | *High performance Entity Component Systems* — LopezRuiz (2026-04) — https://lopezruiz.net/2026/04/08-high-performance-ecs.htm | « avoid ECS when: your entity count is small […] your workload is event-driven rather than data-driven […] developer velocity matters more than runtime performance ». « Failure pattern: using ECS as a philosophical replacement for OOP instead of a performance tool. » |
| 3 | *ECS Architecture in Practice* — Moonjump (2026-02) — https://moonjump.com/forum/game-dev/ecs-architecture-in-practice-when-it-actually-helps-and-when-it-s-overkill-7e21aa | « under a few hundred entities, you're adding architecture complexity for zero measurable benefit ». « Debugging "why did this enemy do that" turns into chasing data across five separate system files. » « ECS-for-everything is a trap. » |
| 4 | *Archetypal ECS Considered Harmful?* — Moonside Games (2023-11) — https://moonside.games/posts/archetypal-ecs-considered-harmful/ | Conditions du gain : masses homogènes, structure quasi statique, pas de refs externes ; sinon archetypes fragmentés, gains évaporés ; réécriture de stockage = 3 semaines, 5 FPS vs 300–500 FPS avant. |
| 5 | D. Gustafsson, *Thoughts on ECS* — Voxagon (2025-03) — https://blog.voxagon.se/2025/03/28/thoughts-on-ecs.html | « ECS requires lots and lots of lookups for entity-component mappings […]. doesn't come for free » ; multi-composants = cache misses multiples, « that's exactly what the good old struct already does » ; « One area … rarely discussed is how complicated they are to debug ». |
| 6 | Claassen, *Migrating CitySim from Class Hierarchy Sim to ECS Sim* (2026-05, sim à tick 1 s) — https://claassen.net/geek/blog/2026/05/migrating-citysim-from-class-hierarchy-sim-to-ecs-sim.html | Vécu neutre-pénible : relations croisées = dictionnaires externes « less obviously connected to the domain » ; archetype discoverability faible ; « Ceremony. Defining fifteen record struct component types… is a lot of boilerplate. » |
| 7 | *ECS Proper* — Socratopia ch. 9 — https://www.socratopia.app/library/game-code-anatomy-en/chapter-9 | « when you have only a few hundred entities total, ECS may be slower in practice because the orchestration cost (queries, system scheduling) doesn't pay off » ; « Writing this from scratch is weeks of work ». |
| 8 | *The Hybrid Reality* — Socratopia ch. 10 — https://www.socratopia.app/library/game-code-anatomy-en/chapter-10 | Unity/Unreal/Godot = hybrides ; « ECS in the gameplay layer is verbose and pessimistic for low entity counts » ; « hybrid is the default; uniformity is the exception that needs justification ». |
| 9 | R. Schoellgen, *Skip the ECS* — infinitecode (2025-05) — https://infinitivecode.substack.com/p/skip-the-ecs | megastruct + hot-data packing ; « You don't need a full ECS framework to build a performant, scalable game » ; ~200 entités/room tient en cache. |
| 10 | *Unity ECS vs GameObjects – A Real Performance Comparison* — UnityQueen (2026-06) — https://unityqueen.com/2026/06/05/unity-ecs-vs-gameobjects-a-real-performance-comparison/ | « 1,000 objects → Both approaches perform well » ; écarts à partir de 10 000–50 000. |
| 11 | r/unrealengine, *ECS around ~100ish NPCs?* (2025-05) — https://www.reddit.com/r/unrealengine/comments/1kd03jv/does_using_ecs_make_sense_around_100ish_npcs_if/ | « i would not do it for 100 npc. i run at 120 fps with 100 actors unoptimised. » |
| 12 | bitECS docs — *Serialization* — https://bitecs.dev/docs/serialization | serializer dédié ; remap des entity IDs au restore (save/load) = plomberie non triviale. |
| 13 | StackOverflow, *What are the disadvantages of the ECS?* (2020) — https://stackoverflow.com/questions/58596897/what-are-the-disadvantages-of-the-ecs-entity-component-system-architectural-pa | « Systems are very dependent on their ordering. […] harder to debug single component changes… ». |

---

## 4. Alternatives crédibles

1. **Services OO + records/POJO (recommandation initiale de la recherche)**
   - Entités = records issus de `data/*.json` (planètes), types dédiés (flotte,
     usine, staff…) ; **composants** = champs structurés (pas de `Map` générique).
   - Une classe/méthode de service par domaine : `productionService.run(world)`,
     `researchService.run(world)`… appelées **dans l'ordre tickPhases** (ADR-009
     conservé tel quel).
   - Actions joueur = méthodes retournant `Result<World, DomainError>` — contrat
     ADR-011 naturel, sérialisation native en DTO versionné, déterminisme trivial.
   - Tests : services purs sur fixtures record, golden unchanged.

2. **Hybride « ECS pour les bonnes choses » (Socratopia ch.10, Moonjump)**
   - ECS uniquement là où il y a une vraie masse homogène à itérer (combat de
     masse, à justifier par profiling). Aujourd'hui : YAGNI aux volumes annoncés.
   - Le reste : OO/records. C'est le compromis le plus « industrie ».

3. **Data-oriented sans ECS formel (Schoellgen)**
   - Entité structurée (megastruct) + **hot-data packing** ciblé : si un système
     devient mesuré chaud, on extrait un tableau SoA dédié (ex. boucle 160 corps
     × production). Gain de localité réel sans le framework.

4. **Composition par types/unions, sans World générique**
   - « Tes corps sont composables » : `Body = { position, resources } & Partial
     <Mineable> & Partial<Habitable> & Partial<Methanoid>` → la composition que
     l'ECS vend s'obtient aussi avec records typés + zod (ADR-010), **sans la
     couche de requêtes**.

---

## 5. Verdict : **REMPLACER** (l'ECS pur formel) — 2026-09-16

- Le cœur « entité = ID / composant = data / système = logique » est une bonne
  direction conceptuelle (composition, séparation data/logique) : on garde les
  composants et les systèmes, **mais comme records + services**, pas comme
  `World` générique à Maps.
- À cette échelle (~200–400 entités hétérogènes, tick par jour, mono-thread,
  offline), le **consensus* des sources est unanime : l'ECS pur ne rapporte rien
  et coûte (indirection, ordre, debug, sérialisation, friction ADR-011).
- La spec n'embarque pas le mécanisme (SoA/TypedArray) qui rendrait l'ECS utile →
  on aurait le pire des deux mondes.
- Le reste du design est **compatible sans rupture** : tickPhases (ADR-009),
  SIM_CONFIG injectée (ADR-012), errors (ADR-011), zod frontières (ADR-010),
  tests golden (ADR-002) restent identiques ; seuls les internals du cœur changent
  (World → états typés + services).

**Déclencheurs de réversibilité** : si le profilage montrait un jour une boucle
chaude réelle (ex. combat de masse), migrer UN sous-domaine vers du SoA/ECS ciblé
= scénario d'hybride prévu (option 2), sans réécrire le cœur.

---

*Recension rendue par : spécialiste antagoniste (challenge ECS) — opencode.
À trancher par l'utilisateur : réévaluer ADR-008 avant implémentation.*