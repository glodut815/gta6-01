// The story: "The Meridian Job". Four missions for Danny Cole, a wheelman who
// owes Ray's Garage one last job. Each mission is a list of steps; a step is
// done by reaching a place, stealing a car, or clearing out the goons.
var SB = window.SB || (window.SB = {});

SB.STORY_TITLE = 'The Meridian Job';

SB.MISSIONS = [
  {
    id: 'first-wheels',
    title: '1 — First Wheels',
    reward: 300,
    intro: [
      { who: 'Ray', text: 'Danny. You owe me one last job, and the Meridian crew pays in cash, not promises.' },
      { who: 'Ray', text: 'First, wheels. Grab any car on the street — press E next to one — then bring it to my garage.' },
      { who: 'Danny', text: 'One last job, Ray. Then we are square.' },
    ],
    steps: [
      { type: 'steal', text: 'Steal a car (walk up to one and press E)' },
      { type: 'reach', place: 'garage', radius: 90, text: 'Drive the car to Ray\'s Garage' },
    ],
    outro: [
      { who: 'Ray', text: 'Good. She runs clean. The crew meets at the docks — go get the package.' },
    ],
  },
  {
    id: 'the-pickup',
    title: '2 — The Pickup',
    reward: 500,
    intro: [
      { who: 'Ray', text: 'The package is waiting at Meridian Docks. Walk in, grab it, and take it to the Sunset Motel. No detours.' },
      { who: 'Ray', text: 'Take this, too. A pistol — just in case. Left click shoots, F throws a punch.' },
    ],
    steps: [
      { type: 'collect', place: 'docks', radius: 80, text: 'Pick up the package at Meridian Docks' },
      { type: 'reach', place: 'motel', radius: 90, text: 'Deliver the package to the Sunset Motel' },
    ],
    outro: [
      { who: 'Motel Clerk', text: 'Package received. The crew says the next run is hot — the cops will be watching.' },
    ],
  },
  {
    id: 'hot-cargo',
    title: '3 — Hot Cargo',
    reward: 800,
    intro: [
      { who: 'Ray', text: 'Change of plan. The cargo has to cross the East Bridge tonight, and the whole precinct knows it.' },
      { who: 'Ray', text: 'You will have heat on you from the start. Lose them or outrun them — just get to the bridge.' },
    ],
    steps: [
      { type: 'reach', place: 'bridge', radius: 100, text: 'Reach the East Bridge drop-off — with the cops on your tail' },
    ],
    outro: [
      { who: 'Ray', text: 'You made it. One more run, Danny, and the debt is gone for good.' },
    ],
  },
  {
    id: 'the-getaway',
    title: '4 — The Getaway',
    reward: 1500,
    intro: [
      { who: 'Ray', text: 'The Harbor Warehouse. The crew stashed the payout there, but the dock gang moved in first.' },
      { who: 'Ray', text: 'Clear them out, grab the cash, and bring it home to the safehouse. Then we are done.' },
    ],
    steps: [
      { type: 'clear', place: 'warehouse', radius: 200, text: 'Clear the dock gang out of the Harbor Warehouse' },
      { type: 'collect', place: 'warehouse', radius: 80, text: 'Grab the payout cash' },
      { type: 'reach', place: 'safehouse', radius: 90, text: 'Bring the cash to the Safehouse' },
    ],
    outro: [
      { who: 'Danny', text: 'Debt paid. Sunspire Bay is mine now — and nobody owns my wheels but me.' },
    ],
  },
];

SB.currentMission = function (G) {
  if (G.missionIndex < 0 || G.missionIndex >= SB.MISSIONS.length) return null;
  return SB.MISSIONS[G.missionIndex];
};

SB.currentStep = function (G) {
  var m = SB.currentMission(G);
  if (!m) return null;
  return m.steps[G.missionStep] || null;
};

