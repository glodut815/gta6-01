// Wanted level and the police who answer it. Cruisers spawn at the city edge,
// chase the player, ram their car, and arrest them if they catch them slow.
// Wanted decays once the player breaks line of sight and stays quiet.

import { MAX_WANTED } from './config.js';
import { collideWorld } from './city.js';

export class Police {
  constructor(city) {
    this.city = city;
    this.cruisers = [];
    this.wanted = 0;
    this.quietTimer = 0;
    this.decayTimer = 0;
    this.arrestTimer = 0;
    this.spawnTimer = 0;
  }

  // A crime was committed in view. Wanted only ever rises here.
  commitCrime(level) {
    this.wanted = Math.max(this.wanted, Math.min(MAX_WANTED, level));
    this.quietTimer = 0;
    this.decayTimer = 0;
  }

  update(dt, world) {
    const p = world.player;
    const playerSpeed = p.car ? Math.abs(p.car.speed) : Math.hypot(p.vx || 0, p.vy || 0);

    // Wanted decays after 9 quiet seconds, one star per 7 seconds.
    this.quietTimer += dt;
    if (this.quietTimer > 9 && this.wanted > 0) {
      this.decayTimer += dt;
      if (this.decayTimer > 7) {
        this.wanted -= 1;
        this.decayTimer = 0;
        if (this.wanted === 0) world.addToast('You lost the cops.');
      }
    }

    // Spawn cruisers up to the wanted level, from the city edge.
    this.spawnTimer -= dt;
    if (this.cruisers.length < this.wanted && this.spawnTimer <= 0) {
      this.spawnTimer = 1.2;
      const edge = Math.floor(Math.random() * 4);
      let x = 200, y = 200;
      if (edge === 0) { x = p.x + 700; y = p.y - 500; }
      if (edge === 1) { x = p.x - 700; y = p.y + 500; }
      if (edge === 2) { x = p.x - 500; y = p.y - 700; }
      if (edge === 3) { x = p.x + 500; y = p.y + 700; }
      x = Math.max(80, Math.min(3520, x));
      y = Math.max(80, Math.min(2520, y));
      this.cruisers.push({ x, y, angle: Math.atan2(p.y - y, p.x - x), speed: 0 });
    }
    // Extra cruisers leave when the heat drops.
    while (this.cruisers.length > this.wanted) this.cruisers.pop();

    let nearest = Infinity;
    for (const c of this.cruisers) {
      const dx = p.x - c.x, dy = p.y - c.y;
      const dist = Math.hypot(dx, dy);
      nearest = Math.min(nearest, dist);
      const wantAngle = Math.atan2(dy, dx);
      let diff = normAngle(wantAngle - c.angle);
      const turn = 2.6;
      c.angle += Math.max(-turn * dt, Math.min(turn * dt, diff));
      const targetSpeed = dist > 260 ? 470 : 430;
      c.speed += Math.max(-500 * dt, Math.min(320 * dt, targetSpeed - c.speed));
      const nx = c.x + Math.cos(c.angle) * c.speed * dt;
      const ny = c.y + Math.sin(c.angle) * c.speed * dt;
      if (!collideWorld(this.city, nx, ny, 18)) { c.x = nx; c.y = ny; }
      else { c.angle += 0.9 * dt * 4; c.speed *= 0.6; }

      // Ram: shove the player's car and slow it.
      if (dist < 46) {
        if (p.car) {
          p.car.speed *= 0.92;
          p.car.x += Math.cos(c.angle) * 26 * dt * 8;
          p.car.y += Math.sin(c.angle) * 26 * dt * 8;
          world.audio.thud();
        } else if (playerSpeed < 60) {
          this.arrestTimer += dt;
        }
      }
    }

    // Arrested: caught slow with a cruiser on top of you.
    if (this.cruisers.length && nearest < 70 && playerSpeed < 50) {
      this.arrestTimer += dt;
      if (this.arrestTimer > 2.2) {
        this.arrestTimer = 0;
        world.onBusted();
      }
    } else {
      this.arrestTimer = Math.max(0, this.arrestTimer - dt * 2);
    }
    // Any cruiser close by keeps the heat alive.
    if (nearest < 520) this.quietTimer = 0;
  }

  clear() {
    this.cruisers = [];
    this.wanted = 0;
    this.arrestTimer = 0;
  }
}

export function normAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
