// Screenshot staging: ?shot=start|street|chase|mission places the game in a
// fixed, seeded state so the four screenshots each show a different system.

import { PLACES } from './config.js';

const MISSION_GOON_SPOTS = [
  { x: 3300, y: 1640 }, { x: 3420, y: 1660 }, { x: 3360, y: 1800 },
  { x: 3280, y: 1760 }, { x: 3440, y: 1780 },
];

export function applyShot(game, name) {
  const p = game.player;
  game.missions.dialogue = [];
  game.toasts = [];

  if (name === 'start') {
    // Title screen over the living city; the menu draws itself.
    game.mode = 'title';
    game.camera.x = 850;
    game.camera.y = 600;
    return;
  }

  game.mode = 'playing';

  if (name === 'street') {
    // On foot downtown, traffic and pedestrians around, mission 1 live.
    game.missions.index = 0;
    game.missions.step = 0;
    p.x = 1250; p.y = 1150;
    p.car = null;
    p.aimAngle = -0.6;
    game.cash = 120;
    game.police.wanted = 0;
    game.camera.x = p.x;
    game.camera.y = p.y;
    return;
  }

  if (name === 'chase') {
    // Driving fast down Harbor Avenue, 3 stars, cruisers on the tail.
    game.missions.index = 2;
    game.missions.step = 0;
    p.car = { x: 1700, y: 1100, angle: 0, speed: 380, color: '#c0392b', model: 'sedan' };
    p.x = p.car.x; p.y = p.car.y;
    game.police.wanted = 3;
    game.police.cruisers = [
      { x: 1480, y: 1080, angle: 0, speed: 430 },
      { x: 1380, y: 1140, angle: 0.1, speed: 420 },
      { x: 1560, y: 1180, angle: -0.1, speed: 440 },
    ];
    game.camera.x = p.x + 120;
    game.camera.y = p.y;
    return;
  }

  if (name === 'mission') {
    // Mission 4 firefight at the docks warehouse, muzzle flash mid-burst.
    game.missions.index = 3;
    game.missions.step = 1;
    p.x = 3300; p.y = 1560;
    p.car = null;
    p.aimAngle = Math.atan2(1700 - p.y, 3360 - p.x);
    game.combat.spawnGoons(MISSION_GOON_SPOTS);
    game.combat.bullets.push({
      x: 3330, y: 1620,
      vx: Math.cos(p.aimAngle) * 780, vy: Math.sin(p.aimAngle) * 780,
      friendly: true, life: 0.5,
    });
    game.combat.muzzle = { x: p.x + Math.cos(p.aimAngle) * 26, y: p.y + Math.sin(p.aimAngle) * 26, t: 0.07 };
    game.police.wanted = 2;
    game.cash = 2720;
    game.camera.x = 3340;
    game.camera.y = 1680;
    return;
  }

  // Unknown ?shot= falls back to the title screen.
  game.mode = 'title';
}
