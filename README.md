# Deuteros Resurrected Web

[![CI](https://github.com/giak/deuteros-resurrected-web/actions/workflows/ci.yml/badge.svg)](https://github.com/giak/deuteros-resurrected-web/actions/workflows/ci.yml)

**Un spiritual successor de *Deuteros: The Next Millennium* (Ian Bird, 1991) en webapp.**

Jeu de gestion spatiale post-apocalyptique : exploitez les ressources du système solaire, développez votre recherche, construisez vos flottes, conquérez les 8 systèmes extrasolaires et récupérez les 8 segments Hydroïdes.

- **100 % navigateur** — aucune installation, aucun serveur, jouable hors-ligne
- **TypeScript + Vite + Canvas 2D** — rendu 2D stylé, UI dense façon écrans Amiga
- **Sauvegarde locale** (localStorage / IndexedDB)
- **Spiritual successor** : les concepts de l'original, avec une UX moderne

---

## Documentation

La documentation complète vit dans [`docs/`](docs/).

| Document | Contenu |
|---|---|
| [VISION.md](docs/VISION.md) | Pourquoi ce projet, pour qui, critères de succès, non-objectifs |
| [PFD.md](docs/PFD.md) | **Plan Fonctionnel Détaillé** : chaque écran et système du jeu |
| [GAMEPLAY.md](docs/GAMEPLAY.md) | Règles détaillées : ressources, recherche, production, combat |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Structure du code, modules, flux de données |
| [DATA.md](docs/DATA.md) | Modèle de données (planètes, technologies, recettes, événements) |
| [ROADMAP.md](docs/ROADMAP.md) | Phases d'implémentation du MVP au jeu complet |
| [TECH_STACK.md](docs/TECH_STACK.md) | Choix techniques détaillés |
| [DECISIONS.md](docs/DECISIONS.md) | ADR — registre des décisions architecturales |
| [DASHBOARD.md](docs/DASHBOARD.md) | État d'avancement, stats, liens utiles |
| [TRACE.md](docs/TRACE.md) | Journal de sessions de travail |
| [RESEARCH.md](docs/RESEARCH.md) | Recherche de référence sur l'original *Deuteros* (règles, chiffres, lore) |

## Statut actuel

🎮 **v0 — « Boucle Terre » jouable — tag `v0.0.1` posé (playtest validé, 2026-09-18).** Boucle économique complète (minage → production → recherche → formation) sur l'écran Terre, écran de victoire OF Frame, trace de session (K10) et pause automatique sur objectif atteint (K11/K12). Voir [DASHBOARD.md](docs/DASHBOARD.md) pour l'état précis.

## Licence

Projet personnel non affilié à Activision ni aux ayants droit d'origine.
*Deuteros* appartient à ses créateurs. Ce projet est purement inspiré de ses concepts.