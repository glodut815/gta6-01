// Combat: fists and the pistol, bullets, armed goons, damage and particles.
// Nothing here is gory: hits burst into sparks and the target staggers.
var SB = window.SB || (window.SB = {});

SB.spawnParticles = function (G, x, y, n, color, speed) {
  for (var i = 0; i < n; i += 1) {
    var a = G.rng.range(0, Math.PI * 2);
    var s = G.rng.range(speed * 0.3, speed);
    G.particles.push({
      x: x, y: y,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: G.rng.range(0.25, 0.6), maxLife: 0.6,
      color: color, size: G.rng.range(2, 5),
    });
  }
};

SB.updateParticles = function (G, dt) {
  for (var i = G.particles.length - 1; i >= 0; i -= 1) {
    var p = G.particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.92; p.vy *= 0.92;
    if (p.life <= 0) G.particles.splice(i, 1);
  }
};

SB.damagePlayer = function (G, amount) {
  if (G.state !== 'play' || G.player.invuln > 0) return;
  G.player.health -= amount;
  G.player.invuln = 0.5;
  G.shake = Math.max(G.shake, 5);
  if (G.player.health <= 0) {
    G.player.health = 0;
    SB.wastePlayer(G);
  }
};

SB.tryPunch = function (G) {
  var p = G.player;
  if (p.punchCd > 0 || p.car) return;
  p.punchCd = SB.PLAYER.punchCooldown;
  p.attacking = true;
  p.attackTimer = 0.18;
  p.attackAngle = Math.atan2(SB.Input.mouse.worldY - p.y, SB.Input.mouse.worldX - p.x);
  SB.Audio.punch();
  // Hit anything close in front of the player: peds, goons, cruisers.
  var hx = p.x + Math.cos(p.attackAngle) * 30;
  var hy = p.y + Math.sin(p.attackAngle) * 30;
  var hitSomething = false;
  for (var i = 0; i < G.peds.length; i += 1) {
    var ped = G.peds[i];
    if (ped.state === 'down') continue;
    if (Math.hypot(ped.x - hx, ped.y - hy) < SB.PLAYER.punchRange) {
      SB.knockPed(G, ped, false);
      SB.addWanted(G, SB.WANTED.assaultPed, 'assault');
      hitSomething = true;
    }
  }
  for (var j = 0; j < G.goons.length; j += 1) {
    var goon = G.goons[j];
    if (Math.hypot(goon.x - hx, goon.y - hy) < SB.PLAYER.punchRange + 8) {
      SB.damageGoon(G, goon, SB.PLAYER.punchDamage);
      hitSomething = true;
    }
  }
  if (hitSomething) G.shake = Math.max(G.shake, 3);
};

SB.tryShoot = function (G) {
  var p = G.player;
  if (p.shootCd > 0 || p.car || !p.hasGun) return;
  p.shootCd = SB.PLAYER.shootCooldown;
  p.attacking = true;
  p.attackTimer = 0.12;
  var angle = Math.atan2(SB.Input.mouse.worldY - p.y, SB.Input.mouse.worldX - p.x);
  p.attackAngle = angle;
  var mx = p.x + Math.cos(angle) * 22;
  var my = p.y + Math.sin(angle) * 22;
  G.bullets.push({
    x: mx, y: my, vx: Math.cos(angle) * 950, vy: Math.sin(angle) * 950,
    fromPlayer: true, damage: SB.PLAYER.pistolDamage, life: 0.6,
  });
  SB.spawnParticles(G, mx, my, 5, '#ffd76a', 200);
  SB.Audio.shoot();
  G.shake = Math.max(G.shake, 2);
};

SB.makeGoon = function (rng, x, y) {
  return {
    x: x, y: y, hp: 60,
    angle: rng.range(0, Math.PI * 2),
    shootCd: rng.range(0.5, 1.5),
    state: 'guard', // guard | chase | down
    color: '#3d2b2b',
  };
};

SB.spawnGoons = function (G, x, y, n) {
  for (var i = 0; i < n; i += 1) {
    var gx = x + G.rng.range(-120, 120);
    var gy = y + G.rng.range(-120, 120);
    G.goons.push(SB.makeGoon(G.rng, gx, gy));
  }
};

