// HUD: cash and health, wanted stars, the mission objective bar, the
// minimap, the speedometer, dialogue boxes, toasts and every menu screen.
// All drawing is plain canvas so it renders identically everywhere.

import { VIEW_W, VIEW_H, WORLD, PLACES } from './config.js';
import { hasSave } from './save.js';

function star(ctx, x, y, r, fill) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fill ? '#ffd34d' : 'rgba(20,20,20,0.55)';
  ctx.fill();
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 2;
  ctx.stroke();
}

export function drawHUD(ctx, world) {
  const p = world.player;
  const police = world.police;
  const missions = world.missions;

  ctx.textBaseline = 'alphabetic';

  // Cash + health, top left.
  ctx.fillStyle = 'rgba(8,12,8,0.62)';
  roundRect(ctx, 14, 12, 250, 64, 10); ctx.fill();
  ctx.fillStyle = '#7dff8a';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('$' + world.cash.toLocaleString('en-US'), 28, 42);
  ctx.fillStyle = '#fff';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('CASH', 196, 26);
  // Health bar.
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  roundRect(ctx, 28, 52, 150, 10, 5); ctx.fill();
  ctx.fillStyle = world.health > 35 ? '#5dd65d' : '#e74c3c';
  roundRect(ctx, 28, 52, 150 * Math.max(0, world.health / 100), 10, 5); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText('HP ' + Math.max(0, Math.round(world.health)), 186, 62);

  // Wanted stars, top right.
  for (let i = 0; i < 5; i++) {
    star(ctx, VIEW_W - 34 - i * 34, 36, 13, i < police.wanted);
  }
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(police.wanted > 0 ? 'WANTED' : 'CLEAN', VIEW_W - 16, 66);
  ctx.textAlign = 'left';

  // Mission objective bar, top centre.
  if (missions.active || missions.done) {
    const label = missions.done
      ? 'STORY COMPLETE'
      : 'MISSION ' + missions.def.id + ' — ' + missions.def.title.toUpperCase();
    const obj = missions.objectiveText();
    const target = missions.targetPoint();
    const dist = target ? Math.round(Math.hypot(p.x - target.x, p.y - target.y) / 10) + 'm' : '';
    ctx.font = 'bold 13px system-ui, sans-serif';
    const w1 = ctx.measureText(label).width;
    ctx.font = '13px system-ui, sans-serif';
    const w2 = ctx.measureText(obj + '  ' + dist).width;
    const bw = Math.max(w1, w2) + 36;
    ctx.fillStyle = 'rgba(8,12,8,0.62)';
    roundRect(ctx, (VIEW_W - bw) / 2, 12, bw, 56, 10); ctx.fill();
    ctx.fillStyle = '#ffd34d';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, VIEW_W / 2, 32);
    ctx.fillStyle = '#fff';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(obj + (dist ? '  ·  ' + dist : ''), VIEW_W / 2, 54);
    ctx.textAlign = 'left';
  }

  // "THE HEAT IS ON" banner at 3+ stars.
  if (police.wanted >= 3) {
    ctx.fillStyle = 'rgba(180,20,20,0.85)';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const t = '★ THE HEAT IS ON ★';
    const w = ctx.measureText(t).width + 36;
    roundRect(ctx, (VIEW_W - w) / 2, 82, w, 34, 8); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(t, VIEW_W / 2, 106);
    ctx.textAlign = 'left';
  }

  drawMinimap(ctx, world);
  drawToasts(ctx, world);
  if (p.car) drawSpeedometer(ctx, p.car);
  if (missions.dialogueActive()) drawDialogue(ctx, missions.dialogueCurrent());
}

