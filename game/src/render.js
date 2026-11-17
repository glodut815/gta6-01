// The renderer: a smooth-follow camera over the city, fake-3D buildings,
// day light, cars, people, particles, and the menu screens. Everything draws
// from the live game state, so a screenshot is always a real frame of play.
var SB = window.SB || (window.SB = {});

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function drawCarBody(ctx, car, isPlayer) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  rr(ctx, -22 + 3, -11 + 4, 46, 24, 8);
  ctx.fill();
  // Wheels.
  ctx.fillStyle = '#14161a';
  ctx.fillRect(-17, -13, 9, 5);
  ctx.fillRect(-17, 8, 9, 5);
  ctx.fillRect(9, -13, 9, 5);
  ctx.fillRect(9, 8, 9, 5);
  // Body.
  ctx.fillStyle = car.color;
  rr(ctx, -22, -11, 46, 24, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Windshield and roof.
  ctx.fillStyle = 'rgba(190,220,240,0.85)';
  ctx.fillRect(6, -9, 8, 18);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  rr(ctx, -8, -9, 12, 18, 4);
  ctx.fill();
  // Headlights.
  ctx.fillStyle = '#fff8c9';
  ctx.fillRect(22, -8, 2, 4);
  ctx.fillRect(22, 4, 2, 4);
  if (car.kind === 'police') {
    var flash = Math.sin(car.sirenPhase || 0) > 0;
    ctx.fillStyle = flash ? '#ff3b30' : '#2f7bff';
    ctx.fillRect(-4, -11, 8, 4);
    ctx.fillStyle = flash ? '#2f7bff' : '#ff3b30';
    ctx.fillRect(-4, 7, 8, 4);
  }
  if (isPlayer) {
    ctx.strokeStyle = SB.PALETTE.gold;
    ctx.lineWidth = 2.5;
    rr(ctx, -25, -14, 52, 30, 10);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPerson(ctx, x, y, angle, bodyColor, skinColor, r, down) {
  ctx.save();
  ctx.translate(x, y);
  if (down) {
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(0, 0, r + 4, r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = bodyColor;
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = skinColor;
    ctx.beginPath(); ctx.arc(r + 2, 0, r * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    return;
  }
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath(); ctx.ellipse(0, 3, r * 0.9, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(angle);
  ctx.fillStyle = bodyColor;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = skinColor;
  ctx.beginPath(); ctx.arc(r * 0.45, 0, r * 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawWorld(ctx, G, view) {
  var city = G.city;
  var cam = G.camera;
  ctx.save();
  // Screen shake.
  var shx = G.shake > 0 ? (G.rng.next() - 0.5) * G.shake : 0;
  var shy = G.shake > 0 ? (G.rng.next() - 0.5) * G.shake : 0;
  ctx.translate(view.w / 2, view.h / 2);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x + shx, -cam.y + shy);

  // Ground.
  ctx.fillStyle = SB.PALETTE.grass;
  ctx.fillRect(0, 0, SB.CFG.WORLD_W, SB.CFG.WORLD_H);
  // Mow stripes for a little texture.
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (var s = 0; s < SB.CFG.WORLD_W; s += 160) {
    ctx.fillRect(s, 0, 80, SB.CFG.WORLD_H);
  }
  // Beach and bay.
  var beach = SB.CITY.BEACH, bay = SB.CITY.BAY;
  ctx.fillStyle = SB.PALETTE.sand;
  ctx.fillRect(beach.x, beach.y, beach.w, beach.h);
  ctx.fillStyle = SB.PALETTE.water;
  ctx.fillRect(bay.x, bay.y, bay.w, bay.h);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  for (var wv = 0; wv < 5; wv += 1) {
    ctx.beginPath();
    for (var wx = bay.x + 20; wx < bay.x + bay.w - 20; wx += 40) {
      var wy = bay.y + 90 + wv * 130 + Math.sin(wx * 0.02 + G.time + wv) * 6;
      if (wx === bay.x + 20) ctx.moveTo(wx, wy); else ctx.lineTo(wx, wy);
    }
    ctx.stroke();
  }
  // Park.
  var park = SB.CITY.PARK;
  ctx.fillStyle = SB.PALETTE.park;
  ctx.fillRect(park.x, park.y, park.w, park.h);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.arc(park.x + park.w / 2, park.y + park.h / 2, 40, 0, Math.PI * 2);
  ctx.fill();

  // Sidewalks, then roads, then lane dashes.
  var half = SB.CFG.ROAD_W / 2;
  var sw = SB.CFG.SIDEWALK;
  ctx.fillStyle = SB.PALETTE.sidewalk;
  for (var i = 0; i < SB.ROADS_V.length; i += 1) {
    ctx.fillRect(SB.ROADS_V[i] - half - sw, 0, SB.CFG.ROAD_W + sw * 2, SB.CFG.WORLD_H);
  }
  for (var j = 0; j < SB.ROADS_H.length; j += 1) {
    ctx.fillRect(0, SB.ROADS_H[j] - half - sw, SB.CFG.WORLD_W, SB.CFG.ROAD_W + sw * 2);
  }
  ctx.fillStyle = SB.PALETTE.road;
  for (var i2 = 0; i2 < SB.ROADS_V.length; i2 += 1) {
    ctx.fillRect(SB.ROADS_V[i2] - half, 0, SB.CFG.ROAD_W, SB.CFG.WORLD_H);
  }
  for (var j2 = 0; j2 < SB.ROADS_H.length; j2 += 1) {
    ctx.fillRect(0, SB.ROADS_H[j2] - half, SB.CFG.WORLD_W, SB.CFG.ROAD_W);
  }
  ctx.fillStyle = SB.PALETTE.lane;
  for (var i3 = 0; i3 < SB.ROADS_V.length; i3 += 1) {
    for (var y = 40; y < SB.CFG.WORLD_H; y += 64) {
      ctx.fillRect(SB.ROADS_V[i3] - 2, y, 4, 30);
    }
  }
  for (var j3 = 0; j3 < SB.ROADS_H.length; j3 += 1) {
    for (var x = 40; x < SB.CFG.WORLD_W; x += 64) {
      ctx.fillRect(x, SB.ROADS_H[j3] - 2, 30, 4);
    }
  }
  // Crosswalks at every intersection.
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (var ci = 0; ci < SB.ROADS_V.length; ci += 1) {
    for (var cj = 0; cj < SB.ROADS_H.length; cj += 1) {
      var cx = SB.ROADS_V[ci], cy = SB.ROADS_H[cj];
      for (var k = -3; k <= 3; k += 1) {
        ctx.fillRect(cx - half + 8, cy + k * 12 - 4, 18, 6);
        ctx.fillRect(cx + half - 26, cy + k * 12 - 4, 18, 6);
      }
    }
  }

  // Buildings with a fake-3D side so the tall ones read as towers.
  for (var b = 0; b < city.buildings.length; b += 1) {
    var bd = city.buildings[b];
    var off = bd.height * 9;
    if (off > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.30)';
      ctx.fillRect(bd.x + off, bd.y + off, bd.w, bd.h);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.moveTo(bd.x + bd.w, bd.y);
      ctx.lineTo(bd.x + bd.w + off, bd.y + off);
      ctx.lineTo(bd.x + bd.w + off, bd.y + bd.h + off);
      ctx.lineTo(bd.x + bd.w, bd.y + bd.h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = bd.color;
    ctx.fillRect(bd.x, bd.y, bd.w, bd.h);
    ctx.fillStyle = bd.roof;
    ctx.fillRect(bd.x + 5, bd.y + 5, bd.w - 10, bd.h - 10);
    // Windows on the tall ones.
    if (bd.height > 0) {
      ctx.fillStyle = 'rgba(220,235,250,0.75)';
      for (var wx2 = bd.x + 12; wx2 < bd.x + bd.w - 12; wx2 += 18) {
        for (var wy2 = bd.y + 12; wy2 < bd.y + bd.h - 12; wy2 += 18) {
          ctx.fillRect(wx2, wy2, 8, 8);
        }
      }
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(bd.x, bd.y, bd.w, bd.h);
  }

  // Trees.
  for (var t = 0; t < city.trees.length; t += 1) {
    var tree = city.trees[t];
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(tree.x + 3, tree.y + 4, tree.r, tree.r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3f6b2f';
    ctx.beginPath(); ctx.arc(tree.x, tree.y, tree.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#548c3f';
    ctx.beginPath(); ctx.arc(tree.x - 3, tree.y - 3, tree.r * 0.6, 0, Math.PI * 2); ctx.fill();
  }

  // District labels, faint, in world space.
  ctx.fillStyle = 'rgba(255,255,255,0.20)';
  ctx.font = 'bold 34px ' + SB.FONT;
  ctx.textAlign = 'center';
  ctx.fillText('DOWNTOWN', 1800, 1180);
  ctx.fillText('OLD TOWN', 1800, 420);
  ctx.fillText('INDUSTRIAL', 3000, 2380);
  ctx.fillText('MARINA', 380, 2100);
  ctx.fillText('MERIDIAN PARK', 1600, 1230);
  ctx.textAlign = 'left';

  // Named places.
  ctx.font = 'bold 13px ' + SB.FONT;
  var placeKeys = Object.keys(SB.PLACES);
  for (var pk = 0; pk < placeKeys.length; pk += 1) {
    var pl = SB.PLACES[placeKeys[pk]];
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    var pw = ctx.measureText(pl.name).width;
    ctx.fillRect(pl.x - pw / 2 - 6, pl.y - 34, pw + 12, 18);
    ctx.fillStyle = '#f4f1e8';
    ctx.textAlign = 'center';
    ctx.fillText(pl.name, pl.x, pl.y - 21);
    ctx.textAlign = 'left';
  }

  // Mission beacon: a column of light and a pulsing ring.
  var target = SB.missionTarget(G);
  if (target && (G.state === 'play' || G.state === 'dialogue')) {
    var pulse = 1 + Math.sin(G.time * 4) * 0.15;
    ctx.fillStyle = 'rgba(242,201,76,0.18)';
    ctx.fillRect(target.x - 26, target.y - 260, 52, 260);
    ctx.strokeStyle = SB.PALETTE.gold;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(target.x, target.y, 34 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = SB.PALETTE.gold;
    ctx.beginPath();
    ctx.arc(target.x, target.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Parked cars, traffic, police, peds, goons.
  for (var pc = 0; pc < G.traffic.length; pc += 1) {
    drawCarBody(ctx, G.traffic[pc], false);
  }
  for (var po = 0; po < G.police.length; po += 1) {
    drawCarBody(ctx, G.police[po], false);
  }
  for (var pd = 0; pd < G.peds.length; pd += 1) {
    var ped = G.peds[pd];
    drawPerson(ctx, ped.x, ped.y, ped.angle, ped.color, ped.skin, 9, ped.state === 'down');
  }
  for (var gn = 0; gn < G.goons.length; gn += 1) {
    var goon = G.goons[gn];
    drawPerson(ctx, goon.x, goon.y, goon.angle, goon.color, '#e0ac69', 12, goon.state === 'down');
    if (goon.state !== 'down') {
      // A little gun in the goon's hands.
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(goon.x + Math.cos(goon.angle) * 12, goon.y + Math.sin(goon.angle) * 12);
      ctx.lineTo(goon.x + Math.cos(goon.angle) * 24, goon.y + Math.sin(goon.angle) * 24);
      ctx.stroke();
    }
  }

  // The player: in a car, or on foot.
  var p = G.player;
  if (p.car) {
    drawCarBody(ctx, p.car, true);
  } else {
    drawPerson(ctx, p.x, p.y, p.angle, '#2f6fb2', '#f1c27d', 13, false);
    if (p.hasGun) {
      ctx.strokeStyle = '#1c1c1c';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(p.x + Math.cos(p.angle) * 12, p.y + Math.sin(p.angle) * 12);
      ctx.lineTo(p.x + Math.cos(p.angle) * 26, p.y + Math.sin(p.angle) * 26);
      ctx.stroke();
    }
    if (p.attacking && p.attackTimer > 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 34, p.attackAngle - 0.7, p.attackAngle + 0.7);
      ctx.stroke();
    }
  }

  // Bullets.
  ctx.strokeStyle = '#ffe27a';
  ctx.lineWidth = 3;
  for (var bl = 0; bl < G.bullets.length; bl += 1) {
    var blt = G.bullets[bl];
    ctx.beginPath();
    ctx.moveTo(blt.x, blt.y);
    ctx.lineTo(blt.x - blt.vx * 0.02, blt.y - blt.vy * 0.02);
    ctx.stroke();
  }

  // Particles.
  for (var pt = 0; pt < G.particles.length; pt += 1) {
    var part = G.particles[pt];
    ctx.globalAlpha = Math.max(0, part.life / part.maxLife);
    ctx.fillStyle = part.color;
    ctx.beginPath();
    ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // A soft vignette so the frame feels like dusk in the city.
  var vg = ctx.createRadialGradient(view.w / 2, view.h / 2, Math.min(view.w, view.h) * 0.45, view.w / 2, view.h / 2, Math.max(view.w, view.h) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(10,10,20,0.28)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, view.w, view.h);
};

SB.render = function (G, view) {
  var ctx = G.ctx;
  ctx.clearRect(0, 0, view.w, view.h);
  if (G.state === 'title') {
    drawWorld(ctx, G, view);
    SB.drawTitle(ctx, G, view);
    return;
  }
  if (G.state === 'howto') {
    drawWorld(ctx, G, view);
    SB.drawHowTo(ctx, G, view);
    return;
  }
  drawWorld(ctx, G, view);
  SB.drawHUD(ctx, G, view);
  if (G.state === 'pause') SB.drawPause(ctx, G, view);
  if (G.state === 'wasted') SB.drawEndCard(ctx, G, view, 'WASTED', 'The streets got you. The hospital patched you up — minus a fine.');
  if (G.state === 'busted') SB.drawEndCard(ctx, G, view, 'BUSTED', 'The cops dragged you in. You posted bail and walked out — minus a fine.');
  if (G.state === 'complete') SB.drawEndCard(ctx, G, view, 'STORY COMPLETE', 'The Meridian Job is done. Sunspire Bay is yours — keep driving.');
};

// --- Menu screens ----------------------------------------------------------

SB.drawTitle = function (ctx, G, view) {
  var W = view.w, H = view.h;
  ctx.fillStyle = 'rgba(8, 10, 18, 0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = SB.PALETTE.gold;
  ctx.font = 'bold 84px ' + SB.FONT;
  ctx.fillText('SUNSPIRE BAY', W / 2, H * 0.30);
  ctx.fillStyle = SB.PALETTE.text;
  ctx.font = 'bold 24px ' + SB.FONT;
  ctx.fillText('T H E   M E R I D I A N   J O B', W / 2, H * 0.30 + 44);
  ctx.fillStyle = SB.PALETTE.muted;
  ctx.font = '15px ' + SB.FONT;
  ctx.fillText('An open-world crime story — steal cars, outrun the law, finish the job.', W / 2, H * 0.30 + 74);
  ctx.fillText('A fan-made original. Not affiliated with Rockstar Games.', W / 2, H * 0.30 + 96);

  var buttons = G.titleButtons;
  for (var i = 0; i < buttons.length; i += 1) {
    var b = buttons[i];
    if (!b.visible()) continue;
    ctx.fillStyle = b.hover ? 'rgba(242,201,76,0.92)' : SB.PALETTE.panel;
    ctx.strokeStyle = SB.PALETTE.gold;
    ctx.lineWidth = 1.5;
    rr(ctx, b.x, b.y, b.w, b.h, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = b.hover ? '#1c1a14' : SB.PALETTE.text;
    ctx.font = 'bold 19px ' + SB.FONT;
    ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 7);
  }
  ctx.fillStyle = SB.PALETTE.muted;
  ctx.font = '13px ' + SB.FONT;
  ctx.fillText('WASD move  •  E steal / enter car  •  F punch  •  Click shoot  •  Esc pause  •  M mute', W / 2, H - 28);
  ctx.fillText('Progress saves automatically — pick CONTINUE to jump back in.', W / 2, H - 52);
  ctx.textAlign = 'left';
};

SB.drawHowTo = function (ctx, G, view) {
  var W = view.w, H = view.h;
  ctx.fillStyle = 'rgba(8, 10, 18, 0.78)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = SB.PALETTE.gold;
  ctx.font = 'bold 44px ' + SB.FONT;
  ctx.fillText('HOW TO PLAY', W / 2, H * 0.16);
  var lines = [
    ['Move', 'WASD / Arrow keys — walk. Hold Shift to run.'],
    ['Steal a car', 'Walk up to any car and press E. Watch for witnesses — stealing in front of cops or crowds raises your wanted level.'],
    ['Drive', 'W — accelerate, S — brake / reverse, A / D — steer, Space — handbrake, E — get out.'],
    ['Fight', 'F — punch. Once Ray gives you the pistol, left click shoots toward the mouse.'],
    ['Wanted level', 'Stars rise when you commit crimes. Police cruisers chase and ram you; on foot, if one sits on you too long, you get BUSTED.'],
    ['Missions', 'Follow the gold marker and the objective at the bottom. Finish all four missions of The Meridian Job to complete the story.'],
    ['Save', 'Progress saves automatically. CONTINUE on the title screen picks up where you left off.'],
    ['Sound', 'M — mute. Esc — pause.'],
  ];
  ctx.font = '15px ' + SB.FONT;
  var y = H * 0.16 + 52;
  for (var i = 0; i < lines.length; i += 1) {
    ctx.fillStyle = SB.PALETTE.gold;
    ctx.font = 'bold 16px ' + SB.FONT;
    ctx.fillText(lines[i][0], W / 2, y);
    ctx.fillStyle = SB.PALETTE.text;
    ctx.font = '15px ' + SB.FONT;
    y += 22;
    ctx.fillText(lines[i][1], W / 2, y);
    y += 30;
  }
  var buttons = G.howtoButtons;
  for (var b = 0; b < buttons.length; b += 1) {
    var btn = buttons[b];
    ctx.fillStyle = btn.hover ? 'rgba(242,201,76,0.92)' : SB.PALETTE.panel;
    ctx.strokeStyle = SB.PALETTE.gold;
    ctx.lineWidth = 1.5;
    rr(ctx, btn.x, btn.y, btn.w, btn.h, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = btn.hover ? '#1c1a14' : SB.PALETTE.text;
    ctx.font = 'bold 19px ' + SB.FONT;
    ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2 + 7);
  }
  ctx.textAlign = 'left';
};

SB.drawPause = function (ctx, G, view) {
  var W = view.w, H = view.h;
  ctx.fillStyle = 'rgba(8, 10, 18, 0.72)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = SB.PALETTE.text;
  ctx.font = 'bold 52px ' + SB.FONT;
  ctx.fillText('PAUSED', W / 2, H * 0.26);
  var buttons = G.pauseButtons;
  for (var i = 0; i < buttons.length; i += 1) {
    var b = buttons[i];
    ctx.fillStyle = b.hover ? 'rgba(242,201,76,0.92)' : SB.PALETTE.panel;
    ctx.strokeStyle = SB.PALETTE.gold;
    ctx.lineWidth = 1.5;
    rr(ctx, b.x, b.y, b.w, b.h, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = b.hover ? '#1c1a14' : SB.PALETTE.text;
    ctx.font = 'bold 19px ' + SB.FONT;
    ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 7);
  }
  ctx.fillStyle = SB.PALETTE.muted;
  ctx.font = '14px ' + SB.FONT;
  ctx.fillText('Cash $' + G.cash.toLocaleString('en-US') + '  •  Missions ' + G.missionsDone + ' / ' + SB.MISSIONS.length + '  •  ' + (G.player.hasGun ? 'Armed' : 'Unarmed'), W / 2, H * 0.26 + 44);
  ctx.textAlign = 'left';
};

SB.drawEndCard = function (ctx, G, view, title, sub) {
  var W = view.w, H = view.h;
  ctx.fillStyle = 'rgba(8, 10, 18, 0.66)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = title === 'WASTED' || title === 'BUSTED' ? SB.PALETTE.red : SB.PALETTE.gold;
  ctx.font = 'bold 72px ' + SB.FONT;
  ctx.fillText(title, W / 2, H * 0.36);
  ctx.fillStyle = SB.PALETTE.text;
  ctx.font = '17px ' + SB.FONT;
  ctx.fillText(sub, W / 2, H * 0.36 + 40);
  if (G.finePaid) {
    ctx.fillStyle = SB.PALETTE.muted;
    ctx.font = '15px ' + SB.FONT;
    ctx.fillText('Fine paid: $' + G.finePaid, W / 2, H * 0.36 + 66);
  }
  var buttons = G.endButtons;
  for (var i = 0; i < buttons.length; i += 1) {
    var b = buttons[i];
    ctx.fillStyle = b.hover ? 'rgba(242,201,76,0.92)' : SB.PALETTE.panel;
    ctx.strokeStyle = SB.PALETTE.gold;
    ctx.lineWidth = 1.5;
    rr(ctx, b.x, b.y, b.w, b.h, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = b.hover ? '#1c1a14' : SB.PALETTE.text;
    ctx.font = 'bold 19px ' + SB.FONT;
    ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 7);
  }
  ctx.textAlign = 'left';
};
