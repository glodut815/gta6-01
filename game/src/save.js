// Saving and loading: one slot in localStorage. The save holds the story
// progress, the cash, the player's spot in the city and whether they own the
// pistol. It never holds the keypair, a wallet, or anything but game state.
var SB = window.SB || (window.SB = {});

SB.saveGame = function (G) {
  try {
    var data = {
      version: 1,
      cash: G.cash,
      health: G.player.health,
      hasGun: G.player.hasGun,
      missionIndex: G.missionIndex,
      missionStep: G.missionStep,
      missionsDone: G.missionsDone,
      storyComplete: G.storyComplete,
      x: Math.round(G.player.x),
      y: Math.round(G.player.y),
      wanted: G.wanted,
      playSeconds: Math.round(G.playSeconds || 0),
      savedAt: Date.now(),
    };
    window.localStorage.setItem(SB.CFG.SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    return false;
  }
};

SB.loadSave = function () {
  try {
    var raw = window.localStorage.getItem(SB.CFG.SAVE_KEY);
    if (!raw) return null;
    var data = JSON.parse(raw);
    if (!data || data.version !== 1) return null;
    return data;
  } catch (err) {
    return null;
  }
};

SB.hasSave = function () {
  return SB.loadSave() !== null;
};

SB.clearSave = function () {
  try { window.localStorage.removeItem(SB.CFG.SAVE_KEY); } catch (err) { /* ignore */ }
};

SB.applySave = function (G, data) {
  G.cash = data.cash || 0;
  G.player.health = data.health || SB.PLAYER.health;
  G.player.hasGun = !!data.hasGun;
  G.missionIndex = typeof data.missionIndex === 'number' ? data.missionIndex : 0;
  G.missionStep = data.missionStep || 0;
  G.missionsDone = data.missionsDone || 0;
  G.storyComplete = !!data.storyComplete;
  G.player.x = data.x || SB.PLACES.plaza.x;
  G.player.y = data.y || SB.PLACES.plaza.y;
  G.wanted = 0; // a fresh session starts clean; the heat does not follow you home
  G.playSeconds = data.playSeconds || 0;
  G.missionStarted = G.missionIndex >= 0 && G.missionIndex < SB.MISSIONS.length;
};