function drawMinimap(ctx, world) {
  const mw = 210, mh = 152;
  const mx = 14, my = VIEW_H - mh - 14;
  const sx = mw / WORLD.w, sy = mh / WORLD.h;
  ctx.fillStyle = 'rgba(8,12,8,0.72)';
  roundRect(ctx, mx - 4, my - 4, mw + 8, mh + 8, 10); ctx.fill();
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, mx, my, mw, mh, 6);
  ctx.clip();
  ctx.fillStyle = '#2f6f8f';
  ctx.fillRect(mx, my, mw, mh);
  ctx.fillStyle = '#3f6a3f';
  ctx.fillRect(mx, my, mw, mh);
  // Roads.
  ctx.strokeStyle = 'rgba(220,220,220,0.75)';
  ctx.lineWidth = 2;
  for (const vx of world.city.roadsV) {
    ctx.beginPath(); ctx.moveTo(mx + vx * sx, my); ctx.lineTo(mx + vx * sx, my + mh); ctx.stroke();
  }
  for (const hy of world.city.roadsH) {
    ctx.beginPath(); ctx.moveTo(mx, my + hy * sy); ctx.lineTo(mx + mw, my + hy * sy); ctx.stroke();
  }
  // Water channel.
  ctx.fillStyle = '#2f6f8f';
  ctx.fillRect(mx + world.city.channel.x0 * sx, my, (world.city.channel.x1 - world.city.channel.x0) * sx, mh);
  // Mission beacon.
  const target = world.missions.targetPoint();
  if (target && world.missions.active) {
    const pulse = 5 + 2.5 * Math.sin(world.time * 5);
    ctx.fillStyle = '#ffd34d';
    ctx.beginPath(); ctx.arc(mx + target.x * sx, my + target.y * sy, pulse, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  // Safehouse.
  ctx.fillStyle = '#7dff8a';
  ctx.fillRect(mx + PLACES.safehouse.x * sx - 3, my + PLACES.safehouse.y * sy - 3, 6, 6);
  // Parked + traffic cars.
  ctx.fillStyle = '#ffe14d';
  for (const c of world.city.parkedCars) ctx.fillRect(mx + c.x * sx - 1.5, my + c.y * sy - 1.5, 3, 3);
  for (const c of world.traffic.cars) ctx.fillRect(mx + c.x * sx - 1.5, my + c.y * sy - 1.5, 3, 3);
  // Police, flashing.
  const flash = Math.sin(world.time * 10) > 0 ? '#ff3b30' : '#3b82ff';
  ctx.fillStyle = flash;
  for (const c of world.police.cruisers) {
    ctx.beginPath(); ctx.arc(mx + c.x * sx, my + c.y * sy, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  // Player.
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(mx + world.player.x * sx, my + world.player.y * sy, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText('SUNSPIRE BAY', mx + 2, my + mh + 2 - 152 + 164);
}

function drawSpeedometer(ctx, car) {
  const mph = Math.round(Math.abs(car.speed) * 0.22);
  ctx.fillStyle = 'rgba(8,12,8,0.62)';
  roundRect(ctx, VIEW_W - 164, VIEW_H - 78, 150, 64, 10); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(String(mph), VIEW_W - 52, VIEW_H - 36);
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('MPH', VIEW_W - 26, VIEW_H - 36);
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  roundRect(ctx, VIEW_W - 150, VIEW_H - 26, 122, 8, 4); ctx.fill();
  ctx.fillStyle = mph > 95 ? '#e74c3c' : '#ffd34d';
  roundRect(ctx, VIEW_W - 150, VIEW_H - 26, 122 * Math.min(1, mph / 120), 8, 4); ctx.fill();
}

function drawToasts(ctx, world) {
  ctx.font = '13px system-ui, sans-serif';
  ctx.textAlign = 'right';
  let y = VIEW_H - 96;
  for (let i = world.toasts.length - 1; i >= 0; i--) {
    const t = world.toasts[i];
    const alpha = Math.min(1, t.life / 1.2);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(8,12,8,0.7)';
    const w = ctx.measureText(t.text).width + 24;
    roundRect(ctx, VIEW_W - w - 16, y - 18, w, 26, 8); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(t.text, VIEW_W - 28, y);
    y -= 32;
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

function drawDialogue(ctx, line) {
  const bw = 760, bh = 96;
  const bx = (VIEW_W - bw) / 2, by = VIEW_H - bh - 24;
  ctx.fillStyle = 'rgba(10,10,16,0.88)';
  roundRect(ctx, bx, by, bw, bh, 12); ctx.fill();
  ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 2;
  roundRect(ctx, bx, by, bw, bh, 12); ctx.stroke();
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText(line.who, bx + 22, by + 28);
  ctx.fillStyle = '#fff';
  ctx.font = '16px system-ui, sans-serif';
  wrapText(ctx, line.text, bx + 22, by + 54, bw - 44, 22);
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('E ▸ continue', bx + bw - 18, by + bh - 14);
  ctx.textAlign = 'left';
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += lineH;
    } else line = test;
  }
  ctx.fillText(line, x, yy);
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Title screen. Returns the button rects so the game can hit-test clicks.
export function drawTitle(ctx, world) {
  ctx.fillStyle = 'rgba(6,8,20,0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, 'rgba(255,170,60,0.10)');
  g.addColorStop(1, 'rgba(6,8,20,0.75)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 84px system-ui, sans-serif';
  ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 18;
  ctx.fillText('SUNSPIRE BAY', VIEW_W / 2, 190);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText('— THE MERIDIAN JOB —', VIEW_W / 2, 238);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('A sun-soaked open-world crime story. Steal cars, dodge the law, pull the job.', VIEW_W / 2, 278);

  const buttons = [];
  const labels = [
    { id: 'new', text: '▶  NEW GAME', key: '1' },
    { id: 'continue', text: '↻  CONTINUE', key: '2', disabled: !hasSave() },
    { id: 'howto', text: '?  HOW TO PLAY', key: '3' },
  ];
  let y = 330;
  for (const b of labels) {
    const bw = 340, bh = 54;
    const bx = (VIEW_W - bw) / 2;
    ctx.fillStyle = b.disabled ? 'rgba(120,120,120,0.5)' : 'rgba(255,211,77,0.92)';
    roundRect(ctx, bx, y, bw, bh, 10); ctx.fill();
    ctx.fillStyle = b.disabled ? '#ddd' : '#141414';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText(b.text + '   [' + b.key + ']', VIEW_W / 2, y + 36);
    buttons.push({ id: b.id, x: bx, y, w: bw, h: bh, disabled: !!b.disabled });
    y += 70;
  }
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('An original game by @agenticgangster — no Rockstar content, all art and sound made in code.', VIEW_W / 2, y + 26);
  ctx.textAlign = 'left';
  return buttons;
}

export function drawHowTo(ctx) {
  ctx.fillStyle = 'rgba(6,8,20,0.82)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.fillText('HOW TO PLAY', VIEW_W / 2, 120);
  const lines = [
    'WASD / Arrows — walk or drive (Shift to run)',
    'E — steal a car, enter / exit, talk, pick up',
    'Mouse — aim your pistol, click to shoot',
    'Follow the gold beacon: 4 missions, one big payout',
    'Wanted stars bring the police — break line of sight to cool off',
    'Esc — pause. Progress saves automatically.',
    '',
    'Press Esc or click anywhere to go back',
  ];
  ctx.font = '18px system-ui, sans-serif';
  lines.forEach((l, i) => ctx.fillText(l, VIEW_W / 2, 190 + i * 40));
  ctx.textAlign = 'left';
}

export function drawBusted(ctx) {
  ctx.fillStyle = 'rgba(20,4,4,0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5a4d';
  ctx.font = 'bold 72px system-ui, sans-serif';
  ctx.fillText('BUSTED', VIEW_W / 2, 320);
  ctx.fillStyle = '#fff';
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('The cops caught you. You lose $50 and wake up at the safehouse.', VIEW_W / 2, 372);
  ctx.fillText('Press Enter to continue', VIEW_W / 2, 412);
  ctx.textAlign = 'left';
}

export function drawComplete(ctx, world) {
  ctx.fillStyle = 'rgba(6,16,8,0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 56px system-ui, sans-serif';
  ctx.fillText('THE MERIDIAN JOB', VIEW_W / 2, 280);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText('IS DONE', VIEW_W / 2, 326);
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('Final cash: $' + world.cash.toLocaleString('en-US') + '  ·  Sunspire Bay is yours.', VIEW_W / 2, 384);
  ctx.fillText('Press Enter to keep playing the open city', VIEW_W / 2, 424);
  ctx.textAlign = 'left';
}
