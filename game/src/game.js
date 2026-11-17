// Game: the main loop and the player's life in Sunspire Bay — walking,
// stealing and driving cars, the wanted system, shooting, and the mission
// flow. Every other module plugs in here.

import { VIEW_W, VIEW_H, WORLD, PLACES, START_CASH, PLAYER_MAX_HEALTH, CHANNEL, BRIDGE } from './config.js';
import { buildCity, collideWorld, buildRoadGraph } from './city.js';
import { Traffic } from './traffic.js';
import { Police } from './police.js';
import { Combat } from './combat.js';
import { Missions } from './missions.js';
import { AudioEngine } from './audio.js';
import { Input } from './input.js';
import { drawWorld } from './render.js';
import { drawHUD, drawTitle, drawHowTo, drawBusted, drawComplete } from './hud.js';
import { saveGame, loadGame, hasSave } from './save.js';
import { applyShot } from './shots.js';

const WALK_SPEED = 175;
const RUN_SPEED = 285;

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new Input(canvas);
    this.audio = new AudioEngine();
    this.city = buildCity('sunspire-bay-v1');
    this.roadGraph = buildRoadGraph();
    this.traffic = new Traffic(this.city, 'sunspire-bay-v1');
    this.police = new Police(this.city);
    this.combat = new Combat(this.city);
    this.missions = new Missions();
    this.mode = 'title'; // title | howto | playing | busted | complete
    this.time = 0;
    this.cash = START_CASH;
    this.health = PLAYER_MAX_HEALTH;
    this.player = {
      x: PLACES.spawn.x, y: PLACES.spawn.y,
      vx: 0, vy: 0, moveAngle: 0, aimAngle: 0,
      car: null,
    };
    this.camera = { x: 850, y: 600 };
    this.toasts = [];
    this.titleButtons = [];
    this.bustedReason = '';
    this.saveTimer = 0;
    this.stolenCars = new Set();
    this.shotParam = new URLSearchParams(window.location.search).get('shot');
    if (this.shotParam) applyShot(this, this.shotParam);
  }

  // ---- lifecycle ---------------------------------------------------------

  newGame() {
    this.cash = START_CASH;
    this.health = PLAYER_MAX_HEALTH;
    this.player.x = PLACES.spawn.x;
    this.player.y = PLACES.spawn.y;
    this.player.car = null;
    this.police.clear();
    this.combat.clearGoons();
    this.combat.bullets = [];
    this.missions = new Missions();
    this.mode = 'playing';
    this.missions.startMission(0, this);
    this.audio.ensure();
    this.saveGame();
  }

  continueGame() {
    const data = loadGame();
    if (!data) { this.newGame(); return; }
    this.cash = data.cash;
    this.health = data.health;
    this.player.x = data.x;
    this.player.y = data.y;
    this.player.car = null;
    this.police.clear();
    this.combat.clearGoons();
    this.combat.bullets = [];
    this.missions = new Missions();
    this.missions.fromSave(data.mission);
    this.missions.respawnGoons(this);
    // Mission 3 runs under scripted 2-star heat; re-apply it after a reload.
    if (this.missions.index === 2 && !this.missions.done) {
      this.police.wanted = 2;
    }
    this.mode = 'playing';
    this.addToast('Welcome back to Sunspire Bay.');
    this.audio.ensure();
  }

  saveGame() { saveGame(this); }

  addToast(text) {
    this.toasts.push({ text, life: 4 });
    if (this.toasts.length > 4) this.toasts.shift();
  }

  damagePlayer(n) {
    this.health -= n;
    this.lastDamageAt = this.time;
    if (this.health <= 0) {
      this.health = 0;
      this.onBusted('wasted');
    }
  }

  onBusted(reason) {
    this.bustedReason = reason;
    this.cash = Math.max(0, this.cash - 50);
    this.police.clear();
    if (this.player.car) this.parkCurrentCar();
    this.player.x = PLACES.safehouse.x;
    this.player.y = PLACES.safehouse.y;
    this.health = PLAYER_MAX_HEALTH;
    this.mode = 'busted';
    this.audio.thud();
    this.saveGame();
  }

  onStoryComplete() {
    this.mode = 'complete';
    this.saveGame();
  }

  // ---- per-frame ----------------------------------------------------------

  frame(dt) {
    dt = Math.min(dt, 0.05);
    this.time += dt;
    const input = this.input;

    if (this.mode === 'title') {
      this.traffic.update(dt);
      // Slow cinematic pan over downtown behind the menu.
      this.camera.x = 850 + Math.sin(this.time * 0.05) * 420;
      this.camera.y = 620 + Math.cos(this.time * 0.04) * 220;
      this.handleTitleInput();
    } else if (this.mode === 'howto') {
      if (input.wasPressed('Escape') || input.mouse.clicked) this.mode = 'title';
    } else if (this.mode === 'busted') {
      if (input.wasPressed('Enter') || input.wasPressed('NumpadEnter')) {
        this.mode = 'playing';
        this.addToast('Back on the street. Stay sharp.');
      }
    } else if (this.mode === 'complete') {
      this.traffic.update(dt);
      if (input.wasPressed('Enter') || input.wasPressed('NumpadEnter')) {
        this.mode = 'playing';
      }
    } else if (this.mode === 'playing') {
      this.updatePlaying(dt);
    }

    this.draw();
    input.endFrame();
  }

  handleTitleInput() {
    const input = this.input;
    if (input.wasPressed('Digit1') || input.wasPressed('Numpad1')) { this.newGame(); return; }
    if (input.wasPressed('Digit2') || input.wasPressed('Numpad2')) {
      if (hasSave()) this.continueGame();
      return;
    }
    if (input.wasPressed('Digit3') || input.wasPressed('Numpad3')) { this.mode = 'howto'; return; }
    if (input.mouse.clicked) {
      for (const b of this.titleButtons) {
        if (b.disabled) continue;
        if (input.mouse.x >= b.x && input.mouse.x <= b.x + b.w && input.mouse.y >= b.y && input.mouse.y <= b.y + b.h) {
          if (b.id === 'new') this.newGame();
          else if (b.id === 'continue') this.continueGame();
          else if (b.id === 'howto') this.mode = 'howto';
          return;
        }
      }
    }
  }

  updatePlaying(dt) {
    const input = this.input;
    const p = this.player;
    this.audio.ensure();

    // Dialogue pauses the world; E / click / Enter advances it.
    if (this.missions.dialogueActive()) {
      if (input.wasPressed('KeyE') || input.wasPressed('Enter') || input.mouse.clicked) {
        this.missions.advanceDialogue();
        this.audio.pickup();
      }
      return;
    }

    if (input.wasPressed('Escape')) {
      this.mode = 'title';
      this.saveGame();
      return;
    }

    // Aim follows the mouse in world space.
    const wx = this.camera.x - VIEW_W / 2 + input.mouse.x;
    const wy = this.camera.y - VIEW_H / 2 + input.mouse.y;
    p.aimAngle = Math.atan2(wy - p.y, wx - p.x);

    if (p.car) this.updateDriving(dt);
    else this.updateOnFoot(dt);

    // Shooting (on foot only).
    if (!p.car && input.mouse.down) {
      if (this.combat.playerShoot(p.x, p.y, p.aimAngle, this)) {
        this.police.commitCrime(2);
      }
    }

    if (input.wasPressed('KeyE')) this.interact();

    this.traffic.update(dt);
    this.police.update(dt, this);
    this.combat.update(dt, this);
    this.missions.update(dt, this);

    // Health creeps back after 5 quiet seconds.
    if (this.health > 0 && this.health < PLAYER_MAX_HEALTH && this.time - (this.lastDamageAt || 0) > 5) {
      this.health = Math.min(PLAYER_MAX_HEALTH, this.health + 3 * dt);
    }

    // Toasts fade.
    for (const t of this.toasts) t.life -= dt;
    this.toasts = this.toasts.filter((t) => t.life > 0);

    // Camera follows the player (or their car).
    const tx = p.car ? p.car.x : p.x;
    const ty = p.car ? p.car.y : p.y;
    this.camera.x += (tx - this.camera.x) * Math.min(1, dt * 5);
    this.camera.y += (ty - this.camera.y) * Math.min(1, dt * 5);
    this.camera.x = Math.max(VIEW_W / 2, Math.min(WORLD.w - VIEW_W / 2, this.camera.x));
    this.camera.y = Math.max(VIEW_H / 2, Math.min(WORLD.h - VIEW_H / 2, this.camera.y));

    // Audio follows the drive and the heat.
    this.audio.setEngine(p.car ? Math.abs(p.car.speed) / 430 : 0, !!p.car);
    this.audio.setSiren(this.police.wanted, dt);

    // Autosave while playing.
    this.saveTimer += dt;
    if (this.saveTimer > 20) { this.saveTimer = 0; this.saveGame(); }
  }

  updateOnFoot(dt) {
    const input = this.input;
    const p = this.player;
    const mv = input.moveVector();
    const speed = input.running ? RUN_SPEED : WALK_SPEED;
    p.vx = mv.x * speed;
    p.vy = mv.y * speed;
    if (mv.x !== 0 || mv.y !== 0) p.moveAngle = Math.atan2(mv.y, mv.x);
    this.moveWithCollision(p, p.vx * dt, p.vy * dt, 12);
  }

  updateDriving(dt) {
    const input = this.input;
    const car = this.player.car;
    const mv = input.moveVector();
    const accel = 340, maxSpeed = 430, maxReverse = 130;
    if (mv.y < 0) car.speed += accel * dt;          // W: accelerate
    else if (mv.y > 0) {                            // S: brake / reverse
      if (car.speed > 20) car.speed -= 620 * dt;
      else car.speed -= 220 * dt;
    } else {
      car.speed -= Math.sign(car.speed) * 140 * dt; // coast
      if (Math.abs(car.speed) < 8) car.speed = 0;
    }
    car.speed = Math.max(-maxReverse, Math.min(maxSpeed, car.speed));
    // Steering bites harder with speed, but never at a standstill.
    const grip = Math.min(1, Math.abs(car.speed) / 110);
    const steer = 2.4 * grip;
    if (mv.x !== 0 && Math.abs(car.speed) > 4) {
      car.angle += mv.x * steer * dt * Math.sign(car.speed);
    }
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    if (!collideWorld(this.city, nx, ny, 20)) {
      car.x = nx; car.y = ny;
    } else {
      // Slide along the wall instead of sticking.
      if (!collideWorld(this.city, nx, car.y, 20)) car.x = nx;
      else if (!collideWorld(this.city, car.x, ny, 20)) car.y = ny;
      else car.speed *= 0.4;
      if (Math.abs(car.speed) > 120) this.audio.thud();
    }
    // Running over a pedestrian is a crime.
    for (let i = this.traffic.peds.length - 1; i >= 0; i--) {
      const ped = this.traffic.peds[i];
      if (Math.hypot(ped.x - car.x, ped.y - car.y) < 24 && Math.abs(car.speed) > 60) {
        this.traffic.peds.splice(i, 1);
        this.traffic.peds.push(this.randomPed());
        this.police.commitCrime(Math.min(5, this.police.wanted + 1));
        this.addToast('You hit a pedestrian! The cops are coming.');
        this.audio.thud();
      }
    }
    // Nudge traffic cars out of the way.
    for (const other of this.traffic.cars) {
      const d = Math.hypot(other.x - car.x, other.y - car.y);
      if (d < 44 && d > 0.01) {
        const push = (44 - d) / 2;
        const ux = (other.x - car.x) / d, uy = (other.y - car.y) / d;
        other.x += ux * push; other.y += uy * push;
        car.speed *= 0.94;
      }
    }
    this.player.x = car.x;
    this.player.y = car.y;
  }

  randomPed() {
    const vertical = Math.random() < 0.5;
    const road = vertical
      ? this.city.roadsV[Math.floor(Math.random() * this.city.roadsV.length)]
      : this.city.roadsH[Math.floor(Math.random() * this.city.roadsH.length)];
    const along = 120 + Math.random() * 3200;
    return {
      x: vertical ? road + (Math.random() < 0.5 ? 1 : -1) * 70 : along,
      y: vertical ? along : road + (Math.random() < 0.5 ? 1 : -1) * 70,
      dir: Math.random() < 0.5 ? 1 : -1, speed: 34 + Math.random() * 24,
      color: '#e74c3c', vertical, walkPhase: 0,
    };
  }

  moveWithCollision(p, dx, dy, r) {
    if (!collideWorld(this.city, p.x + dx, p.y, r)) p.x += dx;
    if (!collideWorld(this.city, p.x, p.y + dy, r)) p.y += dy;
  }

  interact() {
    const p = this.player;
    if (p.car) {
      // Step out of the car; it stays parked where you left it.
      this.parkCurrentCar();
      this.addToast('You got out of the car.');
      return;
    }
    // Find the nearest parked car.
    let best = null, bestD = 60;
    for (const car of this.city.parkedCars) {
      const d = Math.hypot(car.x - p.x, car.y - p.y);
      if (d < bestD) { bestD = d; best = car; }
    }
    if (!best) return;
    this.city.parkedCars = this.city.parkedCars.filter((c) => c !== best);
    this.player.car = { x: best.x, y: best.y, angle: best.angle, speed: 0, color: best.color, model: best.model };
    // Stealing in view of a pedestrian or a cruiser raises the heat.
    let seen = false;
    for (const ped of this.traffic.peds) {
      if (Math.hypot(ped.x - p.x, ped.y - p.y) < 320) { seen = true; break; }
    }
    if (!seen) {
      for (const c of this.police.cruisers) {
        if (Math.hypot(c.x - p.x, c.y - p.y) < 420) { seen = true; break; }
      }
    }
    if (!this.stolenCars.has(best)) {
      this.stolenCars.add(best);
      if (seen) {
        this.police.commitCrime(1);
        this.addToast('Someone saw you steal that car!');
      } else {
        this.addToast('Car stolen. Drive!');
      }
      this.audio.pickup();
    } else {
      this.addToast('Back in your car.');
    }
  }

  parkCurrentCar() {
    const car = this.player.car;
    if (!car) return;
    this.city.parkedCars.push({ x: car.x, y: car.y, angle: car.angle, color: car.color, model: car.model });
    this.player.x = car.x + Math.cos(car.angle + Math.PI / 2) * 30;
    this.player.y = car.y + Math.sin(car.angle + Math.PI / 2) * 30;
    this.player.car = null;
  }

  // ---- drawing -------------------------------------------------------------

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    if (this.mode === 'title' || this.mode === 'howto') {
      drawWorld(ctx, this);
      if (this.mode === 'title') this.titleButtons = drawTitle(ctx, this);
      else drawHowTo(ctx);
      return;
    }
    drawWorld(ctx, this);
    drawHUD(ctx, this);
    if (this.mode === 'busted') drawBusted(ctx);
    if (this.mode === 'complete') drawComplete(ctx, this);
  }
}
