// The staged screenshot scenes behind ?shot=cover|street|chase|mission.
// Each one plays the real rules forward from a fresh seeded world for a fixed
// number of steps, steered by scripted inputs, so the frame is what a short
// game really looks like and the same seed always gives the same frame.
var SB = window.SB || (window.SB = {});

var STEP = SB.CFG.STEP;
var NO_INPUT = { up: false, down: false, left: false, right: false, run: false, handbrake: false, enter: false, punch: false, shoot: false };

function runSteps(G, seconds, inputFn) {
  var n = Math.round(seconds / STEP);
  for (var i = 0; i < n; i += 1) {
    var input = inputFn ? inputFn(i, n) : NO_INPUT;
    SB.stepWorld(G, STEP, input);
  }
  // Settle the camera on the player.
  G.camera.x = G.player.x;
  G.camera.y = G.player.y;
  G.camera.zoom = G.player.car ? 0.78 : 1.0;
  SB.Input.mouse.worldX = G.player.x + 200;
  SB.Input.mouse.worldY = G.player.y;
}

// Put a few traffic cars and pedestrians near the player so the frame is busy.
function crowdNear(G, count) {
  for (var i = 0; i < count; i += 1) {
    var p = SB.randomRoadPoint(G.rng);
    var near = i % 2 === 0;
    var x = near ? G.player.x + G.rng.range(-320, 320) : p.x;
    var y = near ? G.player.y + G.rng.range(-240, 240) : p.y;
    var road = SB.nearestRoad(x, y);
    var car = SB.makeTrafficCar(G.rng, road.x, road.y, road.vertical, G.rng.chance(0.5) ? 1 : -1);
    car.baseSpeed = car.speed;
    if (car.vertical) car.x += car.dir > 0 ? car.lane : -car.lane;
    else car.y += car.dir > 0 ? car.lane : -car.lane;
    if (SB.onRoad(car.x, car.y) && !SB.hitsBlocker(G.city, car.x, car.y, 22)) G.traffic.push(car);
    G.peds.push(SB.makePed(G.rng, G.player.x + G.rng.range(-260, 260), G.player.y + G.rng.range(-200, 200)));
  }
}

SB.stageShot = function (name, G) {
  // A fresh seeded world for every shot: same seed, same frame.
  G.seed = 7;
  SB.resetWorld(G);
  G.state = 'play';
  G.cash = 1240;

  if (name === 'street') {
    // On foot downtown, mission 1 live, traffic and pedestrians around.
    G.player.x = SB.PLACES.plaza.x;
    G.player.y = SB.PLACES.plaza.y + 40;
    G.player.hasGun = false;
    SB.startMission(G, 0);
    G.state = 'play'; // startMission opens dialogue; the shot shows play
    G.dialogue = null;
    crowdNear(G, 10);
    runSteps(G, 3.5, function () { return { up: true, down: false, left: false, right: false, run: false, handbrake: false, enter: false, punch: false, shoot: false }; });
    return { screen: 'play' };
  }

  if (name === 'chase') {
    // Driving east on a main road, wanted level 3, cruisers in pursuit.
    var roadY = 1400;
    var car = SB.makeTrafficCar(G.rng, 1250, roadY, false, 1);
    car.color = '#c0392b';
    car.kind = 'parked';
    car.speed = 0;
    G.traffic.push(car);
    G.player.x = car.x; G.player.y = car.y;
    G.traffic.splice(G.traffic.indexOf(car), 1);
    G.player.car = car;
    crowdNear(G, 6);
    for (var c = 0; c < 3; c += 1) {
      var spot = { x: car.x - 260 - c * 130, y: roadY + (c % 2 === 0 ? 24 : -24) };
      var cruiser = SB.makeCruiser(G, spot.x, spot.y);
      cruiser.speed = 420;
      cruiser.angle = 0;
      G.police.push(cruiser);
    }
    SB.startMission(G, 2);
    G.state = 'play';
    G.dialogue = null;
    // Hot Cargo adds its own heat; pin the shot at three stars.
    G.wanted = 3;
    G.crimeTimer = 0;
    runSteps(G, 2.6, function () { return { up: true, down: false, left: false, right: false, run: false, handbrake: false, enter: false, punch: false, shoot: false }; });
    G.camera.zoom = 0.78;
    return { screen: 'play' };
  }

  if (name === 'mission') {
    // Mission 4 at the warehouse: armed, goons in the open, one cruiser.
    G.player.x = SB.PLACES.warehouse.x - 260;
    G.player.y = SB.PLACES.warehouse.y - 60;
    G.player.hasGun = true;
    G.player.angle = 0;
    G.wanted = 1;
    SB.startMission(G, 3);
    G.state = 'play';
    G.dialogue = null;
    // Step into the 'clear' step and spawn the gang.
    SB.updateMissions(G, 0);
    G.stepGoonsSpawned = true;
    var goons = G.goons;
    SB.Input.mouse.worldX = goons.length ? goons[0].x : G.player.x + 200;
    SB.Input.mouse.worldY = goons.length ? goons[0].y : G.player.y;
    crowdNear(G, 4);
    runSteps(G, 1.6, function (i) {
      var shoot = i % 14 < 6;
      return { up: i < 30, down: false, left: false, right: false, run: false, handbrake: false, enter: false, punch: false, shoot: shoot };
    });
    return { screen: 'play' };
  }

  // Default: the cover — the title screen over a living city.
  G.state = 'title';
  runSteps(G, 5, function () { return NO_INPUT; });
  G.state = 'title';
  G.camera.x = 1800;
  G.camera.y = 1350;
  G.camera.zoom = 0.85;
  return { screen: 'title' };
};
