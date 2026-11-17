// Missions: the four-job story "The Meridian Job". Each mission is a chain of
// steps with a beacon target, dialogue, and a payout. The warehouse clear
// step completes when every goon is down — bodies stay down until then.

import { MISSIONS, PLACES, GOON_COUNT } from './config.js';

const GOON_SPOTS = [
  { x: 3300, y: 1640 }, { x: 3420, y: 1660 }, { x: 3360, y: 1800 },
  { x: 3280, y: 1760 }, { x: 3440, y: 1780 },
];

export class Missions {
  constructor() {
    this.index = 0;      // 0-based mission
    this.step = 0;       // step inside the mission
    this.dialogue = [];  // queued {who, text} lines
    this.done = false;   // whole story complete
    this.crate = null;   // payout crate position in mission 4
  }

  get def() { return MISSIONS[this.index]; }
  get active() { return !this.done && this.index < MISSIONS.length; }

  dialogueActive() { return this.dialogue.length > 0; }
  dialogueCurrent() { return this.dialogue[0] || null; }
  advanceDialogue() { this.dialogue.shift(); }

  objectiveText() {
    if (!this.active) return this.done ? 'Story complete — the Meridian Job is done.' : '';
    const d = this.def;
    if (this.index === 1) return this.step === 0 ? d.objective : d.objective2;
    if (this.index === 3) {
      return [d.objective, d.objective2, d.objective3, d.objective4][this.step] || d.objective;
    }
    return d.objective;
  }

  targetPoint() {
    if (!this.active) return null;
    const d = this.def;
    if (this.index === 1) return PLACES[this.step === 0 ? 'docksPickup' : 'motel'];
    if (this.index === 3) {
      if (this.step === 0) return PLACES.warehouse;
      if (this.step === 2) return this.crate || PLACES.warehouse;
      if (this.step === 3) return PLACES.safehouse;
      return PLACES.warehouse;
    }
    return PLACES[d.target];
  }

  startMission(i, world) {
    this.index = i;
    this.step = 0;
    const d = this.def;
    this.dialogue = d.intro.map((l) => ({ ...l }));
    if (d.heat) {
      world.police.wanted = d.heat;
      world.police.quietTimer = 0;
      world.addToast('THE HEAT IS ON — 2 stars');
    }
    world.addToast('Mission ' + d.id + ': ' + d.title);
  }

  // Called when the last goon of mission 4 goes down.
  onGoonDown(world) {
    if (this.index !== 3 || this.step !== 1) return;
    if (world.combat.goonsAlive === 0) {
      this.step = 2;
      this.crate = { x: PLACES.warehouse.x + 60, y: PLACES.warehouse.y + 40, label: 'Payout Case' };
      world.addToast('Crew cleared. Grab the payout case.');
      world.audio.pickup();
    }
  }

  update(dt, world) {
    if (!this.active || this.dialogueActive()) return;
    const p = world.player;
    const d = this.def;
    const target = this.targetPoint();
    if (!target) return;
    const dist = Math.hypot(p.x - target.x, p.y - target.y);
    const radius = d.radius || 110;
    const inCar = !!p.car;

    if (this.index === 0) {
      if (inCar && dist < radius) this.completeMission(world);
      return;
    }
    if (this.index === 1) {
      if (inCar && dist < radius) {
        if (this.step === 0) {
          this.step = 1;
          world.addToast('Crate picked up. Deliver it to the Motel.');
          world.audio.pickup();
        } else {
          this.completeMission(world);
        }
      }
      return;
    }
    if (this.index === 2) {
      if (inCar && dist < radius) {
        this.completeMission(world);
        world.police.wanted = 0;
        world.police.clear();
        world.addToast('You lost the cops.');
      }
      return;
    }
    if (this.index === 3) {
      if (this.step === 0 && dist < radius) {
        this.step = 1;
        world.combat.spawnGoons(GOON_SPOTS.slice(0, GOON_COUNT));
        world.addToast('The crew is armed. Clear them out!');
        world.police.commitCrime(2);
      } else if (this.step === 2 && dist < 70 && !inCar) {
        this.step = 3;
        world.addToast('Payout secured. Get to the Safehouse!');
        world.audio.pickup();
      } else if (this.step === 3 && inCar && dist < radius) {
        this.completeMission(world);
      }
    }
  }

  completeMission(world) {
    const d = this.def;
    world.cash += d.payout;
    world.addToast('Mission complete: ' + d.title + '  +$' + d.payout);
    world.audio.jingle();
    if (this.index >= MISSIONS.length - 1) {
      this.done = true;
      world.onStoryComplete(); // saves, with done = true
      return;
    }
    // Advance the mission FIRST, then save — a save written between the
    // payout and the advance would reload the old mission with the new cash.
    this.startMission(this.index + 1, world);
    world.saveGame();
  }

  // Re-arm the warehouse crew after a reload mid-fight (mission 4, step 1).
  respawnGoons(world) {
    if (this._respawnGoons) {
      this._respawnGoons = false;
      world.combat.spawnGoons(GOON_SPOTS.slice(0, GOON_COUNT));
    }
  }

  // Save / restore shape.
  toSave() {
    return { index: this.index, step: this.step, done: this.done };
  }

  fromSave(s) {
    this.index = s.index || 0;
    this.step = s.step || 0;
    this.done = !!s.done;
    this.dialogue = [];
    this.crate = this.index === 3 && this.step >= 2
      ? { x: PLACES.warehouse.x + 60, y: PLACES.warehouse.y + 40, label: 'Payout Case' }
      : null;
    if (this.index === 3 && this.step === 1) {
      // Re-arm the warehouse crew after a reload mid-fight.
      this._respawnGoons = true;
    }
  }
}
