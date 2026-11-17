// Bootstrap: create the game, run the frame loop, and expose a small live
// state object for playtesting and screenshot staging.

import { Game } from './game.js';
import { VIEW_W, VIEW_H } from './config.js';

const canvas = document.getElementById('game');
const game = new Game(canvas);

let last = performance.now();
function loop(now) {
  const dt = (now - last) / 1000;
  last = now;
  try {
    game.frame(dt);
  } catch (err) {
    console.error('frame error (recovered):', err);
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Live state for automated playtests (read-only from outside).
window.__game = {
  get mode() { return game.mode; },
  get cash() { return game.cash; },
  get health() { return game.health; },
  get wanted() { return game.police.wanted; },
  get missionIndex() { return game.missions.index; },
  get missionStep() { return game.missions.step; },
  get missionTitle() { return game.missions.active ? game.missions.def.title : 'done'; },
  get objective() { return game.missions.objectiveText(); },
  get storyComplete() { return game.missions.done; },
  get dialogueActive() { return game.missions.dialogueActive(); },
  get toasts() { return game.toasts.map((t) => t.text); },
  get player() {
    const p = game.player;
    return {
      x: p.x, y: p.y, angle: p.car ? p.car.angle : p.moveAngle,
      speed: p.car ? p.car.speed : Math.hypot(p.vx, p.vy),
      onFoot: !p.car, health: game.health,
      aimAngle: p.aimAngle,
    };
  },
  get target() { return game.missions.targetPoint(); },
  get goons() {
    return game.combat.goons.map((g) => ({ x: g.x, y: g.y, alive: g.alive, hp: g.hp }));
  },
  get goonsAlive() { return game.combat.goonsAlive; },
  get bullets() {
    return game.combat.bullets.map((b) => ({ x: Math.round(b.x), y: Math.round(b.y), life: +b.life.toFixed(2), friendly: b.friendly }));
  },
  get mouse() { return { x: Math.round(game.input.mouse.x), y: Math.round(game.input.mouse.y), down: game.input.mouse.down }; },
  get camera() { return { x: game.camera.x, y: game.camera.y }; },
  get view() { return { w: VIEW_W, h: VIEW_H }; },
  get parkedCars() {
    return game.city.parkedCars.map((c) => ({ x: c.x, y: c.y }));
  },
  get policeCount() { return game.police.cruisers.length; },
  get roadGraph() { return game.roadGraph; },
  worldToScreen(x, y) {
    return {
      x: VIEW_W / 2 + (x - game.camera.x),
      y: VIEW_H / 2 + (y - game.camera.y),
    };
  },
};
