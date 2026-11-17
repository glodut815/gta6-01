// Sunspire Bay's map: a seeded grid city with a harbour channel, one bridge,
// districts, buildings, parks, piers and parked cars — plus the collision and
// road helpers the player, traffic and police all share.

import { ROADS_V, ROADS_H, ROAD_W, WORLD, CHANNEL, BRIDGE, COLORS, PLACES } from './config.js';
import { makeRng } from './rng.js';

const CAR_COLORS = ['#c0392b', '#2980b9', '#f1c40f', '#ecf0f1', '#2c3e50', '#e67e22', '#8e44ad', '#16a085', '#bdc3c7'];

export function buildCity(seed) {
  const rng = makeRng(seed);
  const buildings = [];
  const parks = [];
  const trees = [];
  const parkedCars = [];

  const roadHalf = ROAD_W / 2;
  const blockXs = [0, ...ROADS_V, WORLD.w];
  const blockYs = [0, ...ROADS_H, WORLD.h];

  // One building block per cell of the street grid.
  for (let i = 0; i < blockXs.length - 1; i++) {
    for (let j = 0; j < blockYs.length - 1; j++) {
      const x0 = blockXs[i] + (i === 0 ? 0 : roadHalf) + 14;
      const x1 = blockXs[i + 1] - (i + 1 === blockXs.length - 1 ? 0 : roadHalf) - 14;
      const y0 = blockYs[j] + (j === 0 ? 0 : roadHalf) + 14;
      const y1 = blockYs[j + 1] - (j + 1 === blockYs.length - 1 ? 0 : roadHalf) - 14;
      if (x1 - x0 < 90 || y1 - y0 < 90) continue;
      // The channel eats the blocks it crosses; the bridge block stays open.
      if (x0 < CHANNEL.x1 && x1 > CHANNEL.x0) continue;
      // East edge is harbour water.
      if (x0 > 3480) continue;
      // The docks stay an open yard: no buildings, so the warehouse fight has
      // clear firing lanes and the pickup spots are always reachable.
      if (x0 >= CHANNEL.x1) continue;
      const roll = rng.next();
      if (roll < 0.16) {
        const park = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
        parks.push(park);
        const n = Math.floor(park.w * park.h / 9000);
        for (let t = 0; t < n; t++) {
          trees.push({ x: rng.range(park.x + 16, park.x + park.w - 16), y: rng.range(park.y + 16, park.y + park.h - 16), r: rng.range(9, 15) });
        }
        continue;
      }
      const nB = rng.int(1, 3);
      for (let b = 0; b < nB; b++) {
        const bw = rng.range(70, Math.min(190, (x1 - x0) / nB - 20));
        const bh = rng.range(60, Math.min(170, y1 - y0 - 24));
        const bx = rng.range(x0 + 8, x1 - bw - 8);
        const by = rng.range(y0 + 8, y1 - bh - 8);
        const rect = { x: bx, y: by, w: bw, h: bh, color: rng.pick(COLORS.buildingRoof), roof: rng.pick(['flat', 'peak', 'flat']) };
        if (buildings.some((o) => rectsOverlap(rect, o, 12))) continue;
        buildings.push(rect);
      }
    }
  }

  // Parked cars along road edges, aligned with the street.
  const spots = [];
  for (const vx of ROADS_V) {
    for (const hy of ROADS_H) {
      if (vx > CHANNEL.x0 && vx < CHANNEL.x1) continue;
      spots.push({ x: vx + roadHalf - 26, y: hy + 150, angle: Math.PI / 2, along: 'v' });
      spots.push({ x: vx - roadHalf + 26, y: hy - 150, angle: -Math.PI / 2, along: 'v' });
    }
  }
  for (const hy of ROADS_H) {
    for (const vx of ROADS_V) {
      if (hy === 1100) continue;
      if (vx > CHANNEL.x0) continue;
      spots.push({ x: vx + 170, y: hy + roadHalf - 26, angle: 0, along: 'h' });
    }
  }
  // Shuffle deterministically, then keep a spread of cars.
  for (let i = spots.length - 1; i > 0; i--) {
    const k = Math.floor(rng.next() * (i + 1));
    [spots[i], spots[k]] = [spots[k], spots[i]];
  }
  for (const s of spots.slice(0, 16)) {
    if (pointInBuilding(buildings, s.x, s.y, 24)) continue;
    if (pointInWater(s.x, s.y)) continue;
    parkedCars.push({ x: s.x, y: s.y, angle: s.angle, color: rng.pick(CAR_COLORS), model: rng.pick(['sedan', 'hatch', 'coupe', 'van']) });
  }

  // Named places and the warehouse fight ground must stay clear of buildings,
  // or a mission target could be unreachable (or the player spawn inside one).
  const CLEAR_SPOTS = [
    PLACES.safehouse, PLACES.garage, PLACES.docksPickup, PLACES.motel,
    PLACES.bridgeEast, PLACES.warehouse, PLACES.spawn,
    { x: 3300, y: 1640 }, { x: 3420, y: 1660 }, { x: 3360, y: 1800 },
    { x: 3280, y: 1760 }, { x: 3440, y: 1780 }, { x: 3420, y: 1760 },
  ];
  const clearBuildings = buildings.filter((b) => {
    for (const c of CLEAR_SPOTS) {
      const cx = Math.max(b.x, Math.min(c.x, b.x + b.w));
      const cy = Math.max(b.y, Math.min(c.y, b.y + b.h));
      if (Math.hypot(c.x - cx, c.y - cy) < 85) return false;
    }
    return true;
  });
  buildings.length = 0;
  buildings.push(...clearBuildings);

  return {
    buildings, parks, trees, parkedCars,
    roadsV: ROADS_V, roadsH: ROADS_H, roadW: ROAD_W,
    channel: CHANNEL, bridge: BRIDGE,
    piers: [{ x: 3480, y: 380, w: 110, h: 46 }, { x: 3480, y: 1080, w: 110, h: 46 }, { x: 3480, y: 1780, w: 110, h: 46 }],
  };
}

