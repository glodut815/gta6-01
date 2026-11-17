// The HUD: cash, health, wanted stars, the mission objective, the minimap,
// speed, hints and dialogue. Everything draws in screen space, after the
// world. The minimap is a live top-down sketch of the whole city.
var SB = window.SB || (window.SB = {});

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = SB.PALETTE.panel;
  ctx.strokeStyle = SB.PALETTE.panelEdge;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
}

function star(ctx, x, y, r, filled) {
  ctx.beginPath();
  for (var i = 0; i < 10; i += 1) {
    var ang = -Math.PI / 2 + (i * Math.PI) / 5;
    var rad = i % 2 === 0 ? r : r * 0.45;
    var px = x + Math.cos(ang) * rad;
    var py = y + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? SB.PALETTE.gold : 'rgba(244,241,232,0.18)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

SB.drawMinimap = function (ctx, G, x, y, w, h) {
  var sx = w / SB.CFG.WORLD_W;
  var sy = h / SB.CFG.WORLD_H;
  panel(ctx, x - 6, y - 6, w + 12, h + 12);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = '#4c7a3e';
  ctx.fillRect(x, y, w, h);
  // Water and park.
  ctx.fillStyle = SB.PALETTE.water;
  var bay = SB.CITY.BAY;
  ctx.fillRect(x + bay.x * sx, y + bay.y * sy, bay.w * sx, bay.h * sy);
  ctx.fillStyle = SB.PALETTE.park;
  var park = SB.CITY.PARK;
  ctx.fillRect(x + park.x * sx, y + park.y * sy, park.w * sx, park.h * sy);
  // Roads.
  ctx.strokeStyle = '#3a3d46';
  ctx.lineWidth = 4;
  for (var i = 0; i < SB.ROADS_V.length; i += 1) {
    ctx.beginPath();
    ctx.moveTo(x + SB.ROADS_V[i] * sx, y);
    ctx.lineTo(x + SB.ROADS_V[i] * sx, y + h);
    ctx.stroke();
  }
  for (var j = 0; j < SB.ROADS_H.length; j += 1) {
    ctx.beginPath();
    ctx.moveTo(x, y + SB.ROADS_H[j] * sy);
    ctx.lineTo(x + w, y + SB.ROADS_H[j] * sy);
    ctx.stroke();
  }
  // Buildings.
  ctx.fillStyle = 'rgba(30, 30, 34, 0.85)';
  for (var b = 0; b < G.city.buildings.length; b += 1) {
    var bd = G.city.buildings[b];
    ctx.fillRect(x + bd.x * sx, y + bd.y * sy, Math.max(1.5, bd.w * sx), Math.max(1.5, bd.h * sy));
  }
  // Mission target.
  var target = SB.missionTarget(G);
  if (target && G.state === 'play') {
    var pulse = 3 + Math.sin(G.time * 5) * 1.5;
    ctx.fillStyle = SB.PALETTE.gold;
    ctx.beginPath();
    ctx.arc(x + target.x * sx, y + target.y * sy, pulse + 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1c1a14';
    ctx.font = 'bold 9px ' + SB.FONT;
    ctx.textAlign = 'center';
    ctx.fillText('!', x + target.x * sx, y + target.y * sy + 3);
  }
  // Police, goons, traffic.
  for (var p = 0; p < G.police.length; p += 1) {
    ctx.fillStyle = Math.sin(G.time * 8 + p) > 0 ? '#ff5a4e' : '#4f8ef7';
    ctx.beginPath();
    ctx.arc(x + G.police[p].x * sx, y + G.police[p].y * sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  for (var g = 0; g < G.goons.length; g += 1) {
    if (G.goons[g].state === 'down') continue;
    ctx.fillStyle = '#ff2e2e';
    ctx.beginPath();
    ctx.arc(x + G.goons[g].x * sx, y + G.goons[g].y * sy, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (var t = 0; t < G.traffic.length; t += 1) {
    ctx.fillRect(x + G.traffic[t].x * sx - 1, y + G.traffic[t].y * sy - 1, 2, 2);
  }
  // The player: a white arrow that turns with them.
  var px = x + G.player.x * sx;
  var py = y + G.player.y * sy;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(G.player.angle);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(7, 0); ctx.lineTo(-5, -5); ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.restore();
  ctx.fillStyle = SB.PALETTE.muted;
  ctx.font = '11px ' + SB.FONT;
  ctx.textAlign = 'left';
  ctx.fillText('SUNSPIRE BAY', x - 2, y + h + 20);
};

SB.drawHUD = function (ctx, G, view) {
  var W = view.w, H = view.h;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Top-left: cash, health, story progress.
  panel(ctx, 14, 14, 208, 78);
  ctx.fillStyle = SB.PALETTE.gold;
  ctx.font = 'bold 22px ' + SB.FONT;
  ctx.fillText('$' + G.cash.toLocaleString('en-US'), 26, 42);
  ctx.fillStyle = SB.PALETTE.muted;
  ctx.font = '12px ' + SB.FONT;
  ctx.fillText('Missions ' + G.missionsDone + ' / ' + SB.MISSIONS.length, 26, 62);
  if (G.player.hasGun) ctx.fillText('PISTOL  •  F punch  •  Click shoot', 26, 80);
  // Health bar.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(120, 24, 88, 10);
  ctx.fillStyle = G.player.health > 30 ? SB.PALETTE.green : SB.PALETTE.red;
  ctx.fillRect(120, 24, 88 * Math.max(0, G.player.health / 100), 10);
  ctx.fillStyle = SB.PALETTE.text;
  ctx.font = 'bold 11px ' + SB.FONT;
  ctx.fillText('HP', 100, 33);

  // Top-centre: wanted stars.
  var starW = 5 * 30;
  var sx0 = (W - starW) / 2;
  panel(ctx, sx0 - 12, 12, starW + 24, 40);
  for (var s = 0; s < 5; s += 1) {
    star(ctx, sx0 + 15 + s * 30, 32, 11, s < G.wanted);
  }
  if (G.wanted > 0) {
    ctx.fillStyle = SB.PALETTE.red;
    ctx.font = 'bold 11px ' + SB.FONT;
    ctx.textAlign = 'center';
    ctx.fillText(G.wanted >= 3 ? 'THE HEAT IS ON' : 'WANTED', W / 2, 66);
    ctx.textAlign = 'left';
  }

  // Top-right: minimap.
  SB.drawMinimap(ctx, G, W - 236, 20, 216, 162);

  // Bottom-centre: current objective.
  var step = SB.currentStep(G);
  var m = SB.currentMission(G);
  if (G.state === 'play' && m && step) {
    var label = m.title + '  —  ' + step.text;
    ctx.font = 'bold 14px ' + SB.FONT;
    var tw = ctx.measureText(label).width;
    panel(ctx, (W - tw) / 2 - 14, H - 64, tw + 28, 34);
    ctx.fillStyle = SB.PALETTE.text;
    ctx.textAlign = 'center';
    ctx.fillText(label, W / 2, H - 42);
    ctx.textAlign = 'left';
  } else if (G.state === 'play' && G.storyComplete) {
    ctx.font = 'bold 14px ' + SB.FONT;
    var done = 'Story complete — free roam. Sunspire Bay is yours, Danny.';
    var dw = ctx.measureText(done).width;
    panel(ctx, (W - dw) / 2 - 14, H - 64, dw + 28, 34);
    ctx.fillStyle = SB.PALETTE.gold;
    ctx.textAlign = 'center';
    ctx.fillText(done, W / 2, H - 42);
    ctx.textAlign = 'left';
  }

  // Toast message above the objective.
  if (G.toastTimer > 0 && G.toast) {
    ctx.font = 'bold 15px ' + SB.FONT;
    ctx.textAlign = 'center';
    ctx.fillStyle = SB.PALETTE.gold;
    ctx.fillText(G.toast, W / 2, H - 84);
    ctx.textAlign = 'left';
  }

  // Bottom-left: context hint.
  var hint = '';
  if (G.state === 'play') {
    if (!G.player.car) {
      var near = SB.nearestCar(G, 90);
      if (near) hint = 'E — Steal the ' + near.label;
      else hint = 'WASD move  •  Shift run  •  F punch' + (G.player.hasGun ? '  •  Click shoot' : '');
    } else {
      hint = 'W/S drive  •  A/D steer  •  Space handbrake  •  E get out';
    }
  }
  if (hint) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.font = '13px ' + SB.FONT;
    var hw = ctx.measureText(hint).width;
    ctx.fillRect(14, H - 34, hw + 16, 22);
    ctx.fillStyle = SB.PALETTE.text;
    ctx.fillText(hint, 22, H - 19);
  }

  // Bottom-right: speedometer while driving.
  if (G.state === 'play' && G.player.car) {
    var kmh = Math.round(Math.abs(G.player.car.speed) * 0.32);
    panel(ctx, W - 150, H - 92, 136, 62);
    ctx.fillStyle = SB.PALETTE.text;
    ctx.font = 'bold 30px ' + SB.FONT;
    ctx.textAlign = 'right';
    ctx.fillText(String(kmh), W - 52, H - 50);
    ctx.font = '12px ' + SB.FONT;
    ctx.fillStyle = SB.PALETTE.muted;
    ctx.fillText('km/h', W - 26, H - 50);
    ctx.textAlign = 'left';
  }

  // Bust warning: a cruiser is closing in on foot.
  if (G.state === 'play' && !G.player.car && G.wanted > 0) {
    var closing = false;
    for (var i = 0; i < G.police.length; i += 1) {
      if (G.police[i].bustTimer > 0.4) { closing = true; break; }
    }
    if (closing) {
      ctx.fillStyle = SB.PALETTE.red;
      ctx.font = 'bold 18px ' + SB.FONT;
      ctx.textAlign = 'center';
      ctx.fillText('THEY ARE GRABBING YOU — RUN!', W / 2, 96);
      ctx.textAlign = 'left';
    }
  }

  // Crosshair when armed on foot.
  if (G.state === 'play' && !G.player.car && G.player.hasGun) {
    var mx = SB.Input.mouse.x, my = SB.Input.mouse.y;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mx, my, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(mx - 13, my); ctx.lineTo(mx - 5, my);
    ctx.moveTo(mx + 5, my); ctx.lineTo(mx + 13, my);
    ctx.moveTo(mx, my - 13); ctx.lineTo(mx, my - 5);
    ctx.moveTo(mx, my + 5); ctx.lineTo(mx, my + 13);
    ctx.stroke();
  }

  // Dialogue box.
  if (G.state === 'dialogue' && G.dialogue) {
    var line = G.dialogue.lines[G.dialogue.index];
    var boxH = 110;
    panel(ctx, W / 2 - 340, H - boxH - 24, 680, boxH);
    ctx.fillStyle = SB.PALETTE.gold;
    ctx.font = 'bold 15px ' + SB.FONT;
    ctx.fillText(line.who, W / 2 - 322, H - boxH + 8);
    ctx.fillStyle = SB.PALETTE.text;
    ctx.font = '16px ' + SB.FONT;
    SB.wrapText(ctx, line.text, W / 2 - 322, H - boxH + 34, 644, 22);
    ctx.fillStyle = SB.PALETTE.muted;
    ctx.font = '12px ' + SB.FONT;
    ctx.textAlign = 'right';
    ctx.fillText('E / click — continue  (' + (G.dialogue.index + 1) + '/' + G.dialogue.lines.length + ')', W / 2 + 322, H - 34);
    ctx.textAlign = 'left';
  }
};

// Word-wrap a paragraph into a box.
SB.wrapText = function (ctx, text, x, y, maxW, lineH) {
  var words = text.split(' ');
  var line = '';
  var cy = y;
  for (var i = 0; i < words.length; i += 1) {
    var test = line ? line + ' ' + words[i] : words[i];
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, cy);
      line = words[i];
      cy += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cy);
  return cy;
};
