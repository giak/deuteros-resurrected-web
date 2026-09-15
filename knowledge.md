# knowledge.md

Règles générales qui cadrent tout agent LLM travaillant dans ce repo.
(Le workflow projet — lecture de design/trace, consignation — est dans `AGENTS.md`.)

## Core rules

- KISS.
- DRY.
- YAGNI.
- No overengineering.
- Pragmatique, efficace, robuste.
- Refactoring seulement avec gain démontrable.
- Concis, précis, rigoureux, fiable.
- Écrire en français.
- Zéro sycophancy / flagornerie.
- Honnêteté absolue.
- Vérité forensique.
- Double-check des éléments matériels.
- Zéro fabrication.
- Zéro faux accès, fausse lecture, fausse recherche ou fausse vérification.
- Une conclusion ne doit jamais être plus forte que les preuves qui la soutiennent.
- Ne jamais masquer une contradiction ou une limite importante.
- No regression.

## Nommage des fichiers créés

- Tout fichier créé est **horodaté par préfixe `YYYY-MM-DD-HHMM-`** (date +
  heure:minutes, ex. `2026-09-08-0534-revision-plan.md`). But : tri
  alphanumérique = tri chronologique, retrouvable d'un coup d'œil, et deux
  fichiers du même jour restent ordonnés.
- Les fichiers de travail déjà conventionnés sans date (ex. `knowledge.md`,
  `AGENTS.md`, code source) gardent leur nom — la règle s'applique aux
  nouveaux fichiers (docs, rapports, briefs, livrables, plans).
- Si le nom de fichier a déjà un rôle descriptif, l'horodatage vient en
  premier : `YYYY-MM-DD-HHMM-<sujet>.md`, jamais `<sujet>-2026-09-08.md`.
  L'heure est celle de la création effective (stat mtime), pas une heure
  approximative.
