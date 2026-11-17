// Every tuning number, colour and key binding for Sunspire Bay, in one place.
// The world is a fixed 3600x2700 city; the renderer scales the camera to the
// window, so no rule below depends on the screen size.
var SB = window.SB || (window.SB = {});

SB.CFG = {
  WORLD_W: 3600,
  WORLD_H: 2700,
  ROAD_W: 96,
  SIDEWALK: 16,
  STEP: 1 / 60,
  SAVE_KEY: 'sunspire-bay.save.v1',
  BEST_KEY: 'sunspire-bay.best.v1',
};

SB.ROADS_V = [200, 600, 1000, 1400, 1800, 2200, 2600, 3000, 3400];
SB.ROADS_H = [200, 600, 1000, 1400, 1800, 2200, 2600];

SB.PLAYER = {
  radius: 13,
  walkSpeed: 175,
  runSpeed: 265,
  health: 100,
  punchRange: 52,
  punchDamage: 18,
  punchCooldown: 0.35,
  shootCooldown: 0.27,
  pistolDamage: 34,
  pistolRange: 520,
};

SB.CAR = {
  accel: 560,
  brake: 950,
  reverseMax: 260,
  maxSpeed: 640,
  steerRate: 2.7,
  drag: 0.55,
  grip: 6.5,
  radius: 20,
};

SB.TRAFFIC = { minSpeed: 120, maxSpeed: 195, count: 26, radius: 20 };
SB.PED = { count: 42, walkSpeed: 55, fleeSpeed: 150 };

SB.POLICE = {
  accel: 720,
  maxSpeed: 665,
  ramDamage: 12,
  bustRadius: 78,
  bustSeconds: 2.4,
  // Cruisers on the street per wanted level (index = stars).
  cruisersForStars: [0, 2, 3, 4, 5, 6],
};

SB.WANTED = {
  stealCar: 1,
  assaultPed: 1,
  hitPed: 1,
  shootPed: 2,
  shootCop: 2,
  crimeCooldown: 25, // seconds of no crime before stars start to fall
  decaySeconds: 12, // seconds per lost star once cooling down
};

// Cash the player loses when busted or wasted.
SB.BUST_FINE = 150;
SB.WASTE_FINE = 150;

SB.PALETTE = {
  grass: '#5d8a4a',
  grassDark: '#4c7a3e',
  park: '#6fa055',
  sand: '#d9c48a',
  water: '#2e6f8e',
  waterDeep: '#256078',
  road: '#3a3d46',
  roadEdge: '#2c2f37',
  sidewalk: '#8d8a7d',
  lane: '#d8c95a',
  buildingRoof: '#7a6f63',
  plaza: '#9a938a',
  text: '#f4f1e8',
  muted: '#b9b4a6',
  gold: '#f2c94c',
  red: '#e5534b',
  blue: '#4f8ef7',
  green: '#58c184',
  panel: 'rgba(16, 18, 26, 0.82)',
  panelEdge: 'rgba(244, 241, 232, 0.25)',
};

SB.BUILDING_COLORS = [
  '#8a7f72', '#a08b74', '#6f7d8c', '#9c8a6d', '#7d8a6f',
  '#b0987f', '#857a8c', '#96826a', '#74828f', '#a8907c',
];
SB.ROOF_COLORS = ['#6b5f52', '#5d6b78', '#7a6a58', '#5f7050', '#6e5a68'];
SB.CAR_COLORS = [
  '#c0392b', '#2980b9', '#f39c12', '#27ae60', '#8e44ad', '#ecf0f1',
  '#2c3e50', '#e67e22', '#16a085', '#d35400', '#7f8c8d', '#b03a2e',
];
SB.PED_COLORS = [
  '#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6', '#e67e22',
  '#1abc9c', '#fd79a8', '#6c5ce7', '#00b894', '#d63031', '#0984e3',
];

SB.KEYS = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  run: ['ShiftLeft', 'ShiftRight'],
  enterCar: ['KeyE'],
  punch: ['KeyF'],
  handbrake: ['Space'],
  pause: ['Escape', 'KeyP'],
  mute: ['KeyM'],
  interact: ['KeyE'],
  advance: ['KeyE', 'Enter', 'Space'],
};

SB.FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
