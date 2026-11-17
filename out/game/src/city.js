// The city of Sunspire Bay: a road grid, districts, buildings, a park, a bay
// with a beach, and the named places the missions use. Everything is placed
// from a seed, so the same seed always builds the same city.
var SB = window.SB || (window.SB = {});

SB.CITY = {
  // The bay: water along the south-west edge, with a sand strip above it.
  BAY: { x: 0, y: 1980, w: 780, h: 720 },
  BEACH: { x: 0, y: 1900, w: 780, h: 80 },
  PARK: { x: 1448, y: 1048, w: 304, h: 304 },
};

// Named places the story uses. All sit on roads or plazas, never inside a building.
SB.PLACES = {
  garage:    { x: 1800, y: 648,  name: "Ray's Garage" },
  docks:     { x: 420,  y: 1820, name: 'Meridian Docks' },
  motel:     { x: 3000, y: 1048, name: 'Sunset Motel' },
  bridge:    { x: 3352, y: 1800, name: 'East Bridge' },
  warehouse: { x: 2900, y: 2200, name: 'Harbor Warehouse' },
  safehouse: { x: 1000, y: 648,  name: 'Safehouse' },
  hospital:  { x: 1400, y: 1752, name: 'Sunspire General' },
  policeHQ:  { x: 2200, y: 1048, name: 'Police HQ' },
  plaza:     { x: 1800, y: 1400, name: 'Meridian Plaza' },
};

SB.buildCity = function (seed) {
  var rng = SB.makeRng(seed);
  var W = SB.CFG.WORLD_W;
  var H = SB.CFG.WORLD_H;
  var city = {
    seed: seed,
    buildings: [],
    trees: [],
    parkedCars: [],
    water: [SB.CITY.BAY],
    parks: [SB.CITY.PARK],
    beaches: [SB.CITY.BEACH],
  };

  function districtAt(cx, cy) {
    if (cx < 820 && cy > 1850) return 'marina';
    if (cx > 2500) return 'industrial';
    if (cy < 550) return 'oldtown';
    if (Math.abs(cx - 1800) < 850 && Math.abs(cy - 1350) < 650) return 'downtown';
    return 'residential';
  }
  function nearPlace(x, y, r) {
    var keys = Object.keys(SB.PLACES);
    for (var i = 0; i < keys.length; i += 1) {
      var p = SB.PLACES[keys[i]];
      if (Math.abs(p.x - x) < r && Math.abs(p.y - y) < r) return true;
    }
    return false;
  }
  function overlapsWater(x, y, w, h) {
    return x < SB.CITY.BAY.x + SB.CITY.BAY.w && x + w > SB.CITY.BAY.x &&
      y < SB.CITY.BAY.y + SB.CITY.BAY.h && y + h > SB.CITY.BAY.y;
  }
  function overlapsPark(x, y, w, h) {
    var p = SB.CITY.PARK;
    return x < p.x + p.w && x + w > p.x && y < p.y + p.h && y + h > p.y;
  }

  var halfRoad = SB.CFG.ROAD_W / 2;
  var pad = halfRoad + SB.CFG.SIDEWALK + 10;
  for (var bx = 0; bx < SB.ROADS_V.length - 1; bx += 1) {
    for (var by = 0; by < SB.ROADS_H.length - 1; by += 1) {
      var bx0 = SB.ROADS_V[bx] + pad;
      var bx1 = SB.ROADS_V[bx + 1] - pad;
      var by0 = SB.ROADS_H[by] + pad;
      var by1 = SB.ROADS_H[by + 1] - pad;
      var cx = (bx0 + bx1) / 2;
      var cy = (by0 + by1) / 2;
      var district = districtAt(cx, cy);
      var block = { x: bx0, y: by0, w: bx1 - bx0, h: by1 - by0 };

      // The park block stays green, with trees instead of buildings.
      if (overlapsPark(block.x, block.y, block.w, block.h)) {
        for (var t = 0; t < 26; t += 1) {
          city.trees.push({
            x: rng.range(block.x + 16, block.x + block.w - 16),
            y: rng.range(block.y + 16, block.y + block.h - 16),
            r: rng.range(9, 15),
          });
        }
        continue;
      }
      // Blocks touching the bay become beachfront: no buildings.
      if (overlapsWater(block.x, block.y, block.w, block.h)) continue;
      // A few blocks are open parking lots with parked cars to steal.
      if (rng.chance(0.16)) {
        var lotCars = rng.int(2, 4);
        for (var c = 0; c < lotCars; c += 1) {
          city.parkedCars.push({
            x: rng.range(block.x + 40, block.x + block.w - 40),
            y: rng.range(block.y + 40, block.y + block.h - 40),
            angle: rng.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]),
            color: rng.pick(SB.CAR_COLORS),
          });
        }
        continue;
      }

      var tall = district === 'downtown';
      var n = tall ? rng.int(2, 4) : rng.int(1, 3);
      for (var b = 0; b < n; b += 1) {
        var bw = rng.range(70, Math.min(150, block.w * 0.45));
        var bh = rng.range(70, Math.min(150, block.h * 0.45));
        var px = rng.range(block.x, block.x + block.w - bw);
        var py = rng.range(block.y, block.y + block.h - bh);
        if (nearPlace(px + bw / 2, py + bh / 2, 170)) continue;
        var clash = false;
        for (var k = 0; k < city.buildings.length; k += 1) {
          var o = city.buildings[k];
          if (px < o.x + o.w + 14 && px + bw + 14 > o.x && py < o.y + o.h + 14 && py + bh + 14 > o.y) {
            clash = true; break;
          }
        }
        if (clash) continue;
        city.buildings.push({
          x: px, y: py, w: bw, h: bh,
          height: tall ? rng.int(1, 3) : rng.int(0, 1),
          color: rng.pick(SB.BUILDING_COLORS),
          roof: rng.pick(SB.ROOF_COLORS),
          district: district,
        });
      }
      // Street trees along residential blocks.
      if (district === 'residential' || district === 'oldtown') {
        for (var s = 0; s < 3; s += 1) {
          city.trees.push({
            x: rng.range(block.x, block.x + block.w),
            y: rng.range(block.y, block.y + block.h),
            r: rng.range(8, 12),
          });
        }
      }
    }
  }

  // Collision blockers: buildings and the bay.
  city.blockers = city.buildings.map(function (b) {
    return { x: b.x, y: b.y, w: b.w, h: b.h };
  });
  city.blockers.push({ x: SB.CITY.BAY.x, y: SB.CITY.BAY.y, w: SB.CITY.BAY.w, h: SB.CITY.BAY.h });

  // Keep the world edges fenced so nothing leaves the map.
  city.bounds = { x: 40, y: 40, w: W - 80, h: H - 80 };
  return city;
};