export function rectsOverlap(a, b, pad) {
  return a.x - pad < b.x + b.w && a.x + a.w + pad > b.x && a.y - pad < b.y + b.h && a.y + a.h + pad > b.y;
}

export function pointInBuilding(buildings, x, y, r) {
  for (const b of buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
  }
  return null;
}

export function pointInWater(x, y) {
  if (x > 3500) return true;
  if (x > CHANNEL.x0 && x < CHANNEL.x1) {
    if (y > BRIDGE.y0 && y < BRIDGE.y1) return false;
    return true;
  }
  return false;
}

// On a road (not on the bridge the channel still counts as road).
export function isOnRoad(x, y) {
  const half = ROAD_W / 2;
  for (const vx of ROADS_V) {
    if (Math.abs(x - vx) <= half) return true;
  }
  for (const hy of ROADS_H) {
    if (Math.abs(y - hy) <= half && !pointInWater(x, y)) return true;
    if (Math.abs(y - hy) <= half && y > BRIDGE.y0 && y < BRIDGE.y1) return true;
  }
  return false;
}

// Circle vs buildings + water + world edge. Returns the blocking rect or 'water'.
export function collideWorld(city, x, y, r) {
  if (x < r + 4 || y < r + 4 || x > WORLD.w - r - 4 || y > WORLD.h - r - 4) return 'edge';
  if (pointInWater(x, y)) return 'water';
  return pointInBuilding(city.buildings, x, y, r);
}

// Road graph for driving: nodes are intersections, edges run along streets.
// A horizontal edge crossing the channel exists only on the bridge street.
export function buildRoadGraph() {
  const nodes = [];
  const index = new Map();
  for (const vx of ROADS_V) {
    for (const hy of ROADS_H) {
      const key = vx + ',' + hy;
      index.set(key, nodes.length);
      nodes.push({ x: vx, y: hy, key });
    }
  }
  const edges = Array.from({ length: nodes.length }, () => []);
  const link = (a, b) => {
    edges[a].push(b);
    edges[b].push(a);
  };
  for (const vx of ROADS_V) {
    for (let j = 0; j < ROADS_H.length - 1; j++) {
      link(index.get(vx + ',' + ROADS_H[j]), index.get(vx + ',' + ROADS_H[j + 1]));
    }
  }
  for (const hy of ROADS_H) {
    for (let i = 0; i < ROADS_V.length - 1; i++) {
      const a = ROADS_V[i], b = ROADS_V[i + 1];
      // Crossing the channel is only possible on the bridge street.
      if (a < CHANNEL.x0 && b > CHANNEL.x1 && hy !== 1100) continue;
      link(index.get(a + ',' + hy), index.get(b + ',' + hy));
    }
  }
  return { nodes, edges, index };
}

// Breadth-first route over intersections, then the final point.
export function findRoute(graph, fromX, fromY, toX, toY) {
  const nearestNode = (x, y) => {
    let best = 0, bestD = Infinity;
    graph.nodes.forEach((n, i) => {
      const d = (n.x - x) ** 2 + (n.y - y) ** 2;
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  };
  const start = nearestNode(fromX, fromY);
  const goal = nearestNode(toX, toY);
  const prev = new Array(graph.nodes.length).fill(-1);
  const queue = [start];
  prev[start] = start;
  while (queue.length) {
    const cur = queue.shift();
    if (cur === goal) break;
    for (const nb of graph.edges[cur]) {
      if (prev[nb] === -1) { prev[nb] = cur; queue.push(nb); }
    }
  }
  if (prev[goal] === -1) return [{ x: toX, y: toY }];
  const path = [];
  let cur = goal;
  while (cur !== start) { path.unshift(graph.nodes[cur]); cur = prev[cur]; }
  path.unshift(graph.nodes[start]);
  path.push({ x: toX, y: toY });
  return path;
}

export function placeLabel(name) {
  return PLACES[name] || { x: 0, y: 0, label: name };
}
