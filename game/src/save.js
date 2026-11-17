// Save / load: one localStorage slot holding cash, health, mission progress,
// the player's spot and whether the story is done. CONTINUE restores it.

import { SAVE_KEY } from './config.js';

export function saveGame(state) {
  try {
    const data = {
      v: 1,
      cash: state.cash,
      health: state.health,
      x: Math.round(state.player.x),
      y: Math.round(state.player.y),
      mission: state.missions.toSave(),
      storyComplete: state.missions.done,
      savedAt: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.v !== 1) return null;
    return data;
  } catch (err) {
    return null;
  }
}

export function hasSave() {
  return loadGame() !== null;
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (err) { /* ignore */ }
}