SB.damageGoon = function (G, goon, amount) {
  goon.hp -= amount;
  SB.spawnParticles(G, goon.x, goon.y, 8, '#ff8a7a', 200);
  if (goon.hp <= 0 && goon.state !== 'down') {
    goon.state = 'down';
    G.cash += 40; // goons drop a little cash
    SB.spawnParticles(G, goon.x, goon.y, 16, '#f2c94c', 260);
    SB.Audio.pickup();
  }
};

SB.updateGoons = function (G, dt) {
  var p = G.player;
  for (var i = G.goons.length - 1; i >= 0; i -= 1) {
    var g = G.goons[i];
    if (g.state === 'down') continue;
    var d = Math.hypot(p.x - g.x, p.y - g.y);
    if (d < 460) {
      g.state = 'chase';
      g.angle = Math.atan2(p.y - g.y, p.x - g.x);
      if (d > 240) {
        g.x += Math.cos(g.angle) * 95 * dt;
        g.y += Math.sin(g.angle) * 95 * dt;
      }
      g.shootCd -= dt;
      if (g.shootCd <= 0 && d < 430) {
        g.shootCd = G.rng.range(0.9, 1.6);
        var a = g.angle + G.rng.range(-0.09, 0.09);
        G.bullets.push({
          x: g.x + Math.cos(a) * 22, y: g.y + Math.sin(a) * 22,
          vx: Math.cos(a) * 700, vy: Math.sin(a) * 700,
          fromPlayer: false, damage: 9, life: 0.7,
        });
        SB.spawnParticles(G, g.x + Math.cos(a) * 22, g.y + Math.sin(a) * 22, 4, '#ffd76a', 160);
        SB.Audio.enemyShoot();
      }
    } else {
      g.state = 'guard';
    }
    SB.resolveCircle(G.city, g, 12);
  }
  // Clear the fallen after a while so the street does not pile up.
  for (var j = G.goons.length - 1; j >= 0; j -= 1) {
    if (G.goons[j].state === 'down') {
      G.goons[j].downTimer = (G.goons[j].downTimer || 0) + dt;
      if (G.goons[j].downTimer > 12) G.goons.splice(j, 1);
    }
  }
};

SB.updateBullets = function (G, dt) {
  var p = G.player;
  for (var i = G.bullets.length - 1; i >= 0; i -= 1) {
    var b = G.bullets[i];
    b.life -= dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    var dead = b.life <= 0 || SB.hitsBlocker(G.city, b.x, b.y, 2);
    if (!dead && b.fromPlayer) {
      for (var j = 0; j < G.goons.length; j += 1) {
        var g = G.goons[j];
        if (g.state !== 'down' && Math.hypot(g.x - b.x, g.y - b.y) < 16) {
          SB.damageGoon(G, g, b.damage);
          dead = true;
          break;
        }
      }
      if (!dead) {
        for (var k = 0; k < G.peds.length; k += 1) {
          var ped = G.peds[k];
          if (ped.state !== 'down' && Math.hypot(ped.x - b.x, ped.y - b.y) < 14) {
            SB.knockPed(G, ped, false);
            SB.addWanted(G, SB.WANTED.shootPed, 'shooting');
            dead = true;
            break;
          }
        }
      }
      if (!dead) {
        for (var m = 0; m < G.police.length; m += 1) {
          var cop = G.police[m];
          if (Math.hypot(cop.x - b.x, cop.y - b.y) < 24) {
            SB.addWanted(G, SB.WANTED.shootCop, 'shooting a cop');
            SB.spawnParticles(G, b.x, b.y, 8, '#9db8d6', 200);
            dead = true;
            break;
          }
        }
      }
    }
    if (!dead && !b.fromPlayer) {
      if (Math.hypot(p.x - b.x, p.y - b.y) < 15) {
        SB.damagePlayer(G, b.damage);
        dead = true;
      }
    }
    if (dead) {
      SB.spawnParticles(G, b.x, b.y, 4, '#ffffff', 120);
      G.bullets.splice(i, 1);
    }
  }
};
