// Traffic: AI cars that drive the road network and pedestrians who walk the
// sidewalks. Both keep to the streets so the city always feels alive.

import { ROADS_V, ROADS_H, ROAD_W } from './config.js';
import { makeRng } from './rng.js';
import { isOnRoad } from './city.js';

const CAR_COLORS = ['#c0392b', '#2980b9', '#f1c40f', '#ecf0f1', '#2c3e50', '#e67e22', '#8e44ad', '#16a085', '#d35400', '#7f8c8d'];
const SHIRT_COLORS = ['#e74c3c', '#3498db', '#f39c12', '#ecf0f1', '#9b59b6', '#1abc9c', '#e67e22', '#fd79a8'];

export class Traffic {
  constructor(city, seed) {
    this.city = city;
    this.rng = makeRng(seed + '-traffic');
    this.cars = [];
    this.peds = [];
    const half = ROAD_W / 2 - 24;

    for (let i = 0; i < 11; i++) {
      const vertical = this.rng.chance(0.5);
      let road, along;
      if (vertical) {
        road = this.rng.pick(ROADS_V);
        along = this.rng.pick(ROADS_H);
      } else {
        road = this.rng.pick(ROADS_H);
        along = this.rng.pick(ROADS_V);
      }
      const dir = this.rng.chance(0.5) ? 1 : -1;
      const car = {
        x: vertical ? road + dir * half * 0.5 : along,
        y: vertical ? along : road + dir * half * 0.5,
        angle: vertical ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI),
        speed: this.rng.range(110, 175),
        cruise: 0,
        color: this.rng.pick(CAR_COLORS),
        model: this.rng.pick(['sedan', 'hatch', 'coupe', 'van']),
        vertical, dir, wait: 0,
      };
      car.cruise = car.speed;
      if (isOnRoad(car.x, car.y)) this.cars.push(car);
    }

    for (let i = 0; i < 26; i++) {
      const vertical = this.rng.chance(0.5);
      let road = this.rng.pick(vertical ? ROADS_V : ROADS_H);
      let along = this.rng.range(120, 3400);
      const ped = {
        x: vertical ? road + (this.rng.chance(0.5) ? 1 : -1) * (ROAD_W / 2 + 12) : along,
        y: vertical ? along : road + (this.rng.chance(0.5) ? 1 : -1) * (ROAD_W / 2 + 12),
        dir: this.rng.chance(0.5) ? 1 : -1,
        speed: this.rng.range(34, 58),
        color: this.rng.pick(SHIRT_COLORS),
        vertical, walkPhase: this.rng.range(0, 6),
      };
      this.peds.push(ped);
    }
  }

  update(dt) {
    const half = ROAD_W / 2 - 24;
    for (const car of this.cars) {
      // Slow down for a car directly ahead on the same street.
      let ahead = false;
      for (const other of this.cars) {
        if (other === car) continue;
        const dx = other.x - car.x, dy = other.y - car.y;
        const along = car.vertical ? dy * car.dir : dx * car.dir;
        const side = car.vertical ? Math.abs(dx) : Math.abs(dy);
        if (along > 0 && along < 78 && side < 26) { ahead = true; break; }
      }
      const target = ahead ? 0 : car.cruise;
      car.speed += Math.max(-260 * dt, Math.min(140 * dt, target - car.speed));
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;

      // At an intersection, sometimes turn onto the crossing street.
      const onV = nearestRoad(ROADS_V, car.x);
      const onH = nearestRoad(ROADS_H, car.y);
      if (onV !== null && onH !== null && Math.abs(car.x - onV) < 14 && Math.abs(car.y - onH) < 14) {
        if (this.rng.chance(0.28)) {
          const wantVertical = this.rng.chance(0.5);
          const dir = this.rng.chance(0.5) ? 1 : -1;
          if (wantVertical && !car.vertical) {
            car.vertical = true; car.dir = dir;
            car.angle = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
            car.x = onV + dir * half * 0.5; car.y = onH;
          } else if (!wantVertical && car.vertical) {
            car.vertical = false; car.dir = dir;
            car.angle = dir > 0 ? 0 : Math.PI;
            car.x = onV; car.y = onH + dir * half * 0.5;
          }
        }
      }
      // Wrap around the world edges so traffic never runs out.
      if (car.x < -60) car.x = 3660;
      if (car.x > 3660) car.x = -60;
      if (car.y < -60) car.y = 2660;
      if (car.y > 2660) car.y = -60;
    }

    for (const ped of this.peds) {
      ped.walkPhase += dt * 6;
      const step = ped.speed * dt;
      if (ped.vertical) ped.y += ped.dir * step;
      else ped.x += ped.dir * step;
      // Turn around at the world edge or at random, keep walking the sidewalk.
      if (ped.x < 90 || ped.x > 3510 || ped.y < 90 || ped.y > 2510 || this.rng.chance(0.002)) {
        ped.dir *= -1;
      }
      // Hop to a crossing street now and then.
      if (this.rng.chance(0.0012)) {
        ped.vertical = !ped.vertical;
        if (ped.vertical) {
          ped.x = nearestRoad(ROADS_V, ped.x) + (ped.dir > 0 ? 1 : -1) * (ROAD_W / 2 + 12);
        } else {
          ped.y = nearestRoad(ROADS_H, ped.y) + (ped.dir > 0 ? 1 : -1) * (ROAD_W / 2 + 12);
        }
      }
    }
  }
}

function nearestRoad(list, v) {
  let best = null, bestD = Infinity;
  for (const r of list) {
    const d = Math.abs(r - v);
    if (d < bestD) { bestD = d; best = r; }
  }
  return bestD < ROAD_W / 2 ? best : null;
}
