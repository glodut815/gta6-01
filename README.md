[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/glodut815/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/glodut815/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
Bounty: https://make.fun/bounty/gta6-01

# Sunspire Bay — The Meridian Job

A 2D top-down open-world crime game in the spirit of GTA 6, built as plain
static files — no library, no build step, no network. Everything (city, art,
sound) is original and generated in code.

You are a wheelman new to Sunspire Bay, a sun-soaked coastal city of grid
streets, docks, a motel row and one bridge over the harbour channel. Ray, a
garage owner with a plan, hires you for **The Meridian Job**: four missions
that pay $300, $800, $1,600 and $400 — steal a car, run a dockside delivery,
cross the bridge under two stars of heat, then clear out the Meridian
warehouse crew, grab the payout and drive it home. Finish the story with
$3,220 in your pocket.

## What is in the game

- **A living city**: downtown, Old Town, Motel Row, Southside and the Docks,
  with buildings, parks, piers, a harbour channel and a bridge — all laid out
  from a fixed seed, so the map is the same every time you play.
- **On foot and by car**: walk, run, steal parked cars, drive with real
  acceleration, braking and steering. Traffic cars drive the road network and
  pedestrians walk the sidewalks.
- **Wanted level 0–5 stars**: stealing in view, shooting or hitting a
  pedestrian raises the heat; police cruisers chase, ram and try to arrest
  you. Break line of sight and stay quiet to cool off.
- **Missions + story**: four chained jobs with intro dialogue, a gold beacon,
  an objective bar and payouts.
- **Combat**: mouse-aim pistol, muzzle flash, armed goons who shoot back,
  health, and a clear-the-warehouse shootout.
- **HUD + minimap**: cash, health, wanted stars, objective bar, live minimap
  (player, cars, police, beacon), speedometer while driving, dialogue boxes
  and toasts.
- **Start screen + save**: New Game / Continue / How to Play; progress saves
  to localStorage automatically.
- **Sound**: WebAudio synthesis only — engine hum, sirens, gunshots, pickup
  chimes and a mission-complete jingle. No audio files.

## Controls

| Key | Action |
| --- | --- |
| WASD / Arrows | Walk, or drive (accelerate / brake / steer) |
| Shift | Run |
| E | Steal / enter / exit a car, advance dialogue, pick up |
| Mouse | Aim, click to shoot |
| Esc | Pause (back to title) |

## How to run

```sh
node serve.ts
# open http://localhost:8080
```

Or serve `game/` with any static file server and open `index.html`.

## Screenshots

`?shot=start` shows the title screen over the living city,
`?shot=street` shows the player on foot downtown,
`?shot=chase` shows a three-star police pursuit,
`?shot=mission` shows the warehouse shootout.

## Layout

- `game/index.html` — the page and canvas
- `game/src/main.js` — bootstrap and frame loop
- `game/src/game.js` — main loop, player, driving, stealing
- `game/src/city.js` — seeded map, roads, bridge, collision
- `game/src/config.js` — tuning, places, mission data
- `game/src/traffic.js` — AI cars and pedestrians
- `game/src/police.js` — wanted level and cruisers
- `game/src/combat.js` — pistol, bullets, goons
- `game/src/missions.js` — the four-mission story
- `game/src/render.js` — top-down daylight rendering
- `game/src/hud.js` — HUD, minimap, menus, dialogue
- `game/src/audio.js` — WebAudio synth sounds
- `game/src/input.js` — keyboard and mouse
- `game/src/rng.js` — seeded random numbers
- `game/src/save.js` — localStorage save / load
- `game/src/shots.js` — `?shot=` staging for screenshots
- `main.ts` — the make.fun entry program (Node 22 stdlib only)

MIT licensed. An original game by @agenticgangster.
