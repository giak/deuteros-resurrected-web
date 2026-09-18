/**
 * Montage de l'application (ARCHITECTURE §2.4) — DOM vanilla.
 * Écran 1 : vue système (canvas) + HUD (jour, contrôles temps). L'écran Terre
 * à onglets (Bulletins, Production…) vit dans #earth-screen (src/ui/earth-screen.ts).
 * La boucle : requestAnimationFrame accumule le temps réel, appelle dayTick()
 * à la cadence de la vitesse choisie, puis demande le rendu.
 */
import { initGame, subscribe, getState, notify } from '@/state/store';
import { createInitialState, dayTick, rankName } from '@/simulation';
import type { DayTickResult } from '@/simulation';
import { pushBulletin } from '@/actions';
import { drawSystem, type Camera } from '@/render/canvas-renderer';
import { mountEarthScreen } from '@/ui/earth-screen';
import { initTrace, traceDay } from '@/trace';

const SPEEDS: Array<{ label: string; msPerDay: number }> = [
  { label: '⏸', msPerDay: 0 },
  { label: '×1', msPerDay: 1000 },
  { label: '×2', msPerDay: 500 },
  { label: '×5', msPerDay: 200 },
  { label: '×20', msPerDay: 50 },
];

const cam: Camera = { x: 0, y: 0, zoom: 1 };
const time = { speedIndex: 0, accumulator: 0, lastFrame: 0 };

export interface ObjectiveCompletion {
  kind: 'recherche' | 'production' | 'formation';
  label: string;
}

/** Libellés français des objectifs terminés d'une frame (pause auto K11). */
export function completedObjectives(result: DayTickResult): ObjectiveCompletion[] {
  const out: ObjectiveCompletion[] = [];
  if (result.researchFinished) {
    out.push({ kind: 'recherche', label: `Recherche achevée : ${result.researchFinished}.` });
  }
  for (const p of result.produced) {
    const planet = p.planetId === 'earth' ? 'Terre' : p.planetId;
    out.push({ kind: 'production', label: `Production terminée : ${p.itemId} (${planet}).` });
  }
  for (const t of result.trainingFinished) {
    const role = { production: 'producteurs', research: 'chercheurs', marines: 'marines' }[t.type];
    out.push({ kind: 'formation', label: `Formation terminée : ${t.count} ${role} disponibles.` });
  }
  return out;
}

/** Vrai si au moins un objectif s'est terminé dans la frame (à pauser). */
export function shouldAutoPause(result: DayTickResult): boolean {
  return result.researchFinished !== null || result.produced.length > 0 || result.trainingFinished.length > 0;
}

export function mountApp(root: HTMLElement): void {
  const state = createInitialState(Date.now() % 2 ** 31);
  state.newsFeed.push("L'opération Deuteros commence. La Terre-Ville est complète.");
  initGame(state);
  initTrace(state.seed);

  root.innerHTML = `
    <div class="game-shell">
      <header class="hud-top">
        <div class="hud-brand">
          <span class="hud-title">DEUTEROS</span>
          <span class="hud-sub">— The Next Millennium · tables v1</span>
        </div>
        <div class="hud-day">
          <span class="hud-day-label">JOUR</span>
          <span id="hud-day-value" class="hud-day-value">1</span>
        </div>
        <div class="hud-controls" id="hud-controls"></div>
      </header>

      <main class="hud-main">
        <canvas id="system-canvas" width="960" height="600"></canvas>
        <aside class="hud-side" id="earth-screen"></aside>
      </main>

      <footer class="hud-bottom">
        <div id="earth-status" class="earth-status"></div>
        <div class="hud-hint">Glisser : déplacer la vue · Molette : zoom · Espace : pause</div>
      </footer>
    </div>
  `;

  setupControls();
  setupCanvasInteraction();
  mountEarthScreen(document.querySelector('#earth-screen')!);
  subscribe(updateHud);
  updateHud();
  startLoop();
}