// True when a circle at (x, y) with radius r touches a blocker or the bounds.
SB.hitsBlocker = function (city, x, y, r) {
  if (x - r < city.bounds.x || x + r > city.bounds.x + city.bounds.w ||
      y - r < city.bounds.y || y + r > city.bounds.y + city.bounds.h) return true;
  for (var i = 0; i < city.blockers.length; i += 1) {
    var b = city.blockers[i];
    var nx = Math.max(b.x, Math.min(x, b.x + b.w));
    var ny = Math.max(b.y, Math.min(y, b.y + b.h));
    var dx = x - nx, dy = y - ny;
    if (dx * dx + dy * dy < r * r) return true;
  }
  return false;
};

// Push a circle out of blockers and bounds, one axis at a time.
SB.resolveCircle = function (city, ent, r) {
  ent.x = Math.max(city.bounds.x + r, Math.min(city.bounds.x + city.bounds.w - r, ent.x));
  ent.y = Math.max(city.bounds.y + r, Math.min(city.bounds.y + city.bounds.h - r, ent.y));
  for (var i = 0; i < city.blockers.length; i += 1) {
    var b = city.blockers[i];
    var nx = Math.max(b.x, Math.min(ent.x, b.x + b.w));
    var ny = Math.max(b.y, Math.min(ent.y, b.y + b.h));
    var dx = ent.x - nx, dy = ent.y - ny;
    var d2 = dx * dx + dy * dy;
    if (d2 >= r * r) continue;
    if (d2 < 0.01) {
      // Centre inside the box: push out along the smallest overlap.
      var left = ent.x - b.x, right = b.x + b.w - ent.x;
      var top = ent.y - b.y, bottom = b.y + b.h - ent.y;
      var m = Math.min(left, right, top, bottom);
      if (m === left) ent.x = b.x - r;
      else if (m === right) ent.x = b.x + b.w + r;
      else if (m === top) ent.y = b.y - r;
      else ent.y = b.y + b.h + r;
      continue;
    }
    var d = Math.sqrt(d2);
    ent.x = nx + (dx / d) * r;
    ent.y = ny + (dy / d) * r;
  }
};

// Is the point on a road (within the asphalt)?
SB.onRoad = function (x, y) {
  var half = SB.CFG.ROAD_W / 2;
  for (var i = 0; i < SB.ROADS_V.length; i += 1) {
    if (Math.abs(x - SB.ROADS_V[i]) < half) return true;
  }
  for (var j = 0; j < SB.ROADS_H.length; j += 1) {
    if (Math.abs(y - SB.ROADS_H[j]) < half) return true;
  }
  return false;
};

// Nearest road centre line to a point, and whether it is vertical.
SB.nearestRoad = function (x, y) {
  var best = null, bestD = Infinity;
  for (var i = 0; i < SB.ROADS_V.length; i += 1) {
    var d = Math.abs(x - SB.ROADS_V[i]);
    if (d < bestD) { bestD = d; best = { x: SB.ROADS_V[i], y: y, vertical: true }; }
  }
  for (var j = 0; j < SB.ROADS_H.length; j += 1) {
    var d2 = Math.abs(y - SB.ROADS_H[j]);
    if (d2 < bestD) { bestD = d2; best = { x: x, y: SB.ROADS_H[j], vertical: false }; }
  }
  return best;
};

// A random point on a road, for spawning traffic.
SB.randomRoadPoint = function (rng) {
  if (rng.chance(0.5)) {
    return { x: rng.pick(SB.ROADS_V), y: rng.range(120, SB.CFG.WORLD_H - 120), vertical: true };
  }
  return { x: rng.range(120, SB.CFG.WORLD_W - 120), y: rng.pick(SB.ROADS_H), vertical: false };
};
