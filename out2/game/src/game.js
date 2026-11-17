// The game itself: state machine, the player on foot and behind the wheel,
// stealing cars, the camera, menus, autosave. The world simulation lives in
// stepWorld so the screenshot scenes can run it forward deterministically.
var SB = window.SB || (window.SB = {});

SB.createGame = function (canvas, seed) {
  var G = {
    canvas: canvas,
    ctx: canvas.getContext('2d'),
    view: { w: 1280, h: 720 },
    state: 'title',
    seed: seed || 7,
    rng: SB.makeRng(seed || 7),
    time: 0,
    playSeconds: 0,
    city: null,
    player: null,
    traffic: [],
    peds: [],
    police: [],
    goons: [],
    bullets: [],
    particles: [],
    wanted: 0,
    crimeTimer: 0,
    decayTimer: 0,
    cash: 0,
    missionIndex: 0,
    missionStep: 0,
    missionStarted: false,
    missionsDone: 0,
    storyComplete: false,
    stepGoonsSpawned: false,
    dialogue: null,
    toast: null,
    toastTimer: 0,
    camera: { x: 1800, y: 1400, zoom: 1 },
    shake: 0,
    finePaid: 0,
    lastCrime: '',
    autosaveTimer: 0,
    titleButtons: [],
    pauseButtons: [],
    endButtons: [],
    howtoButtons: [],
    shotMode: null,
  };
  SB.resetWorld(G);
  SB.layoutButtons(G);
  return G;
};

// Fresh world and player; keeps the canvas and the menu buttons.
SB.resetWorld = function (G) {
  G.rng = SB.makeRng(G.seed);
  G.city = SB.buildCity(G.seed);
  G.traffic = SB.spawnTraffic(G.rng, SB.TRAFFIC.count);
  G.traffic = G.traffic.concat(SB.spawnParkedCars(G.city));
  G.peds = SB.spawnPeds(G.rng, SB.PED.count);
  G.police = [];
  G.goons = [];
  G.bullets = [];
  G.particles = [];
  G.wanted = 0;
  G.crimeTimer = 0;
  G.decayTimer = 0;
  G.cash = 0;
  G.missionIndex = 0;
  G.missionStep = 0;
  G.missionStarted = false;
  G.missionsDone = 0;
  G.storyComplete = false;
  G.stepGoonsSpawned = false;
  G.dialogue = null;
  G.toast = null;
  G.toastTimer = 0;
  G.finePaid = 0;
  G.player = {
    x: SB.PLACES.plaza.x, y: SB.PLACES.plaza.y + 40,
    vx: 0, vy: 0, angle: -Math.PI / 2,
    health: SB.PLAYER.health,
    hasGun: false, car: null,
    punchCd: 0, shootCd: 0, attackTimer: 0, attacking: false, attackAngle: 0,
    invuln: 0, speed: 0,
  };
  G.camera = { x: G.player.x, y: G.player.y, zoom: 1 };
  G.shake = 0;
};

SB.layoutButtons = function (G) {
  var W = G.view.w, H = G.view.h;
  var cx = W / 2 - 140;
  function btn(y, label, onClick, visible) {
    return { x: cx, y: y, w: 280, h: 52, label: label, hover: false, onClick: onClick, visible: visible || function () { return true; } };
  }
  G.titleButtons = [
    btn(H * 0.30 + 130, 'CONTINUE', function () { SB.continueGame(G); }, function () { return SB.hasSave(); }),
    btn(H * 0.30 + 196, 'NEW GAME', function () { SB.newGame(G); }),
    btn(H * 0.30 + 262, 'HOW TO PLAY', function () { G.state = 'howto'; }),
  ];
  G.pauseButtons = [
    btn(H * 0.36, 'RESUME', function () { G.state = 'play'; }),
    btn(H * 0.36 + 66, 'SAVE GAME', function () { SB.saveGame(G); SB.showToast(G, 'Game saved.'); }),
    btn(H * 0.36 + 132, 'HOW TO PLAY', function () { G.state = 'howto'; }),
    btn(H * 0.36 + 198, 'QUIT TO TITLE', function () { SB.quitToTitle(G); }),
  ];
  G.endButtons = [
    btn(H * 0.36 + 120, 'GET BACK OUT THERE', function () { SB.respawnPlayer(G); }),
    btn(H * 0.36 + 186, 'QUIT TO TITLE', function () { SB.quitToTitle(G); }),
  ];
  G.howtoButtons = [
    btn(H - 140, 'BACK', function () { G.state = G.returnState || 'title'; }),
  ];
};

