// Combat: the player's pistol, bullets, muzzle flash and the armed goons who
// guard the Meridian payout. A mission step completes when every goon is down
// — their bodies stay down, they never despawn mid-mission.

import { collideWorld } from './city.js';

export class Combat {
  constructor(city) {
    this.city = city;
    this.bullets = [];
    this.goons = [];
    this.muzzle = null; // {x, y, t} — drawn as a flash while t > 0
    this.fireCooldown = 0;
    this.particles = [];
  }

  spawnGoons(spots) {
    this.goons = spots.map((s, i) => ({
      x: s.x, y: s.y, angle: 0, hp: 3, alive: true,
      shootTimer: 1 + i * 0.4, color: '#5a2e2e', id: i,
    }));
  }

  clearGoons() { this.goons = []; }

  get goonsAlive() { return this.goons.filter((g) => g.alive).length; }

  playerShoot(fromX, fromY, angle, world) {
    if (this.fireCooldown > 0) return false;
    this.fireCooldown = 0.24;
    const mx = fromX + Math.cos(angle) * 26;
    const my = fromY + Math.sin(angle) * 26;
    this.bullets.push({ x: mx, y: my, vx: Math.cos(angle) * 780, vy: Math.sin(angle) * 780, friendly: true, life: 0.9 });
    this.muzzle = { x: mx, y: my, t: 0.07 };
    world.audio.shot();
    return true;
  }

  update(dt, world) {
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    if (this.muzzle) {
      this.muzzle.t -= dt;
      if (this.muzzle.t <= 0) this.muzzle = null;
    }
    const p = world.player;

    // Bullets fly, stop at walls, hurt what they hit.
    for (const b of this.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (collideWorld(this.city, b.x, b.y, 2)) { b.life = 0; this.spark(b.x, b.y); }
      if (b.friendly) {
        for (const g of this.goons) {
          if (g.alive && Math.hypot(g.x - b.x, g.y - b.y) < 16) {
            g.hp -= 1;
            b.life = 0;
            this.spark(b.x, b.y);
            if (g.hp <= 0) {
              g.alive = false;
              world.addToast('Goon down.');
              world.audio.thud();
              world.missions.onGoonDown(world);
            }
            break;
          }
        }
      } else if (Math.hypot(p.x - b.x, p.y - b.y) < 14) {
        b.life = 0;
        world.damagePlayer(8);
        this.spark(b.x, b.y);
      }
    }
    this.bullets = this.bullets.filter((b) => b.life > 0);

    // Goons shoot back when the player is in range and in the open.
    for (const g of this.goons) {
      if (!g.alive) continue;
      const dx = p.x - g.x, dy = p.y - g.y;
      const dist = Math.hypot(dx, dy);
      g.angle = Math.atan2(dy, dx);
      g.shootTimer -= dt;
      if (dist < 430 && g.shootTimer <= 0) {
        g.shootTimer = 0.9 + Math.random() * 0.7;
        const spread = (Math.random() - 0.5) * 0.22;
        const a = g.angle + spread;
        this.bullets.push({ x: g.x + Math.cos(a) * 24, y: g.y + Math.sin(a) * 24, vx: Math.cos(a) * 620, vy: Math.sin(a) * 620, friendly: false, life: 0.8 });
        this.muzzle = { x: g.x + Math.cos(a) * 24, y: g.y + Math.sin(a) * 24, t: 0.05 };
        world.audio.enemyShot();
      }
    }

    for (const pt of this.particles) {
      pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= dt;
    }
    this.particles = this.particles.filter((pt) => pt.life > 0);
  }

  spark(x, y) {
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2;
      this.particles.push({ x, y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 0.25, color: '#ffd34d' });
    }
  }
}
