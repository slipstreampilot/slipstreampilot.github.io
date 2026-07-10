/* STARFALL - in-flight HUD: hull/resources, shields, crew rail, ship view,
   target panel, weapons/drones bars, reactor column, subsystems (§2.3). */
"use strict";

var HUD = (function () {
  var P = GAME_DATA.palette;
  var T = GAME_DATA.text;

  var hit = []; // clickable regions rebuilt each frame: {x,y,w,h,fn,rfn,tip}
  var hoverTip = null;

  function region(x, y, w, h, fn, rfn, tip) {
    hit.push({ x: x, y: y, w: w, h: h, fn: fn, rfn: rfn, tip: tip });
  }
  function inR(r, mx, my) { return mx >= r.x && mx < r.x + r.w && my >= r.y && my < r.y + r.h; }

  // player ship geometry (shared with input)
  var SHIP_TS = 34;
  var SHIP_OX = 330, SHIP_OY = 330;
  var ENEMY_TS = 24;
  var ENEMY_OX = 1498, ENEMY_OY = 310;

  function shipTile(ship, ox, oy, ts, mx, my) {
    for (var i = 0; i < ship.rooms.length; i++) {
      var r = ship.rooms[i];
      var rx = ox + r.x * ts, ry = oy + r.y * ts;
      if (mx >= rx && mx < rx + r.w * ts && my >= ry && my < ry + r.h * ts) {
        var tx = Math.floor((mx - rx) / ts), ty = Math.floor((my - ry) / ts);
        return { room: r.id, tile: ty * r.w + tx };
      }
    }
    return null;
  }

  var TP = { tx: 1380, ty: 100, tw: 440, th: 620 }; // target panel geometry

  // ---- pass 1: chrome that sits UNDER the world (target panel body) -------
  function drawUnder(ctx, W, H, t) {
    hit = [];
    hoverTip = null;
    var enc = Game.combat;
    var enemy = enc && enc.enemy;
    if (enemy && !enemy.destroyed) {
      var tx = TP.tx, ty = TP.ty, tw = TP.tw, th = TP.th;
      // muted body keeps the accent budget on the combatants; rose lives in
      // the border and header identity, not an 11%-of-frame slab
      Art.panel(ctx, tx, ty, tw, th, { fill: "#4A2C2A", alpha: 0.88, cut: 18, stroke: P.enemyPanelRose, inner: "rgba(199,106,101,0.55)" });
      // dark header band keeps all status text legible on the rose panel
      ctx.fillStyle = Art.ROLE.rose.band;
      ctx.fillRect(tx + 8, ty + 8, tw - 16, 100);
      PixelFont.drawText(ctx, T.target, tx + 18, ty + 14, { scale: 3, color: "#FFF", outline: P.outlineDark });
      PixelFont.drawText(ctx, T.classLabel + ": " + enemy.cls, tx + tw - 16, ty + 16, { scale: 2, align: "right", color: Art.ROLE.rose.text });
      var alleg = enc.active ? T.hostile : T.neutral;
      PixelFont.drawText(ctx, T.allegiance + ": " + alleg, tx + tw - 16, ty + 38, { scale: 2, align: "right", color: enc.active ? Art.ROLE.rose.warn : Art.ROLE.rose.good });
      PixelFont.drawText(ctx, T.hull, tx + 18, ty + 62, { scale: 2, color: "#FFF" });
      var ew = (tw - 120) / enemy.hullMax;
      for (var ep = 0; ep < enemy.hullMax; ep++) {
        ctx.fillStyle = ep < enemy.hull ? P.hullBarGreen : "rgba(30,30,30,0.5)";
        ctx.fillRect(tx + 80 + ep * ew, ty + 62, ew - 2, 12);
      }
      for (var es = 0; es < enemy.maxShieldLayers(); es++) {
        ctx.beginPath();
        ctx.arc(tx + 90 + es * 24, ty + 90, 8, 0, Math.PI * 2);
        ctx.fillStyle = es < enemy.shieldLayers ? P.shieldBlueBright : "rgba(30,40,60,0.5)";
        ctx.fill();
        ctx.strokeStyle = P.shieldBlue;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      if (enemy.zoltanShield > 0) {
        ctx.fillStyle = "rgba(120,230,90,0.9)";
        ctx.fillRect(tx + 80, ty + 80, (tw - 160) * enemy.zoltanShield / (enemy.zoltanShieldMax || 12), 6);
      }
    }
  }

  // ---- pass 2: the WORLD (ships, projectiles, FX) - post-processable ------
  // Animation runs on SIM time so pause freezes it (art bible §6).
  function drawWorld(ctx, phase, t) {
    var player = Game.player;
    var enc = Game.combat;
    var enemy = enc && enc.enemy;
    var st = Game.simTime || 0;
    if (phase === "player") {
      ctx.save();
      ctx.translate(Math.sin(st * 0.6) * 3, Math.cos(st * 0.45) * 2.5); // idle drift
      Art.drawShieldBubble(ctx, player, SHIP_OX, SHIP_OY, SHIP_TS);
      Art.drawShip(ctx, player, SHIP_OX, SHIP_OY, SHIP_TS, {
        t: st, selectedCrew: Game.selectedCrew,
        sensorLevel: playerSensorLevel(), facing: "right"
      });
      ctx.restore();
    } else {
      if (enemy && !enemy.destroyed) {
        var showInterior = enemySensorVisible();
        ctx.save();
        ctx.translate(Math.sin(st * 0.5 + 2.2) * 3, Math.cos(st * 0.4 + 1.1) * 2.5);
        Art.drawShieldBubble(ctx, enemy, ENEMY_OX, ENEMY_OY, ENEMY_TS);
        Art.drawShip(ctx, enemy, ENEMY_OX, ENEMY_OY, ENEMY_TS, {
          t: st, sensorLevel: showInterior ? 2 : 0, facing: "left", hideRooms: false
        });
        ctx.restore();
      }
      drawProjectiles(ctx, st);
      FX.draw(ctx);
    }
  }

  // world-space anchor helpers for FX hooks
  function worldPoint(ship, roomId) {
    if (ship.isPlayer) return shipCenter(ship, SHIP_OX, SHIP_OY, SHIP_TS, roomId);
    return shipCenter(ship, ENEMY_OX, ENEMY_OY, ENEMY_TS, roomId);
  }
  function shipCenterPt(ship) {
    var b = ship.bounds;
    if (ship.isPlayer) {
      return { x: SHIP_OX + (b.x + b.w / 2) * SHIP_TS, y: SHIP_OY + (b.y + b.h / 2) * SHIP_TS };
    }
    return { x: ENEMY_OX + (b.x + b.w / 2) * ENEMY_TS, y: ENEMY_OY + (b.y + b.h / 2) * ENEMY_TS };
  }
  function muzzlePoint(ship, slotIdx) {
    // exact barrel tip of the mounted weapon sprite when available
    if (slotIdx != null && ship._mountTips && ship._mountTips[slotIdx]) {
      var tip = ship._mountTips[slotIdx];
      return ship.isPlayer
        ? { x: SHIP_OX + tip.lx, y: SHIP_OY + tip.ly }
        : { x: ENEMY_OX + tip.lx, y: ENEMY_OY + tip.ly };
    }
    return ship.isPlayer ? { x: SHIP_OX + 250, y: SHIP_OY + 40 } : { x: ENEMY_OX + 60, y: ENEMY_OY + 60 };
  }

  // Compatibility wrapper (single-pass callers)
  function draw(ctx, W, H, t) {
    drawUnder(ctx, W, H, t);
    drawWorld(ctx, "player", t);
    drawWorld(ctx, "enemy", t);
    drawOver(ctx, W, H, t);
  }

  // ---- pass 3: HUD chrome OVER the world ----------------------------------
  function drawOver(ctx, W, H, t) {
    var player = Game.player;
    var run = Game.run;
    var res = run.resources;
    var enc = Game.combat;
    var enemy = enc && enc.enemy;
    var mx = Game.mouse.x, my = Game.mouse.y;

    // ============ TOP-LEFT: hull / shields / resources =====================
    // hull bar: 30 pips
    Art.panel(ctx, 14, 10, 96, 28, { fill: P.uiParchment, cut: 8 });
    PixelFont.drawText(ctx, T.hull, 26, 19, { scale: 2, color: "#20201E" });
    var hullFrac = player.hull / player.hullMax;
    var pipW = 13;
    Art.panel(ctx, 112, 10, 30 * pipW + 16, 28, { fill: "#22211E", cut: 8, inner: "rgba(255,255,255,0.2)" });
    for (var hp = 0; hp < player.hullMax; hp++) {
      var on = hp < player.hull;
      ctx.fillStyle = on ? (player.hull <= 10 ? P.dangerRed : P.hullBarGreen) : "#3A3934";
      ctx.fillRect(120 + hp * pipW, 16, pipW - 3, 16);
    }
    if (player.hull <= 10 && Math.sin(t * 6) > 0) {
      PixelFont.drawText(ctx, T.hullCritical, 260, 44, { scale: 2, color: P.dangerRed });
    }

    // shield pips + recharge bar
    var sh = player.sys("shields");
    if (sh) {
      Art.panel(ctx, 14, 44, 190, 46, { fill: "#22211E", cut: 8 });
      Icons.drawIcon(ctx, "shields", 20, 52, 22, P.shieldBlueBright);
      var maxL = Math.floor(sh.level / 2);
      for (var sl = 0; sl < maxL; sl++) {
        var up = sl < player.shieldLayers;
        var canRegen = sl < player.maxShieldLayers();
        ctx.beginPath();
        ctx.arc(60 + sl * 26, 60, 9, 0, Math.PI * 2);
        ctx.fillStyle = up ? P.shieldBlueBright : "#20242C";
        ctx.fill();
        ctx.strokeStyle = canRegen ? P.shieldBlue : "#3A3934";
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      // recharge bar
      if (player.shieldLayers < player.maxShieldLayers()) {
        var frac = player.shieldRegenT / player.shieldRegenTime();
        ctx.fillStyle = "#20242C";
        ctx.fillRect(50, 74, 140, 6);
        ctx.fillStyle = P.shieldBlueBright;
        ctx.fillRect(50, 74, 140 * frac, 6);
      }
      region(14, 44, 190, 46, null, null, "Shields: one layer per two power bars.");
    }
    // zoltan super shield indicator
    if (player.zoltanShield > 0) {
      ctx.fillStyle = "rgba(120,230,90,0.9)";
      ctx.fillRect(50, 84, 140 * (player.zoltanShield / (player.zoltanShieldMax || 5)), 4);
    }

    // resource trio + scrap
    var rx = 216;
    function counter(icon, val, warnZero, tip) {
      var w = 76;
      Art.panel(ctx, rx, 44, w, 30, { fill: val === 0 && warnZero ? "#3A2020" : "#22211E", cut: 8, stroke: val === 0 && warnZero ? P.dangerRed : P.outlineDark });
      Icons.drawIcon(ctx, icon, rx + 5, 49, 20, val === 0 && warnZero ? P.dangerRed : P.textPrimary);
      PixelFont.drawText(ctx, String(val), rx + 34, 53, { scale: 2, color: val === 0 && warnZero ? P.dangerRed : P.textPrimary });
      region(rx, 44, w, 30, null, null, tip);
      rx += w + 8;
    }
    counter("fuel", res.fuel, true, "Fuel: one unit per FTL jump.");
    counter("missiles", res.missiles, true, "Missiles: consumed by missile and bomb weapons.");
    counter("droneParts", res.droneParts, true, "Drone parts: consumed when deploying drones.");
    // scrap plate
    Art.panel(ctx, 560, 8, 150, 34, { fill: P.uiParchment, cut: 10 });
    Icons.drawIcon(ctx, "scrap", 568, 13, 24, "#20201E");
    PixelFont.drawText(ctx, String(res.scrap), 640, 17, { scale: 3, align: "center", color: "#20201E" });
    region(560, 8, 150, 34, null, null, "Scrap: currency for stores and upgrades.");

    // evasion / O2 readouts
    player.evasion(); // refresh displayed value
    Art.panel(ctx, 14, 96, 130, 28, { fill: "#22211E", cut: 8 });
    Icons.drawIcon(ctx, "engines", 20, 100, 20, P.textPrimary);
    PixelFont.drawText(ctx, player.evasionLastComputed + "%", 52, 104, { scale: 2, color: P.textPrimary });
    region(14, 96, 130, 28, null, null, "Evasion: chance to dodge incoming shots.");
    var avgO2 = 0;
    for (var ri = 0; ri < player.rooms.length; ri++) avgO2 += player.rooms[ri].o2;
    avgO2 = Math.round(avgO2 / player.rooms.length);
    var o2warn = avgO2 < 25 && Math.sin(t * 6) > 0;
    Art.panel(ctx, 14, 128, 130, 28, { fill: o2warn ? "#3A2020" : "#22211E", cut: 8, stroke: avgO2 < 25 ? P.dangerRed : P.outlineDark });
    Icons.drawIcon(ctx, "oxygen", 20, 132, 20, avgO2 < 25 ? P.dangerRed : P.textPrimary);
    PixelFont.drawText(ctx, avgO2 + "%", 52, 136, { scale: 2, color: avgO2 < 25 ? P.dangerRed : P.textPrimary });
    region(14, 128, 130, 28, null, null, "Average ship oxygen. Below 25% is dangerous.");

    // ============ TOP-CENTER: FTL gauge + SHIP/wrench + hazard =============
    var ftlX = 760;
    Art.panel(ctx, ftlX, 8, 210, 52, { fill: "#22211E", cut: 10 });
    PixelFont.drawText(ctx, T.ftl, ftlX + 12, 16, { scale: 2, color: P.textPrimary });
    var ftlReady = run.ftlCharge >= 1;
    ctx.fillStyle = "#20242C";
    ctx.fillRect(ftlX + 12, 36, 186, 12);
    ctx.fillStyle = ftlReady ? P.selectionYellow : P.shieldBlueBright;
    ctx.fillRect(ftlX + 12, 36, 186 * Math.min(1, run.ftlCharge), 12);
    PixelFont.drawText(ctx, ftlReady ? T.ready : T.charging, ftlX + 60, 16, { scale: 2, color: ftlReady ? P.selectionYellow : P.textPrimary });
    region(ftlX, 8, 210, 52, function () {
      if (ftlReady) Game.openMap();
    }, null, ftlReady ? "FTL drive ready. Click to open the beacon map and jump." : "FTL drive charging. Piloting must be manned.");

    // SHIP + wrench buttons
    var sb = Art.button(ctx, 986, 8, 100, 52, "", { hover: false });
    Icons.drawIcon(ctx, "ship", 1020, 18, 32, "#20201E");
    region(986, 8, 100, 52, function () { Game.openOverview("systems"); }, null, "Ship overview (systems, crew, inventory).");
    Art.button(ctx, 1094, 8, 64, 52, "", {});
    Icons.drawIcon(ctx, "wrench", 1110, 18, 32, "#20201E");
    region(1094, 8, 64, 52, function () { Game.openOverview("systems"); }, null, "Upgrade systems.");
    // STORE button when at store beacon
    var beacon = Game.map.currentBeacon();
    if (beacon && beacon.type === "store" && !enc) {
      Art.button(ctx, 1166, 8, 130, 52, T.store, { selected: Math.sin(t * 3) > 0 });
      region(1166, 8, 130, 52, function () { Game.openStore(); }, null, "Open the store.");
    }

    // hazard label
    if (Game.hazards && Game.hazards.type && Game.hazards.type !== "nebula") {
      var label = Game.hazards.label();
      if (label) {
        PixelFont.drawText(ctx, label, W / 2, 78, { scale: 3, align: "center", color: P.dangerRed, outline: P.outlineDark });
        if (Game.hazards.warning) {
          Icons.drawIcon(ctx, "danger", W / 2 - 20, 100, 40, P.dangerRed);
          PixelFont.drawText(ctx, T.danger, W / 2, 148, { scale: 2, align: "center", color: P.dangerRed, outline: P.outlineDark });
          // countdown ring
          var frac = Game.hazards.warnT / 5;
          ctx.strokeStyle = P.dangerRed;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(W / 2, 120, 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - frac));
          ctx.stroke();
        }
      }
    }
    // enemy FTL banner
    if (enc && enc.active && enc.enemyAI && enc.enemyAI.fleeing) {
      PixelFont.drawText(ctx, T.enemyFtl, W / 2, 170, { scale: 2, align: "center", color: P.dangerRed, outline: P.outlineDark });
    }
    // intruders warning
    if (player.intruders.length > 0 && Math.sin(t * 5) > -0.2) {
      var anyAlive = false;
      for (var ii = 0; ii < player.intruders.length; ii++) if (!player.intruders[ii].dead) anyAlive = true;
      if (anyAlive) PixelFont.drawText(ctx, T.intruders, W / 2, 196, { scale: 2, align: "center", color: P.dangerRed, outline: P.outlineDark });
    }

    // ============ LEFT RAIL: crew list =====================================
    var cy = 180;
    for (var ci = 0; ci < player.crew.length; ci++) {
      var c = player.crew[ci];
      if (c.isDrone) continue;
      var selected = Game.selectedCrew.indexOf(c) >= 0;
      Art.panel(ctx, 14, cy, 170, 40, { fill: c.dead ? "#3A2020" : selected ? P.selectionYellow : "#22211E", cut: 8 });
      var spr = Art.crewSprite(c.race, 0, false, false);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(spr, 20, cy + 6, 28, 28);
      PixelFont.drawText(ctx, c.name.substring(0, 9), 56, cy + 7, { scale: 2, color: selected ? "#20201E" : P.textPrimary });
      if (!c.dead) {
        var frac2 = c.hp / c.maxHp;
        ctx.fillStyle = "#20242C";
        ctx.fillRect(56, cy + 26, 110, 8);
        ctx.fillStyle = frac2 > 0.6 ? P.crewBarGreen : frac2 > 0.3 ? P.crewYellowHurt : P.dangerRed;
        ctx.fillRect(56, cy + 26, 110 * frac2, 8);
      }
      (function (crew) {
        region(14, cy, 170, 40, function (shift) {
          if (crew.dead) return;
          if (shift) {
            var idx = Game.selectedCrew.indexOf(crew);
            if (idx >= 0) Game.selectedCrew.splice(idx, 1);
            else Game.selectedCrew.push(crew);
          } else Game.selectedCrew = [crew];
        }, null, GAME_DATA.races[crew.race].name + " - " + GAME_DATA.races[crew.race].special);
      })(c);
      cy += 46;
    }
    // save positions / return-to-stations
    Art.button(ctx, 14, cy, 40, 36, "", {});
    Icons.drawIcon(ctx, "savepos", 22, cy + 6, 24, "#20201E");
    region(14, cy, 40, 36, function () { Game.saveStations(); }, null, "Save current crew positions as stations. (SHIFT+R)");
    Art.button(ctx, 62, cy, 40, 36, "", {});
    Icons.drawIcon(ctx, "stations", 70, cy + 6, 24, "#20201E");
    region(62, cy, 40, 36, function () { Game.returnToStations(); }, null, "Send all crew to saved stations. (R)");
    // teleport buttons if installed
    if (player.sys("teleporter")) {
      var tpReady = Sim.Combat.canTeleport(player, enemy);
      Art.button(ctx, 110, cy, 74, 36, T.teleportSend, { disabled: !tpReady || !enemy });
      region(110, cy, 74, 36, function () { Game.armTeleport("send"); }, null, "Teleport crew standing in the teleporter room to a targeted enemy room.");
      Art.button(ctx, 110, cy + 42, 74, 36, T.teleportRetrieve, { disabled: !tpReady || !enemy });
      region(110, cy + 42, 74, 36, function () {
        if (enemy) Sim.Combat.teleportRetrieve(player, enemy, null);
      }, null, "Retrieve your boarding crew from the enemy ship.");
    }
    // cloak button
    if (player.sys("cloaking")) {
      var ck = player.sys("cloaking");
      var canC = player.canCloak();
      var cloakY = cy + (player.sys("teleporter") ? 88 : 0);
      Art.button(ctx, 14, cloakY + 42, 88, 36, "CLOAK", { disabled: !canC, selected: player.cloakActive > 0 });
      region(14, cloakY + 42, 88, 36, function () { player.startCloak(); }, null,
        player.cloakActive > 0 ? "Cloaked: +60% evasion." : player.cloakCooldown > 0 ? "Cloak recharging: " + Math.ceil(player.cloakCooldown) + "s" : "Activate cloaking.");
    }

    // ============ CENTER: player ship (drawn in the world pass) ============
    // ship click handling region (rooms)
    region(SHIP_OX + player.bounds.x * SHIP_TS, SHIP_OY + player.bounds.y * SHIP_TS,
      player.bounds.w * SHIP_TS, player.bounds.h * SHIP_TS,
      function (shift, mx2, my2) { onPlayerShipClick(mx2, my2, shift); },
      function (mx2, my2) { onPlayerShipRightClick(mx2, my2); }, null);

    // door clicks
    for (var di = 0; di < player.doors.length; di++) {
      (function (d) {
        var dx = SHIP_OX + d.x * SHIP_TS, dy = SHIP_OY + d.y * SHIP_TS;
        region(dx - 10, dy - 10, 20, 20, function () {
          if (d.brokenTimer <= 0) { d.open = !d.open; AudioEngine.play("door"); }
        }, null, d.roomB === -1 ? "Airlock door." : "Door.");
      })(player.doors[di]);
    }

    // ============ RIGHT: TARGET panel overlays (panel body in drawUnder,
    // enemy ship in the world pass) =========================================
    if (enemy && !enemy.destroyed) {
      var tx = TP.tx, ty = TP.ty, tw = TP.tw, th = TP.th;
      // targeting reticles
      for (var wi = 0; wi < player.weapons.length; wi++) {
        var slot = player.weapons[wi];
        if (slot.target && slot.target.ship === enemy) {
          var rooms = slot.target.path || [slot.target.room];
          for (var rr = 0; rr < rooms.length; rr++) {
            var er = enemy.roomAt(rooms[rr]);
            if (!er) continue;
            ctx.strokeStyle = slot.def.cls === "beam" ? "#FFD0CC" : P.selectionYellow;
            ctx.lineWidth = 3;
            ctx.strokeRect(ENEMY_OX + er.x * ENEMY_TS + 2, ENEMY_OY + er.y * ENEMY_TS + 2, er.w * ENEMY_TS - 4, er.h * ENEMY_TS - 4);
            PixelFont.drawText(ctx, String(wi + 1), ENEMY_OX + er.x * ENEMY_TS + 6, ENEMY_OY + er.y * ENEMY_TS + 4, { scale: 2, color: P.selectionYellow });
          }
        }
      }
      // enemy room clicks for targeting
      region(ENEMY_OX + enemy.bounds.x * ENEMY_TS, ENEMY_OY + enemy.bounds.y * ENEMY_TS,
        enemy.bounds.w * ENEMY_TS, enemy.bounds.h * ENEMY_TS,
        function (shift, mx2, my2) { onEnemyShipClick(mx2, my2); },
        function (mx2, my2) { onEnemyShipRightClick(mx2, my2); }, null);
      // enemy system icon strip
      var stripX = tx + 40, stripY = ty + th - 50;
      for (var sid2 in enemy.systems) {
        if (!enemy.systems.hasOwnProperty(sid2)) continue;
        var s2 = enemy.systems[sid2];
        var col2 = s2.effectiveLevel() === 0 ? P.dangerRed : s2.damage >= 1 ? P.fireOrange : P.powerGreen;
        Icons.drawIcon(ctx, sid2, stripX, stripY, 26, col2);
        stripX += 36;
      }
      // enemy flee banner
      if (enc.enemyAI && enc.enemyAI.fleeing) {
        PixelFont.drawText(ctx, T.jumpDelayed, tx + tw / 2, ty + th - 80, { scale: 2, align: "center", color: Art.ROLE.rose.warn, outline: P.outlineDark });
      }
      // surge warning (flagship)
      if (enemy.surgeWarnT > 0) {
        PixelFont.drawText(ctx, T.powerSurge, tx + tw / 2, ty + 112, { scale: 2, align: "center", color: P.selectionYellow, outline: P.outlineDark });
      }
    }

    // (projectiles are drawn in the world pass)

    // ============ bottom tray: anchors all lower HUD clusters ==============
    var trayG = ctx.createLinearGradient(0, H - 210, 0, H);
    trayG.addColorStop(0, "rgba(10,10,8,0)");
    trayG.addColorStop(0.45, "rgba(10,10,8,0.62)");
    trayG.addColorStop(1, "rgba(10,10,8,0.92)");
    ctx.fillStyle = trayG;
    ctx.fillRect(0, H - 210, W, 210);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(0, H - 211, W, 1);

    // ============ BOTTOM-LEFT: reactor column ==============================
    drawReactor(ctx, H);

    // ============ BOTTOM-CENTER: weapons / drones ==========================
    drawWeaponsBar(ctx, W, H);

    // ============ BOTTOM-RIGHT: subsystems =================================
    drawSubsystems(ctx, W, H);

    // ============ PAUSED overlay ===========================================
    if (Game.paused && !Game.hidePauseBanner) {
      PixelFont.drawText(ctx, T.paused, 700, H - 300, { scale: 6, align: "center", color: "#FFF", outline: P.outlineDark });
      PixelFont.drawText(ctx, T.pausedSub, 700, H - 240, { scale: 2, align: "center", color: "#DDD", outline: P.outlineDark });
    }

    // hover tooltip
    for (var hi2 = hit.length - 1; hi2 >= 0; hi2--) {
      if (hit[hi2].tip && inR(hit[hi2], mx, my)) { Tooltips.hover(ctx, mx, my, hit[hi2].tip, W, H); break; }
    }
    // targeting cursor
    if (Game.armedWeapon != null || Game.teleportArm) {
      ctx.strokeStyle = P.dangerRed;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(mx, my, 12, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = P.dangerRed;
      ctx.fillRect(mx - 1.5, my - 1.5, 3, 3);
      // beam drag preview
      if (Game.beamDrag) {
        ctx.strokeStyle = "#FFD0CC";
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(Game.beamDrag.x1, Game.beamDrag.y1);
        ctx.lineTo(mx, my);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  function playerSensorLevel() {
    var player = Game.player;
    var s = player.sys("sensors");
    var lvl = s ? s.effectivePower() > 0 ? s.effectiveLevel() : 0 : 0;
    if (s && player.manningSkill("sensors") >= 0) lvl++;
    // slug crew sense without sensors
    for (var i = 0; i < player.crew.length; i++) if (!player.crew[i].dead && player.crew[i].race === "slug") lvl = Math.max(lvl, 1);
    if (Game.hazards && Game.hazards.sensorsDark()) return 1; // own interior occupied rooms only (approx: level 1)
    return Math.max(1, lvl); // always see own interior at least
  }
  function enemySensorVisible() {
    var player = Game.player;
    if (Game.hazards && Game.hazards.sensorsDark()) {
      for (var i = 0; i < player.crew.length; i++) if (!player.crew[i].dead && player.crew[i].race === "slug") return true;
      return false;
    }
    var s = player.sys("sensors");
    var lvl = s && s.effectivePower() > 0 ? s.effectiveLevel() : 0;
    if (s && player.manningSkill("sensors") >= 0) lvl++;
    return lvl >= 2;
  }

  function drawProjectiles(ctx, t) {
    var list = Sim.Combat.projectiles;
    var player = Game.player;
    var enemy = Game.combat && Game.combat.enemy;
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      var from, to;
      if (p.to === player) {
        from = p.origin || { x: ENEMY_OX + 100, y: ENEMY_OY + 100 };
        to = shipCenter(player, SHIP_OX, SHIP_OY, SHIP_TS, p.room);
      } else {
        from = p.origin || { x: SHIP_OX + 200, y: SHIP_OY + 60 };
        to = enemy ? shipCenter(enemy, ENEMY_OX, ENEMY_OY, ENEMY_TS, p.room) : { x: 1600, y: 400 };
      }
      if (p.asb || p.asteroid) from = { x: to.x + RNGoffset(i), y: -40 };
      var tt = Math.min(1.4, p.t);
      var x = from.x + (to.x - from.x) * tt;
      var y = from.y + (to.y - from.y) * tt;
      if (p.missed && p.t > 0.9) { x += (p.t - 0.9) * 600; y -= (p.t - 0.9) * 200; }
      var ang = Math.atan2(to.y - from.y, to.x - from.x);
      Art.drawProjectile(ctx, p, x, y, ang);
    }
    // beam visual
    var bv = Sim.Combat.beamVisual;
    if (bv) {
      var tgt = bv.to;
      var isEnemyTgt = tgt !== player;
      var ox2 = isEnemyTgt ? ENEMY_OX : SHIP_OX, oy2 = isEnemyTgt ? ENEMY_OY : SHIP_OY, ts2 = isEnemyTgt ? ENEMY_TS : SHIP_TS;
      ctx.strokeStyle = "rgba(255,90,60,0.9)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      var startPt = bv.origin || (isEnemyTgt ? { x: SHIP_OX + 250, y: SHIP_OY + 40 } : { x: ENEMY_OX + 60, y: ENEMY_OY + 60 });
      ctx.moveTo(startPt.x, startPt.y);
      for (var b = 0; b < bv.rooms.length; b++) {
        var room = tgt.roomAt(bv.rooms[b]);
        if (room) ctx.lineTo(ox2 + (room.x + room.w / 2) * ts2, oy2 + (room.y + room.h / 2) * ts2);
      }
      ctx.stroke();
    }
  }
  function RNGoffset(i) { return ((i * 137) % 160) - 80; }
  function shipCenter(ship, ox, oy, ts, roomId) {
    var room = ship.roomAt(roomId);
    if (!room) return { x: ox + ship.bounds.w * ts / 2, y: oy + ship.bounds.h * ts / 2 };
    return { x: ox + (room.x + room.w / 2) * ts, y: oy + (room.y + room.h / 2) * ts };
  }

  function drawReactor(ctx, H) {
    var player = Game.player;
    var x = 20, baseY = H - 40;
    // reactor free bars stack
    var free = player.reactorFree();
    var total = player.reactorAvailable();
    for (var i = 0; i < total; i++) {
      var y = baseY - i * 12;
      ctx.fillStyle = i < free ? P.reactorGreen : "rgba(255,255,255,0.15)";
      ctx.strokeStyle = "#FFF";
      ctx.lineWidth = 1;
      if (i < free) ctx.fillRect(x, y, 34, 9);
      else ctx.strokeRect(x, y, 34, 9);
    }
    if (player.ionStorm) Icons.drawIcon(ctx, "ion", x + 4, baseY - total * 12 - 26, 22, P.ionBlue);
    region(x, baseY - total * 12, 36, total * 12 + 12, null, null, "Reactor: " + free + " free of " + total + (player.ionStorm ? " (ion storm: halved)" : ""));

    // per-system power columns
    var sysOrder = ["shields", "engines", "oxygen", "weapons", "medbay", "droneCtrl", "teleporter", "cloaking", "artillery"];
    var sx = x + 60;
    for (var si = 0; si < sysOrder.length; si++) {
      var sid = sysOrder[si];
      var s = player.sys(sid);
      if (!s) continue;
      (function (sid2, s2, sx2) {
        // bars
        for (var b = 0; b < s2.level; b++) {
          var by = baseY - b * 12;
          var isDamaged = b >= s2.effectiveLevel();
          var powered = b < s2.effectivePower() - s2.zoltanBars;
          var isZoltan = b >= s2.effectivePower() - s2.zoltanBars && b < s2.effectivePower();
          var ionLocked = s2.ionSec > 0;
          ctx.lineWidth = 1;
          if (isDamaged) {
            ctx.fillStyle = P.dangerRed;
            ctx.fillRect(sx2, by, 26, 9);
          } else if (isZoltan) {
            ctx.fillStyle = P.selectionYellow;
            ctx.fillRect(sx2, by, 26, 9);
          } else if (powered) {
            ctx.fillStyle = ionLocked ? P.ionBlue : P.powerGreen;
            ctx.fillRect(sx2, by, 26, 9);
          } else {
            ctx.strokeStyle = "#FFF";
            ctx.strokeRect(sx2, by, 26, 9);
          }
        }
        // icon
        var iconY = baseY + 14;
        var col = s2.effectiveLevel() === 0 ? P.dangerRed : s2.damage >= 1 ? P.fireOrange : s2.effectivePower() > 0 ? P.powerGreen : "#8A8A85";
        Icons.drawIcon(ctx, sid2, sx2, iconY, 26, col);
        if (s2.ionSec > 0) Icons.drawIcon(ctx, "ion", sx2, iconY, 26, P.ionBlue);
        region(sx2 - 4, baseY - s2.level * 12, 34, s2.level * 12 + 48,
          function () { player.addPower(sid2); },
          function () { player.removePower(sid2); },
          GAME_DATA.systems[sid2].name + " - click: +1 power, right-click: -1. " + (GAME_DATA.systems[sid2].desc || ""));
      })(sid, s, sx);
      sx += 44;
    }
  }

  function drawWeaponsBar(ctx, W, H) {
    var player = Game.player;
    var x = 480, y = H - 120, slotW = 168, slotH = 74;
    PixelFont.drawText(ctx, T.weapons, x + 4, y - 22, { scale: 2, color: P.textPrimary, outline: P.outlineDark });
    for (var i = 0; i < player.weaponSlots; i++) {
      var sx = x + i * (slotW + 8);
      var slot = player.weapons[i];
      var armed = Game.armedWeapon === i;
      Art.panel(ctx, sx, y, slotW, slotH, {
        fill: !slot ? "#1A1A18" : armed ? P.selectionYellow : slot.powered ? P.uiParchment : P.uiParchmentDim,
        cut: 8
      });
      if (slot) {
        Art.drawWeaponArt(ctx, slot.id, sx + slotW - 54, y + 3, 48, 34);
        var nameLines = PixelFont.wrap(slot.def.name, 2, slotW - 66).slice(0, 2);
        for (var nl = 0; nl < nameLines.length; nl++) {
          PixelFont.drawText(ctx, nameLines[nl], sx + 8, y + 5 + nl * 17, { scale: 2, color: "#20201E" });
        }
        // charge bar
        var frac = slot.chargeFrac();
        ctx.fillStyle = "#20242C";
        ctx.fillRect(sx + 8, y + 42, slotW - 46, 10);
        ctx.fillStyle = frac >= 1 ? P.powerGreen : "#E8E8E0";
        ctx.fillRect(sx + 8, y + 42, (slotW - 46) * frac, 10);
        // missile cost
        if (slot.def.missiles) Icons.drawIcon(ctx, "missiles", sx + slotW - 32, y + 38, 18, "#20201E");
        // keybind badge
        Art.panel(ctx, sx + slotW - 26, y + slotH - 24, 20, 20, { fill: "#22211E", cut: 4 });
        PixelFont.drawText(ctx, String(i + 1), sx + slotW - 16, y + slotH - 19, { scale: 2, align: "center", color: "#FFF" });
        // power pips
        for (var pp = 0; pp < slot.def.power; pp++) {
          ctx.fillStyle = slot.powered ? P.powerGreen : "#57544E";
          ctx.fillRect(sx + 8 + pp * 10, y + 58, 8, 8);
        }
        (function (idx, s) {
          region(sx, y, slotW, slotH, function () { Game.clickWeaponSlot(idx); },
            function () { Game.rightClickWeaponSlot(idx); },
            s.def.name + " - " + (s.def.flavor || "") + " Click to arm, then click an enemy room. Right-click to depower.");
        })(i, slot);
      }
    }
    // AUTO-FIRE
    var afX = x + player.weaponSlots * (slotW + 8) + 6;
    Art.button(ctx, afX, y, 120, slotH, "", { selected: Game.autoFire });
    Icons.drawIcon(ctx, "autofire", afX + 44, y + 8, 32, "#20201E");
    PixelFont.drawText(ctx, T.autoFire, afX + 60, y + 50, { scale: 2, align: "center", color: "#20201E" });
    region(afX, y, 120, slotH, function () { Game.autoFire = !Game.autoFire; AudioEngine.play("uiClick"); }, null,
      "Auto-fire: weapons fire the moment they charge, at their stored targets. (A)");

    // drones bar
    if (player.sys("droneCtrl")) {
      var dy = y - 100;
      PixelFont.drawText(ctx, T.drones, x + 4, dy - 22, { scale: 2, color: P.textPrimary, outline: P.outlineDark });
      for (var d = 0; d < player.droneSlots; d++) {
        var dx = x + d * (slotW + 8);
        var dslot = player.drones[d];
        Art.panel(ctx, dx, dy, slotW, 70, { fill: !dslot ? "#1A1A18" : dslot.powered ? P.uiParchment : P.uiParchmentDim, cut: 8 });
        if (dslot) {
          var dnLines = PixelFont.wrap(dslot.def.name, 2, slotW - 18).slice(0, 2);
          for (var dnl = 0; dnl < dnLines.length; dnl++) {
            PixelFont.drawText(ctx, dnLines[dnl], dx + 8, dy + 4 + dnl * 16, { scale: 2, color: "#20201E" });
          }
          PixelFont.drawText(ctx, dslot.destroyed && dslot.respawnT > 0 ? "REBUILDING" : dslot.powered ? "ACTIVE" : dslot.deployed ? "STANDBY" : "DOCKED", dx + 8, dy + 38, { scale: 2, color: dslot.powered ? "#2A6E2A" : "#57544E" });
          for (var dp = 0; dp < dslot.def.power; dp++) {
            ctx.fillStyle = dslot.powered ? P.powerGreen : "#57544E";
            ctx.fillRect(dx + 8 + dp * 10, dy + 56, 8, 8);
          }
          Art.panel(ctx, dx + slotW - 26, dy + 44, 20, 20, { fill: "#22211E", cut: 4 });
          PixelFont.drawText(ctx, String(d + 5), dx + slotW - 16, dy + 49, { scale: 2, align: "center", color: "#FFF" });
          (function (idx, ds) {
            region(dx, dy, slotW, 70, function () { Game.toggleDrone(idx); }, null,
              ds.def.name + " - " + ds.def.desc + (ds.deployed ? "" : " Deploying consumes one drone part."));
          })(d, dslot);
        }
      }
    }
  }

  function drawSubsystems(ctx, W, H) {
    var player = Game.player;
    var x = W - 260, y = H - 90;
    PixelFont.drawText(ctx, T.subsystems, x + 90, y + 56, { scale: 2, color: P.textPrimary, outline: P.outlineDark });
    var subs = ["piloting", "sensors", "doors"];
    for (var i = 0; i < subs.length; i++) {
      var s = player.sys(subs[i]);
      if (!s) continue;
      var sx = x + i * 64;
      var col = s.effectiveLevel() === 0 ? P.dangerRed : s.damage >= 1 ? P.fireOrange : P.powerGreen;
      Icons.drawIcon(ctx, subs[i], sx, y, 34, col);
      if (s.ionSec > 0) Icons.drawIcon(ctx, "ion", sx, y, 34, P.ionBlue);
      // manned marker
      if (player.manningSkill(subs[i]) >= 0) {
        Icons.drawIcon(ctx, "crew", sx + 10, y - 22, 16, P.powerGreen);
      }
      // damage pips
      for (var d = 0; d < s.level; d++) {
        ctx.fillStyle = d < s.effectiveLevel() ? P.powerGreen : P.dangerRed;
        ctx.fillRect(sx + d * 9, y + 38, 7, 5);
      }
      (function (sid) {
        region(sx - 4, y - 6, 50, 52, function () {
          if (sid === "doors") Game.doorMode = !Game.doorMode;
        }, null, GAME_DATA.systems[sid].name + ": " + GAME_DATA.systems[sid].desc);
      })(subs[i]);
    }
  }

  // ---- input handlers -------------------------------------------------------
  function onPlayerShipClick(mx, my, shift) {
    var player = Game.player;
    var hitT = shipTile(player, SHIP_OX, SHIP_OY, SHIP_TS, mx, my);
    if (!hitT) return;
    // bomb targeting on own ship
    if (Game.armedWeapon != null) {
      var slot = player.weapons[Game.armedWeapon];
      if (slot && slot.def.cls === "bomb") {
        slot.target = { ship: player, room: hitT.room };
        if (!Game.autoFire && slot.ready()) Sim.Combat.fireWeapon(player, slot);
        Game.armedWeapon = null;
        return;
      }
    }
    // crew selection: click a crew sprite?
    var all = player.crew;
    for (var i = 0; i < all.length; i++) {
      var c = all[i];
      if (c.dead || c.isDrone || c.ship !== player) continue;
      if (c.room === hitT.room && c.tile === hitT.tile) {
        if (shift) {
          var idx = Game.selectedCrew.indexOf(c);
          if (idx >= 0) Game.selectedCrew.splice(idx, 1); else Game.selectedCrew.push(c);
        } else Game.selectedCrew = [c];
        AudioEngine.play("uiClick");
        return;
      }
    }
    // move order with selected crew (left-click also works)
    if (Game.selectedCrew.length) {
      for (var s = 0; s < Game.selectedCrew.length; s++) {
        if (Game.selectedCrew[s].ship === player) Game.selectedCrew[s].orderTo(hitT.room);
      }
      AudioEngine.play("uiClick");
    }
  }
  function onPlayerShipRightClick(mx, my) {
    var player = Game.player;
    var hitT = shipTile(player, SHIP_OX, SHIP_OY, SHIP_TS, mx, my);
    if (!hitT) return;
    if (Game.selectedCrew.length) {
      for (var s = 0; s < Game.selectedCrew.length; s++) {
        if (Game.selectedCrew[s].ship === player) Game.selectedCrew[s].orderTo(hitT.room);
      }
    }
  }
  function onEnemyShipClick(mx, my) {
    var enemy = Game.combat && Game.combat.enemy;
    if (!enemy) return;
    var hitT = shipTile(enemy, ENEMY_OX, ENEMY_OY, ENEMY_TS, mx, my);
    if (!hitT) return;
    // teleport targeting
    if (Game.teleportArm === "send") {
      Sim.Combat.teleportSend(Game.player, enemy, hitT.room);
      Game.teleportArm = null;
      return;
    }
    // boarding crew move orders (selected crew standing on enemy ship)
    var moved = false;
    for (var s = 0; s < Game.selectedCrew.length; s++) {
      if (Game.selectedCrew[s].ship === enemy) { Game.selectedCrew[s].orderTo(hitT.room); moved = true; }
    }
    if (moved) return;
    if (Game.armedWeapon != null) {
      var slot = Game.player.weapons[Game.armedWeapon];
      if (!slot) return;
      if (slot.def.cls === "beam") {
        if (!Game.beamDrag) {
          Game.beamDrag = { room: hitT.room, x1: mx, y1: my };
          return;
        }
        // finish beam line: rooms between first and second click
        var path = beamPath(enemy, Game.beamDrag.room, hitT.room);
        slot.target = { ship: enemy, path: path, lockedBeforeCloak: enemy.cloakActive <= 0 };
        Game.beamDrag = null;
        Game.armedWeapon = null;
        if (!Game.autoFire && slot.ready()) Sim.Combat.fireWeapon(Game.player, slot);
        return;
      }
      var fireNow = slot.target && slot.target.room === hitT.room && slot.ready() && !Game.autoFire;
      slot.target = { ship: enemy, room: hitT.room };
      Game.armedWeapon = null;
      if (fireNow || (!Game.autoFire && slot.ready())) Sim.Combat.fireWeapon(Game.player, slot);
      AudioEngine.play("uiClick");
    }
  }
  function onEnemyShipRightClick(mx, my) {
    var enemy = Game.combat && Game.combat.enemy;
    if (!enemy) return;
    var hitT = shipTile(enemy, ENEMY_OX, ENEMY_OY, ENEMY_TS, mx, my);
    if (!hitT) return;
    // clear any weapon targeting this room
    for (var i = 0; i < Game.player.weapons.length; i++) {
      var slot = Game.player.weapons[i];
      if (slot.target && slot.target.ship === enemy) {
        var rooms = slot.target.path || [slot.target.room];
        if (rooms.indexOf(hitT.room) >= 0) slot.target = null;
      }
    }
  }
  function beamPath(ship, roomA, roomB) {
    var a = ship.roomAt(roomA), b = ship.roomAt(roomB);
    if (!a || !b) return [roomA];
    var ax = a.x + a.w / 2, ay = a.y + a.h / 2;
    var bx = b.x + b.w / 2, by = b.y + b.h / 2;
    var path = [];
    var steps = 24;
    for (var i = 0; i <= steps; i++) {
      var x = ax + (bx - ax) * i / steps, y = ay + (by - ay) * i / steps;
      for (var r = 0; r < ship.rooms.length; r++) {
        var room = ship.rooms[r];
        if (x >= room.x && x < room.x + room.w && y >= room.y && y < room.y + room.h) {
          if (path.indexOf(room.id) < 0) path.push(room.id);
        }
      }
    }
    return path.length ? path : [roomA];
  }

  function click(mx, my, shift, right) {
    for (var i = hit.length - 1; i >= 0; i--) {
      var r = hit[i];
      if (inR(r, mx, my)) {
        if (right && r.rfn) { r.rfn(mx, my); return true; }
        if (!right && r.fn) { r.fn(shift, mx, my); return true; }
      }
    }
    // clicking empty space clears selection/arming
    if (!right) {
      Game.selectedCrew = [];
      Game.armedWeapon = null;
      Game.beamDrag = null;
      Game.teleportArm = null;
    }
    return false;
  }

  return {
    draw: draw, drawUnder: drawUnder, drawWorld: drawWorld, drawOver: drawOver,
    click: click, SHIP_OX: SHIP_OX, SHIP_OY: SHIP_OY, SHIP_TS: SHIP_TS,
    worldPoint: worldPoint, shipCenterPt: shipCenterPt, muzzlePoint: muzzlePoint
  };
})();
