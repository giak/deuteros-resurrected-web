/**
 * Écran Terre (task 9, B1+B2) — coquille à onglets + panneau Production.
 * L'onglet Bulletins rend le fil des 8 derniers bulletins ; Production liste
 * les items queueables au sol (GROUND_ITEMS) avec Produire / Annuler.
 * Les helpers purs (productionRows) sont exportés pour les tests hors DOM.
 */
import { GROUND_ITEMS, type GameState } from '@/simulation';
import { getState, subscribe } from '@/state/store';
import { cancelQueueItem, queueItem, runAction } from '@/actions';

type Tab = 'news' | 'production' | 'research' | 'staff' | 'mining';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'news', label: 'Bulletins' },
  { id: 'production', label: 'Production' },
  { id: 'research', label: 'Recherche' },
  { id: 'staff', label: 'Personnel' },
  { id: 'mining', label: 'Minage' },
];

let active: Tab = 'production';

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
    // tasks 10 : research / staff / mining
    default:
      host.innerHTML = `<p class="news-empty">Panneau à venir (task 10).</p>`;
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
  host.innerHTML = `<ul class="news-feed">${s.newsFeed.slice().reverse().map((n) => `<li>${n}</li>`).join('')}</ul>`;
}