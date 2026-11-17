// Traffic cars that drive the road grid, and pedestrians who walk the
// sidewalks. Both are simple, readable AI: cars follow a road and turn at
// intersections; pedestrians stroll and run from danger.
var SB = window.SB || (window.SB = {});

SB.makeTrafficCar = function (rng, x, y, vertical, dir) {
  return {
    kind: 'traffic',
    x: x, y: y,
    angle: vertical ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI),
    speed: rng.range(SB.TRAFFIC.minSpeed, SB.TRAFFIC.maxSpeed),
    baseSpeed: 0,
    vertical: vertical,
    dir: dir,
    // Lane offset: right-hand side of the road.
    lane: 24,
    color: rng.pick(SB.CAR_COLORS),
    brake: 0,
    driver: true, // stealing it makes the driver run away on foot
  };
};

SB.spawnTraffic = function (rng, count) {
  var cars = [];
  for (var i = 0; i < count; i += 1) {
    var p = SB.randomRoadPoint(rng);
    var dir = rng.chance(0.5) ? 1 : -1;
    var car = SB.makeTrafficCar(rng, p.x, p.y, p.vertical, dir);
    car.baseSpeed = car.speed;
    // Sit in the right-hand lane.
    if (car.vertical) car.x += car.dir > 0 ? car.lane : -car.lane;
    else car.y += car.dir > 0 ? car.lane : -car.lane;
    cars.push(car);
  }
  return cars;
};

SB.spawnParkedCars = function (city) {
  return city.parkedCars.map(function (p) {
    return {
      kind: 'parked', x: p.x, y: p.y, angle: p.angle, speed: 0,
      vertical: false, dir: 1, lane: 0, color: p.color, brake: 0, driver: false,
    };
  });
};

function nearestIntersection(v, axisValue) {
  var roads = axisValue === 'x' ? SB.ROADS_V : SB.ROADS_H;
  var best = roads[0], bestD = Infinity;
  for (var i = 0; i < roads.length; i += 1) {
    var d = Math.abs(roads[i] - v);
    if (d < bestD) { bestD = d; best = roads[i]; }
  }
  return { at: best, dist: bestD };
}

SB.updateTraffic = function (G, dt) {
  var rng = G.rng;
  var cars = G.traffic;
  for (var i = 0; i < cars.length; i += 1) {
    var c = cars[i];
    if (c.kind === 'parked') continue;
    // Slow for the car ahead on the same road.
    var ahead = Infinity;
    for (var j = 0; j < cars.length; j += 1) {
      if (i === j) continue;
      var o = cars[j];
      var dx = o.x - c.x, dy = o.y - c.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 110) continue;
      var along = c.vertical ? dy * c.dir : dx * c.dir;
      var side = c.vertical ? Math.abs(dx) : Math.abs(dy);
      if (along > 0 && along < 110 && side < 40) ahead = Math.min(ahead, along);
    }
    var target = c.baseSpeed;
    if (ahead < 70) target = Math.max(0, (ahead - 34) * 2.2);
    c.speed += (target - c.speed) * Math.min(1, dt * 2.5);

    var step = c.speed * dt;
    if (c.vertical) c.y += c.dir * step;
    else c.x += c.dir * step;

    // At an intersection, sometimes turn onto the crossing road.
    var cross = c.vertical ? nearestIntersection(c.y, 'y') : nearestIntersection(c.x, 'x');
    if (cross.dist < 6 && !c.turnedAt) {
      c.turnedAt = cross.at;
      if (rng.chance(0.35)) {
        var nd = rng.chance(0.5) ? 1 : -1;
        if (c.vertical) {
          c.vertical = false; c.dir = nd;
          c.angle = nd > 0 ? 0 : Math.PI;
          c.y = cross.at + (nd > 0 ? c.lane : -c.lane);
        } else {
          c.vertical = true; c.dir = nd;
          c.angle = nd > 0 ? Math.PI / 2 : -Math.PI / 2;
          c.x = cross.at + (nd > 0 ? c.lane : -c.lane);
        }
      }
    } else if (cross.dist > 60) {
      c.turnedAt = null;
    }

    // Wrap around the map edges so traffic never runs out.
    if (c.x < 60) { c.x = SB.CFG.WORLD_W - 60; }
    if (c.x > SB.CFG.WORLD_W - 60) { c.x = 60; }
    if (c.y < 60) { c.y = SB.CFG.WORLD_H - 60; }
    if (c.y > SB.CFG.WORLD_H - 60) { c.y = 60; }
  }

  // Keep the streets full: replace cars that got stolen or wrecked.
  var moving = 0;
  for (var k = 0; k < cars.length; k += 1) if (cars[k].kind !== 'parked') moving += 1;
  if (moving < SB.TRAFFIC.count && rng.chance(dt * 0.5)) {
    var p = SB.randomRoadPoint(rng);
    var d2 = rng.chance(0.5) ? 1 : -1;
    var car = SB.makeTrafficCar(rng, p.x, p.y, p.vertical, d2);
    car.baseSpeed = car.speed;
    if (car.vertical) car.x += car.dir > 0 ? car.lane : -car.lane;
    else car.y += car.dir > 0 ? car.lane : -car.lane;
    cars.push(car);
  }
};

