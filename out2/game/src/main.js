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
      acc -= STEP;
      guard += 1;
    }
    if (guard === 5) acc = 0;
    G.view.w = canvas.width;
    G.view.h = canvas.height;
    SB.render(G, G.view);
    SB.Input.endFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
