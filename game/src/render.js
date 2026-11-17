// Rendering: the whole city from the top down — ground, water, roads, the
// bridge, buildings with shadows, parks, cars, pedestrians, the player,
// gunfire and the mission beacon — under warm daylight.

import { VIEW_W, VIEW_H, WORLD, ROAD_W, COLORS, PLACES } from './config.js';
import { roundRect } from './hud.js';

export function drawWorld(ctx, world) {
  const cam = world.camera;
  const ox = VIEW_W / 2 - cam.x;
  const oy = VIEW_H / 2 - cam.y;
  ctx.save();
  ctx.translate(ox, oy);

  drawGround(ctx, world);
  drawRoads(ctx, world);
  drawDocksProps(ctx, world);
  drawParks(ctx, world);
  drawBuildings(ctx, world);
  drawBeacon(ctx, world);
  drawParkedCars(ctx, world);
  for (const c of world.traffic.cars) drawCar(ctx, c.x, c.y, c.angle, c.color, c.model, false);
  for (const c of world.police.cruisers) drawPoliceCar(ctx, c, world.time);
  for (const p of world.traffic.peds) drawPedestrian(ctx, p, world.time);
  drawGoons(ctx, world);
  drawPlayer(ctx, world);
  drawBullets(ctx, world);
  drawParticles(ctx, world);
  drawMuzzle(ctx, world);

  ctx.restore();
  drawSunlight(ctx);
  drawEdgeArrow(ctx, world);
}

function drawGround(ctx, world) {
  // Grass base with a checker of mown tones.
  ctx.fillStyle = COLORS.grass;
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);
  ctx.fillStyle = COLORS.grassAlt;
  const step = 220;
  for (let x = 0; x < WORLD.w; x += step) {
    for (let y = 0; y < WORLD.h; y += step) {
      if (((x + y) / step) % 2 === 0) ctx.fillRect(x, y, step, step);
    }
  }
  // Sand along the harbour edge.
  ctx.fillStyle = COLORS.sand;
  ctx.fillRect(3460, 0, 40, WORLD.h);
  // Water: the channel and the harbour strip.
  ctx.fillStyle = COLORS.water;
  ctx.fillRect(world.city.channel.x0, 0, world.city.channel.x1 - world.city.channel.x0, WORLD.h);
  ctx.fillRect(3500, 0, 100, WORLD.h);
  ctx.fillStyle = COLORS.waterDeep;
  ctx.fillRect(3520, 0, 80, WORLD.h);
  // Shimmer lines on the water.
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2;
  for (let y = 60; y < WORLD.h; y += 130) {
    const wob = Math.sin(world.time * 1.4 + y * 0.02) * 8;
    ctx.beginPath();
    ctx.moveTo(world.city.channel.x0 + 18 + wob, y);
    ctx.lineTo(world.city.channel.x1 - 18 + wob, y);
    ctx.stroke();
  }
  // Piers.
  ctx.fillStyle = '#8a6a4a';
  for (const pier of world.city.piers) ctx.fillRect(pier.x, pier.y, pier.w, pier.h);
}

