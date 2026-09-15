/**
 * Rendu Canvas 2D de la vue système (ARCHITECTURE §2.5) — projette l'état,
 * ne le mute jamais. Sprites procéduraux : étoile, anneaux d'orbite, corps,
 * lunes offsetées, indicateurs (colonie Méthanoïde, segment, exploitation).
 */
import { getState } from '@/state/store';
import { SOL_BODIES } from '@/simulation';

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

/** Distance orbitale en pixels = base + order × spacing (ordre 0 = Mercure). */
const ORBIT_BASE = 60;
const ORBIT_SPACING = 34;
const MOON_OFFSET = 10;

const BODY_COLORS: Record<string, string> = {
  mercury: '#9c8f7f', venus: '#d9b26a', earth: '#4f86d4', mars: '#c1543a',
  asteroids: '#7a7a72', jupiter: '#c99b6a', saturn: '#d9c391', uranus: '#8fd1d6',
  neptune: '#4a6fd1', pluto: '#b0a49a', decuria: '#8f86b5', the_moon: '#b8b8b0',
  phobos: '#8d7a6a', deimos: '#96826f',
};

function bodyColor(id: string): string {
  return BODY_COLORS[id] ?? '#a8a8a0';
}

function orbitRadius(order: number): number {
  return ORBIT_BASE + Math.max(order, 0) * ORBIT_SPACING;
}

/** Angle initial : étale les corps sur le cercle (angle d'or, déterministe). */
function baseAngle(order: number): number {
  return (order * 2.39996) % (Math.PI * 2);
}

export function drawSystem(ctx: CanvasRenderingContext2D, cam: Camera, time: number): void {
  const state = getState();
  const { width, height } = ctx.canvas;

  ctx.fillStyle = '#050508';
  ctx.fillRect(0, 0, width, height);
  drawStarfield(ctx, time);

  ctx.save();
  ctx.translate(width / 2 + cam.x, height / 2 + cam.y);
  ctx.scale(cam.zoom, cam.zoom);

  const solPlanets = SOL_BODIES.filter((b) => b.starId === 'the_sun' && b.type === 'planet');
  const solMoons = SOL_BODIES.filter((b) => b.starId === 'the_sun' && b.type === 'moon');

  drawStar(ctx);

  for (const p of solPlanets) {
    const r = orbitRadius(p.order);
    const a = baseAngle(p.order) + time * 0.00008 * (1 / (1 + p.order * 0.15));
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;

    // Anneau d'orbite
    ctx.strokeStyle = 'rgba(120, 140, 180, 0.14)';
    ctx.lineWidth = 1 / cam.zoom;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    // Repère v1 : orbite terrestre en pointillés
    if (p.id === 'earth') {
      ctx.strokeStyle = 'rgba(90, 200, 140, 0.5)';
      ctx.setLineDash([4 / cam.zoom, 4 / cam.zoom]);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    drawBody(ctx, p.id, x, y, planetSize(p.id));

    // Lunes : petites orbites autour du parent
    let mi = 0;
    for (const m of solMoons) {
      if (m.moonParentId !== p.id) continue;
      const mr = planetSize(p.id) + 8 + mi * MOON_OFFSET;
      const ma = a * 2 + mi * 1.7;
      drawBody(ctx, m.id, x + Math.cos(ma) * mr, y + Math.sin(ma) * mr, 2.5);
      mi += 1;
    }

    const rt = state.planets[p.id];
    if (rt) drawIndicators(ctx, x, y, planetSize(p.id), rt.activeMethanoid, rt.segment !== null, rt.derricks > 0);
  }

  ctx.restore();
}

function drawStarfield(ctx: CanvasRenderingContext2D, time: number): void {
  const { width, height } = ctx.canvas;
  const rnd = (i: number) => {
    const x = Math.sin(i * 127.1) * 43758.5453;
    return x - Math.floor(x);
  };
  for (let i = 0; i < 140; i++) {
    const x = rnd(i) * width;
    const y = rnd(i + 1000) * height;
    const tw = 0.35 + 0.3 * Math.sin(time * 0.001 + i);
    ctx.fillStyle = `rgba(220, 224, 240, ${tw.toFixed(2)})`;
    ctx.fillRect(x, y, 1.4, 1.4);
  }
}

function drawStar(ctx: CanvasRenderingContext2D): void {
  const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 34);
  grad.addColorStop(0, '#fff3c2');
  grad.addColorStop(0.35, '#f5c542');
  grad.addColorStop(1, 'rgba(245, 197, 66, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe08a';
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();
}

function planetSize(id: string): number {
  switch (id) {
    case 'jupiter': return 10;
    case 'saturn': return 9;
    case 'uranus':
    case 'neptune': return 7;
    case 'earth':
    case 'venus': return 6;
    case 'mars':
    case 'mercury': return 4.5;
    default: return 5;
  }
}

function drawBody(ctx: CanvasRenderingContext2D, id: string, x: number, y: number, size: number): void {
  ctx.fillStyle = bodyColor(id);
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();
  // Liseré sombre côté anti-étoile (suggestion d'éclairage)
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, size - 0.75, Math.PI * 0.25, Math.PI * 1.25);
  ctx.stroke();
}

function drawIndicators(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  methanoid: boolean,
  segment: boolean,
  mined: boolean,
): void {
  // Colonie Méthanoïde : croix rouge
  if (methanoid) {
    ctx.strokeStyle = '#e04a3a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - size - 6, y - size - 6);
    ctx.lineTo(x - size - 2, y - size - 2);
    ctx.moveTo(x - size - 2, y - size - 6);
    ctx.lineTo(x - size - 6, y - size - 2);
    ctx.stroke();
  }
  // Segment Hydroïde : losange doré
  if (segment) {
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(x + size + 5, y - size - 2);
    ctx.lineTo(x + size + 8, y - size - 5);
    ctx.lineTo(x + size + 11, y - size - 2);
    ctx.lineTo(x + size + 8, y + 1);
    ctx.closePath();
    ctx.fill();
  }
  // Exploitation : point vert
  if (mined) {
    ctx.fillStyle = '#59c96a';
    ctx.beginPath();
    ctx.arc(x, y - size - 4, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}
