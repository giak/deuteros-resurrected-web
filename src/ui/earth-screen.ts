/**
 * Écran Terre (tasks 9-10, B1-B5) — coquille à onglets + panneaux Production,
 * Recherche, Personnel et Minage. L'onglet Bulletins rend le fil des 8 derniers
 * bulletins. Les helpers purs (*Rows) sont exportés pour les tests hors DOM.
 */
import { GROUND_ITEMS, RESEARCHABLE_ITEMS, SIM_CONFIG, rankName, type GameState } from '@/simulation';
import { getState, subscribe } from '@/state/store';
import { cancelQueueItem, installDerrick, queueItem, runAction, selectResearch, trainStaff } from '@/actions';

type Tab = 'news' | 'production' | 'research' | 'staff' | 'mining';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'news', label: 'Bulletins' },
  { id: 'production', label: 'Production' },
  { id: 'research', label: 'Recherche' },
  { id: 'staff', label: 'Personnel' },
  { id: 'mining', label: 'Minage' },
];

let active: Tab = 'production';

/** Échappe une chaîne avant interpolation dans un nœud texte HTML. */
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Ligne du panneau production, déduite de l'état sans DOM. */
export interface ProductionRow {
  id: string;
  shortName: string;
  mass: number;
  inputs: string;
  disabled: boolean;
}

/** Items queueables au sol + disponibilité selon les stocks (helper pur). */
export function productionRows(state: GameState): ProductionRow[] {
  const earth = state.planets.earth;
  return GROUND_ITEMS.map((item) => {
    const disabled = !item.inputs || !Object.entries(item.inputs).every(
      ([r, q]) => (earth.stores[r as keyof typeof earth.stores] ?? 0) >= (q ?? 0),
    );
    return {
      id: item.id,
      shortName: item.shortName,
      mass: item.mass,
      inputs: Object.entries(item.inputs ?? {}).map(([r, q]) => `${q} ${r}`).join(', '),
      disabled,
    };
  });
}

/** Ligne du panneau recherche, déduite de l'état sans DOM (miroir de renderResearch). */
export interface ResearchRow {
  id: string;
  shortName: string;
  techLevel: number;
  current: boolean;
  researched: boolean;
  locked: boolean;
  percentage: number;
  selectable: boolean;
}

/** Items recherchables + progression de chacun (helper pur). */
export function researchRows(state: GameState): ResearchRow[] {
  return RESEARCHABLE_ITEMS.map((it) => {
    const p = state.research.progress[it.id];
    return {
      id: it.id,
      shortName: it.shortName,
      techLevel: it.techLevel!,
      current: state.research.currentItemId === it.id,
      researched: p.researched,
      locked: p.locked,
      percentage: p.percentage,
      selectable: !p.researched && !p.locked,
    };
  });
}

/** Données du panneau personnel, déduites de l'état sans DOM (miroir de renderStaff). */
export interface StaffPanel {
  reservoir: number;
  builderCount: number;
  builderRank: string;
  builderActions: number;
  researchCount: number;
  researchRank: string;
  researchActions: number;
  inTrainingProduction: number;
  inTrainingResearch: number;
  trainingDays: number;
}

export function staffRows(state: GameState): StaffPanel {
  const b = state.planets.earth.factory.builder;
  const r = state.planets.earth.researchTeam;
  return {
    reservoir: state.training.reservoir,
    builderCount: b?.count ?? 0,
    builderRank: b ? rankName(b) : '—',
    builderActions: b?.actionsTaken ?? 0,
    researchCount: r?.count ?? 0,
    researchRank: r ? rankName(r) : '—',
    researchActions: r?.actionsTaken ?? 0,
    inTrainingProduction: state.training.inTraining.production,
    inTrainingResearch: state.training.inTraining.research,
    trainingDays: SIM_CONFIG.STAFF_TRAINING_DAYS,
  };
}

/** Ligne du panneau minage, déduite de l'état sans DOM (miroir de renderMining). */
export interface MiningRow {
  resource: string;
  groundLabel: string;
  stock: number;
}

export function miningRows(state: GameState): MiningRow[] {
  const earth = state.planets.earth;
  return earth.deposits.map((d) => ({
    resource: d.resource,
    groundLabel:
      d.groundAmount > 0 ? `${d.groundAmount} au sol` : d.surveyTicks > 0 ? `sondage : ${d.surveyTicks} j` : 'à sonder',
    stock: earth.stores[d.resource] ?? 0,
  }));
}

export function mountEarthScreen(container: HTMLElement): void {
  container.innerHTML = `
    <nav class="tabs" aria-label="Sections de la Terre">${TABS.map((t) => `<button class="tab" data-tab="${t.id}" aria-pressed="false">${t.label}</button>`).join('')}</nav>
    <div id="panel-host"></div>`;
  for (const btn of container.querySelectorAll<HTMLButtonElement>('.tab')) {
    btn.addEventListener('click', () => {
      active = btn.dataset.tab as Tab;
      render();
    });
  }
  subscribe(render);
  render();
}

