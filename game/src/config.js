// Sunspire Bay — shared tuning, map layout and mission data.
// One source of truth for numbers every other module reads.

export const VIEW_W = 1280;
export const VIEW_H = 720;

export const WORLD = { w: 3600, h: 2600 };

// Road centrelines. Streets are wide enough for U-turns.
export const ROADS_V = [200, 700, 1200, 1700, 2200, 2700, 3200];
export const ROADS_H = [200, 650, 1100, 1550, 2000, 2350];
export const ROAD_W = 116;

// A water channel splits the city: docks and harbour lie east of it.
// The only crossing is the bridge on Harbor Avenue (y = 1100).
export const CHANNEL = { x0: 3000, x1: 3180 };
export const BRIDGE = { y0: 1024, y1: 1176 };

// Named places. Every mission target is a point on or beside a road.
export const PLACES = {
  safehouse: { x: 460, y: 470, label: 'Safehouse' },
  garage: { x: 1200, y: 650, label: "Ray's Garage" },
  docksPickup: { x: 3360, y: 780, label: 'Docks Pickup' },
  motel: { x: 700, y: 2000, label: 'Motel' },
  bridgeEast: { x: 3360, y: 1100, label: 'Bridge East End' },
  warehouse: { x: 3360, y: 1720, label: 'Meridian Warehouse' },
  spawn: { x: 520, y: 560, label: 'Spawn' },
};

export const DISTRICTS = [
  { name: 'Downtown', x0: 0, y0: 0, x1: 1700, y1: 1100, tint: '#c8b18a' },
  { name: 'Motel Row', x0: 0, y0: 1550, x1: 1700, y1: 2600, tint: '#b98a7a' },
  { name: 'Old Town', x0: 1700, y0: 0, x1: 3000, y1: 1100, tint: '#a8b8a0' },
  { name: 'Southside', x0: 1700, y0: 1100, x1: 3000, y1: 2600, tint: '#9aa8c0' },
  { name: 'Docks', x0: 3180, y0: 0, x1: 3600, y1: 2600, tint: '#8a94a0' },
];

export const COLORS = {
  grass: '#5d8a4a',
  grassAlt: '#557f43',
  sand: '#d8c08a',
  asphalt: '#3a3d44',
  asphaltEdge: '#2c2f36',
  lane: '#e8d44d',
  sidewalk: '#9a938a',
  water: '#2f6f8f',
  waterDeep: '#25607e',
  buildingRoof: ['#b0563a', '#7a6a8a', '#4a7a9a', '#9a8a4a', '#6a8a5a', '#8a4a5a'],
  park: '#4a7a3a',
  bridgeDeck: '#6a6f78',
};

// Mission chain: "The Meridian Job". Payouts sum with the $120 starting
// cash to exactly $3,220 when the story is complete.
export const MISSIONS = [
  {
    id: 1, title: 'First Wheels', payout: 300,
    intro: [
      { who: 'RAY', text: 'Kid. You want in on the Meridian Job? First prove you can drive.' },
      { who: 'RAY', text: 'Borrow a car — any car — and bring it to my garage. Try not to scratch it.' },
      { who: 'YOU', text: 'Borrow. Right. Let me go find a generous donor.' },
    ],
    objective: 'Steal a car and drive to Ray\u2019s Garage',
    target: 'garage', needCar: true, radius: 110,
  },
  {
    id: 2, title: 'Dockside Run', payout: 800,
    intro: [
      { who: 'RAY', text: 'Not bad. Now the real work. Pick up the crate at the docks, then drop it at the motel.' },
      { who: 'RAY', text: 'No cops, no shortcuts through the water. The bridge is the only way east.' },
    ],
    objective: 'Pick up the crate at the Docks',
    objective2: 'Deliver the crate to the Motel',
    target: 'docksPickup', target2: 'motel', needCar: true, radius: 110,
  },
  {
    id: 3, title: 'Hot Crossing', payout: 1600,
    intro: [
      { who: 'RAY', text: 'The Meridian crew knows our face now. Heat is coming — cross the bridge east and lose them.' },
      { who: 'RAY', text: 'Two stars on your tail the whole way. Keep moving and do not stop on the bridge.' },
    ],
    objective: 'Cross the bridge east under 2-star heat',
    target: 'bridgeEast', needCar: true, radius: 120, heat: 2,
  },
  {
    id: 4, title: 'The Getaway', payout: 400,
    intro: [
      { who: 'RAY', text: 'Last job. The payout sits in the Meridian warehouse — and the crew is guarding it with guns.' },
      { who: 'RAY', text: 'Clear them out, grab the case, and bring it home to the safehouse. Then we are rich.' },
    ],
    objective: 'Reach the Meridian Warehouse',
    objective2: 'Clear out the crew guarding the payout',
    objective3: 'Grab the payout case',
    objective4: 'Drive the payout home to the Safehouse',
    target: 'warehouse', needCar: false, radius: 130,
  },
];

export const START_CASH = 120;
export const PLAYER_MAX_HEALTH = 100;
export const GOON_COUNT = 5;
export const MAX_WANTED = 5;

// Save key for localStorage.
export const SAVE_KEY = 'sunspire-bay-save-v1';