SB.newGame = function (G) {
  SB.clearSave();
  SB.resetWorld(G);
  G.state = 'play';
  SB.startMission(G, 0);
};

SB.continueGame = function (G) {
  var data = SB.loadSave();
  SB.resetWorld(G);
  if (data) SB.applySave(G, data);
  G.state = 'play';
  SB.showToast(G, 'Welcome back to Sunspire Bay.');
  if (G.missionIndex >= 0 && G.missionIndex < SB.MISSIONS.length && G.missionStarted) {
    // Re-open the current mission's intro so the player remembers the job.
    SB.showDialogue(G, SB.MISSIONS[G.missionIndex].intro);
  }
};

SB.quitToTitle = function (G) {
  SB.saveGame(G);
  SB.Audio.stopAll();
  G.state = 'title';
  G.dialogue = null;
  G.returnState = 'title';
};

// --- Cars ---------------------------------------------------------------

SB.nearestCar = function (G, radius) {
  var p = G.player;
  var best = null, bestD = radius;
  var all = G.traffic.concat(G.police);
  for (var i = 0; i < all.length; i += 1) {
    var c = all[i];
    var d = Math.hypot(c.x - p.x, c.y - p.y);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  if (best) {
    var names = ['Sedan', 'Coupe', 'Hatchback', 'Pickup', 'Van', 'Cruiser'];
    best.label = best.kind === 'police' ? 'Police Cruiser' : names[Math.abs(Math.floor(best.x + best.y)) % names.length];
  }
  return best;
};

SB.enterCar = function (G) {
  var p = G.player;
  if (p.car) return;
  var car = SB.nearestCar(G, 92);
  if (!car || car.kind === 'wrecked') return;
  if (car.kind === 'police' && G.wanted === 0) {
    SB.showToast(G, 'Stealing a cruiser in broad daylight? Not today.');
    return;
  }
  // Stealing in front of a witness is a crime; an empty street is free.
  var witnessed = false;
  for (var i = 0; i < G.police.length; i += 1) {
    if (Math.hypot(G.police[i].x - p.x, G.police[i].y - p.y) < 520) { witnessed = true; break; }
  }
  if (!witnessed) {
    for (var j = 0; j < G.peds.length; j += 1) {
      if (Math.hypot(G.peds[j].x - p.x, G.peds[j].y - p.y) < 260) { witnessed = true; break; }
    }
  }
  if (witnessed) SB.addWanted(G, SB.WANTED.stealCar, 'grand theft auto');
  if (car.driver) {
    car.driver = false;
    SB.spawnPed(G, car.x + 24, car.y, 'flee');
  }
  // Take the car out of traffic; it is the player's now.
  var idx = G.traffic.indexOf(car);
  if (idx !== -1) G.traffic.splice(idx, 1);
  var pidx = G.police.indexOf(car);
  if (pidx !== -1) G.police.splice(pidx, 1);
  car.speed = 0;
  p.car = car;
  p.x = car.x; p.y = car.y;
  SB.Audio.carDoor();
  SB.Audio.setEngine(true, 0);
  SB.showToast(G, 'You took the ' + (car.label || 'car') + '.');
};

SB.exitCar = function (G, keepInPlace) {
  var p = G.player;
  if (!p.car) return;
  var car = p.car;
  car.speed = 0;
  car.kind = 'parked';
  car.vertical = false;
  car.driver = false;
  G.traffic.push(car);
  p.car = null;
  p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
  p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
  SB.resolveCircle(G.city, p, SB.PLAYER.radius);
  SB.Audio.carDoor();
  SB.Audio.setEngine(false, 0);
};

// --- Player -------------------------------------------------------------

function updatePlayerOnFoot(G, dt, input) {
  var p = G.player;
  var dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  var dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  var len = Math.hypot(dx, dy);
  var speed = input.run ? SB.PLAYER.runSpeed : SB.PLAYER.walkSpeed;
  if (len > 0) {
    dx /= len; dy /= len;
    p.vx = dx * speed; p.vy = dy * speed;
    p.angle = Math.atan2(dy, dx);
    p.speed = speed;
  } else {
    p.vx = 0; p.vy = 0;
    p.speed = 0;
  }
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  SB.resolveCircle(G.city, p, SB.PLAYER.radius);

  p.punchCd = Math.max(0, p.punchCd - dt);
  p.shootCd = Math.max(0, p.shootCd - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  if (p.attackTimer > 0) {
    p.attackTimer -= dt;
    if (p.attackTimer <= 0) p.attacking = false;
  }
  // Face the mouse while fighting.
  if (input.shoot || input.punch) {
    p.angle = Math.atan2(SB.Input.mouse.worldY - p.y, SB.Input.mouse.worldX - p.x);
  }
  if (input.punch) SB.tryPunch(G);
  if (input.shoot) SB.tryShoot(G);
  if (input.enter) SB.enterCar(G);
}

function updatePlayerInCar(G, dt, input) {
  var p = G.player;
  var car = p.car;
  var fwd = input.up ? 1 : 0;
  var rev = input.down ? 1 : 0;
  if (fwd) car.speed += SB.CAR.accel * dt;
  else if (rev) car.speed -= (car.speed > 0 ? SB.CAR.brake : SB.CAR.accel * 0.6) * dt;
  else {
    // Coast down.
    car.speed -= car.speed * SB.CAR.drag * dt;
    if (Math.abs(car.speed) < 4) car.speed = 0;
  }
  if (input.handbrake) {
    car.speed -= car.speed * 3.2 * dt;
    car.angle += ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * SB.CAR.steerRate * 1.6 * dt * Math.sign(car.speed || 1);
  }
  car.speed = Math.max(-SB.CAR.reverseMax, Math.min(SB.CAR.maxSpeed, car.speed));
  var steer = ((input.right ? 1 : 0) - (input.left ? 1 : 0));
  var grip = Math.min(1, Math.abs(car.speed) / 160);
  car.angle += steer * SB.CAR.steerRate * grip * dt * Math.sign(car.speed || 1);
  var nx = car.x + Math.cos(car.angle) * car.speed * dt;
  var ny = car.y + Math.sin(car.angle) * car.speed * dt;
  var beforeX = car.x, beforeY = car.y;
  car.x = nx; car.y = ny;
  if (SB.hitsBlocker(G.city, car.x, car.y, 20)) {
    car.x = beforeX; car.y = beforeY;
    if (Math.abs(car.speed) > 120) {
      SB.Audio.crash();
      SB.spawnParticles(G, car.x, car.y, 10, '#f2c94c', 220);
      G.shake = Math.max(G.shake, 6);
      SB.damagePlayer(G, 4);
    }
    car.speed *= -0.25;
  }
  p.x = car.x; p.y = car.y;
  p.vx = Math.cos(car.angle) * car.speed;
  p.vy = Math.sin(car.angle) * car.speed;
  p.angle = car.angle;
  p.speed = Math.abs(car.speed);
  SB.Audio.setEngine(true, Math.abs(car.speed) / SB.CAR.maxSpeed);

  // Bump traffic cars and knock down pedestrians in the way.
  for (var i = 0; i < G.traffic.length; i += 1) {
    var o = G.traffic[i];
    if (o.kind === 'parked' && Math.abs(o.speed) < 1) {
      var dp = Math.hypot(o.x - car.x, o.y - car.y);
      if (dp < 44 && Math.abs(car.speed) > 60) {
        o.x += (o.x - car.x) * 0.2;
        o.y += (o.y - car.y) * 0.2;
        car.speed *= 0.7;
        SB.Audio.crash();
        G.shake = Math.max(G.shake, 4);
      }
      continue;
    }
    var d = Math.hypot(o.x - car.x, o.y - car.y);
    if (d < 46) {
      if (Math.abs(car.speed) > 240) {
        SB.wreckTrafficCar(G, o);
        car.speed *= 0.6;
        G.shake = Math.max(G.shake, 8);
      } else {
        // Gentle nudge: push both apart.
        var push = Math.atan2(o.y - car.y, o.x - car.x);
        o.x += Math.cos(push) * 30 * dt * 10;
        o.y += Math.sin(push) * 30 * dt * 10;
        car.speed *= 0.94;
      }
    }
  }
  for (var j = 0; j < G.peds.length; j += 1) {
    var ped = G.peds[j];
    if (ped.state === 'down') continue;
    if (Math.hypot(ped.x - car.x, ped.y - car.y) < 26 && Math.abs(car.speed) > 40) {
      SB.knockPed(G, ped, true);
      SB.addWanted(G, SB.WANTED.hitPed, 'hit and run');
      car.speed *= 0.8;
      SB.Audio.crash();
      G.shake = Math.max(G.shake, 5);
    }
  }
  if (input.enter) SB.exitCar(G);
}

// One fixed step of the world. `input` is a plain object with boolean fields
// (up/down/left/right/run/handbrake/enter/punch/shoot) — live play reads it
// from the keyboard, the screenshot scenes script it.
SB.stepWorld = function (G, dt, input) {
  G.time += dt;
  if (G.state === 'play') G.playSeconds += dt;
  var p = G.player;
  if (p.car) updatePlayerInCar(G, dt, input);
  else updatePlayerOnFoot(G, dt, input);
  SB.updateTraffic(G, dt);
  SB.updatePeds(G, dt);
  SB.updatePolice(G, dt);
  SB.updateWanted(G, dt);
  SB.updateGoons(G, dt);
  SB.updateBullets(G, dt);
  SB.updateParticles(G, dt);
  SB.updateMissions(G, dt);
  if (G.toastTimer > 0) G.toastTimer -= dt;
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 26);
};

// --- The frame -----------------------------------------------------------

function readLiveInput() {
  var K = SB.KEYS;
  return {
    up: SB.Input.held(K.up),
    down: SB.Input.held(K.down),
    left: SB.Input.held(K.left),
    right: SB.Input.held(K.right),
    run: SB.Input.held(K.run),
    handbrake: SB.Input.held(K.handbrake),
    enter: SB.Input.hit(K.enterCar),
    punch: SB.Input.hit(K.punch) || SB.Input.consumeClick(),
    shoot: SB.Input.mouse.down,
  };
}

function handleButtons(G, buttons) {
  var m = SB.Input.mouse;
  var clicked = SB.Input.consumeClick();
  for (var i = 0; i < buttons.length; i += 1) {
    var b = buttons[i];
    if (!b.visible()) { b.hover = false; continue; }
    b.hover = m.x >= b.x && m.x <= b.x + b.w && m.y >= b.y && m.y <= b.y + b.h;
    if (b.hover && clicked) {
      SB.Audio.unlock();
      b.onClick();
      return true;
    }
  }
  return false;
}

function updateCamera(G, dt) {
  var p = G.player;
  var targetZoom = p.car ? 0.78 : 1.0;
  var k = 1 - Math.exp(-dt * 4.5);
  G.camera.x += (p.x - G.camera.x) * k;
  G.camera.y += (p.y - G.camera.y) * k;
  G.camera.zoom += (targetZoom - G.camera.zoom) * (1 - Math.exp(-dt * 2.5));
  // Mouse world position for aiming.
  SB.Input.mouse.worldX = (SB.Input.mouse.x - G.view.w / 2) / G.camera.zoom + G.camera.x;
  SB.Input.mouse.worldY = (SB.Input.mouse.y - G.view.h / 2) / G.camera.zoom + G.camera.y;
}

SB.update = function (G, dt) {
  G.time += dt * 0.2; // menus still animate a little
  if (SB.Input.hit(SB.KEYS.mute)) {
    var muted = SB.Audio.toggleMute();
    SB.showToast(G, muted ? 'Sound off' : 'Sound on');
  }
  if (G.state === 'title') {
    // The city lives behind the title: traffic drives, camera drifts.
    var idle = { up: false, down: false, left: false, right: false, run: false, handbrake: false, enter: false, punch: false, shoot: false };
    var keepState = G.state;
    G.state = 'play';
    SB.stepWorld(G, dt, idle);
    G.state = keepState;
    G.camera.x = 1800 + Math.cos(G.time * 0.05) * 500;
    G.camera.y = 1350 + Math.sin(G.time * 0.04) * 350;
    G.camera.zoom = 0.85;
    handleButtons(G, G.titleButtons);
    return;
  }
  if (G.state === 'howto') {
    handleButtons(G, G.howtoButtons);
    return;
  }
  if (G.state === 'pause') {
    handleButtons(G, G.pauseButtons);
    return;
  }
  if (G.state === 'wasted' || G.state === 'busted' || G.state === 'complete') {
    handleButtons(G, G.endButtons);
    return;
  }
  if (G.state === 'dialogue') {
    if (SB.Input.hit(SB.KEYS.advance) || SB.Input.consumeClick()) {
      SB.Audio.unlock();
      SB.advanceDialogue(G);
    }
    updateCamera(G, dt);
    return;
  }
  if (G.state !== 'play') return;

  if (SB.Input.hit(SB.KEYS.pause)) {
    G.state = 'pause';
    G.returnState = 'play';
    SB.Audio.setEngine(false, 0);
    SB.Audio.setSiren(false);
    return;
  }
  SB.Audio.unlock();
  updateCamera(G, dt);
  SB.stepWorld(G, dt, readLiveInput());
  updateCamera(G, dt);
  G.autosaveTimer += dt;
  if (G.autosaveTimer > 15) {
    G.autosaveTimer = 0;
    SB.saveGame(G);
  }
};