function render(): void {
  const host = document.querySelector<HTMLDivElement>('#panel-host')!;
  for (const btn of document.querySelectorAll<HTMLButtonElement>('.tab')) {
    const isActive = btn.dataset.tab === active;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  }
  switch (active) {
    case 'production':
      renderProduction(host);
      break;
    case 'news':
      renderNews(host);
      break;
    case 'research':
      renderResearch(host);
      break;
    case 'staff':
      renderStaff(host);
      break;
    case 'mining':
      renderMining(host);
      break;
  }
}

export function renderProduction(host: HTMLElement): void {
  const earth = getState().planets.earth;
  const rows = productionRows(getState());
  const cur = earth.factory.currentItemId;
  host.innerHTML = `
    <table class="panel-table"><thead><tr><th>Item</th><th>Masse</th><th>Intrants</th><th></th></tr></thead>
    <tbody>${rows
      .map(
        (row) => `<tr>
      <td>${row.shortName}</td>
      <td>${row.mass} t</td>
      <td>${row.inputs}</td>
      <td><button class="hud-btn" data-queue="${row.id}" aria-label="Produire ${row.shortName}" ${row.disabled ? 'disabled' : ''}>Produire</button></td>
    </tr>`,
      )
      .join('')}</tbody></table>
    <div class="queue-line">
      ${cur
        ? `En cours : <strong>${cur}</strong> (valeur ${earth.factory.productionValue}, wraps ${earth.factory.productionComplete}/4)
               <button class="hud-btn" id="cancel-queue" aria-label="Annuler la production en cours">Annuler (travail perdu)</button>`
        : 'Usine inoccupée.'}
    </div>`;
  for (const btn of host.querySelectorAll<HTMLButtonElement>('[data-queue]')) {
    btn.addEventListener('click', () => runAction(queueItem, getState(), { itemId: btn.dataset.queue! }));
  }
  host
    .querySelector('#cancel-queue')
    ?.addEventListener('click', () => runAction(cancelQueueItem, getState(), undefined));
}

function renderNews(host: HTMLElement): void {
  const s = getState();
  host.innerHTML = `<ul class="news-feed">${s.newsFeed.slice().reverse().map((n) => `<li>${esc(n)}</li>`).join('')}</ul>`;
}

function renderResearch(host: HTMLElement): void {
  const s = getState();
  const team = s.planets.earth.researchTeam!;
  const rows = researchRows(s)
    .map((r) => {
      const badge = r.researched ? '✔' : r.locked ? '🔒' : `${r.percentage} %`;
      return `<tr class="${r.current ? 'current' : ''}">
        <td>${esc(r.shortName)}</td><td>tech ${r.techLevel}</td><td>${badge}</td>
        <td>${r.selectable ? `<button class="hud-btn" data-research="${r.id}">Sélectionner</button>` : ''}</td>
      </tr>`;
    })
    .join('');
  host.innerHTML = `<p class="panel-hint">Équipe : ${team.count} ${rankName(team)} — 1 seul projet actif.</p>
    <table class="panel-table"><tbody>${rows}</tbody></table>`;
  for (const btn of host.querySelectorAll<HTMLButtonElement>('[data-research]'))
    btn.addEventListener('click', () => runAction(selectResearch, getState(), { itemId: btn.dataset.research! }));
}

function renderStaff(host: HTMLElement): void {
  const t = staffRows(getState());
  host.innerHTML = `
    <p>Réservoir : <strong>${t.reservoir}</strong> citoyens</p>
    <p>Production : <strong>${t.builderCount}</strong> — ${t.builderRank} (${t.builderActions} actions vers prochain rang)</p>
    <p>Recherche : <strong>${t.researchCount}</strong> — ${t.researchRank} (${t.researchActions} actions)</p>
    <p>En formation : ${t.inTrainingProduction} prod. / ${t.inTrainingResearch} rech. (${t.trainingDays} j)</p>
    <div class="queue-line">
      <button class="hud-btn" id="train-prod">Former 100 producteurs</button>
      <button class="hud-btn" id="train-res">Former 100 chercheurs</button>
    </div>`;
  host.querySelector('#train-prod')?.addEventListener('click', () => runAction(trainStaff, getState(), { type: 'production', count: 100 }));
  host.querySelector('#train-res')?.addEventListener('click', () => runAction(trainStaff, getState(), { type: 'research', count: 100 }));
}

function renderMining(host: HTMLElement): void {
  const s = getState();
  const earth = s.planets.earth;
  const rows = miningRows(s)
    .map((r) => `<tr><td>${esc(r.resource)}</td>
      <td>${esc(r.groundLabel)}</td>
      <td>${r.stock}</td></tr>`)
    .join('');
  host.innerHTML = `<p>Derricks actifs : <strong>${earth.derricks}</strong> (jours pairs) — derricks en stock : ${earth.items['derrick'] ?? 0}</p>
    <table class="panel-table"><thead><tr><th>Matière</th><th>Gisement</th><th>Stock</th></tr></thead><tbody>${rows}</tbody></table>
    <button class="hud-btn" id="install-derrick" ${(earth.items['derrick'] ?? 0) < 1 ? 'disabled' : ''}>Installer un derrick</button>`;
  host.querySelector('#install-derrick')?.addEventListener('click', () => runAction(installDerrick, getState(), undefined));
}
