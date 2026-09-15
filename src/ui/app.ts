/**
 * Montage de l'application (ARCHITECTURE §2.4) — DOM vanilla.
 * Écran 1 : vue système (canvas) + HUD (jour, contrôles temps, bulletins).
 * La boucle : requestAnimationFrame accumule le temps réel, appelle dayTick()
 * à la cadence de la vitesse choisie, puis demande le rendu.
 */
import { initGame, subscribe, getState, notify } from '@/state/store';
import { createInitialState, dayTick, SOL_BODIES } from '@/simulation';
import { drawSystem, type Camera } from '@/render/canvas-renderer';

const SPEEDS: Array<{ label: string; msPerDay: number }> = [
  { label: '⏸', msPerDay: 0 },
  { label: '×1', msPerDay: 1000 },
  { label: '×2', msPerDay: 500 },
  { label: '×5', msPerDay: 200 },
  { label: '×20', msPerDay: 50 },
];

const cam: Camera = { x: 0, y: 0, zoom: 1 };
const time = { speedIndex: 0, accumulator: 0, lastFrame: 0 };

/** Équipe de recherche de la Terre — placeholder jusqu'à l'écran Personnel. */
const researchStaff: { type: 'research'; count: number; actionsTaken: number } | null = null;

export function mountApp(root: HTMLElement): void {
  const state = createInitialState(Date.now() % 2 ** 31);
  state.newsFeed.push("L'opération Deuteros commence. La Terre-Ville est complète.");
  initGame(state);

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
        <aside class="hud-side">
          <section class="hud-panel">
            <h2 class="hud-panel-title">Bulletins</h2>
            <ul id="news-feed" class="news-feed"></ul>
          </section>
          <section class="hud-panel">
            <h2 class="hud-panel-title">Corps suivis</h2>
            <div id="body-list" class="body-list"></div>
          </section>
        </aside>
      </main>

      <footer class="hud-bottom">
        <div id="earth-status" class="earth-status"></div>
        <div class="hud-hint">Glisser : déplacer la vue · Molette : zoom · Espace : pause</div>
      </footer>
    </div>
  `;

  setupControls();
  setupCanvasInteraction();
  setupSidebar();
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
      while (time.accumulator >= msPerDay && steps < 50) {
        time.accumulator -= msPerDay;
        const result = dayTick(getState(), { research: researchStaff, production: null, marines: null });
        pushNews(result);
        steps += 1;
      }
      if (steps > 0) notify();
    }

    drawSystem(ctx, cam, now);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
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
    if (e.code === 'Space') {
      e.preventDefault();
      setSpeed(time.speedIndex === 0 ? 1 : 0);
    }
  });
}

function setSpeed(index: number): void {
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

  const feed = document.querySelector<HTMLUListElement>('#news-feed');
  if (feed) {
    feed.innerHTML = '';
    for (const item of state.newsFeed.slice(-8).reverse()) {
      const li = document.createElement('li');
      li.textContent = item;
      feed.appendChild(li);
    }
  }

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

function setupSidebar(): void {
  const list = document.querySelector<HTMLDivElement>('#body-list');
  if (!list) return;
  for (const b of SOL_BODIES.filter((b) => b.type === 'planet' && b.starId === 'the_sun')) {
    const row = document.createElement('div');
    row.className = 'body-row';
    row.innerHTML = `<span class="body-dot" style="background:${bodyDotColor(b.id)}"></span>
      <span class="body-name">${b.name}</span>
      <span class="body-meta">${b.deposits.length} gis.</span>`;
    list.appendChild(row);
  }
}

function bodyDotColor(id: string): string {
  const colors: Record<string, string> = {
    mercury: '#9c8f7f', venus: '#d9b26a', earth: '#4f86d4', mars: '#c1543a',
    asteroids: '#7a7a72', jupiter: '#c99b6a', saturn: '#d9c391', uranus: '#8fd1d6',
    neptune: '#4a6fd1', pluto: '#b0a49a', decuria: '#8f86b5',
  };
  return colors[id] ?? '#a8a8a0';
}
