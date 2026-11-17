// Boot for Sunspire Bay. Sizes the canvas to the window, then either stages
// one deterministic screenshot scene (?shot=cover|street|chase|mission) and
// renders a single frame, or runs the live game loop at a fixed 60 Hz step.
var SB = window.SB || (window.SB = {});

(function () {
  var canvas = document.getElementById('game');
  var params = new URLSearchParams(window.location.search);
  var shot = params.get('shot');
  var seedParam = Number(params.get('seed') || 7);

  function fitCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  fitCanvas();
  window.addEventListener('resize', fitCanvas);

  var G = SB.createGame(canvas, seedParam);
  G.view.w = canvas.width;
  G.view.h = canvas.height;
  SB.layoutButtons(G);
  SB.Input.attach(canvas);
  window.__game = G;

  function renderOnce() {
    G.view.w = canvas.width;
    G.view.h = canvas.height;
    SB.render(G, G.view);
  }

  if (shot) {
    // Screenshot mode: stage the scene, draw one frame, signal readiness.
    G.view.w = canvas.width;
    G.view.h = canvas.height;
    SB.layoutButtons(G);
    try {
      SB.stageShot(shot, G);
    } catch (err) {
      window.__shotError = String(err && err.stack || err);
    }
    renderOnce();
    window.__shotReady = true;
    return;
  }

  // Live play: fixed-step simulation, render every animation frame.
  // Edge-triggered input (a key press, a click) is cleared after EVERY
  // simulation step, not just every frame: several steps can run in one
  // frame, and a press must never fire twice — the E that ends a dialogue
  // must not also steal the car parked next to the player.
  var STEP = SB.CFG.STEP;
  var acc = 0;
  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    acc += dt;
    var guard = 0;
    while (acc >= STEP && guard < 5) {
      SB.update(G, STEP);
      SB.Input.endFrame();
      acc -= STEP;
      guard += 1;
    }
    if (guard === 5) acc = 0;
    G.view.w = canvas.width;
    G.view.h = canvas.height;
    SB.render(G, G.view);
    // NOTE: no endFrame() here on purpose. Edge input is cleared after each
    // simulation step above; clearing it after rendering too would drop a
    // click or key press that lands in a frame which ran no step.
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
