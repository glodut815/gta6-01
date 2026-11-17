[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/glodut815/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/glodut815/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Bounty: https://make.fun/bounty/gta6-01

# Sunspire Bay — The Meridian Job

An open-world crime game in the spirit of GTA 6, built as an entry for the
[make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01). Everything is
original: our own city, characters, vehicles, story, art and sounds — nothing
from Rockstar Games.

You are Danny Cole, a wheelman who owes Ray's Garage one last job. Steal cars,
outrun the Sunspire Bay police, and run all four missions of **The Meridian
Job** across a living city: traffic on the grid, pedestrians on the sidewalks,
a wanted level with cruisers that chase and ram you, fist and pistol combat,
and a crew waiting at the docks.

## The city

- **Explore on foot and by car** — a 3600×2700 city with downtown towers, Old
  Town, the Marina bay and beach, Meridian Park, and the Industrial east side.
- **Traffic and pedestrians** — cars drive the road grid and turn at
  intersections; pedestrians stroll the sidewalks and run from trouble.
- **Steal any car** — walk up and press E. Stealing in front of cops or a
  crowd raises your wanted level; an empty street is free.
- **Wanted level + police** — 0–5 stars. Cruisers spawn, chase with sirens,
  ram your car, and arrest you on foot if they sit on you too long. Lie low
  and the heat cools off.
- **Missions + story** — four missions with dialogue, objectives and cash
  rewards: First Wheels, The Pickup, Hot Cargo, The Getaway.
- **Combat** — fists (F) and, once Ray hands it over, a pistol (left click).
  Armed dock gangs guard the final payout.
- **HUD + minimap** — cash, health, wanted stars, objective, speedometer and
  a live minimap of the whole city.
- **Start + save** — title screen with Continue / New Game / How to Play,
  autosave plus a save button in the pause menu (localStorage).

## Controls

| Key | Action |
| --- | --- |
| WASD / Arrows | Move / drive |
| Shift | Run |
| E | Steal / enter car, get out, advance dialogue |
| F | Punch |
| Left click | Shoot (once armed) |
| Space | Handbrake |
| Esc / P | Pause |
| M | Mute |

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no
network requests — every file the game loads lives under `game/`. Sound is
synthesized with WebAudio; the game starts silent until your first click or
key press.

## Layout

- `game/index.html` — the page; loads the scripts in `game/src/`.
- `game/src/` — one job per file: `city` (map), `traffic` (cars + peds),
  `police` (wanted + cruisers), `combat` (fists, pistol, goons),
  `missions` (story), `hud` (HUD + minimap), `render` (camera + drawing),
  `shots` (deterministic screenshot scenes), `game` (state machine),
  `audio` (synth sounds + music), `save` (localStorage), `rng`, `config`,
  `input`, `main` (boot).
- `main.ts` — the entrypoint: copies `game/` and `screenshots/` to `/output`
  and writes `/output/dossier.json`.
- `screenshots/` — four real renders of the game, taken in headless Chromium.

## License

MIT. See `LICENSE`.
