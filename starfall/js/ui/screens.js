/* STARFALL - screens: main menu, hangar, beacon map, sector select, store,
   event dialogue, ship overview, options, stats, pause, game over, victory. */
"use strict";

var Screens = (function () {
  var P = GAME_DATA.palette;
  var T = GAME_DATA.text;
  var hit = [];
  var hoverIdx = -1;

  function region(x, y, w, h, fn, rfn, tip) { hit.push({ x: x, y: y, w: w, h: h, fn: fn, rfn: rfn, tip: tip }); }
  function inR(r, mx, my) { return mx >= r.x && mx < r.x + r.w && my >= r.y && my < r.y + r.h; }
  function btn(ctx, x, y, w, h, label, fn, opts) {
    opts = opts || {};
    var mx = Game.mouse.x, my = Game.mouse.y;
    var hover = mx >= x && mx < x + w && my >= y && my < y + h && !opts.disabled;
    Art.button(ctx, x, y, w, h, label, { hover: hover, disabled: opts.disabled, selected: opts.selected, scale: opts.scale });
    region(x, y, w, h, opts.disabled ? null : fn, null, opts.tip);
    return hover;
  }

  // ==========================================================================
  // MAIN MENU (§2.1)
  // ==========================================================================
  function drawMainMenu(ctx, W, H, t) {
    hit = [];
    Art.background(ctx, 42, "menu", W, H, t);
    // drifting fleet layered by depth: far ships small/dim, near ship large
    // and low, none crowding the right-hand menu column
    var fleet = [
      { scale: 0.14, y: 200, speed: 5, dim: 0.4, phase: 0 },
      { scale: 0.22, y: 330, speed: 8, dim: 0.6, phase: 900 },
      { scale: 0.42, y: 520, speed: 13, dim: 0.85, phase: 400 },
      { scale: 0.85, y: 880, speed: 22, dim: 1.0, phase: 1200 }
    ];
    for (var f = 0; f < fleet.length; f++) {
      var fs = fleet[f];
      var span = W - 420 + 400; // travel corridor stops short of the menu column
      var fx = ((t * fs.speed + fs.phase) % span) - 400;
      var fy = fs.y + Math.sin(t * 0.4 + f * 1.7) * 8;
      ctx.save();
      ctx.globalAlpha = fs.dim;
      if (fs.dim < 1) {
        ctx.filter = "brightness(" + (0.45 + fs.dim * 0.55) + ")";
      }
      ctx.translate(fx, fy);
      ctx.scale(fs.scale, fs.scale);
      Art.drawHullOrSprite(ctx, "kestrel", 420, 180, "right");
      ctx.restore();
      ctx.filter = "none";
    }
    // logo
    PixelFont.drawText(ctx, T.title, W - 120, 90, { scale: 8, align: "right", color: "#FFF", outline: P.outlineDark });
    PixelFont.drawText(ctx, "A SPACESHIP ROGUELIKE", W - 120, 165, { scale: 2, align: "right", color: P.beaconYellow });

    var hasRun = Save.hasRun();
    var items = [
      { label: T.continueBtn, disabled: !hasRun, fn: function () { Game.continueRun(); } },
      { label: T.newGame, fn: function () {
          if (hasRun) Game.confirm(T.abandonConfirm, function () { Game.toHangar(); });
          else Game.toHangar();
        } },
      { label: T.tutorial, fn: function () { Game.showHelp = true; } },
      { label: T.stats, fn: function () { Game.state = "stats"; } },
      { label: T.options, fn: function () { Game.state = "options"; Game.optionsReturn = "menu"; } },
      { label: T.credits, fn: function () { Game.state = "credits"; } },
      { label: T.quit, fn: function () { window.close(); Game.quitAttempted = true; } }
    ];
    var y = 300;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var mx = Game.mouse.x, my = Game.mouse.y;
      var w = 340, x = W - w - 100;
      var hover = mx >= x && mx < x + w && my >= y && my < y + 52 && !it.disabled;
      PixelFont.drawText(ctx, it.label, x + w - 10, y + 14, {
        scale: 3, align: "right",
        color: it.disabled ? P.textDisabledGray : hover ? P.selectionYellow : "#FFF",
        outline: P.outlineDark
      });
      if (!it.disabled) (function (fn) { region(x, y, w, 52, function () { AudioEngine.play("uiClick"); fn(); }); })(it.fn);
      y += 62;
    }
    if (Game.quitAttempted) {
      PixelFont.drawText(ctx, T.youMayClose, W / 2, H - 60, { scale: 2, align: "center", color: P.beaconYellow });
    }
    if (Game.showHelp) drawHelpOverlay(ctx, W, H);
    if (Save.storageWarning) {
      PixelFont.drawText(ctx, T.savingDisabled, W / 2, H - 30, { scale: 2, align: "center", color: P.dangerRed });
    }
  }

  function drawHelpOverlay(ctx, W, H) {
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(0, 0, W, H);
    var w = 1000, x = (W - w) / 2, y = 90;
    Art.panel(ctx, x, y, w, H - 180, { fill: P.uiParchment, cut: 18 });
    PixelFont.drawText(ctx, "HOW TO PLAY", x + w / 2, y + 22, { scale: 4, align: "center", color: "#20201E" });
    var lines = [
      "Your ship carries vital intelligence to the Federation fleet. Cross eight",
      "sectors before the rebel armada catches you, then defeat their dreadnought.",
      "",
      "SPACE pauses the game at any time. Give orders while paused.",
      "Click a weapon (1-4), then click an enemy room to target it.",
      "Click a crew member, then a room, to move them. They repair, fight",
      "fires, and man stations automatically once in position.",
      "Power systems from the reactor: click a system icon to add power,",
      "right-click to remove it. Shields need two bars per layer.",
      "Jump beacon to beacon with the FTL drive (the map is under M or J).",
      "Every jump costs one fuel. The rebel fleet swallows beacons behind you.",
      "Buy weapons, systems, crew, and repairs at stores. Collect scrap by",
      "winning fights and helping those you meet.",
      "",
      "Reach the exit beacon of each sector. Survive to The Last Stand."
    ];
    for (var i = 0; i < lines.length; i++) {
      PixelFont.drawText(ctx, lines[i], x + 40, y + 80 + i * 26, { scale: 2, color: "#20201E" });
    }
    btn(ctx, x + w / 2 - 80, y + H - 180 - 70, 160, 44, T.continueBtn, function () { Game.showHelp = false; });
  }

  function drawCredits(ctx, W, H, t) {
    hit = [];
    Art.background(ctx, 42, "menu", W, H, t);
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, W, H);
    var lines = GAME_DATA.creditsLines;
    var scroll = (t * 30) % (lines.length * 40 + H);
    for (var i = 0; i < lines.length; i++) {
      var y = H - scroll + i * 40;
      if (y > -40 && y < H + 40) {
        PixelFont.drawText(ctx, lines[i], W / 2, y, { scale: i === 0 ? 5 : 2, align: "center", color: "#FFF", outline: i === 0 ? P.outlineDark : null });
      }
    }
    btn(ctx, W / 2 - 70, H - 70, 140, 44, T.done, function () { Game.state = "menu"; });
  }

  // ==========================================================================
  // HANGAR (§2.2)
  // ==========================================================================
  var hangar = {
    shipIdx: 0, layoutB: false, hideRooms: false, difficulty: "EASY",
    showList: false, renaming: false, shipName: null, crewNames: null,
    cheats: { railgun: false, scrap: false, teleport: false, upgraded: false }
  };
  function availableShips() {
    var out = [];
    for (var i = 0; i < GAME_DATA.ships.length; i++) {
      if (GAME_DATA.ships[i].variant === "A") out.push(GAME_DATA.ships[i]);
    }
    return out;
  }
  function currentHangarShip() {
    var families = availableShips();
    var fam = families[hangar.shipIdx % families.length];
    if (hangar.layoutB) {
      var bId = fam.id.replace("_a", "_b");
      var b = GAME_DATA.shipById[bId];
      if (b && Game.profile.unlockedShips[bId]) return b;
    }
    return fam;
  }
  function shipUnlocked(def) { return !!Game.profile.unlockedShips[def.id]; }

  function drawHangar(ctx, W, H, t) {
    hit = [];
    Art.hangarBackground(ctx, W, H);
    // focus the dock: warm key light from upper-left, gentle corner falloff
    var keyG = ctx.createRadialGradient(W * 0.38, H * 0.18, 120, W * 0.52, H * 0.38, H * 1.15);
    keyG.addColorStop(0, "rgba(255,214,150,0.16)");
    keyG.addColorStop(0.68, "rgba(0,0,0,0)");
    keyG.addColorStop(1, "rgba(0,0,0,0.22)");
    ctx.fillStyle = keyG;
    ctx.fillRect(0, 0, W, H);
    var def = currentHangarShip();
    var unlocked = shipUnlocked(def);
    if (hangar.shipName == null) hangar.shipName = def.name;

    // center: ship layout at large scale
    var ts = 44;
    var lay = def.layout;
    var ox = W / 2 - (lay ? (boundsOf(lay).w * ts) / 2 : 200), oy = 200;
    var preview = Game.hangarPreviewShip;
    if (!preview || preview.def !== def) {
      preview = Game.hangarPreviewShip = Game.buildPlayerShip(def);
      preview.def = def;
    }
    if (unlocked) {
      // grounding shadow beneath the docked ship
      var shipMidX = ox + (preview.bounds.w / 2) * ts;
      var shipBotY = oy + (preview.bounds.h + 2.4) * ts;
      var shGrad = ctx.createRadialGradient(shipMidX, shipBotY, 20, shipMidX, shipBotY, 480);
      shGrad.addColorStop(0, "rgba(0,0,0,0.42)");
      shGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = shGrad;
      ctx.beginPath();
      ctx.ellipse(shipMidX, shipBotY, 480, 70, 0, 0, Math.PI * 2);
      ctx.fill();
      Art.drawShip(ctx, preview, ox - preview.bounds.x * ts, oy, ts, { t: t, hideRooms: hangar.hideRooms, facing: "right", noEngines: true, noShadow: true });
    } else {
      // black silhouette + padlock
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.translate(ox - 40, oy - 40);
      ctx.fillStyle = "#0A0A0A";
      Art.drawHullOrSprite(ctx, def.hullStyle, 560, 280, "right");
      ctx.fillStyle = "rgba(0,0,0,0.82)";
      ctx.fillRect(-80, -80, 800, 460);
      ctx.restore();
      Icons.drawIcon(ctx, "lock", W / 2 - 30, 300, 60, "#888");
      PixelFont.drawParagraph(ctx, def.unlockHint, W / 2 - 240, 390, { scale: 2, color: "#CCC", maxWidth: 480 });
    }

    // top-left: rename + name plate
    btn(ctx, 20, 20, 120, 44, T.rename, function () { Game.beginRename(); }, { tip: "Rename your ship." });
    Art.panel(ctx, 150, 20, 420, 44, { fill: "#1A1A18", cut: 10 });
    PixelFont.drawText(ctx, hangar.shipName.toUpperCase().substring(0, 20), 360, 32, { scale: 3, align: "center", color: "#FFF" });

    // left column: SHIP / LIST / arrows / RANDOM / LAYOUT / HIDE ROOMS
    var lx = 20, ly = 90;
    Art.panel(ctx, lx, ly, 360, 300, { fill: "rgba(20,20,18,0.85)", cut: 12 });
    PixelFont.drawText(ctx, T.ship, lx + 20, ly + 16, { scale: 3, color: "#FFF" });
    btn(ctx, lx + 20, ly + 52, 44, 40, "<", function () { hangarPrev(); });
    btn(ctx, lx + 72, ly + 52, 120, 40, T.list, function () { hangar.showList = !hangar.showList; });
    btn(ctx, lx + 200, ly + 52, 44, 40, ">", function () { hangarNext(); });
    btn(ctx, lx + 20, ly + 102, 224, 40, T.randomShip, function () {
      var opts = [];
      var fams = availableShips();
      for (var i = 0; i < fams.length; i++) if (shipUnlocked(fams[i])) opts.push(i);
      hangar.shipIdx = RNG.vol.pick(opts);
      hangar.layoutB = RNG.vol.chance(50) && shipUnlocked(GAME_DATA.shipById[fams[hangar.shipIdx].id.replace("_a", "_b")]);
      onShipChanged();
    });
    // layout A/B
    var famDef = availableShips()[hangar.shipIdx % availableShips().length];
    var bDef = GAME_DATA.shipById[famDef.id.replace("_a", "_b")];
    var bUnlocked = bDef && shipUnlocked(bDef);
    btn(ctx, lx + 20, ly + 152, 108, 40, T.layoutA, function () { hangar.layoutB = false; onShipChanged(); }, { selected: !hangar.layoutB });
    btn(ctx, lx + 136, ly + 152, 108, 40, T.layoutB, function () { if (bUnlocked) { hangar.layoutB = true; onShipChanged(); } }, { selected: hangar.layoutB, disabled: !bUnlocked, tip: bUnlocked ? null : "Layout B: earn 2 of this ship's 3 achievements." });
    if (!bUnlocked) Icons.drawIcon(ctx, "lock", lx + 214, ly + 160, 22, "#20201E");
    btn(ctx, lx + 20, ly + 202, 224, 40, T.hideRooms, function () { hangar.hideRooms = !hangar.hideRooms; }, { selected: hangar.hideRooms });

    // ship achievements panel
    var famKey = def.family;
    var shipAch = GAME_DATA.shipAchievements[famKey] || [];
    var achY = ly + 310;
    Art.panel(ctx, lx, achY, 360, 130, { fill: "rgba(20,20,18,0.85)", cut: 12 });
    PixelFont.drawText(ctx, "Layout B: finish 2", lx + 20, achY + 12, { scale: 2, color: "#E8938D" });
    for (var a = 0; a < shipAch.length; a++) {
      var earned = Game.profile.achievements[shipAch[a].id];
      var ax = lx + 20 + a * 110;
      Art.panel(ctx, ax, achY + 40, 100, 70, { fill: earned ? P.selectionYellow : "#1A1A18", cut: 8 });
      Icons.drawIcon(ctx, earned ? "star" : "lock", ax + 36, achY + 60, 28, earned ? "#20201E" : "#666");
      region(ax, achY + 40, 100, 70, null, null, shipAch[a].name + ": " + shipAch[a].req);
    }

    // top-right: difficulty + START
    var dx = W - 420;
    btn(ctx, dx, 20, 130, 40, T.easy, function () { hangar.difficulty = "EASY"; }, { selected: hangar.difficulty === "EASY" });
    btn(ctx, dx, 64, 130, 40, T.normal, function () { hangar.difficulty = "NORMAL"; }, { selected: hangar.difficulty === "NORMAL" });
    btn(ctx, dx, 108, 130, 40, T.hard, function () { hangar.difficulty = "HARD"; }, { selected: hangar.difficulty === "HARD" });
    btn(ctx, W - 270, 20, 250, 128, T.start, function () {
      if (unlocked) Game.startRun(def, hangar.difficulty, hangar.shipName);
    }, { disabled: !unlocked, scale: 5 });

    // advanced content toggle (locked DISABLED)
    Art.panel(ctx, W - 420, 170, 400, 70, { fill: "rgba(20,20,18,0.85)", cut: 10 });
    PixelFont.drawText(ctx, T.aeContent, W - 400, 182, { scale: 2, color: "#FFF" });
    Art.button(ctx, W - 400, 204, 130, 28, T.disabled, { selected: true, scale: 2 });
    Art.button(ctx, W - 260, 204, 120, 28, T.enabled, { disabled: true, scale: 2 });
    region(W - 420, 170, 400, 70, null, null, T.notAvailable);

    // CHEATS panel (right under Advanced Edition Content)
    var chX = W - 420, chY = 260;
    var chOn = hangar.cheats.railgun || hangar.cheats.scrap || hangar.cheats.teleport || hangar.cheats.upgraded;
    Art.panel(ctx, chX, chY, 400, 236, { fill: "rgba(20,20,18,0.85)", cut: 12 });
    PixelFont.drawText(ctx, "CHEATS", chX + 20, chY + 14, { scale: 3, color: chOn ? "#FF7B6E" : "#FFF" });
    if (chOn) PixelFont.drawText(ctx, "ACTIVE", chX + 150, chY + 20, { scale: 2, color: "#FF7B6E" });
    var cheatDefs = [
      ["railgun", "EM RAIL GUN", "Ship starts with the EM Rail Gun: one shot kills any enemy, pierces all shields and defenses."],
      ["scrap", "15,000 SCRAP", "Start the run with 15,000 scrap."],
      ["teleport", "MAGIC TELEPORT", "Jump to ANY beacon on the map, any time, no FTL charge, no fuel cost."],
      ["upgraded", "FULLY UPGRADED SHIP", "Max reactor and every installed system fully upgraded from the start."]
    ];
    for (var chI = 0; chI < cheatDefs.length; chI++) {
      (function (key, label, tip) {
        btn(ctx, chX + 20, chY + 48 + chI * 44, 360, 38, label, function () {
          hangar.cheats[key] = !hangar.cheats[key];
        }, { selected: hangar.cheats[key], tip: tip, scale: 2 });
      })(cheatDefs[chI][0], cheatDefs[chI][1], cheatDefs[chI][2]);
    }

    // bottom: crew / weapons+drones / augments panels
    var py = H - 300;
    // CREW
    Art.panel(ctx, 20, py, 560, 280, { fill: "rgba(20,20,18,0.88)", cut: 12 });
    PixelFont.drawText(ctx, T.crew, 40, py + 12, { scale: 3, color: "#FFF" });
    if (!hangar.crewNames || hangar.crewNames.length !== def.crew.length) {
      hangar.crewNames = [];
      for (var cn = 0; cn < def.crew.length; cn++) hangar.crewNames.push(RNG.vol.pick(GAME_DATA.crewNames));
    }
    for (var c = 0; c < def.crew.length; c++) {
      var cx = 40 + (c % 4) * 130, cyy = py + 44 + Math.floor(c / 4) * 116;
      Art.panel(ctx, cx, cyy, 118, 106, { fill: "#22211E", cut: 8 });
      if (!Art.drawCrewArt(ctx, def.crew[c], cx + 34, cyy + 4, 50, 48)) {
        var spr = Art.crewSprite(def.crew[c], 0, false, false);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(spr, cx + 38, cyy + 8, 42, 42);
      }
      PixelFont.drawText(ctx, (hangar.crewNames[c] || "").substring(0, 9), cx + 59, cyy + 54, { scale: 2, align: "center", color: "#FFF" });
      (function (idx) {
        btn(ctx, cx + 8, cyy + 74, 102, 24, T.customize, function () { Game.beginRenameCrew(idx); }, { scale: 1 });
      })(c);
      region(cx, cyy, 118, 70, null, null, GAME_DATA.races[def.crew[c]].name + " - " + GAME_DATA.races[def.crew[c]].special);
    }

    // WEAPONS / DRONES
    Art.panel(ctx, 600, py, 700, 280, { fill: "rgba(20,20,18,0.88)", cut: 12 });
    PixelFont.drawText(ctx, T.weapons, 620, py + 12, { scale: 3, color: "#FFF" });
    for (var w = 0; w < 4; w++) {
      var wx = 620 + w * 165;
      var wid = def.weapons[w];
      Art.panel(ctx, wx, py + 44, 155, 76, { fill: wid ? P.uiTooltipMauve : "#1A1A18", cut: 8 });
      if (wid) {
        var wdef = GAME_DATA.weaponById[wid];
        var wnl = PixelFont.wrap(wdef.name, 2, 140).slice(0, 2);
        for (var wni = 0; wni < wnl.length; wni++) {
          PixelFont.drawText(ctx, wnl[wni], wx + 8, py + 50 + wni * 17, { scale: 2, color: "#FFF" });
        }
        if (!Art.drawWeaponArt(ctx, wid, wx + 96, py + 66, 52, 48)) {
          Icons.drawIcon(ctx, wdef.cls === "missile" || wdef.cls === "bomb" ? "missiles" : "weapons", wx + 62, py + 86, 26, "#FFF");
        }
        (function (wd) {
          region(wx, py + 44, 155, 76, null, null, wd.name + " - " + statsTipText(wd));
        })(wdef);
      }
    }
    PixelFont.drawText(ctx, T.drones, 620, py + 140, { scale: 3, color: "#FFF" });
    if (def.drones.length === 0 && !def.systems.droneCtrl) {
      PixelFont.drawText(ctx, "SYSTEM NOT INSTALLED", 950, py + 200, { scale: 3, align: "center", color: Art.ROLE.dark.sub });
    } else {
      for (var d = 0; d < 3; d++) {
        var dx2 = 620 + d * 165;
        var did = def.drones[d];
        Art.panel(ctx, dx2, py + 172, 155, 76, { fill: did ? P.uiTooltipMauve : "#1A1A18", cut: 8 });
        if (did) {
          var ddef = GAME_DATA.droneById[did];
          PixelFont.drawText(ctx, ddef.name.substring(0, 13), dx2 + 8, py + 180, { scale: 2, color: "#FFF" });
          Icons.drawIcon(ctx, "droneCtrl", dx2 + 62, py + 204, 30, "#FFF");
          (function (dd) { region(dx2, py + 172, 155, 76, null, null, dd.name + " - " + dd.desc); })(ddef);
        }
      }
    }

    // AUGMENTATIONS
    Art.panel(ctx, 1320, py, 580, 280, { fill: "rgba(20,20,18,0.88)", cut: 12 });
    PixelFont.drawText(ctx, T.augmentations, 1340, py + 12, { scale: 3, color: "#FFF" });
    for (var g = 0; g < 3; g++) {
      var gid = def.augments[g];
      Art.panel(ctx, 1340, py + 50 + g * 74, 540, 64, { fill: gid ? P.uiTooltipMauve : "#1A1A18", cut: 8 });
      if (gid) {
        var adef = GAME_DATA.augmentById[gid];
        PixelFont.drawText(ctx, adef.name, 1356, py + 60 + g * 74, { scale: 2, color: "#FFF" });
        var effLines = PixelFont.wrap(adef.effect, 1, 520);
        PixelFont.drawText(ctx, effLines[0], 1356, py + 84 + g * 74, { scale: 1, color: "#E0D8D6" });
        (function (ad) { region(1340, py + 50 + g * 74, 540, 64, null, null, ad.name + ": " + ad.effect); })(adef);
      }
    }

    // ship list overlay
    if (hangar.showList) drawShipList(ctx, W, H);

    // hover tooltips
    drawHitTips(ctx, W, H);
  }
  function statsTipText(wdef) {
    return Tooltips.weaponStats(wdef).join(". ");
  }
  function boundsOf(lay) {
    var minX = 99, minY = 99, maxX = 0, maxY = 0;
    for (var i = 0; i < lay.rooms.length; i++) {
      var r = lay.rooms[i];
      minX = Math.min(minX, r.x); minY = Math.min(minY, r.y);
      maxX = Math.max(maxX, r.x + r.w); maxY = Math.max(maxY, r.y + r.h);
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }
  function hangarPrev() {
    var n = availableShips().length;
    hangar.shipIdx = (hangar.shipIdx + n - 1) % n;
    onShipChanged();
  }
  function hangarNext() {
    hangar.shipIdx = (hangar.shipIdx + 1) % availableShips().length;
    onShipChanged();
  }
  function onShipChanged() {
    hangar.shipName = null;
    hangar.crewNames = null;
    Game.hangarPreviewShip = null;
    AudioEngine.play("uiClick");
  }

  function drawShipList(ctx, W, H) {
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    ctx.fillRect(0, 0, W, H);
    var w = 1200, h = 760, x = (W - w) / 2, y = (H - h) / 2;
    Art.panel(ctx, x, y, w, h, { fill: P.uiParchment, cut: 18 });
    PixelFont.drawText(ctx, T.chooseShip, x + w / 2, y + 24, { scale: 4, align: "center", color: "#20201E" });
    var fams = availableShips();
    for (var i = 0; i < fams.length; i++) {
      var col = i % 3, row = Math.floor(i / 3);
      var sx = x + 60 + col * 370, sy = y + 90 + row * 210;
      var unlocked = shipUnlocked(fams[i]);
      Art.panel(ctx, sx, sy, 340, 180, { fill: hangar.shipIdx === i ? P.selectionYellow : "#D9D5D4", cut: 10 });
      ctx.save();
      ctx.translate(sx + 40, sy + 30);
      ctx.scale(0.5, 0.5);
      if (!unlocked) ctx.filter = "brightness(0.15)";
      Art.drawHullOrSprite(ctx, fams[i].hullStyle, 420, 180, "right");
      ctx.restore();
      if (!unlocked) Icons.drawIcon(ctx, "lock", sx + 150, sy + 60, 40, "#888");
      if (!unlocked) {
        ctx.fillStyle = "rgba(26,26,24,0.85)";
        ctx.fillRect(sx + 90, sy + 140, 160, 26);
      }
      PixelFont.drawText(ctx, unlocked ? fams[i].cls : "???", sx + 170, sy + 148, { scale: 2, align: "center", color: unlocked ? "#20201E" : Art.ROLE.dark.sub });
      (function (idx, unl, defn) {
        region(sx, sy, 340, 180, function () {
          hangar.shipIdx = idx; hangar.layoutB = false; hangar.showList = false; onShipChanged();
        }, null, unl ? defn.cls : defn.unlockHint);
      })(i, unlocked, fams[i]);
    }
    btn(ctx, x + w / 2 - 70, y + h - 60, 140, 44, T.done, function () { hangar.showList = false; });
  }

  // ==========================================================================
  // BEACON MAP (§2.4)
  // ==========================================================================
  function drawBeaconMap(ctx, W, H, t) {
    // draws OVER the HUD as a modal; strong scrim so the overlay owns focus
    ctx.fillStyle = "rgba(0,0,0,0.62)";
    ctx.fillRect(0, 0, W, H);
    var w = 1240, h = 820, x = (W - w) / 2, y = (H - h) / 2;
    Art.panel(ctx, x, y, w, h, { fill: P.uiParchment, cut: 22 });
    PixelFont.drawText(ctx, T.beaconMap, x + 30, y + 18, { scale: 4, color: "#20201E" });
    // starfield panel
    var px = x + 24, py = y + 70, pw = w - 48, ph = h - 170;
    ctx.save();
    ctx.beginPath();
    ctx.rect(px, py, pw, ph);
    ctx.clip();
    ctx.fillStyle = P.mapBgCharcoal;
    ctx.fillRect(px, py, pw, ph);
    ctx.translate(px, py);
    Art.background(ctx, Game.run.runSeed + Game.run.sectorNumber * 7, "map", pw, ph, t);
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.rect(px, py, pw, ph);
    ctx.clip();
    // re-render bg inside clip
    ctx.translate(px, py);
    var run = Game.run;
    // rebel fleet zone (§2.4)
    var fleetX = (Game.map.fleetPos / 6) * pw;
    if (fleetX > -pw * 0.3) {
      ctx.fillStyle = P.fleetZoneRed;
      ctx.fillRect(0, 0, Math.max(0, fleetX), ph);
      ctx.strokeStyle = P.fleetStripeRed;
      ctx.lineWidth = 14;
      for (var st = -ph; st < fleetX; st += 44) {
        ctx.beginPath();
        ctx.moveTo(st, ph); ctx.lineTo(st + ph, 0);
        ctx.stroke();
      }
      // advancing boundary arcs
      ctx.strokeStyle = "#FFF";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(fleetX - ph * 1.1, ph / 2, ph * 1.18, ph * 0.75, 0, -0.9, 0.9);
      ctx.stroke();
      ctx.strokeStyle = P.enemyPanelRose;
      ctx.beginPath();
      ctx.ellipse(fleetX - ph * 1.1 + 46, ph / 2, ph * 1.18, ph * 0.75, 0, -0.9, 0.9);
      ctx.stroke();
      // vertical WARNING!
      ctx.save();
      ctx.translate(fleetX + 26, ph / 2 - 90);
      for (var wl = 0; wl < 8; wl++) {
        PixelFont.drawText(ctx, "WARNING!"[wl], 0, wl * 24, { scale: 2, color: "#FFF" });
      }
      ctx.restore();
      // red arrows
      for (var ar = 0; ar < 4; ar++) {
        var ay = ph * (0.15 + ar * 0.23);
        ctx.fillStyle = P.enemyPanelRose;
        ctx.beginPath();
        ctx.moveTo(fleetX + 52, ay - 12);
        ctx.lineTo(fleetX + 84, ay);
        ctx.lineTo(fleetX + 52, ay + 12);
        ctx.closePath();
        ctx.fill();
      }
    }
    var cur = Game.map.currentBeacon();
    var reachable = Game.map.reachable(run.currentBeaconId);
    var mx = Game.mouse.x - px, my = Game.mouse.y - py;
    // faint standing links to every reachable beacon (the jump graph reads
    // at a glance; hover still brightens the chosen path)
    ctx.strokeStyle = "rgba(124,216,124,0.22)";
    ctx.setLineDash([4, 7]);
    ctx.lineWidth = 2;
    for (var rl2 = 0; rl2 < reachable.length; rl2++) {
      var rb = run.beacons[reachable[rl2]];
      ctx.beginPath();
      ctx.moveTo(cur.x * pw, cur.y * ph);
      ctx.lineTo(rb.x * pw, rb.y * ph);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // pulsing ring marks the current position
    ctx.strokeStyle = "rgba(255,255,255," + (0.35 + 0.3 * Math.sin(t * 3.2)) + ")";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cur.x * pw, cur.y * ph, 16 + 4 * Math.sin(t * 3.2), 0, Math.PI * 2);
    ctx.stroke();
    // beacons
    for (var i = 0; i < run.beacons.length; i++) {
      var b = run.beacons[i];
      var bx = b.x * pw, by = b.y * ph;
      var isCur = i === run.currentBeaconId;
      var isReach = reachable.indexOf(i) >= 0;
      var hover = Math.abs(mx - bx) < 16 && Math.abs(my - by) < 16;
      // dashed path from current on hover / selection
      if ((hover || Game.map.selectedBeacon === i) && isReach && Game.optShowPaths !== false) {
        ctx.strokeStyle = "#7CD87C";
        ctx.setLineDash([6, 6]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cur.x * pw, cur.y * ph);
        ctx.lineTo(bx, by);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      // beacon diamond
      var dim = b.visited ? 0.45 : 1;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = Game.map.selectedBeacon === i ? P.selectionYellow : "rgba(202,187,118," + dim + ")";
      var sz = Game.map.selectedBeacon === i ? 7 : 5;
      ctx.fillRect(-sz, -sz, sz * 2, sz * 2);
      ctx.restore();
      // overtaken fleet icon
      if (b.overtaken) Icons.drawIcon(ctx, "fleet", bx - 12, by - 26, 22, P.dangerRed);
      // current position blinking ship glyph
      if (isCur && Math.sin(t * 5) > -0.3) Icons.drawIcon(ctx, "ship", bx - 13, by - 34, 26, "#FFF");
      // tags (flip to the left near the panel's right edge so they never clip)
      var tagX = bx > pw - 100 ? bx - 94 : bx + 10;
      if ((b.type === "store" && (b.known || b.visited))) {
        Art.panel(ctx, tagX, by - 26, 74, 20, { fill: P.storeTagTeal, cut: 4, inner: "rgba(255,255,255,0.4)" });
        PixelFont.drawText(ctx, T.storeTag, tagX + 37, by - 21, { scale: 1, align: "center", color: "#BFE8E8" });
      }
      if (b.type === "exit") {
        Art.panel(ctx, tagX, by - 26, 60, 20, { fill: P.exitTagGreen, cut: 4, inner: "rgba(255,255,255,0.4)" });
        PixelFont.drawText(ctx, T.exitTag, tagX + 30, by - 21, { scale: 1, align: "center", color: "#FFF" });
      }
      if (b.type === "distress" && b.known && !b.visited) {
        // pulsing ring
        ctx.strokeStyle = "rgba(255,255,255," + (0.5 + 0.4 * Math.sin(t * 4)) + ")";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(bx, by, 12 + 3 * Math.sin(t * 4), 0, Math.PI * 2);
        ctx.stroke();
      }
      if (b.questEvent) Icons.drawIcon(ctx, "quest", bx - 9, by - 30, 18, P.fireOrange);
      if (b.scanned && !b.visited) {
        if (b.hazard && b.hazard !== "nebula") Icons.drawIcon(ctx, "danger", bx + 12, by + 6, 14, P.fireOrange);
        if (b.type === "hostile") Icons.drawIcon(ctx, "ship", bx + 12, by - 10, 14, P.dangerRed);
      }
      if (b.nebula) {
        ctx.fillStyle = "rgba(140,80,180,0.28)";
        ctx.beginPath();
        ctx.arc(bx, by, 26, 0, Math.PI * 2);
        ctx.fill();
      }
      (function (idx, reach) {
        region(px + bx - 15, py + by - 15, 30, 30, function () {
          if (reach) { Game.map.selectedBeacon = idx; AudioEngine.play("uiClick"); }
        }, null, beaconTip(run.beacons[idx], idx));
      })(i, isReach);
    }
    ctx.restore();

    // footer: SECTOR plate + name + buttons
    Art.panel(ctx, x + 24, y + h - 84, 220, 50, { fill: "#22211E", cut: 10 });
    PixelFont.drawText(ctx, T.sector, x + 40, y + h - 70, { scale: 3, color: "#FFF" });
    Art.panel(ctx, x + 250, y + h - 84, 60, 50, { fill: "#22211E", cut: 10 });
    PixelFont.drawText(ctx, String(run.sectorNumber), x + 280, y + h - 70, { scale: 3, align: "center", color: P.selectionYellow });
    Art.panel(ctx, x + 318, y + h - 84, 500, 50, { fill: "#22211E", cut: 10 });
    PixelFont.drawText(ctx, run.sector.name, x + 338, y + h - 70, { scale: 2, color: "#FFF" });

    var magicJump = run.cheats && run.cheats.teleport;
    var ftlReady = run.ftlCharge >= 1 || magicJump;
    var canJump = ftlReady && Game.map.selectedBeacon != null && (run.resources.fuel > 0 || magicJump) && !Game.eventModal;
    // no-fuel state (§9.5)
    if (run.resources.fuel <= 0) {
      PixelFont.drawText(ctx, T.noFuel, x + w - 480, y + 30, { scale: 3, color: P.dangerRed });
      btn(ctx, x + w - 560, y + h - 84, 140, 50, T.wait, function () { Game.waitAtBeacon(); }, { tip: "Wait one turn. The rebel fleet keeps advancing." });
      btn(ctx, x + w - 410, y + h - 84, 190, 50, T.distressBeacon, function () { Game.map.distressToggle = !Game.map.distressToggle; },
        { selected: Game.map.distressToggle, tip: "Broadcast distress: raises the chance SOMEONE answers while you wait." });
    }
    // exit beacon: leave sector
    if (cur && cur.type === "exit" && ftlReady && run.sectorNumber < 8) {
      btn(ctx, x + w - 560, y + 16, 200, 44, T.leaveSector, function () { Game.leaveSector(); });
    }
    btn(ctx, x + w - 350, y + h - 84, 160, 50, T.jump, function () { Game.jumpToSelected(); },
      { disabled: !canJump, tip: canJump ? (magicJump ? "Magic teleport: jump anywhere, free, instantly." : "Jump to the selected beacon (1 fuel).") : "Select a reachable beacon with a charged FTL drive." });
    btn(ctx, x + w - 180, y + h - 84, 150, 50, T.cancel, function () { Game.closeMap(); });

    drawHitTips(ctx, W, H);
  }
  function beaconTip(b, idx) {
    if (idx === Game.run.currentBeaconId) return "Your current position.";
    var bits = [];
    if (b.visited) bits.push("Explored.");
    if (b.overtaken) bits.push("Overtaken by the rebel fleet!");
    if (b.type === "exit") bits.push("Sector exit beacon.");
    if (b.type === "store" && b.known) bits.push("A store operates here.");
    if (b.type === "distress" && b.known) bits.push("Distress signal detected.");
    if (b.questEvent) bits.push("Quest destination.");
    if (b.nebula) bits.push("Nebula: sensors will fail; the fleet advances slower when you wait here.");
    if (b.scanned && b.hazard && b.hazard !== "nebula") bits.push("Hazard detected: " + b.hazard + ".");
    return bits.length ? bits.join(" ") : "An unexplored beacon.";
  }

  // ==========================================================================
  // SECTOR SELECT (§2.5)
  // ==========================================================================
  function drawSectorSelect(ctx, W, H, t) {
    hit = [];
    Art.background(ctx, Game.run.runSeed + 999, "map", W, H, t);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, W, H);
    var w = 1500, h = 700, x = (W - w) / 2, y = (H - h) / 2;
    Art.panel(ctx, x, y, w, h, { fill: P.uiParchment, cut: 22 });
    PixelFont.drawText(ctx, "SELECT NEXT SECTOR", x + w / 2, y + 22, { scale: 4, align: "center", color: "#20201E" });
    var tree = Game.run.sectorTree;
    var curCol = Game.run.sectorNumber - 1; // 0-based col of current
    var curNode = Game.run.sectorNode;
    var colW = (w - 120) / 8;
    var colors = { civilian: P.exitTagGreen, hostile: P.dangerRed, nebula: "#8C4CD3", lastStand: "#20201E" };
    // edges
    for (var c = 0; c < 7; c++) {
      for (var i = 0; i < tree[c].length; i++) {
        var n = tree[c][i];
        var nx = x + 80 + c * colW, ny = y + 90 + (i + 0.5) * ((h - 160) / tree[c].length);
        for (var e = 0; e < (n.next || []).length; e++) {
          var m = tree[c + 1][n.next[e]];
          if (!m) continue;
          var mx2 = x + 80 + (c + 1) * colW, my2 = y + 90 + (n.next[e] + 0.5) * ((h - 160) / tree[c + 1].length);
          ctx.strokeStyle = "rgba(60,60,55,0.6)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(nx, ny); ctx.lineTo(mx2, my2);
          ctx.stroke();
        }
      }
    }
    // nodes
    for (var c2 = 0; c2 < 8; c2++) {
      for (var i2 = 0; i2 < tree[c2].length; i2++) {
        var node = tree[c2][i2];
        var nx2 = x + 80 + c2 * colW, ny2 = y + 90 + (i2 + 0.5) * ((h - 160) / tree[c2].length);
        var selectable = c2 === curCol + 1 && curNode && (curNode.next || []).indexOf(i2) >= 0;
        var isCurrent = c2 === curCol && i2 === Game.run.sectorRow;
        ctx.beginPath();
        ctx.arc(nx2, ny2, selectable ? 16 : 11, 0, Math.PI * 2);
        ctx.fillStyle = colors[node.type] || "#888";
        ctx.fill();
        ctx.strokeStyle = isCurrent ? P.selectionYellow : selectable ? "#20201E" : "rgba(0,0,0,0.4)";
        ctx.lineWidth = selectable || isCurrent ? 4 : 2;
        ctx.stroke();
        if (c2 === 7) PixelFont.drawText(ctx, "THE LAST STAND", nx2, ny2 + 26, { scale: 2, align: "center", color: "#20201E" });
        (function (nd, sel, row) {
          region(nx2 - 20, ny2 - 20, 40, 40, function () {
            if (sel) { Game.pendingSectorPick = { node: nd, row: row }; AudioEngine.play("uiClick"); }
          }, null, nd.name + " - " + (GAME_DATA.sectorTypes.filter(function (s) { return s.id === nd.type; })[0] || { trait: "The final stand of the Federation fleet." }).trait);
        })(node, selectable, i2);
        if (Game.pendingSectorPick && Game.pendingSectorPick.node === node) {
          ctx.strokeStyle = P.selectionYellow;
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(nx2, ny2, 22, 0, Math.PI * 2); ctx.stroke();
        }
      }
    }
    btn(ctx, x + w / 2 - 90, y + h - 70, 180, 50, T.jump, function () { Game.confirmSectorPick(); },
      { disabled: !Game.pendingSectorPick, scale: 3 });
    drawHitTips(ctx, W, H);
  }

  // ==========================================================================
  // STORE (§2.7)
  // ==========================================================================
  var storeTab = "buy";
  var storePage = 0;
  function drawStore(ctx, W, H, t) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, W, H);
    var w = 1360, h = 860, x = (W - w) / 2, y = (H - h) / 2;
    Art.panel(ctx, x, y, w, h, { fill: P.uiParchment, cut: 22 });
    PixelFont.drawText(ctx, T.store, x + 30, y + 18, { scale: 4, color: "#20201E" });
    var stock = Game.currentStore;
    var res = Game.run.resources;
    if (!stock) return;

    btn(ctx, x + 200, y + 14, 110, 40, T.buy, function () { storeTab = "buy"; }, { selected: storeTab === "buy" });
    btn(ctx, x + 320, y + 14, 110, 40, T.sell, function () { storeTab = "sell"; }, { selected: storeTab === "sell" });

    // scrap on hand - always visible while trading
    Art.panel(ctx, x + w - 280, y + 14, 250, 44, { fill: "#22211E", cut: 10 });
    Icons.drawIcon(ctx, "scrap", x + w - 264, y + 24, 26, P.selectionYellow);
    PixelFont.drawText(ctx, String(res.scrap), x + w - 226, y + 26, { scale: 3, color: P.selectionYellow });

    if (storeTab === "buy") drawStoreBuy(ctx, x, y, w, h, stock, res);
    else drawStoreSell(ctx, x, y, w, h, res);

    btn(ctx, x + w - 170, y + h - 70, 140, 48, T.done, function () { Game.closeStore(); }, { scale: 3 });
    drawHitTips(ctx, W, H);
  }

  function drawStoreBuy(ctx, x, y, w, h, stock, res) {
    // 3-band grid: left column (supplies / repair / ship), 2x2 category grid,
    // full-width inspector band underneath. No paging, no dead space.
    var colL = x + 24, colW = 360;
    var rowH = 260, row1 = y + 70, row2 = row1 + rowH + 12, bandY = row2 + rowH + 12, bandH = 168;

    // --- left: SUPPLIES ---
    Art.darkWell(ctx, colL, row1, colW, rowH);
    PixelFont.drawText(ctx, T.supplies, colL + 16, row1 + 12, { scale: 3, color: "#FFF" });
    var rows = [
      { icon: "fuel", key: "fuel", price: GAME_DATA.prices.fuel, label: "Fuel" },
      { icon: "missiles", key: "missiles", price: GAME_DATA.prices.missile, label: "Missiles" },
      { icon: "droneParts", key: "droneParts", price: GAME_DATA.prices.dronePart, label: "Drone parts" }
    ];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var ry = row1 + 58 + i * 64;
      Art.panel(ctx, colL + 12, ry - 10, colW - 24, 54, { fill: "#22211E", cut: 8 });
      Icons.drawIcon(ctx, r.icon, colL + 24, ry, 30, "#FFF");
      PixelFont.drawText(ctx, "x" + stock.supplies[r.key], colL + 64, ry + 8, { scale: 2, color: stock.supplies[r.key] > 0 ? "#FFF" : Art.ROLE.dark.disabled });
      Icons.drawIcon(ctx, "scrap", colL + 128, ry + 2, 22, P.selectionYellow);
      PixelFont.drawText(ctx, String(r.price), colL + 156, ry + 8, { scale: 2, color: P.selectionYellow });
      var afford = res.scrap >= r.price && stock.supplies[r.key] > 0;
      (function (row) {
        btn(ctx, colL + colW - 118, ry - 4, 96, 40, T.buy, function () { Game.storeBuySupply(row.key, row.price); },
          { disabled: !afford, tip: row.label + ": " + row.price + " scrap each." });
      })(r);
    }

    // --- left: REPAIR ---
    Art.darkWell(ctx, colL, row2, colW, rowH);
    PixelFont.drawText(ctx, T.repair, colL + 16, row2 + 12, { scale: 3, color: "#FFF" });
    var perPoint = Game.repairPricePerPoint();
    var missing = Game.player.hullMax - Game.player.hull;
    // hull bar
    var hbX = colL + 16, hbY = row2 + 54, hbW = colW - 32;
    Art.panel(ctx, hbX, hbY, hbW, 34, { fill: "#22211E", cut: 6 });
    var hullFrac = Game.player.hull / Game.player.hullMax;
    ctx.fillStyle = hullFrac > 0.66 ? P.hullBarGreen : hullFrac > 0.33 ? "#F2C464" : "#FF7B6E";
    ctx.globalAlpha = 0.85;
    ctx.fillRect(hbX + 4, hbY + 4, (hbW - 8) * hullFrac, 26);
    ctx.globalAlpha = 1;
    PixelFont.drawText(ctx, Game.player.hull + "/" + Game.player.hullMax, hbX + hbW / 2, hbY + 9, { scale: 2, align: "center", color: "#FFF", outline: "#20201E" });
    btn(ctx, colL + 16, row2 + 104, 156, 44, T.onePt + " | " + perPoint, function () { Game.storeRepair(1); },
      { disabled: missing === 0 || res.scrap < perPoint, tip: "Repair 1 hull point for " + perPoint + " scrap." });
    btn(ctx, colL + 182, row2 + 104, 162, 44, T.all + " | " + (missing * perPoint), function () { Game.storeRepair(missing); },
      { disabled: missing === 0 || res.scrap < missing * perPoint, tip: "Repair all " + missing + " missing hull points." });
    PixelFont.drawText(ctx, missing === 0 ? "HULL AT FULL INTEGRITY" : (perPoint + " SCRAP PER POINT"),
      colL + colW / 2, row2 + 168, { scale: 2, align: "center", color: missing === 0 ? Art.ROLE.dark.good : Art.ROLE.dark.sub });

    // --- left: SHIP STORES (what you own) ---
    Art.darkWell(ctx, colL, bandY, colW, bandH);
    PixelFont.drawText(ctx, "ON BOARD", colL + 16, bandY + 12, { scale: 3, color: "#FFF" });
    var own = [
      { icon: "fuel", v: res.fuel }, { icon: "missiles", v: res.missiles },
      { icon: "droneParts", v: res.droneParts }, { icon: "scrap", v: res.scrap }
    ];
    for (var oi = 0; oi < own.length; oi++) {
      var oxx = colL + 16 + (oi % 2) * 170, oyy = bandY + 56 + Math.floor(oi / 2) * 52;
      Icons.drawIcon(ctx, own[oi].icon, oxx, oyy, 26, own[oi].icon === "scrap" ? P.selectionYellow : "#FFF");
      PixelFont.drawText(ctx, String(own[oi].v), oxx + 38, oyy + 6, { scale: 2, color: own[oi].icon === "scrap" ? P.selectionYellow : "#FFF" });
    }

    // --- 2x2 category grid ---
    var cats = stock.categories;
    var gx = x + 404, gw = 460, gapX = 16;
    for (var cI = 0; cI < 4; cI++) {
      var gcol = cI % 2, grow = Math.floor(cI / 2);
      var cx = gx + gcol * (gw + gapX), cyTop = (grow === 0 ? row1 : row2);
      if (cI < cats.length) {
        var cat = cats[cI];
        Art.darkWell(ctx, cx, cyTop, gw, rowH);
        PixelFont.drawText(ctx, cat.label, cx + 16, cyTop + 10, { scale: 3, color: "#FFF" });
        for (var it = 0; it < cat.items.length; it++) {
          var item = cat.items[it];
          var iy = cyTop + 46 + it * 70;
          var sel = Game.storeSelected === item;
          Art.panel(ctx, cx + 12, iy, gw - 24, 62, { fill: item.sold ? "#2A2926" : sel ? P.selectionYellow : P.uiTooltipMauve, cut: 8 });
          if (!item.sold) {
            var drewArt = item.kind === "weapon" ? Art.drawWeaponArt(ctx, item.id, cx + 16, iy + 6, 50, 50)
              : item.kind === "crew" ? Art.drawCrewArt(ctx, item.id, cx + 16, iy + 6, 50, 50)
              : item.kind === "system" ? Art.drawIconArt(ctx, item.id, cx + 20, iy + 12, 40)
              : false;
            if (!drewArt) Icons.drawIcon(ctx, item.icon, cx + 24, iy + 16, 30, sel ? "#20201E" : "#FFF");
            PixelFont.drawText(ctx, item.name, cx + 74, iy + 12, { scale: 2, color: sel ? "#20201E" : "#FFF" });
            var afford2 = res.scrap >= item.price && !item.blocked;
            var priceCol = sel ? (afford2 ? Art.ROLE.light.ink : Art.ROLE.light.warn) : (afford2 ? Art.ROLE.mauve.accent : Art.ROLE.mauve.warn);
            Icons.drawIcon(ctx, "scrap", cx + gw - 120, iy + 16, 22, priceCol);
            PixelFont.drawText(ctx, String(item.price), cx + gw - 92, iy + 22, { scale: 2, color: priceCol });
            (function (itm) {
              region(cx + 12, iy, gw - 24, 62, function () {
                if (Game.storeSelected === itm) Game.storeBuyItem(itm);
                else Game.storeSelected = itm;
              }, null, itm.tip);
            })(item);
          } else {
            PixelFont.drawText(ctx, "SOLD", cx + gw / 2, iy + 22, { scale: 2, align: "center", color: Art.ROLE.dark.sub });
          }
        }
      } else {
        // empty rack: keep the grid solid instead of leaving a hole
        Art.darkWell(ctx, cx, cyTop, gw, rowH);
        ctx.save();
        ctx.beginPath();
        ctx.rect(cx + 6, cyTop + 6, gw - 12, rowH - 12);
        ctx.clip();
        ctx.globalAlpha = 0.22;
        ctx.strokeStyle = "#57544E";
        ctx.lineWidth = 2;
        for (var st = -rowH; st < gw; st += 26) {
          ctx.beginPath();
          ctx.moveTo(cx + st, cyTop + rowH);
          ctx.lineTo(cx + st + rowH, cyTop);
          ctx.stroke();
        }
        ctx.restore();
        PixelFont.drawText(ctx, "EMPTY RACK", cx + gw / 2, cyTop + rowH / 2 - 8, { scale: 2, align: "center", color: Art.ROLE.dark.disabled });
      }
    }

    // --- inspector band ---
    var bx = gx, bw = gw * 2 + gapX;
    Art.darkWell(ctx, bx, bandY, bw, bandH);
    var itemS = Game.storeSelected;
    if (itemS && !itemS.sold) {
      // big art plate for the selected item
      var bandArtW = 0;
      if (itemS.kind === "weapon" || itemS.kind === "crew" || itemS.kind === "system") {
        Art.panel(ctx, bx + 14, bandY + 14, 132, bandH - 28, { fill: "#22211E", cut: 8 });
        var drewBig = itemS.kind === "weapon" ? Art.drawWeaponArt(ctx, itemS.id, bx + 22, bandY + 22, 116, bandH - 44)
          : itemS.kind === "crew" ? Art.drawCrewArt(ctx, itemS.id, bx + 22, bandY + 22, 116, bandH - 44)
          : Art.drawIconArt(ctx, itemS.id, bx + 40, bandY + 32, bandH - 64);
        if (!drewBig) Icons.drawIcon(ctx, itemS.icon, bx + 50, bandY + 50, 60, "#FFF");
        bandArtW = 150;
      }
      PixelFont.drawText(ctx, itemS.name.toUpperCase(), bx + 20 + bandArtW, bandY + 14, { scale: 3, color: P.selectionYellow });
      Icons.drawIcon(ctx, "scrap", bx + bw - 150, bandY + 14, 24, P.selectionYellow);
      PixelFont.drawText(ctx, String(itemS.price), bx + bw - 118, bandY + 18, { scale: 3, color: P.selectionYellow });
      if (itemS.flavor) PixelFont.drawParagraph(ctx, itemS.flavor, bx + 20 + bandArtW, bandY + 52, { scale: 1, color: Art.ROLE.dark.text, maxWidth: bw / 2 - 50 - bandArtW });
      var sLines = itemS.statLines || [];
      for (var sl = 0; sl < Math.min(4, sLines.length); sl++) {
        PixelFont.drawText(ctx, sLines[sl], bx + bw / 2 + 10, bandY + 50 + sl * 22, { scale: 1, color: Art.ROLE.dark.sub });
      }
      if (itemS.warn) {
        PixelFont.drawText(ctx, itemS.warn, bx + 20 + bandArtW, bandY + bandH - 30, { scale: 1, color: Art.ROLE.dark.warn });
      } else if (itemS.tipText) {
        PixelFont.drawText(ctx, T.tip + ": " + itemS.tipText, bx + 20 + bandArtW, bandY + bandH - 30, { scale: 1, color: Art.ROLE.dark.sub });
      }
      PixelFont.drawText(ctx, "CLICK THE ITEM AGAIN TO BUY", bx + bw - 20, bandY + bandH - 30, { scale: 1, align: "right", color: Art.ROLE.dark.good });
    } else {
      PixelFont.drawText(ctx, "SELECT AN ITEM TO INSPECT IT", bx + bw / 2, bandY + bandH / 2 - 16, { scale: 2, align: "center", color: Art.ROLE.dark.sub });
      PixelFont.drawText(ctx, "CLICK ONCE TO INSPECT - CLICK AGAIN TO BUY", bx + bw / 2, bandY + bandH / 2 + 12, { scale: 1, align: "center", color: Art.ROLE.dark.disabled });
    }
  }

  function drawStoreSell(ctx, x, y, w, h, res) {
    Art.darkWell(ctx, x + 24, y + 70, w - 48, h - 160);
    PixelFont.drawText(ctx, "SELL - half price. Click an item to sell it.", x + 44, y + 84, { scale: 2, color: "#FFF" });
    var ship = Game.player;
    var items = [];
    var i;
    for (i = 0; i < ship.weapons.length; i++) {
      var wdef = ship.weapons[i].def;
      items.push({ label: wdef.name, price: Math.floor((wdef.price || (wdef.sellsFor || 10) * 2) * 0.5), kind: "weapon", idx: i, icon: "weapons" });
    }
    for (i = 0; i < ship.drones.length; i++) {
      items.push({ label: ship.drones[i].def.name, price: Math.floor(ship.drones[i].def.price * 0.5), kind: "drone", idx: i, icon: "droneCtrl" });
    }
    for (i = 0; i < ship.augments.length; i++) {
      var adef = GAME_DATA.augmentById[ship.augments[i]];
      items.push({ label: adef.name, price: Math.floor((adef.price || (adef.sellsFor || 10) * 2) * 0.5), kind: "augment", idx: i, icon: "augment" });
    }
    for (i = 0; i < ship.cargo.length; i++) {
      var cdef = ship.cargo[i].type === "weapon" ? GAME_DATA.weaponById[ship.cargo[i].id] : GAME_DATA.droneById[ship.cargo[i].id];
      items.push({ label: cdef.name, price: Math.floor((cdef.price || (cdef.sellsFor || 10) * 2) * 0.5), kind: "cargo", idx: i, icon: "augment" });
    }
    items.push({ label: "Fuel (1)", price: Math.floor(GAME_DATA.prices.fuel * 0.5), kind: "fuel", disabled: res.fuel <= 0, icon: "fuel" });
    items.push({ label: "Missiles (1)", price: Math.floor(GAME_DATA.prices.missile * 0.5), kind: "missiles", disabled: res.missiles <= 0, icon: "missiles" });
    items.push({ label: "Drone parts (1)", price: Math.floor(GAME_DATA.prices.dronePart * 0.5), kind: "droneParts", disabled: res.droneParts <= 0, icon: "droneParts" });
    for (i = 0; i < items.length; i++) {
      var col = i % 3, row = Math.floor(i / 3);
      var ix = x + 44 + col * 430, iy = y + 120 + row * 66;
      var itm = items[i];
      Art.panel(ctx, ix, iy, 410, 56, { fill: itm.disabled ? "#2A2926" : P.uiTooltipMauve, cut: 8 });
      var sellArt = itm.kind === "weapon" ? Art.drawWeaponArt(ctx, ship.weapons[itm.idx].id, ix + 6, iy + 6, 44, 44)
        : (itm.kind === "cargo" && ship.cargo[itm.idx] && ship.cargo[itm.idx].type === "weapon")
          ? Art.drawWeaponArt(ctx, ship.cargo[itm.idx].id, ix + 6, iy + 6, 44, 44)
          : false;
      if (!sellArt) Icons.drawIcon(ctx, itm.icon, ix + 10, iy + 13, 28, "#FFF");
      PixelFont.drawText(ctx, itm.label.substring(0, 22), ix + 56, iy + 8, { scale: 2, color: itm.disabled ? "#666" : "#FFF" });
      Icons.drawIcon(ctx, "scrap", ix + 310, iy + 14, 20, Art.ROLE.mauve.accent);
      PixelFont.drawText(ctx, "+" + itm.price, ix + 338, iy + 18, { scale: 2, color: itm.disabled ? Art.ROLE.mauve.sub : Art.ROLE.mauve.accent });
      if (!itm.disabled) (function (item) {
        region(ix, iy, 410, 56, function () { Game.storeSellItem(item); }, null, "Sell for " + item.price + " scrap.");
      })(itm);
    }
  }

  // ==========================================================================
  // EVENT DIALOGUE (§2.8) & SURRENDER (§2.9)
  // ==========================================================================
  function drawEventDialogue(ctx, W, H, t) {
    var ev = Game.eventModal;
    if (!ev) return;
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, W, H);
    var w = 900;
    var scale = 2;
    var textLines = PixelFont.wrap(ev.text, scale, w - 80);
    var lh = PixelFont.lineHeight(scale);
    var choices = ev.choices || [];
    var visChoices = [];
    for (var i = 0; i < choices.length; i++) {
      if (ev.isResult || Sim.Events.choiceVisible(choices[i])) visChoices.push(choices[i]);
    }
    var rewardLines = ev.rewards || [];
    var h = 120 + textLines.length * lh + rewardLines.length * lh + visChoices.length * 46;
    var x = (W - w) / 2, y = Math.max(60, (H - h) / 2 - 80);
    Art.panel(ctx, x, y, w, h, { fill: P.uiParchment, cut: 18 });
    var cy = y + 36;
    for (var l = 0; l < textLines.length; l++) {
      PixelFont.drawText(ctx, textLines[l], x + 40, cy, { scale: scale, color: "#20201E" });
      cy += lh;
    }
    cy += 8;
    for (var rl = 0; rl < rewardLines.length; rl++) {
      PixelFont.drawText(ctx, rewardLines[rl], x + 40, cy, { scale: 2, color: "#2A6E2A" });
      cy += lh;
    }
    cy += 12;
    var mx = Game.mouse.x, my = Game.mouse.y;
    for (var c = 0; c < visChoices.length; c++) {
      var ch = visChoices[c];
      var enabled = ev.isResult || Sim.Events.choiceEnabled(ch);
      var label = (c + 1) + ". " + ch.label;
      var chLines = PixelFont.wrap(label, 2, w - 110);
      var rowH = chLines.length * lh + 10;
      var hover = mx >= x + 30 && mx < x + w - 30 && my >= cy - 5 && my < cy - 5 + rowH && enabled;
      var isBlue = !!ch.blue;
      var state = !enabled ? "disabled" : isBlue ? (hover ? "blueHover" : "blue") : (hover ? "hover" : "normal");
      drawChoiceRow(ctx, x + 30, cy, w - 60, label, { state: state });
      (function (choice, en) {
        region(x + 30, cy - 5, w - 60, rowH, function () {
          if (en) Game.chooseEventOption(choice);
        });
      })(ch, enabled);
      cy += rowH + 8;
    }
    drawHitTips(ctx, W, H);
  }

  // ==========================================================================
  // SHIP OVERVIEW (§2.6): Systems / Crew / Inventory tabs
  // ==========================================================================
  var overviewTab = "systems";
  var overviewPurchases = []; // undo stack for this visit

  function drawOverview(ctx, W, H, t) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, W, H);
    var w = 1500, h = 900, x = (W - w) / 2, y = (H - h) / 2;
    Art.panel(ctx, x, y, w, h, { fill: P.uiParchment, cut: 22 });
    // tabs
    var tabs = [["systems", "ship"], ["crew", "crew"], ["inventory", "weapons"]];
    for (var tb = 0; tb < tabs.length; tb++) {
      var sel = overviewTab === tabs[tb][0];
      Art.button(ctx, x + 30 + tb * 76, y + 12, 66, 48, "", { selected: sel });
      Icons.drawIcon(ctx, tabs[tb][1], x + 48 + tb * 76, y + 22, 30, "#20201E");
      (function (tab) { region(x + 30 + tb * 76, y + 12, 66, 48, function () { overviewTab = tab; }); })(tabs[tb][0]);
    }
    // ship name plate
    Art.panel(ctx, x + w / 2 - 220, y + 14, 440, 44, { fill: "#22211E", cut: 10 });
    PixelFont.drawText(ctx, Game.run.shipName.toUpperCase(), x + w / 2, y + 26, { scale: 3, align: "center", color: "#FFF" });

    if (overviewTab === "systems") drawOverviewSystems(ctx, x, y, w, h);
    else if (overviewTab === "crew") drawOverviewCrew(ctx, x, y, w, h);
    else drawOverviewInventory(ctx, x, y, w, h);

    drawHitTips(ctx, W, H);
  }

  function drawOverviewSystems(ctx, x, y, w, h) {
    var ship = Game.player;
    var res = Game.run.resources;
    // wells
    Art.darkWell(ctx, x + 30, y + 90, w - 460, 460);
    PixelFont.drawText(ctx, T.systems, x + 50, y + 100, { scale: 3, color: "#FFF" });
    var sysOrder = ["shields", "engines", "oxygen", "weapons", "medbay", "droneCtrl", "teleporter", "cloaking", "artillery"];
    var gx = x + 60;
    var hoveredSys = null;
    var mx = Game.mouse.x, my = Game.mouse.y;
    for (var i = 0; i < sysOrder.length; i++) {
      var sid = sysOrder[i];
      var s = ship.sys(sid);
      var def = GAME_DATA.systems[sid];
      // gauge (also draw empty slot gauges)
      var maxL = def.maxLevel;
      var baseY = y + 420;
      for (var b = 0; b < maxL; b++) {
        var by = baseY - b * 24;
        if (s && b < s.level) {
          ctx.fillStyle = P.powerGreen;
          ctx.fillRect(gx, by, 40, 18);
        } else {
          ctx.fillStyle = P.unpoweredKhaki;
          ctx.fillRect(gx, by, 40, 18);
          ctx.strokeStyle = "#1A1A18";
          ctx.strokeRect(gx, by, 40, 18);
        }
      }
      if (!Art.drawIconArt(ctx, sid, gx - 1, baseY + 24, 42, !s)) {
        Icons.drawIcon(ctx, sid, gx + 4, baseY + 30, 32, s ? P.powerGreen : "#57544E");
      }
      // cost plate
      var cost = s ? def.upgradeCost[s.level + 1] : null;
      if (s && s.id === "shields" && Game.player.firstShieldUpgrade100 && s.level === 1) cost = 100;
      if (cost != null) {
        Art.panel(ctx, gx - 6, baseY + 68, 56, 26, { fill: "#22211E", cut: 4 });
        Icons.drawIcon(ctx, "scrap", gx - 2, baseY + 72, 16, res.scrap >= cost ? P.selectionYellow : Art.ROLE.dark.warn);
        PixelFont.drawText(ctx, String(cost), gx + 20, baseY + 74, { scale: 2, color: res.scrap >= cost ? P.selectionYellow : Art.ROLE.dark.warn });
      }
      if (mx >= gx - 8 && mx < gx + 48 && my >= y + 120 && my < baseY + 100) hoveredSys = sid;
      (function (sid2, s2, cost2) {
        region(gx - 8, y + 120, 56, baseY + 100 - (y + 120), function () {
          Game.buySystemLevel(sid2);
        }, function () {
          Game.refundSystemLevel(sid2);
        }, null);
      })(sid, s, cost);
      gx += 78;
    }
    // subsystems well
    Art.darkWell(ctx, x + 30, y + 570, w - 460, 260);
    PixelFont.drawText(ctx, T.subsystems, x + 50, y + 580, { scale: 3, color: "#FFF" });
    var subOrder = ["piloting", "sensors", "doors"];
    var sx2 = x + 60;
    for (var si = 0; si < subOrder.length; si++) {
      var sid3 = subOrder[si];
      var s3 = ship.sys(sid3);
      var def3 = GAME_DATA.systems[sid3];
      var baseY2 = y + 750;
      for (var b2 = 0; b2 < def3.maxLevel; b2++) {
        var by2 = baseY2 - b2 * 24;
        ctx.fillStyle = s3 && b2 < s3.level ? P.powerGreen : P.unpoweredKhaki;
        ctx.fillRect(sx2, by2, 40, 18);
      }
      if (!Art.drawIconArt(ctx, sid3, sx2 - 2, baseY2 + 22, 44, !s3)) {
        Icons.drawIcon(ctx, sid3, sx2 + 4, baseY2 + 26, 30, s3 ? P.powerGreen : "#57544E");
      }
      var cost3 = s3 ? def3.upgradeCost[s3.level + 1] : null;
      if (cost3 != null) {
        Art.panel(ctx, sx2 - 6, baseY2 + 58, 56, 24, { fill: "#22211E", cut: 4 });
        PixelFont.drawText(ctx, String(cost3), sx2 + 18, baseY2 + 62, { scale: 2, color: res.scrap >= cost3 ? P.selectionYellow : Art.ROLE.dark.warn });
      }
      if (mx >= sx2 - 8 && mx < sx2 + 48 && my >= y + 600 && my < baseY2 + 84) hoveredSys = sid3;
      (function (sid4) {
        region(sx2 - 8, y + 600, 56, baseY2 + 84 - (y + 600), function () { Game.buySystemLevel(sid4); }, function () { Game.refundSystemLevel(sid4); });
      })(sid3);
      sx2 += 78;
    }
    // REACTOR well
    Art.darkWell(ctx, x + w - 800 + 380, y + 570, 380, 260);
    PixelFont.drawText(ctx, T.reactor, x + w - 400, y + 580, { scale: 3, color: "#FFF" });
    var rl = ship.reactorLevel;
    for (var rb = 0; rb < GAME_DATA.reactorMax; rb++) {
      var rxx = x + w - 400 + (rb % 5) * 34, ryy = y + 620 + Math.floor(rb / 5) * 24;
      ctx.fillStyle = rb < rl ? P.reactorGreen : P.unpoweredKhaki;
      ctx.fillRect(rxx, ryy, 28, 16);
    }
    PixelFont.drawText(ctx, rl + " POWER BARS", x + w - 400, y + 750, { scale: 2, color: "#FFF" });
    if (rl < GAME_DATA.reactorMax) {
      var rcost = GAME_DATA.reactorCost(rl + 1);
      btn(ctx, x + w - 400, y + 776, 150, 40, "+1 | " + rcost, function () { Game.buyReactorBar(); },
        { disabled: res.scrap < rcost || !!Game.combat, tip: Game.combat ? "Cannot upgrade the reactor during combat." : "Buy one reactor bar." });
    }
    // info card
    if (hoveredSys) {
      var hs = GAME_DATA.systems[hoveredSys];
      var costs = [];
      for (var lv = 2; lv <= hs.maxLevel; lv++) if (hs.upgradeCost[lv] != null) costs.push(hs.upgradeCost[lv]);
      var lines = PixelFont.wrap("Upgrade costs: " + costs.join("/"), 2, 330);
      if (hs.effect) lines = lines.concat(PixelFont.wrap(hs.effect, 2, 330));
      Tooltips.drawCard(ctx, x + w - 410, y + 90, 380, hs.name, hs.desc, lines);
    }
    // scrap + UNDO/ACCEPT
    Art.panel(ctx, x + w - 410, y + 470, 190, 44, { fill: "#22211E", cut: 8 });
    Icons.drawIcon(ctx, "scrap", x + w - 400, y + 480, 24, P.selectionYellow);
    PixelFont.drawText(ctx, String(res.scrap), x + w - 360, y + 484, { scale: 3, color: P.selectionYellow });
    btn(ctx, x + 40, y + h - 60, 140, 44, T.undo, function () { Game.undoOverviewPurchases(); }, { disabled: !Game.overviewPurchases.length });
    btn(ctx, x + w - 190, y + h - 60, 150, 44, T.accept, function () { Game.closeOverview(); }, { scale: 3 });
  }

  function drawOverviewCrew(ctx, x, y, w, h) {
    var ship = Game.player;
    PixelFont.drawText(ctx, T.renameCrewNote, x + 40, y + 74, { scale: 2, color: "#57544E" });
    var hovered = null;
    var mx = Game.mouse.x, my = Game.mouse.y;
    var idx = 0;
    for (var i = 0; i < ship.crew.length; i++) {
      var c = ship.crew[i];
      if (c.isDrone) continue;
      var cx = x + 40 + (idx % 4) * 250, cy = y + 110 + Math.floor(idx / 4) * 250;
      Art.panel(ctx, cx, cy, 230, 230, { fill: c.dead ? "#3A2020" : P.uiParchmentDim, cut: 10 });
      if (!Art.drawCrewArt(ctx, c.race, cx + 71, cy + 12, 88, 88)) {
        var spr = Art.crewSprite(c.race, 0, false, false);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(spr, cx + 75, cy + 16, 80, 80);
      }
      Art.panel(ctx, cx + 20, cy + 106, 190, 34, { fill: "#22211E", cut: 6 });
      PixelFont.drawText(ctx, c.name.toUpperCase().substring(0, 12), cx + 115, cy + 114, { scale: 2, align: "center", color: "#FFF" });
      (function (crew) {
        region(cx + 20, cy + 106, 190, 34, function () { Game.beginRenameCrewLive(crew); }, null, "Click to rename.");
      })(c);
      // HP
      ctx.fillStyle = "#20242C";
      ctx.fillRect(cx + 20, cy + 148, 190, 8);
      ctx.fillStyle = P.crewBarGreen;
      ctx.fillRect(cx + 20, cy + 148, 190 * c.hp / c.maxHp, 8);
      (function (crew) {
        btn(ctx, cx + 50, cy + 170, 130, 36, T.dismiss, function () {
          Game.confirm(T.dismissConfirm.replace("NAME", crew.name), function () { Game.dismissCrew(crew); });
        }, { disabled: ship.crew.length <= 1 });
      })(c);
      if (mx >= cx && mx < cx + 230 && my >= cy && my < cy + 230) hovered = c;
      idx++;
    }
    // right rail: race card + skills
    var railX = x + w - 430;
    if (hovered) {
      var rdef = GAME_DATA.races[hovered.race];
      Tooltips.drawCard(ctx, railX, y + 90, 400, hovered.name + " (" + rdef.name + ")", rdef.special, null);
      // CREW SKILLS card
      Art.panel(ctx, railX, y + 240, 400, 420, { fill: P.uiTooltipMauve, cut: 10 });
      PixelFont.drawText(ctx, T.crewSkills, railX + 20, y + 254, { scale: 3, color: "#FFF" });
      var skills = ["piloting", "engines", "shields", "weapons", "repair", "combat"];
      for (var s = 0; s < skills.length; s++) {
        var sk = skills[s];
        var sdef = GAME_DATA.skills[sk];
        var sy = y + 300 + s * 60;
        Icons.drawIcon(ctx, sk === "repair" ? "wrench" : sk === "combat" ? "crew" : sk === "piloting" ? "piloting" : sk, railX + 16, sy, 26, "#FFF");
        PixelFont.drawText(ctx, sdef.name, railX + 56, sy, { scale: 2, color: "#FFF" });
        var lvl = hovered.skillLevel(sk);
        var per = sdef.xpPerLevel * (hovered.race === "human" ? 0.9 : 1);
        var xp = hovered.skills[sk] || 0;
        ctx.fillStyle = "#20242C";
        ctx.fillRect(railX + 56, sy + 22, 240, 10);
        ctx.fillStyle = lvl >= 2 ? P.selectionYellow : P.crewBarGreen;
        ctx.fillRect(railX + 56, sy + 22, 240 * Math.min(1, xp / (per * 2)), 10);
        // level notches
        ctx.fillStyle = "#FFF";
        ctx.fillRect(railX + 56 + 120, sy + 20, 2, 14);
        PixelFont.drawText(ctx, sdef.bonusText[Math.max(0, lvl)], railX + 310, sy + 18, { scale: 1, color: Art.ROLE.mauve.sub });
      }
    }
    btn(ctx, x + w - 190, y + h - 60, 150, 44, T.accept, function () { Game.closeOverview(); }, { scale: 3 });
  }

  function drawOverviewInventory(ctx, x, y, w, h) {
    var ship = Game.player;
    var mx = Game.mouse.x, my = Game.mouse.y;
    var hoveredItem = null;
    // WEAPONS well
    Art.darkWell(ctx, x + 30, y + 90, w - 470, 160);
    PixelFont.drawText(ctx, T.weapons, x + 50, y + 100, { scale: 3, color: "#FFF" });
    for (var i = 0; i < ship.weaponSlots; i++) {
      var wx = x + 50 + i * 250, wy = y + 130;
      var slot = ship.weapons[i];
      Art.panel(ctx, wx, wy, 236, 100, { fill: slot ? P.uiTooltipMauve : "#1A1A18", cut: 8 });
      if (slot) {
        Art.drawWeaponArt(ctx, slot.id, wx + 156, wy + 6, 72, 50);
        PixelFont.drawText(ctx, slot.def.name.substring(0, 13), wx + 10, wy + 10, { scale: 2, color: "#FFF" });
        PixelFont.drawText(ctx, slot.powered ? "POWERED" : "UNPOWERED", wx + 10, wy + 36, { scale: 2, color: slot.powered ? Art.ROLE.mauve.good : Art.ROLE.mauve.sub });
        (function (idx, s) {
          btn(ctx, wx + 10, wy + 60, 108, 30, s.powered ? "OFF" : "ON", function () {
            if (s.powered) Sim.Combat.depowerWeapon(ship, s, true);
            else Sim.Combat.powerWeapon(ship, s);
          }, { scale: 1 });
          btn(ctx, wx + 126, wy + 60, 100, 30, "TO CARGO", function () { Game.unequipWeapon(idx); }, { scale: 1, disabled: ship.cargo.length >= 4 });
          if (idx > 0) {
            btn(ctx, wx - 14, wy + 34, 24, 30, "<", function () { Game.swapWeapons(idx, idx - 1); }, { scale: 1 });
          }
        })(i, slot);
        if (mx >= wx && mx < wx + 236 && my >= wy && my < wy + 100) hoveredItem = { def: slot.def, kind: "weapon" };
      }
    }
    // DRONES well
    Art.darkWell(ctx, x + 30, y + 270, w - 470, 150);
    PixelFont.drawText(ctx, T.drones, x + 50, y + 280, { scale: 3, color: "#FFF" });
    if (ship.sys("droneCtrl")) {
      for (var d = 0; d < ship.droneSlots; d++) {
        var dx = x + 50 + d * 250, dy = y + 312;
        var dslot = ship.drones[d];
        Art.panel(ctx, dx, dy, 236, 90, { fill: dslot ? P.uiTooltipMauve : "#1A1A18", cut: 8 });
        if (dslot) {
          PixelFont.drawText(ctx, dslot.def.name.substring(0, 16), dx + 10, dy + 10, { scale: 2, color: "#FFF" });
          (function (idx) {
            btn(ctx, dx + 10, dy + 50, 120, 30, "TO CARGO", function () { Game.unequipDrone(idx); }, { scale: 1, disabled: ship.cargo.length >= 4 });
          })(d);
          if (mx >= dx && mx < dx + 236 && my >= dy && my < dy + 90) hoveredItem = { def: dslot.def, kind: "drone" };
        }
      }
    } else {
      PixelFont.drawText(ctx, "SYSTEM NOT INSTALLED", x + (w - 440) / 2, y + 340, { scale: 3, align: "center", color: Art.ROLE.dark.sub });
    }
    // CARGO well
    Art.darkWell(ctx, x + 30, y + 440, w - 470, 150);
    PixelFont.drawText(ctx, T.cargo, x + 50, y + 450, { scale: 3, color: "#FFF" });
    for (var cg = 0; cg < 4; cg++) {
      var cgx = x + 50 + cg * 250, cgy = y + 482;
      var item = ship.cargo[cg];
      Art.panel(ctx, cgx, cgy, 236, 90, { fill: item ? P.uiTooltipMauve : "#1A1A18", cut: 8 });
      if (item) {
        var idef = item.type === "weapon" ? GAME_DATA.weaponById[item.id] : GAME_DATA.droneById[item.id];
        if (item.type === "weapon") Art.drawWeaponArt(ctx, item.id, cgx + 156, cgy + 6, 72, 46);
        PixelFont.drawText(ctx, idef.name.substring(0, 13), cgx + 10, cgy + 10, { scale: 2, color: "#FFF" });
        (function (idx, it) {
          btn(ctx, cgx + 10, cgy + 50, 120, 30, "EQUIP", function () { Game.equipFromCargo(idx); }, { scale: 1 });
        })(cg, item);
        if (mx >= cgx && mx < cgx + 236 && my >= cgy && my < cgy + 90) hoveredItem = { def: idef, kind: item.type };
      }
    }
    // AUGMENTATIONS well
    Art.darkWell(ctx, x + 30, y + 610, w - 470, 170);
    PixelFont.drawText(ctx, T.augmentations, x + 50, y + 620, { scale: 3, color: "#FFF" });
    for (var a = 0; a < 3; a++) {
      var aid = ship.augments[a];
      var ay = y + 652 + a * 40;
      Art.panel(ctx, x + 50, ay, w - 520, 34, { fill: aid ? P.uiTooltipMauve : "#1A1A18", cut: 6 });
      if (aid) {
        var adef2 = GAME_DATA.augmentById[aid];
        PixelFont.drawText(ctx, adef2.name, x + 66, ay + 8, { scale: 2, color: "#FFF" });
        if (mx >= x + 50 && mx < x + w - 470 && my >= ay && my < ay + 34) hoveredItem = { def: { name: adef2.name, flavor: adef2.effect }, kind: "augment" };
      }
    }
    // right rail: stat card + tip
    if (hoveredItem) {
      var lines2 = hoveredItem.kind === "weapon" ? Tooltips.weaponStats(hoveredItem.def) : null;
      var flavor = hoveredItem.def.flavor || hoveredItem.def.desc || "";
      var used = Tooltips.drawCard(ctx, x + w - 420, y + 90, 390, hoveredItem.def.name, flavor, lines2);
      var tipText = hoveredItem.kind === "weapon" ? Tooltips.tipForClass(hoveredItem.def.cls)
        : hoveredItem.kind === "drone" ? T.tipDrone : T.tipAugment;
      if (tipText) Tooltips.drawTipCard(ctx, x + w - 420, y + 100 + used, 390, T.tip + ": " + tipText);
    }
    btn(ctx, x + w - 190, y + h - 60, 150, 44, T.accept, function () { Game.closeOverview(); }, { scale: 3 });
  }

  // ==========================================================================
  // PAUSE MENU (§2.11)
  // ==========================================================================
  function drawPauseMenu(ctx, W, H) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, W, H);
    var x = W / 2 - 440, y = 160;
    var items = [
      [T.continueBtn, function () { Game.pauseMenu = false; }],
      [T.menu, function () { Game.saveAndExitToMenu(); }],
      [T.hangar, function () { Game.confirm(T.abandonRun, function () { Game.abandonToHangar(); }); }],
      [T.restart, function () { Game.confirm(T.abandonRun, function () { Game.restartRun(); }); }],
      [T.options, function () { Game.state = "options"; Game.optionsReturn = "flight"; }],
      [T.controls, function () { Game.showControls = true; }],
      [T.saveQuit, function () { Game.saveAndExitToMenu(true); }]
    ];
    for (var i = 0; i < items.length; i++) {
      btn(ctx, x, y + i * 64, 340, 52, items[i][0], items[i][1], { scale: 3 });
    }
    // info plates
    Art.panel(ctx, x + 370, y, 500, 52, { fill: P.uiParchment, cut: 10 });
    PixelFont.drawText(ctx, T.difficultyLabel + ": " + Game.run.difficulty, x + 390, y + 16, { scale: 2, color: "#20201E" });
    Art.panel(ctx, x + 370, y + 64, 500, 52, { fill: P.uiParchment, cut: 10 });
    PixelFont.drawText(ctx, T.advancedLabel + ": " + T.disabled, x + 390, y + 80, { scale: 2, color: "#20201E" });
    // ship achievements
    Art.panel(ctx, x + 370, y + 140, 500, 210, { fill: P.uiParchment, cut: 10 });
    PixelFont.drawText(ctx, T.currentShipAch, x + 390, y + 152, { scale: 2, color: "#20201E" });
    var fam = Game.run.shipFamily;
    var shipAch = GAME_DATA.shipAchievements[fam] || [];
    for (var a = 0; a < shipAch.length; a++) {
      var earned = Game.profile.achievements[shipAch[a].id];
      var ax = x + 390 + a * 130;
      Art.panel(ctx, ax, y + 185, 120, 100, { fill: earned ? P.selectionYellow : "#D9D5D4", cut: 8 });
      Icons.drawIcon(ctx, earned ? "star" : "lock", ax + 45, y + 210, 30, "#20201E");
      region(ax, y + 185, 120, 100, null, null, shipAch[a].name + ": " + shipAch[a].req);
    }
    Art.button(ctx, x + 770, y + 300, 60, 44, "", {});
    Icons.drawIcon(ctx, "trophy", x + 786, y + 308, 28, "#20201E");
    region(x + 770, y + 300, 60, 44, function () { Game.pauseMenu = false; Game.state = "stats"; Game.statsReturn = "flight"; });
    if (Game.showControls) drawControls(ctx, W, H);
    drawHitTips(ctx, W, H);
  }

  function drawControls(ctx, W, H) {
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(0, 0, W, H);
    var w = 800, x = (W - w) / 2, y = 100;
    Art.panel(ctx, x, y, w, H - 220, { fill: P.uiParchment, cut: 16 });
    PixelFont.drawText(ctx, T.controls, x + w / 2, y + 20, { scale: 4, align: "center", color: "#20201E" });
    var rows = [
      ["SPACE", "Pause / unpause"], ["ESC", "Close menu / pause menu"],
      ["1-4", "Arm weapon (then click enemy room)"], ["SHIFT+1-4", "Toggle weapon power"],
      ["5-8", "Toggle drone power"], ["A", "Toggle auto-fire"],
      ["M / TAB", "Beacon map"], ["J", "Beacon map / jump"],
      ["U", "Ship overview: Systems"], ["C", "Crew tab"], ["I", "Inventory tab"],
      ["O", "Open all doors (SHIFT+O incl. airlocks)"], ["D", "Close all doors"],
      ["R", "Return crew to stations"], ["SHIFT+R", "Save crew stations"], ["F", "Fullscreen"]
    ];
    for (var i = 0; i < rows.length; i++) {
      var ry = y + 70 + i * 38;
      PixelFont.drawText(ctx, rows[i][0], x + 60, ry, { scale: 2, color: "#8A3324" });
      PixelFont.drawText(ctx, rows[i][1], x + 280, ry, { scale: 2, color: "#20201E" });
    }
    btn(ctx, x + w / 2 - 70, y + H - 220 - 64, 140, 44, T.done, function () { Game.showControls = false; });
  }

  // ==========================================================================
  // GAME OVER / VICTORY (§2.12, §2.13)
  // ==========================================================================
  function drawGameOver(ctx, W, H, t, victory) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, W, H);
    var w = 900, h = 480, x = (W - w) / 2, y = (H - h) / 2;
    Art.panel(ctx, x, y, w, h, { fill: P.uiParchment, cut: 20 });
    var head = victory ? T.victoryHead : T.voyageOver;
    var headLines = PixelFont.wrap(head, 3, w - 80);
    var cy = y + 40;
    for (var i = 0; i < headLines.length; i++) {
      PixelFont.drawText(ctx, headLines[i], x + w / 2, cy, { scale: 3, align: "center", color: victory ? "#2A6E2A" : "#8A3324" });
      cy += 40;
    }
    if (!victory && Game.defeatReason) {
      PixelFont.drawText(ctx, Game.defeatReason, x + w / 2, cy + 4, { scale: 2, align: "center", color: "#57544E" });
      cy += 34;
    }
    PixelFont.drawText(ctx, T.score + ":", x + w / 2, cy + 20, { scale: 3, align: "center", color: "#20201E" });
    PixelFont.drawText(ctx, String(Game.finalScore || 0), x + w / 2, cy + 60, { scale: 6, align: "center", color: "#20201E" });
    if (Game.newHighScore) {
      PixelFont.drawText(ctx, T.newHighScore, x + w / 2, cy + 124, { scale: 2, align: "center", color: Art.ROLE.light.accent });
    }
    var by = y + h - 70;
    btn(ctx, x + 30, by, 150, 46, T.stats, function () { Game.state = "stats"; Game.statsReturn = victory ? "victory" : "gameover"; });
    btn(ctx, x + 200, by, 160, 46, T.restart, function () { Game.restartRun(); });
    btn(ctx, x + 380, by, 160, 46, T.hangar, function () { Game.abandonToHangar(); });
    btn(ctx, x + 560, by, 140, 46, T.menu, function () { Game.toMenuFromEnd(); });
    btn(ctx, x + 720, by, 140, 46, T.quit, function () { window.close(); Game.quitAttempted = true; });
    drawHitTips(ctx, W, H);
  }

  // ==========================================================================
  // STATS & ACHIEVEMENTS (§2.14)
  // ==========================================================================
  var statsTab = "achievements";
  function drawStats(ctx, W, H, t) {
    hit = [];
    Art.background(ctx, 77, "menu", W, H, t);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, W, H);
    var w = 1500, h = 900, x = (W - w) / 2, y = (H - h) / 2;
    Art.panel(ctx, x, y, w, h, { fill: P.uiParchment, cut: 22 });
    btn(ctx, x + 30, y + 16, 220, 44, T.highScores, function () { statsTab = "scores"; }, { selected: statsTab === "scores" });
    btn(ctx, x + 260, y + 16, 160, 44, T.stats, function () { statsTab = "stats"; }, { selected: statsTab === "stats" });
    btn(ctx, x + 430, y + 16, 260, 44, T.achievements, function () { statsTab = "achievements"; }, { selected: statsTab === "achievements" });

    var prof = Game.profile;
    if (statsTab === "scores") {
      PixelFont.drawText(ctx, T.highScores, x + w / 2, y + 84, { scale: 3, align: "center", color: "#20201E" });
      for (var i = 0; i < 10; i++) {
        var sc = prof.highScores[i];
        var ry = y + 130 + i * 64;
        Art.panel(ctx, x + 100, ry, w - 200, 54, { fill: i % 2 ? "#D9D5D4" : "#E4E9E0", cut: 8 });
        if (sc) {
          PixelFont.drawText(ctx, (i + 1) + ".", x + 120, ry + 16, { scale: 2, color: "#20201E" });
          PixelFont.drawText(ctx, sc.ship, x + 180, ry + 16, { scale: 2, color: "#20201E" });
          PixelFont.drawText(ctx, T.score + " " + sc.score, x + 700, ry + 16, { scale: 2, color: "#20201E" });
          PixelFont.drawText(ctx, T.sector + " " + sc.sector, x + 1000, ry + 16, { scale: 2, color: "#20201E" });
          PixelFont.drawText(ctx, sc.difficulty, x + 1200, ry + 16, { scale: 2, color: sc.victory ? "#2A6E2A" : "#8A3324" });
        }
      }
    } else if (statsTab === "stats") {
      var rows = [
        ["Ships defeated", prof.stats.shipsDefeated || 0],
        ["Beacons explored", prof.stats.beaconsExplored || 0],
        ["Scrap collected", prof.stats.scrapCollected || 0],
        ["Crew hired", prof.stats.crewHired || 0],
        ["Games won", prof.stats.gamesWon || 0],
        ["Games lost", prof.stats.gamesLost || 0],
        ["Best score", prof.highScores[0] ? prof.highScores[0].score : 0]
      ];
      for (var r = 0; r < rows.length; r++) {
        var ry2 = y + 140 + r * 80;
        Art.panel(ctx, x + 300, ry2, 900, 64, { fill: r % 2 ? "#D9D5D4" : "#E4E9E0", cut: 8 });
        PixelFont.drawText(ctx, rows[r][0], x + 330, ry2 + 20, { scale: 3, color: "#20201E" });
        PixelFont.drawText(ctx, String(rows[r][1]), x + 1160, ry2 + 20, { scale: 3, align: "right", color: "#20201E" });
      }
    } else {
      // achievements grid: 3 rows by category
      var rowsA = ["General progress", "Going the distance", "Skill and equipment feats"];
      for (var ra = 0; ra < rowsA.length; ra++) {
        PixelFont.drawText(ctx, rowsA[ra].toUpperCase(), x + 60, y + 90 + ra * 250, { scale: 2, color: "#20201E" });
        var items = [];
        for (var ai = 0; ai < GAME_DATA.achievements.length; ai++) {
          if (GAME_DATA.achievements[ai].row === rowsA[ra]) items.push(GAME_DATA.achievements[ai]);
        }
        for (var it2 = 0; it2 < items.length; it2++) {
          var ach = items[it2];
          var earned = prof.achievements[ach.id];
          var ax = x + 60 + it2 * 175, ay = y + 120 + ra * 250;
          Art.panel(ctx, ax, ay, 160, 170, { fill: earned ? P.selectionYellow : "#D9D5D4", cut: 10 });
          Icons.drawIcon(ctx, earned ? "trophy" : "lock", ax + 60, ay + 40, 40, earned ? "#8A6A18" : "#888");
          var nameLines = PixelFont.wrap(ach.name, 1, 140);
          for (var nl = 0; nl < nameLines.length; nl++) {
            PixelFont.drawText(ctx, nameLines[nl], ax + 80, ay + 100 + nl * 14, { scale: 1, align: "center", color: "#20201E" });
          }
          region(ax, ay, 160, 170, null, null, ach.name + ": " + ach.req);
        }
      }
    }
    btn(ctx, x + w - 170, y + h - 64, 140, 46, T.done, function () {
      Game.state = Game.statsReturn === "flight" ? "flight" : Game.statsReturn || "menu";
      if (Game.statsReturn === "flight") Game.pauseMenu = true;
      Game.statsReturn = null;
    });
    drawHitTips(ctx, W, H);
  }

  // ==========================================================================
  // OPTIONS (§2.15)
  // ==========================================================================
  function drawOptions(ctx, W, H, t) {
    hit = [];
    Art.background(ctx, 55, "menu", W, H, t);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, W, H);
    var w = 1300, h = 900, x = (W - w) / 2, y = (H - h) / 2;
    Art.panel(ctx, x, y, w, h, { fill: P.uiParchment, cut: 22 });
    PixelFont.drawText(ctx, T.options, x + w / 2, y + 20, { scale: 4, align: "center", color: "#20201E" });
    var o = Game.profile.options;

    function toggleRow(cx, cy, label, key, disabled, fixedText) {
      PixelFont.drawText(ctx, label, cx, cy + 8, { scale: 2, color: disabled ? "#8A8A85" : "#20201E" });
      if (fixedText) {
        Art.button(ctx, cx + 330, cy, 130, 34, fixedText, { disabled: true, scale: 2 });
      } else {
        btn(ctx, cx + 330, cy, 100, 34, o[key] ? "ON" : "OFF", function () { o[key] = !o[key]; Save.saveProfile(); },
          { selected: !!o[key], disabled: disabled, scale: 2 });
      }
    }
    // VIDEO well
    Art.darkWell(ctx, x + 30, y + 80, 600, 350);
    PixelFont.drawText(ctx, T.video, x + 50, y + 92, { scale: 3, color: "#FFF" });
    ctx.save();
    // draw toggle labels in white over dark well: use custom rows
    var vy = y + 140;
    function darkToggle(label, key, fixedText, disabled) {
      PixelFont.drawText(ctx, label, x + 50, vy + 8, { scale: 2, color: "#FFF" });
      if (fixedText) Art.button(ctx, x + 400, vy, 170, 34, fixedText, { disabled: true, scale: 2 });
      else btn(ctx, x + 400, vy, 100, 34, o[key] ? "ON" : "OFF", function () { o[key] = !o[key]; Save.saveProfile(); if (key === "fullscreen") Game.applyFullscreen(); }, { selected: !!o[key], scale: 2, disabled: disabled });
      vy += 42;
    }
    // Art style cycler (vector default; pixel/neon/painterly alternates)
    PixelFont.drawText(ctx, "Art style", x + 50, vy + 8, { scale: 2, color: "#FFF" });
    var dirs = ["vector", "pixel", "neon", "painterly"];
    var curDir = o.artDir || "vector";
    btn(ctx, x + 400, vy, 170, 34, curDir.toUpperCase(), function () {
      var next = dirs[(dirs.indexOf(curDir) + 1) % dirs.length];
      o.artDir = next;
      Game.artDir = next;
      Save.saveProfile();
    }, { scale: 2, tip: "Cycle the rendering style. VECTOR is the standard look." });
    vy += 42;
    darkToggle(T.fullscreen, "fullscreen");
    darkToggle(T.vsync, null, "ON");
    darkToggle(T.frameCap, "frameCap");
    darkToggle(T.dynamicBg, "dynamicBg");
    darkToggle(T.colorblind, "colorblind");
    darkToggle(T.language, null, T.english);
    ctx.restore();

    // GAMEPLAY well
    Art.darkWell(ctx, x + 660, y + 80, 600, 520);
    PixelFont.drawText(ctx, T.gameplay, x + 680, y + 92, { scale: 3, color: "#FFF" });
    var gy = y + 140;
    function gpToggle(label, key) {
      PixelFont.drawText(ctx, label, x + 680, gy + 8, { scale: 2, color: "#FFF" });
      btn(ctx, x + 1080, gy, 100, 34, o[key] ? "ON" : "OFF", function () { o[key] = !o[key]; Save.saveProfile(); }, { selected: !!o[key], scale: 2 });
      gy += 46;
    }
    PixelFont.drawText(ctx, T.eventDelay, x + 680, gy + 8, { scale: 2, color: "#FFF" });
    btn(ctx, x + 1000, gy, 80, 34, "NONE", function () { o.eventDelay = "none"; Save.saveProfile(); }, { selected: o.eventDelay !== "short", scale: 1 });
    btn(ctx, x + 1090, gy, 90, 34, "SHORT", function () { o.eventDelay = "short"; Save.saveProfile(); }, { selected: o.eventDelay === "short", scale: 1 });
    gy += 46;
    gpToggle(T.showPaths, "showPaths");
    gpToggle(T.achPopups, "achPopups");
    gpToggle(T.showTips, "showTips");
    PixelFont.drawText(ctx, "Auto-pause:", x + 680, gy + 8, { scale: 2, color: "#AAA" });
    gy += 40;
    gpToggle("Enemy sighted", "apEnemy");
    gpToggle("Intruders detected", "apIntruders");
    gpToggle("Hull breach", "apBreach");
    gpToggle("Fire started", "apFire");
    gpToggle("Crew member died", "apCrewDeath");

    // AUDIO well
    Art.darkWell(ctx, x + 30, y + 450, 600, 220);
    PixelFont.drawText(ctx, T.audio, x + 50, y + 462, { scale: 3, color: "#FFF" });
    function slider(cy2, label, key) {
      PixelFont.drawText(ctx, label, x + 50, cy2, { scale: 2, color: "#FFF" });
      var sx = x + 50, sw = 400, sy = cy2 + 28;
      ctx.fillStyle = "#20242C";
      ctx.fillRect(sx, sy, sw, 12);
      ctx.fillStyle = P.powerGreen;
      ctx.fillRect(sx, sy, sw * (o[key] / 100), 12);
      region(sx - 4, sy - 8, sw + 8, 28, function (shift, mx) {
        o[key] = Math.round(Math.max(0, Math.min(100, (mx - sx) / sw * 100)));
        AudioEngine.setVolumes(o.sfxVolume, o.musicVolume);
        Save.saveProfile();
        AudioEngine.play("uiClick");
      }, null, label + ": " + o[key]);
      PixelFont.drawText(ctx, String(o[key]), sx + sw + 20, sy - 4, { scale: 2, color: "#FFF" });
    }
    slider(y + 510, T.volume, "sfxVolume");
    slider(y + 580, T.musicVolume, "musicVolume");

    // DELETE PROFILE
    btn(ctx, x + 40, y + h - 70, 260, 46, T.deleteProfile, function () {
      Game.confirm("Delete ALL progress, stats and unlocks?", function () {
        Game.confirm("Are you absolutely sure?", function () { Save.deleteProfile(); });
      });
    });
    btn(ctx, x + w - 180, y + h - 70, 150, 46, T.done, function () {
      Save.saveProfile();
      if (Game.optionsReturn === "flight") { Game.state = "flight"; Game.pauseMenu = true; }
      else Game.state = "menu";
    }, { scale: 3 });
    drawHitTips(ctx, W, H);
  }

  // ==========================================================================
  // STYLE GUIDE (debug/review): every surface, text role, and component state
  // on one canvas. Reached via Game.state = "styleguide".
  // ==========================================================================
  function drawStyleGuide(ctx, W, H, t) {
    hit = [];
    var R = Art.ROLE;
    ctx.fillStyle = P.spaceBlack;
    ctx.fillRect(0, 0, W, H);
    PixelFont.drawText(ctx, "STARFALL COMPONENT KIT", 30, 20, { scale: 4, color: "#FFF", outline: P.outlineDark });

    // --- surfaces with their text roles ---
    var surf = [
      { name: "PARCHMENT", fill: P.uiParchment, roles: R.light },
      { name: "PARCHMENT DIM", fill: P.uiParchmentDim, roles: R.light },
      { name: "DARK WELL", fill: P.uiPanelDarkWell, roles: R.dark },
      { name: "HUD PLATE", fill: "#22211E", roles: R.dark },
      { name: "MAUVE CARD", fill: P.uiTooltipMauve, roles: R.mauve }
    ];
    for (var s = 0; s < surf.length; s++) {
      var sx = 30 + s * 372, sy = 80;
      Art.panel(ctx, sx, sy, 352, 260, { fill: surf[s].fill, cut: 12 });
      var roles = surf[s].roles;
      var yy = sy + 18;
      PixelFont.drawText(ctx, surf[s].name, sx + 16, yy, { scale: 2, color: roles.ink || roles.text }); yy += 34;
      var entries = [["ink/text", roles.ink || roles.text], ["sub", roles.sub], ["accent", roles.accent],
        ["good", roles.good], ["warn", roles.warn], ["blue", roles.blue], ["disabled", roles.disabled]];
      for (var e = 0; e < entries.length; e++) {
        if (!entries[e][1]) continue;
        PixelFont.drawText(ctx, entries[e][0] + ": The quick engineer 0123", sx + 16, yy, { scale: 2, color: entries[e][1] });
        yy += 28;
      }
    }

    // --- buttons in all states ---
    PixelFont.drawText(ctx, "BUTTONS", 30, 366, { scale: 2, color: "#FFF" });
    Art.button(ctx, 30, 392, 170, 44, "NORMAL", {});
    Art.button(ctx, 214, 392, 170, 44, "HOVER", { hover: true });
    Art.button(ctx, 398, 392, 170, 44, "SELECTED", { selected: true });
    Art.button(ctx, 582, 392, 170, 44, "DISABLED", { disabled: true });

    // --- pips / bars / gauges ---
    PixelFont.drawText(ctx, "PIPS + BARS", 830, 366, { scale: 2, color: "#FFF" });
    Art.panel(ctx, 830, 392, 560, 44, { fill: "#22211E", cut: 8 });
    for (var hp = 0; hp < 20; hp++) {
      ctx.fillStyle = hp < 13 ? P.hullBarGreen : hp < 16 ? P.dangerRed : "#3A3934";
      ctx.fillRect(842 + hp * 15, 402, 12, 14);
    }
    for (var sp = 0; sp < 4; sp++) {
      ctx.beginPath();
      ctx.arc(1170 + sp * 26, 414, 9, 0, Math.PI * 2);
      ctx.fillStyle = sp < 2 ? P.shieldBlueBright : "#20242C";
      ctx.fill();
      ctx.strokeStyle = P.shieldBlue;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    // power column sample
    var pcx = 1300;
    for (var pb = 0; pb < 4; pb++) {
      var py2 = 428 - pb * 9;
      if (pb < 2) { ctx.fillStyle = P.powerGreen; ctx.fillRect(pcx, py2, 26, 7); }
      else if (pb === 2) { ctx.fillStyle = P.ionBlue; ctx.fillRect(pcx, py2, 26, 7); }
      else { ctx.strokeStyle = "#FFF"; ctx.lineWidth = 1; ctx.strokeRect(pcx, py2, 26, 7); }
    }

    // --- event dialogue states ---
    PixelFont.drawText(ctx, "EVENT CHOICES", 30, 462, { scale: 2, color: "#FFF" });
    Art.panel(ctx, 30, 488, 900, 210, { fill: P.uiParchment, cut: 14 });
    PixelFont.drawText(ctx, "An example event line of readable body prose sits here.", 70, 512, { scale: 2, color: R.light.ink });
    drawChoiceRow(ctx, 60, 546, 840, "1. A normal choice.", { state: "normal" });
    drawChoiceRow(ctx, 60, 580, 840, "2. A hovered choice.", { state: "hover" });
    drawChoiceRow(ctx, 60, 614, 840, "3. (Engi Crew) A blue option with a requirement.", { state: "blue" });
    drawChoiceRow(ctx, 60, 648, 840, "4. (Blue, hovered) Send your Engi to the ring.", { state: "blueHover" });

    // --- tooltip cards ---
    Tooltips.drawCard(ctx, 960, 488, 380, "Burst Laser II", "The argument settler.",
      ["Power required: 2", "Charge time: 12 seconds", "Damage: 1", "Fire chance: Low"]);
    Tooltips.drawTipCard(ctx, 1360, 488, 380, "Tip: each laser shot is blocked by a single shield layer, regardless of damage.");

    // --- icons on dark + light ---
    PixelFont.drawText(ctx, "ICONS", 30, 720, { scale: 2, color: "#FFF" });
    var iconNames = ["shields", "engines", "oxygen", "weapons", "medbay", "droneCtrl", "teleporter", "cloaking", "piloting", "sensors", "doors", "scrap", "fuel", "missiles", "droneParts", "hull", "crew", "danger", "fire", "ion"];
    Art.panel(ctx, 30, 744, 860, 60, { fill: "#22211E", cut: 8 });
    for (var ic = 0; ic < iconNames.length; ic++) Icons.drawIcon(ctx, iconNames[ic], 46 + ic * 42, 758, 30, P.powerGreen);
    Art.panel(ctx, 30, 812, 860, 60, { fill: P.uiParchment, cut: 8 });
    for (var ic2 = 0; ic2 < iconNames.length; ic2++) Icons.drawIcon(ctx, iconNames[ic2], 46 + ic2 * 42, 826, 30, "#20201E");

    // --- crew sprites ---
    PixelFont.drawText(ctx, "CREW", 930, 720, { scale: 2, color: "#FFF" });
    var races = ["human", "engi", "mantis", "rock", "zoltan", "slug", "crystal"];
    Art.panel(ctx, 930, 744, 460, 128, { fill: P.roomFloorWhite, cut: 8 });
    ctx.imageSmoothingEnabled = false;
    for (var cr = 0; cr < races.length; cr++) {
      ctx.drawImage(Art.crewSprite(races[cr], 0, false, false), 950 + cr * 62, 764, 44, 44);
      PixelFont.drawText(ctx, races[cr].substring(0, 6), 972 + cr * 62, 816, { scale: 1, align: "center", color: "#20201E" });
    }

    // --- hull sample ---
    PixelFont.drawText(ctx, "HULL", 1430, 720, { scale: 2, color: "#FFF" });
    ctx.save();
    ctx.translate(1430, 760);
    ctx.scale(0.55, 0.55);
    Art.drawHullOrSprite(ctx, "kestrel", 560, 240, "right");
    ctx.restore();

    PixelFont.drawText(ctx, "Set Game.state elsewhere to leave this screen.", 30, H - 40, { scale: 2, color: "#B9B4A9" });
  }

  // Shared event-choice row renderer: highlight bar + ink text keeps every
  // state legible on parchment. Returns row height.
  function drawChoiceRow(ctx, x, y, w, label, opts) {
    var R = Art.ROLE.light;
    var state = opts.state;
    var lines = PixelFont.wrap(label, 2, w - 30);
    var lh = PixelFont.lineHeight(2);
    var h = lines.length * lh + 10;
    var isBlue = state === "blue" || state === "blueHover";
    var hovered = state === "hover" || state === "blueHover";
    var disabled = state === "disabled";
    if (hovered) {
      ctx.fillStyle = isBlue ? "rgba(92,201,255,0.42)" : P.selectionYellow;
      ctx.fillRect(x, y - 5, w, h);
      ctx.strokeStyle = "rgba(26,26,24,0.55)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y - 5, w, h);
    }
    if (isBlue) { // blue-option identity chip
      ctx.fillStyle = P.blueOptionCyan;
      ctx.fillRect(x + 2, y - 3, 6, h - 4);
      ctx.strokeStyle = "#1A4A62";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 2, y - 3, 6, h - 4);
    }
    var color = disabled ? R.disabled : isBlue ? R.blue : R.ink;
    for (var i = 0; i < lines.length; i++) {
      PixelFont.drawText(ctx, lines[i], x + 16, y + i * lh, { scale: 2, color: color });
    }
    return h;
  }

  // ---- shared -----------------------------------------------------------
  function drawHitTips(ctx, W, H) {
    var mx = Game.mouse.x, my = Game.mouse.y;
    for (var i = hit.length - 1; i >= 0; i--) {
      if (hit[i].tip && inR(hit[i], mx, my)) {
        Tooltips.hover(ctx, mx, my, hit[i].tip, W, H);
        break;
      }
    }
  }

  function click(mx, my, shift, right) {
    for (var i = hit.length - 1; i >= 0; i--) {
      var r = hit[i];
      if (inR(r, mx, my)) {
        if (right && r.rfn) { r.rfn(mx, my); return true; }
        if (!right && r.fn) { AudioEngine.play("uiClick"); r.fn(shift, mx, my); return true; }
        if (r.fn || r.rfn) return true;
      }
    }
    return false;
  }
  function resetHit() { hit = []; }

  return {
    drawMainMenu: drawMainMenu, drawCredits: drawCredits, drawHangar: drawHangar,
    drawBeaconMap: drawBeaconMap, drawSectorSelect: drawSectorSelect,
    drawStore: drawStore, drawEventDialogue: drawEventDialogue,
    drawOverview: drawOverview, drawPauseMenu: drawPauseMenu,
    drawGameOver: drawGameOver, drawStats: drawStats, drawOptions: drawOptions,
    drawHelpOverlay: drawHelpOverlay, drawStyleGuide: drawStyleGuide,
    click: click, resetHit: resetHit,
    hangar: hangar,
    setOverviewTab: function (t2) { overviewTab = t2; }
  };
})();