// Where the player should go right now: the current step's place — or, when
// the current step has no place of its own (stealing a car), the next step's,
// so the marker always points at the job ahead.
SB.missionTarget = function (G) {
  var step = SB.currentStep(G);
  if (!step) return null;
  if (step.place) return SB.PLACES[step.place];
  var m = SB.currentMission(G);
  var next = m.steps[G.missionStep + 1];
  if (next && next.place) return SB.PLACES[next.place];
  return null;
};

SB.startMission = function (G, index) {
  var m = SB.MISSIONS[index];
  if (!m) return;
  G.missionIndex = index;
  G.missionStep = 0;
  G.missionStarted = true;
  if (index === 2) {
    // Hot Cargo starts with the cops already looking for the player.
    SB.addWanted(G, 2, 'the crew tipped off the cops');
  }
  if (index === 1) {
    G.player.hasGun = true; // Ray hands over the pistol
  }
  SB.showDialogue(G, m.intro);
};

SB.completeMission = function (G) {
  var m = SB.currentMission(G);
  if (!m) return;
  G.cash += m.reward;
  G.missionsDone += 1;
  G.missionIndex += 1;
  G.missionStep = 0;
  G.missionStarted = false; // the next mission's intro starts after this outro
  if (G.missionIndex >= SB.MISSIONS.length) {
    G.storyComplete = true;
  }
  SB.Audio.missionDone();
  SB.showDialogue(G, m.outro.concat([
    { who: 'Sunspire Bay', text: 'Mission complete — $' + m.reward + ' earned.' },
  ]));
  SB.saveGame(G);
};

SB.advanceStep = function (G) {
  var m = SB.currentMission(G);
  if (!m) return;
  G.missionStep += 1;
  SB.Audio.pickup();
  if (G.missionStep >= m.steps.length) SB.completeMission(G);
  else SB.saveGame(G);
};

SB.updateMissions = function (G, dt) {
  var step = SB.currentStep(G);
  if (!step) return;
  var p = G.player;
  if (step.type === 'steal') {
    if (p.car) SB.advanceStep(G);
    return;
  }
  if (step.type === 'clear') {
    // Done when every goon is down — not when their bodies are cleared away.
    var anyStanding = false;
    for (var gi = 0; gi < G.goons.length; gi += 1) {
      if (G.goons[gi].state !== 'down') { anyStanding = true; break; }
    }
    if (G.stepGoonsSpawned && !anyStanding) {
      G.stepGoonsSpawned = false;
      SB.advanceStep(G);
    } else if (!G.stepGoonsSpawned) {
      var place = SB.PLACES[step.place];
      SB.spawnGoons(G, place.x, place.y, 3);
      G.stepGoonsSpawned = true;
      SB.showToast(G, 'The dock gang is here — clear them out!');
    }
    return;
  }
  // reach / collect: stand inside the marker radius.
  var place = SB.PLACES[step.place];
  if (!place) return;
  var d = Math.hypot(p.x - place.x, p.y - place.y);
  if (d < step.radius) {
    if (step.type === 'collect') SB.showToast(G, step.place === 'docks' ? 'Package collected!' : 'Payout grabbed!');
    SB.advanceStep(G);
  }
};

// --- Dialogue -------------------------------------------------------------

SB.showDialogue = function (G, lines) {
  if (!lines || !lines.length) return;
  G.dialogue = { lines: lines, index: 0 };
  G.state = 'dialogue';
};

SB.advanceDialogue = function (G) {
  if (!G.dialogue) return;
  G.dialogue.index += 1;
  if (G.dialogue.index >= G.dialogue.lines.length) {
    G.dialogue = null;
    G.state = 'play';
    // Starting the next mission once the previous one's outro is read.
    if (G.missionIndex >= 0 && G.missionIndex < SB.MISSIONS.length && !G.missionStarted) {
      SB.startMission(G, G.missionIndex);
    }
  }
};

// A short message that fades at the bottom of the screen.
SB.showToast = function (G, text) {
  G.toast = text;
  G.toastTimer = 3;
};