// A traffic car the player hit hard: it spins out, then its driver flees.
SB.wreckTrafficCar = function (G, car) {
  car.kind = 'wrecked';
  car.speed = 0;
  car.spin = (G.rng.next() - 0.5) * 1.2;
  SB.spawnParticles(G, car.x, car.y, 14, '#f2c94c', 260);
  SB.Audio.crash();
  if (car.driver) {
    car.driver = false;
    SB.spawnPed(G, car.x + 20, car.y, 'flee');
  }
};

SB.makePed = function (rng, x, y) {
  var road = SB.nearestRoad(x, y);
  return {
    x: x, y: y,
    angle: rng.range(0, Math.PI * 2),
    speed: rng.range(40, 70),
    state: 'walk', // walk | flee | down
    downTimer: 0,
    color: rng.pick(SB.PED_COLORS),
    skin: rng.pick(['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac']),
    road: road,
    turnTimer: rng.range(2, 8),
  };
};

SB.spawnPeds = function (rng, count) {
  var peds = [];
  for (var i = 0; i < count; i += 1) {
    var p = SB.randomRoadPoint(rng);
    peds.push(SB.makePed(rng, p.x + rng.range(-70, 70), p.y + rng.range(-70, 70)));
  }
  return peds;
};

SB.spawnPed = function (G, x, y, state) {
  var ped = SB.makePed(G.rng, x, y);
  ped.state = state || 'walk';
  G.peds.push(ped);
  return ped;
};

SB.updatePeds = function (G, dt) {
  var peds = G.peds;
  var player = G.player;
  for (var i = 0; i < peds.length; i += 1) {
    var p = peds[i];
    if (p.state === 'down') {
      p.downTimer -= dt;
      if (p.downTimer <= 0) {
        p.state = 'flee';
        p.fleeX = player.x; p.fleeY = player.y;
      }
      continue;
    }
    if (p.state === 'flee') {
      var dx = p.x - (p.fleeX || player.x);
      var dy = p.y - (p.fleeY || player.y);
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      p.angle = Math.atan2(dy, dx);
      var sp = SB.PED.fleeSpeed;
      p.x += Math.cos(p.angle) * sp * dt;
      p.y += Math.sin(p.angle) * sp * dt;
      if (d > 520) p.state = 'walk';
    } else {
      // Stroll along the sidewalk: keep turning at random, stay near roads.
      p.turnTimer -= dt;
      if (p.turnTimer <= 0) {
        p.turnTimer = G.rng.range(2, 7);
        p.angle += G.rng.pick([-Math.PI / 2, Math.PI / 2, Math.PI, 0]);
      }
      p.x += Math.cos(p.angle) * p.speed * dt;
      p.y += Math.sin(p.angle) * p.speed * dt;
      if (!SB.onRoad(p.x, p.y)) {
        // Drifted off the street: steer back toward the nearest road.
        var road = SB.nearestRoad(p.x, p.y);
        p.angle = Math.atan2(road.y - p.y, road.x - p.x);
      }
    }
    SB.resolveCircle(G.city, p, 10);
    // Flee from gunfire, punches and speeding cars nearby.
    var pd = Math.hypot(p.x - player.x, p.y - player.y);
    if (p.state === 'walk' && pd < 130 && (G.player.attacking || (G.player.car && Math.abs(G.player.car.speed) > 200))) {
      p.state = 'flee';
      p.fleeX = player.x; p.fleeY = player.y;
    }
  }
  // Top the crowd back up as peds wander off.
  if (peds.length < SB.PED.count && G.rng.chance(dt * 0.8)) {
    var spot = SB.randomRoadPoint(G.rng);
    peds.push(SB.makePed(G.rng, spot.x, spot.y));
  }
};

// Knock a pedestrian down: they fall, then get up and run.
SB.knockPed = function (G, ped, byCar) {
  if (ped.state === 'down') return;
  ped.state = 'down';
  ped.downTimer = byCar ? 3.5 : 2.0;
  SB.spawnParticles(G, ped.x, ped.y, 8, '#ffffff', 140);
};