// ---------------------------------------------------------------------------
// Boucle de temps — pause/vitesse via msPerDay (0 = pause). Ordres donnés en
// pause puis résolus (ADR-002) : la vitesse ne change que la cadence des ticks.
// ---------------------------------------------------------------------------
function startLoop(): void {
  const canvas = document.querySelector<HTMLCanvasElement>('#system-canvas')!;
  const ctx = canvas.getContext('2d')!;

  const frame = (now: number) => {
    const dt = time.lastFrame ? now - time.lastFrame : 0;
    time.lastFrame = now;

    const msPerDay = SPEEDS[time.speedIndex].msPerDay;
    if (msPerDay > 0) {
      time.accumulator += dt;
      let steps = 0;
      const pending: string[] = [];
      while (time.accumulator >= msPerDay && steps < 50) {
        time.accumulator -= msPerDay;
        const result = dayTick(getState());
        traceDay(result.day - 1, result.journal);
        pushNews(result);
        if (shouldAutoPause(result)) {
          pending.push(...completedObjectives(result).map((o) => o.label));
        }
        steps += 1;
      }
      if (steps > 0) notify();
      checkVictory();
      if (pending.length > 0 && !getState().flags['v0_victory']) {
        pauseForObjectives(pending);
      }
    }

    drawSystem(ctx, cam, now);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------------------
// Pause auto sur objectif atteint (K11/K12) — arrêt net, reprise par choix de
// vitesse. La bannière se ferme (bouton/Espace) sans relancer ; cliquer une
// vitesse ×1..×20 ferme et relance (via setSpeed, index > 0). Priorité victoire :
// si v0_victory est posé dans la frame, seule l'overlay de victoire s'affiche.
// ---------------------------------------------------------------------------
function pauseForObjectives(labels: string[]): void {
  setSpeed(0);
  const list = labels.map((l) => `<li>${l}</li>`).join('');
  document.querySelector('#app')!.insertAdjacentHTML(
    'beforeend',
    `<div class="pause-banner" id="pause-banner">
       <span class="pause-title">Objectif atteint</span>
       <ul class="pause-list">${list}</ul>
       <button class="hud-btn pause-resume">Fermer (Espace)</button>
     </div>`,
  );
  document.querySelector<HTMLButtonElement>('.pause-resume')!.addEventListener('click', dismissPauseBanner);
}

function dismissPauseBanner(): void {
  document.querySelector('#pause-banner')?.remove();
}

// ---------------------------------------------------------------------------
// Victoire v0 — détection post-tick, une seule fois (flag) : bulletin FR,
// pause immédiate, puis overlay récap (task 11, D1).
// ---------------------------------------------------------------------------

/** Rang affiché de l'équipe production (seuils brief : ≥12 Expert, ≥6 Ingénieur). */
export function victoryRankLabel(actionsTaken: number): string {
  return rankName({ type: 'production', count: 0, actionsTaken });
}

function checkVictory(): void {
  const st = getState();
  if (st.flags['v0_victory'] || (st.planets.earth.items['of_frame'] ?? 0) < 1) return;
  st.flags['v0_victory'] = true;
  pushBulletin(st, 'VICTOIRE v0 : OF Frame produit !');
  setSpeed(0);
  const builderActions = st.planets.earth.factory.builder?.actionsTaken ?? 0;
  const totalUnits = Object.values(st.planets.earth.items).reduce((a, b) => a + b, 0);
  document.querySelector('#app')!.insertAdjacentHTML(
    'beforeend',
    `<div class="victory-overlay"><div class="victory-box">
       <h2>Objectif atteint — OF Frame produit</h2>
       <p>Jour ${st.day} · production cumulée : ${totalUnits} unités</p>
       <p>Équipe production : ${builderActions} items · rang ${victoryRankLabel(builderActions)}</p>
       <button class="hud-btn" onclick="this.closest('.victory-overlay').remove()">Continuer à observer</button>
     </div></div>`,
  );
}

/** Alimente les bulletins (8 derniers conservés — interface originale). */
function pushNews(result: ReturnType<typeof dayTick>): void {
  const state = getState();
  if (result.researchFinished) {
    state.newsFeed.push(`Recherche achevée : ${result.researchFinished}.`);
  }
  if (result.produced.length > 0) {
    const byPlanet = new Map<string, number>();
    for (const p of result.produced) byPlanet.set(p.planetId, (byPlanet.get(p.planetId) ?? 0) + 1);
    for (const [planetId, n] of byPlanet) {
      state.newsFeed.push(`Production : ${n} unité(s) sur ${planetId}.`);
    }
  }
  if (state.newsFeed.length > 8) state.newsFeed.splice(0, state.newsFeed.length - 8);
}

// ---------------------------------------------------------------------------
// Canvas : pan (drag) + zoom (molette)
// ---------------------------------------------------------------------------
function setupCanvasInteraction(): void {
  const canvas = document.querySelector<HTMLCanvasElement>('#system-canvas')!;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    cam.x += e.clientX - lastX;
    cam.y += e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
  });
  canvas.addEventListener('pointerup', (e) => {
    dragging = false;
    canvas.releasePointerCapture(e.pointerId);
    canvas.style.cursor = 'grab';
  });
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      cam.zoom = Math.min(4, Math.max(0.4, cam.zoom * factor));
    },
    { passive: false },
  );
}

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------
function setupControls(): void {
  const controls = document.querySelector<HTMLDivElement>('#hud-controls')!;
  controls.innerHTML = '';
  SPEEDS.forEach((s, i) => {
    const btn = document.createElement('button');
    btn.className = 'hud-btn';
    btn.textContent = s.label;
    btn.dataset.speed = String(i);
    btn.setAttribute('aria-label', i === 0 ? 'Pause' : `Vitesse ${s.label}`);
    btn.addEventListener('click', () => setSpeed(i));
    controls.appendChild(btn);
  });
  setSpeed(0); // démarrage en pause

  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Space') return;
    e.preventDefault();
    if (document.querySelector('#pause-banner')) {
      dismissPauseBanner();
      return;
    }
    setSpeed(time.speedIndex === 0 ? 1 : 0);
  });
}

function setSpeed(index: number): void {
  if (index > 0) document.querySelector('#pause-banner')?.remove();
  time.speedIndex = index;
  time.accumulator = 0;
  for (const btn of document.querySelectorAll<HTMLButtonElement>('.hud-btn')) {
    btn.classList.toggle('active', Number(btn.dataset.speed) === index);
  }
}

function updateHud(): void {
  const state = getState();
  const dayEl = document.querySelector('#hud-day-value');
  if (dayEl) dayEl.textContent = String(state.day);

  // Statut Terre : projet de recherche courant + barre de progression
  const earth = document.querySelector<HTMLDivElement>('#earth-status');
  if (earth) {
    const rid = state.research.currentItemId;
    const p = rid ? state.research.progress[rid] : null;
    earth.innerHTML = p
      ? `Recherche : <strong>${rid}</strong> — ${p.percentage} %
         <div class="progress-track"><div class="progress-fill" style="width:${p.percentage}%"></div></div>`
      : 'Recherche : aucun projet sélectionné';
  }
}
