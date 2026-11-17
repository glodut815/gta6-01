// Keyboard and mouse state. The game polls this each frame; menu buttons read
// the click edge (a press that happened since the last frame) through consumeClick.
var SB = window.SB || (window.SB = {});

SB.Input = (function () {
  var keys = {};
  var mouse = { x: 0, y: 0, down: false, clicked: false, worldX: 0, worldY: 0 };
  var pressed = {}; // keys pressed since last frame (edge-triggered)
  var attached = false;

  function keyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].indexOf(e.code) !== -1) {
      e.preventDefault();
    }
    if (!keys[e.code]) pressed[e.code] = true;
    keys[e.code] = true;
  }
  function keyUp(e) { keys[e.code] = false; }

  return {
    mouse: mouse,
    attach: function (canvas) {
      if (attached) return;
      attached = true;
      window.addEventListener('keydown', keyDown);
      window.addEventListener('keyup', keyUp);
      window.addEventListener('blur', function () { keys = {}; mouse.down = false; });
      canvas.addEventListener('mousemove', function (e) {
        var r = canvas.getBoundingClientRect();
        mouse.x = e.clientX - r.left;
        mouse.y = e.clientY - r.top;
      });
      canvas.addEventListener('mousedown', function (e) {
        if (e.button === 0) { mouse.down = true; mouse.clicked = true; }
      });
      window.addEventListener('mouseup', function (e) {
        if (e.button === 0) mouse.down = false;
      });
      canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    },
    // True while any of the codes is held.
    held: function (codes) {
      for (var i = 0; i < codes.length; i += 1) {
        if (keys[codes[i]]) return true;
      }
      return false;
    },
    // True only on the frame the key went down.
    hit: function (codes) {
      for (var i = 0; i < codes.length; i += 1) {
        if (pressed[codes[i]]) return true;
      }
      return false;
    },
    // A mouse click that happened since the last frame; consumes it.
    consumeClick: function () {
      var c = mouse.clicked;
      mouse.clicked = false;
      return c;
    },
    // Called at the end of each frame: clears edge-triggered state.
    endFrame: function () {
      pressed = {};
      mouse.clicked = false;
    },
  };
})();