function drawRoads(ctx, world) {
  const half = ROAD_W / 2;
  // Road beds.
  ctx.fillStyle = COLORS.asphalt;
  for (const vx of world.city.roadsV) {
    // Vertical roads stop at the channel — only the 3200 avenue runs east.
    ctx.fillRect(vx - half, 0, ROAD_W, WORLD.h);
  }
  for (const hy of world.city.roadsH) {
    if (hy === 1100) {
      ctx.fillRect(0, hy - half, WORLD.w, ROAD_W);
    } else {
      ctx.fillRect(0, hy - half, world.city.channel.x0, ROAD_W);
      ctx.fillRect(world.city.channel.x1, hy - half, WORLD.w - world.city.channel.x1, ROAD_W);
    }
  }
  // The channel swallows the middle of every road but the bridge street.
  ctx.fillStyle = COLORS.water;
  for (const hy of world.city.roadsH) {
    if (hy !== 1100) ctx.fillRect(world.city.channel.x0, hy - half, world.city.channel.x1 - world.city.channel.x0, ROAD_W);
  }
  // Bridge deck over the channel.
  ctx.fillStyle = COLORS.bridgeDeck;
  ctx.fillRect(world.city.channel.x0 - 8, world.city.bridge.y0, world.city.channel.x1 - world.city.channel.x0 + 16, world.city.bridge.y1 - world.city.bridge.y0);
  ctx.strokeStyle = '#e8d44d';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(world.city.channel.x0 - 8, 1100); ctx.lineTo(world.city.channel.x1 + 8, 1100);
  ctx.stroke();
  // Lane dashes.
  ctx.fillStyle = COLORS.lane;
  for (const vx of world.city.roadsV) {
    for (let y = 40; y < WORLD.h; y += 64) ctx.fillRect(vx - 2, y, 4, 30);
  }
  for (const hy of world.city.roadsH) {
    for (let x = 40; x < WORLD.w; x += 64) {
      if (hy !== 1100 && x > world.city.channel.x0 - 40 && x < world.city.channel.x1 + 40) continue;
      ctx.fillRect(x, hy - 2, 30, 4);
    }
  }
  // Sidewalks.
  ctx.strokeStyle = COLORS.sidewalk;
  ctx.lineWidth = 10;
  for (const vx of world.city.roadsV) {
    ctx.beginPath(); ctx.moveTo(vx - half - 5, 0); ctx.lineTo(vx - half - 5, WORLD.h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(vx + half + 5, 0); ctx.lineTo(vx + half + 5, WORLD.h); ctx.stroke();
  }
  for (const hy of world.city.roadsH) {
    ctx.beginPath(); ctx.moveTo(0, hy - half - 5); ctx.lineTo(WORLD.w, hy - half - 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, hy + half + 5); ctx.lineTo(WORLD.w, hy + half + 5); ctx.stroke();
  }
  // District labels painted on the ground.
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('DOWNTOWN', 850, 420);
  ctx.fillText('OLD TOWN', 2350, 420);
  ctx.fillText('MOTEL ROW', 850, 2260);
  ctx.fillText('DOCKS', 3340, 420);
  ctx.textAlign = 'left';
}

function drawDocksProps(ctx, world) {
  // Container stacks and harbour cranes: flat top-down props, no collision.
  const containers = [
    { x: 3280, y: 380, c: '#b0563a' }, { x: 3280, y: 420, c: '#4a7a9a' },
    { x: 3380, y: 520, c: '#9a8a4a' }, { x: 3260, y: 2260, c: '#7a6a8a' },
    { x: 3360, y: 2300, c: '#4a7a5a' },
  ];
  for (const k of containers) {
    ctx.fillStyle = k.c;
    ctx.fillRect(k.x, k.y, 64, 26);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(k.x, k.y, 64, 6);
  }
  for (const cy of [900, 2050]) {
    ctx.strokeStyle = '#e8b93b';
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(3460, cy); ctx.lineTo(3460, cy - 90); ctx.lineTo(3400, cy - 90); ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(3400, cy - 90); ctx.lineTo(3400, cy - 40); ctx.stroke();
  }
}

function drawParks(ctx, world) {
  for (const park of world.city.parks) {
    ctx.fillStyle = COLORS.park;
    roundRect(ctx, park.x, park.y, park.w, park.h, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  for (const t of world.city.trees) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.arc(t.x + 5, t.y + 6, t.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2e6b2e';
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a9a3a';
    ctx.beginPath(); ctx.arc(t.x - 3, t.y - 3, t.r * 0.6, 0, Math.PI * 2); ctx.fill();
  }
}

function drawBuildings(ctx, world) {
  for (const b of world.city.buildings) {
    // Soft shadow to the south-east.
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    roundRect(ctx, b.x + 10, b.y + 12, b.w, b.h, 6);
    ctx.fill();
    ctx.fillStyle = b.color;
    roundRect(ctx, b.x, b.y, b.w, b.h, 6);
    ctx.fill();
    // Roof detail.
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    roundRect(ctx, b.x + 8, b.y + 8, b.w - 16, Math.min(22, b.h - 16), 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    const cols = Math.max(1, Math.floor(b.w / 34));
    const rows = Math.max(1, Math.floor(b.h / 34));
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        ctx.fillRect(b.x + 12 + i * 34, b.y + 12 + j * 34, 14, 12);
      }
    }
  }
  // Named places get a sign.
  drawSign(ctx, PLACES.garage.x, PLACES.garage.y, "RAY'S GARAGE", '#ffd34d');
  drawSign(ctx, PLACES.motel.x, PLACES.motel.y, 'MOTEL', '#7dd8ff');
  drawSign(ctx, PLACES.safehouse.x, PLACES.safehouse.y, 'SAFEHOUSE', '#7dff8a');
  drawSign(ctx, PLACES.warehouse.x, PLACES.warehouse.y, 'MERIDIAN WAREHOUSE', '#ff9a5a');
}

function drawSign(ctx, x, y, text, color) {
  ctx.font = 'bold 13px system-ui, sans-serif';
  const w = ctx.measureText(text).width + 18;
  ctx.fillStyle = 'rgba(10,10,14,0.8)';
  roundRect(ctx, x - w / 2, y - 34, w, 22, 6);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y - 18);
  ctx.textAlign = 'left';
}

function drawBeacon(ctx, world) {
  const target = world.missions.targetPoint();
  if (!target || !world.missions.active) return;
  const pulse = 1 + 0.12 * Math.sin(world.time * 5);
  ctx.strokeStyle = 'rgba(255,211,77,0.9)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(target.x, target.y, 34 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(target.x, target.y, 12, 0, Math.PI * 2);
  ctx.stroke();
  // Light pillar.
  const g = ctx.createLinearGradient(target.x, target.y - 260, target.x, target.y);
  g.addColorStop(0, 'rgba(255,211,77,0)');
  g.addColorStop(1, 'rgba(255,211,77,0.35)');
  ctx.fillStyle = g;
  ctx.fillRect(target.x - 12, target.y - 260, 24, 260);
  // Payout crate in mission 4.
  if (world.missions.crate) {
    const c = world.missions.crate;
    ctx.fillStyle = '#8a6a2a';
    ctx.fillRect(c.x - 16, c.y - 12, 32, 24);
    ctx.fillStyle = '#ffd34d';
    ctx.fillRect(c.x - 16, c.y - 2, 32, 4);
  }
}

function drawParkedCars(ctx, world) {
  for (const c of world.city.parkedCars) drawCar(ctx, c.x, c.y, c.angle, c.color, c.model, false);
}

export function drawCar(ctx, x, y, angle, color, model, isPlayer) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const len = model === 'van' ? 52 : 44;
  const wid = model === 'van' ? 26 : 22;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  roundRect(ctx, -len / 2 + 4, -wid / 2 + 5, len, wid, 7);
  ctx.fill();
  ctx.fillStyle = color;
  roundRect(ctx, -len / 2, -wid / 2, len, wid, 7);
  ctx.fill();
  ctx.fillStyle = 'rgba(180,220,255,0.85)';
  roundRect(ctx, -len / 2 + 10, -wid / 2 + 3, 12, wid - 6, 3);
  ctx.fill();
  roundRect(ctx, len / 2 - 20, -wid / 2 + 3, 10, wid - 6, 3);
  ctx.fill();
  ctx.fillStyle = '#222';
  ctx.fillRect(-len / 2 + 4, -wid / 2 - 3, 10, 5);
  ctx.fillRect(-len / 2 + 4, wid / 2 - 2, 10, 5);
  ctx.fillRect(len / 2 - 14, -wid / 2 - 3, 10, 5);
  ctx.fillRect(len / 2 - 14, wid / 2 - 2, 10, 5);
  if (isPlayer) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    roundRect(ctx, -len / 2 - 2, -wid / 2 - 2, len + 4, wid + 4, 8);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPoliceCar(ctx, c, time) {
  drawCar(ctx, c.x, c.y, c.angle, '#1c2733', 'sedan', false);
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(c.angle);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 9px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PD', 0, 3);
  ctx.restore();
  const flash = Math.sin(time * 12) > 0;
  ctx.fillStyle = flash ? '#ff3b30' : '#3b82ff';
  ctx.beginPath();
  ctx.arc(c.x - Math.cos(c.angle) * 6, c.y - Math.sin(c.angle) * 6, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.arc(c.x - Math.cos(c.angle) * 6, c.y - Math.sin(c.angle) * 6, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawPedestrian(ctx, p, time) {
  const bob = Math.sin(p.walkPhase) * 1.5;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(p.x + 2, p.y + 3, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = p.color;
  ctx.beginPath(); ctx.arc(p.x, p.y + bob * 0.3, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8c39a';
  ctx.beginPath(); ctx.arc(p.x, p.y - 2 + bob * 0.3, 4.5, 0, Math.PI * 2); ctx.fill();
}

function drawGoons(ctx, world) {
  for (const g of world.combat.goons) {
    if (g.alive) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(g.x + 2, g.y + 3, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = g.color;
      ctx.beginPath(); ctx.arc(g.x, g.y, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8c39a';
      ctx.beginPath(); ctx.arc(g.x, g.y - 2, 5, 0, Math.PI * 2); ctx.fill();
      // Gun barrel toward the player.
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(g.x, g.y);
      ctx.lineTo(g.x + Math.cos(g.angle) * 18, g.y + Math.sin(g.angle) * 18);
      ctx.stroke();
      // HP pips.
      for (let i = 0; i < g.hp; i++) {
        ctx.fillStyle = '#ff5a4d';
        ctx.fillRect(g.x - 12 + i * 9, g.y - 20, 7, 3);
      }
    } else {
      // Downed body stays on the ground.
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(g.x, g.y, 13, 7, 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6a3a3a';
      ctx.beginPath(); ctx.ellipse(g.x, g.y, 11, 6, 0.4, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawPlayer(ctx, world) {
  const p = world.player;
  if (p.car) {
    drawCar(ctx, p.car.x, p.car.y, p.car.angle, p.car.color, p.car.model, true);
    return;
  }
  const a = p.aimAngle || 0;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(p.x + 2, p.y + 3, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f5d76e';
  ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#20242e';
  ctx.beginPath(); ctx.arc(p.x, p.y - 2, 5.5, 0, Math.PI * 2); ctx.fill();
  // Pistol toward the aim.
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + Math.cos(a) * 18, p.y + Math.sin(a) * 18);
  ctx.stroke();
  // Direction tick.
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(p.moveAngle || 0) * 8, p.y + Math.sin(p.moveAngle || 0) * 8, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawBullets(ctx, world) {
  for (const b of world.combat.bullets) {
    ctx.strokeStyle = '#ffe14d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.012, b.y - b.vy * 0.012);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
}

function drawParticles(ctx, world) {
  for (const pt of world.combat.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / 0.25);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - 2, pt.y - 2, 4, 4);
  }
  ctx.globalAlpha = 1;
}

function drawMuzzle(ctx, world) {
  const m = world.combat.muzzle;
  if (!m) return;
  const g = ctx.createRadialGradient(m.x, m.y, 2, m.x, m.y, 34);
  g.addColorStop(0, 'rgba(255,240,160,0.95)');
  g.addColorStop(0.4, 'rgba(255,180,60,0.7)');
  g.addColorStop(1, 'rgba(255,140,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(m.x, m.y, 34, 0, Math.PI * 2); ctx.fill();
}

function drawSunlight(ctx) {
  const g = ctx.createRadialGradient(180, 90, 60, 180, 90, 900);
  g.addColorStop(0, 'rgba(255,220,140,0.10)');
  g.addColorStop(1, 'rgba(255,220,140,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function drawEdgeArrow(ctx, world) {
  const target = world.missions.targetPoint();
  if (!target || !world.missions.active || world.mode !== 'playing') return;
  const p = world.player;
  const sx = VIEW_W / 2 + (target.x - p.x);
  const sy = VIEW_H / 2 + (target.y - p.y);
  if (sx > 40 && sx < VIEW_W - 40 && sy > 40 && sy < VIEW_H - 40) return;
  const cx = Math.max(50, Math.min(VIEW_W - 50, sx));
  const cy = Math.max(50, Math.min(VIEW_H - 50, sy));
  const a = Math.atan2(sy - cy, sx - cx);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(a);
  ctx.fillStyle = '#ffd34d';
  ctx.beginPath();
  ctx.moveTo(18, 0); ctx.lineTo(-10, -12); ctx.lineTo(-4, 0); ctx.lineTo(-10, 12);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}
