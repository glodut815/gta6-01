// The wanted system and the police. Stars rise when the player commits crimes
// in front of witnesses; cruisers spawn, chase, ram, and arrest the player on
// foot. Stars fall once the player lies low and stays out of sight.
var SB = window.SB || (window.SB = {});

SB.addWanted = function (G, stars, reason) {
  if (stars <= 0) return;
  var before = G.wanted;
  G.wanted = Math.min(5, G.wanted + stars);
  G.crimeTimer = 0; // fresh crime resets the cool-down clock
  G.lastCrime = reason || 'crime';
  if (G.wanted > before) SB.spawnParticles(G, G.player.x, G.player.y, 6, '#e5534b', 180);
};

SB.updateWanted = function (G, dt) {
  if (G.wanted === 0) return;
  G.crimeTimer += dt;
  if (G.crimeTimer < SB.WANTED.crimeCooldown) return;
  // Cooling down: lose a star every few seconds, but only while no cruiser
  // is close enough to see the player.
  var nearest = Infinity;
  for (var i = 0; i < G.police.length; i += 1) {
    var d = Math.hypot(G.police[i].x - G.player.x, G.police[i].y - G.player.y);
    if (d < nearest) nearest = d;
  }
  if (nearest > 620) {
    G.decayTimer += dt;
    if (G.decayTimer >= SB.WANTED.decaySeconds) {
      G.decayTimer = 0;
      G.wanted = Math.max(0, G.wanted - 1);
    }
  } else {
    G.decayTimer = 0;
  }
};

SB.makeCruiser = function (G, x, y) {
  return {
    kind: 'police',
    x: x, y: y,
    angle: 0,
    speed: 0,
    color: '#1c2733',
    sirenPhase: G.rng.next() * Math.PI * 2,
    bustTimer: 0,
  };
};

function spawnPointNear(G, dist) {
  // A road point roughly `dist` away from the player, so cruisers arrive
  // from off-screen instead of popping in on top of the player.
  var a = G.rng.range(0, Math.PI * 2);
  var x = G.player.x + Math.cos(a) * dist;
  var y = G.player.y + Math.sin(a) * dist;
  x = Math.max(120, Math.min(SB.CFG.WORLD_W - 120, x));
  y = Math.max(120, Math.min(SB.CFG.WORLD_H - 120, y));
  var road = SB.nearestRoad(x, y);
  return { x: road.x, y: road.y };
}

SB.updatePolice = function (G, dt) {
  var want = SB.POLICE.cruisersForStars[G.wanted] || 0;
  // Spawn cruisers up to the wanted level's count.
  if (G.police.length < want && G.rng.chance(dt * 1.2)) {
    var spot = spawnPointNear(G, 750);
    G.police.push(SB.makeCruiser(G, spot.x, spot.y));
  }
  // Despawn the extras once the heat falls.
  while (G.police.length > want) G.police.pop();
  SB.Audio.setSiren(G.wanted > 0 && G.state === 'play');

  var player = G.player;
  for (var i = 0; i < G.police.length; i += 1) {
    var c = G.police[i];
    c.sirenPhase += dt * 6;
    // Pursuit steering: aim at the player, with a little lead on their motion.
    var tx = player.x + (player.vx || 0) * 0.4;
    var ty = player.y + (player.vy || 0) * 0.4;
    var wantAngle = Math.atan2(ty - c.y, tx - c.x);
    var diff = wantAngle - c.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    var turn = Math.max(-1, Math.min(1, diff * 2.2));
    c.angle += turn * 3.1 * dt;
    var targetSpeed = SB.POLICE.maxSpeed * (0.82 + G.wanted * 0.05);
    if (Math.abs(diff) > 1.2) targetSpeed *= 0.45;
    c.speed += (targetSpeed - c.speed) * Math.min(1, dt * 1.4);
    c.x += Math.cos(c.angle) * c.speed * dt;
    c.y += Math.sin(c.angle) * c.speed * dt;
    // Cruisers stick to the streets: slide along buildings instead of through them.
    if (SB.hitsBlocker(G.city, c.x, c.y, 20)) {
      c.x -= Math.cos(c.angle) * c.speed * dt;
      c.y -= Math.sin(c.angle) * c.speed * dt;
      c.angle += 0.9 * dt * 4;
      c.speed *= 0.6;
    }

    // Ram the player: damage on impact, with a cooldown per cruiser.
    var d = Math.hypot(c.x - player.x, c.y - player.y);
    c.ramCd = Math.max(0, (c.ramCd || 0) - dt);
    if (d < 46 && c.ramCd <= 0) {
      c.ramCd = 0.9;
      if (player.car) {
        // Shunt the player's car sideways and slow it.
        var push = Math.atan2(player.y - c.y, player.x - c.x);
        player.car.speed *= 0.55;
        player.x += Math.cos(push) * 26;
        player.y += Math.sin(push) * 26;
        SB.damagePlayer(G, SB.POLICE.ramDamage * 0.4);
      } else {
        SB.damagePlayer(G, SB.POLICE.ramDamage);
      }
      SB.spawnParticles(G, player.x, player.y, 10, '#f2c94c', 220);
      SB.Audio.crash();
      G.shake = Math.max(G.shake, 7);
    }

    // Arrest: on foot, slow, and a cruiser parked on top of the player.
    if (!player.car && d < SB.POLICE.bustRadius && c.speed < 90) {
      c.bustTimer += dt;
      if (c.bustTimer >= SB.POLICE.bustSeconds) {
        SB.bustPlayer(G);
        return;
      }
    } else {
      c.bustTimer = 0;
    }
  }
};

SB.bustPlayer = function (G) {
  if (G.state !== 'play') return;
  G.state = 'busted';
  var fine = Math.min(G.cash, SB.BUST_FINE);
  G.cash -= fine;
  G.finePaid = fine;
  G.wanted = 0;
  G.police.length = 0;
  SB.Audio.setSiren(false);
  SB.Audio.setEngine(false, 0);
  SB.Audio.busted();
  SB.saveGame(G);
};

SB.wastePlayer = function (G) {
  if (G.state !== 'play') return;
  G.state = 'wasted';
  var fine = Math.min(G.cash, SB.WASTE_FINE);
  G.cash -= fine;
  G.finePaid = fine;
  G.wanted = 0;
  G.police.length = 0;
  if (G.player.car) SB.exitCar(G, true);
  SB.Audio.setSiren(false);
  SB.Audio.setEngine(false, 0);
  SB.Audio.wasted();
  SB.saveGame(G);
};

// Respawn after busted/wasted: hospital steps, full health, clean record.
SB.respawnPlayer = function (G) {
  var hospital = SB.PLACES.hospital;
  G.player.x = hospital.x;
  G.player.y = hospital.y + 60;
  G.player.health = SB.PLAYER.health;
  G.player.car = null;
  G.state = 'play';
  G.message = null;
  G.messageTimer = 0;
};
