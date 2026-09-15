# TECH_STACK — Choix techniques

> Version 0.1 — 2026-09-15
> Décision entérinée par ADR-001. Ce document motive chaque choix de façon concrète.

---

## 1. Langage & outillage

| Outil | Choix | Pourquoi |
|---|---|---|
| Langage | **TypeScript (mode strict)** | Typage fort pour un domaine data-lourd, adoption rapide, zéro dépendance serveur |
| Build | **Vite** | dev server instantané, bundling léger, HMR efficace pour itérer sur le jeu |
| Tests | **Vitest** | natif Vite, test rapide de fonctions pures (la simulation) |
| Lint/Format | **ESLint + Prettier** | cohérence, config minimaliste |
| Runtime | **Navigateur** (pas de Node requis en production) | le jeu vit dans le client, offline-first |

**Pourquoi pas autre chose** :
- **Rust/WASM** : plus puissant, mais build pipeline lourd et itération lente — surqualité pour une sim par tick discret dans le navigateur.
- **Python backend** : aucun besoin serveur (solo, save locale) — ajouterait une couche inutile.
- **React/Angular/Vue** : DOM vanilla + helpers suffisent pour une UI dense et custom-style ; zero lock-in, bundle plus petit. Réévaluable si l'UI devient ingérable.

---

## 2. Rendu

| Couche | Choix | Pourquoi |
|---|---|---|
| Vue du système | **Canvas 2D natif** | des milliers d'entités légères, zoom/pan fluide, pas de framework nécessaire |
| UI de gestion | **DOM + CSS custom** | dense, accessible, inspectable, stylable finement |
| Sprites | **Procédural** (code) | pas d'art asset à créer en v1, cohérent, scala |
| 3D | **Non** (au moins v1) | le jeu original est 2D ; la 3D n'apporte pas de valeur de gameplay ici et double le travail |

Pourquoi pas Three.js : coût de complexité, perf, et pas de besoin réel en v1. Une passerelle reste possible (ADR enregistré).

---

## 3. Persistance

| Couche | Choix |
|---|---|
| Sauvegardes | **IndexedDB** (autosave + multi-slots) |
| Export/Import | JSON (v1). |
| Réseau | aucun requis en v1 |

---

## 4. Performance (cibles)

- Vue système : 60 fps avec 500+ entités sur machine moyenne.
- Save < 200 KB.
- Bootstrap < 10 s sur connexion moyenne (Vite + code-splitting par écran).

---

## 5. Récap de la stack

```
TypeScript strict  +  Vite  +  Canvas 2D  +  DOM vanilla  +  CSS custom
IndexedDB (saves)  +  Vitest (tests)  +  ESLint + Prettier
```

Aucune dépendance réseau obligatoire, aucun backend, aucun framework UI lourd.