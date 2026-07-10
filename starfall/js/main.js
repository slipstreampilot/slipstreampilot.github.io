/* STARFALL - game state machine + fixed-timestep loop (§1, §19), run
   orchestration, stores, flagship, achievements, input map (§18). */
"use strict";

// Flagship pod pseudo-systems (isolated artillery pods, §15.2)
(function () {
  for (var i = 1; i <= 4; i++) {
    GAME_DATA.systems["pod" + i] = {
      name: "Artillery Pod", maxLevel: 2, mannable: false, purchase: null,
      sub: false, upgradeCost: {}, desc: "An isolated dreadnought weapon pod."
    };
  }
})();

var Game = {
  state: "menu",            // menu|hangar|flight|sectorSelect|stats|options|credits|gameover|victory
  paused: false,
  pauseMenu: false,
  autoFire: true,
  selectedCrew: [],
  armedWeapon: null,
  beamDrag: null,
  teleportArm: null,
  doorMode: false,
  mouse: { x: 0, y: 0 },
  run: null,
  player: null,
  combat: null,
  map: null,
  hazards: null,
  eventModal: null,
  mapOpen: false,
  storeOpen: false,
  overviewOpen: false,
  currentStore: null,
  storeSelected: null,
  overviewPurchases: [],
  confirmDialog: null,
  toasts: [],
  stats: {},
  runFlags: {},
  profile: null,
  time: 0,
  jumpAnim: 0,
  shake: 0,
  finalScore: 0,
  newHighScore: false,
  defeatReason: null,
  showHelp: false,
  showControls: false,
  quitAttempted: false,
  hangarPreviewShip: null,
  pendingSectorPick: null,
  statsReturn: null,
  optionsReturn: null,
  achv: null
};

(function () {
  var canvas, ctx, W = 1920, H = 1080;
  var accumulator = 0, lastTime = 0;
  var DT = 1 / 60;
  var T = GAME_DATA.text;
  var P = GAME_DATA.palette;

  // ==========================================================================
  // Boot
  // ==========================================================================
  window.addEventListener("DOMContentLoaded", boot);
  function boot() {
    canvas = document.getElementById("game");
    ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    Game.profile = Save.loadProfile();
    Game.artDir = Game.profile.options.artDir || "vector";
    AudioEngine.setVolumes(Game.profile.options.sfxVolume, Game.profile.options.musicVolume);
    resize();
    window.addEventListener("resize", resize);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    canvas.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    lastTime = performance.now();
    requestAnimationFrame(frame);
  }

  function resize() {
    var ww = window.innerWidth, wh = window.innerHeight;
    var scale = Math.min(ww / W, wh / H);
    canvas.style.width = Math.floor(W * scale) + "px";
    canvas.style.height = Math.floor(H * scale) + "px";
  }

  function canvasCoords(e) {
    var r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
  }
  function onMouseMove(e) {
    var c = canvasCoords(e);
    Game.mouse.x = c.x; Game.mouse.y = c.y;
  }
  function onWheel(e) {
    e.preventDefault();
  }

  // ==========================================================================
  // Main loop (§1.2): fixed timestep 60/s, decoupled render
  // ==========================================================================
  function frame(now) {
    var elapsed = Math.min(0.25, (now - lastTime) / 1000);
    lastTime = now;
    Game.time += elapsed;
    accumulator += elapsed;
    var simRunning = Game.state === "flight" && !Game.paused && !anyModal();
    while (accumulator >= DT) {
      accumulator -= DT;
      if (simRunning) simTick(DT);
    }
    render();
    requestAnimationFrame(frame);
  }

  function anyModal() {
    return !!(Game.eventModal || Game.mapOpen || Game.storeOpen || Game.overviewOpen ||
      Game.pauseMenu || Game.confirmDialog || Game.showControls || Game.showHelp || Game.renameInput);
  }

  // ==========================================================================
  // Simulation tick (§1.3 order)
  // ==========================================================================
  var aiSecT = 0;
  function simTick(dt) {
    var player = Game.player;
    if (!player) return;
    var enemy = Game.combat && Game.combat.enemy;
    Game.simTime = (Game.simTime || 0) + dt; // drives world animation (freezes on pause)
    FX.tick(dt);

    // 1. hazards
    if (Game.hazards) Game.hazards.tick(dt);
    // 2-4. weapons/drones/AI + projectiles + shields (combat module)
    Sim.Combat.tick(dt);
    // flagship surge
    if (enemy && enemy.isBoss && Game.combat.active) bossTick(enemy, dt);
    // 5-7. crew, oxygen, fire (ship ticks handle O2/fire; crew tick separately)
    player.tick(dt);
    if (enemy && !enemy.destroyed) enemy.tick(dt);
    var all = player.crew.concat(player.intruders);
    var i;
    for (i = 0; i < all.length; i++) if (!all[i].dead) all[i].tick(dt);
    if (enemy && !enemy.destroyed) {
      var eAll = enemy.crew.concat(enemy.intruders);
      for (i = 0; i < eAll.length; i++) if (!eAll[i].dead) eAll[i].tick(dt);
    }
    // boarder AI 1/s
    aiSecT += dt;
    if (aiSecT >= 1) {
      aiSecT = 0;
      Sim.EnemyAI.boarderTick(player);
      if (enemy && !enemy.destroyed) Sim.EnemyAI.boarderTick(enemy);
      // player boarders on enemy pursue crew automatically
      autoBoarderOrders(enemy);
      // auto-ship self repair
      selfRepairTick(player);
      if (enemy) selfRepairTick(enemy);
    }
    // 8. FTL charge
    tickFtl(dt);
    // 9. victory/defeat checks (both die -> defeat wins, §1.3)
    checkEndConditions();
    // ambience loops
    updateAudioLoops();
    if (Game.shake > 0) Game.shake -= dt;
    if (Game.jumpAnim > 0) Game.jumpAnim -= dt;
  }

  function autoBoarderOrders(enemy) {
    if (!enemy || enemy.destroyed) return;
    for (var i = 0; i < enemy.intruders.length; i++) {
      var b = enemy.intruders[i];
      if (b.dead || b.homeShip !== Game.player || b.moving) continue;
      if (b.findEnemyInRoom()) continue;
      // seek nearest enemy crew
      var target = null;
      for (var c = 0; c < enemy.crew.length; c++) {
        if (!enemy.crew[c].dead) { target = enemy.crew[c].room; break; }
      }
      if (target != null && b.room !== target && !b.orderHold) b.orderTo(target);
    }
  }
  function selfRepairTick(ship) {
    if (!ship.selfRepair && !ship.aiTakeover) return;
    ship.selfRepairT = (ship.selfRepairT || 0) + 1;
    var interval = ship.aiTakeover ? 15 : 20;
    if (ship.selfRepairT >= interval) {
      ship.selfRepairT = 0;
      for (var sid in ship.systems) {
        if (!ship.systems.hasOwnProperty(sid)) continue;
        var s = ship.systems[sid];
        var room = ship.roomOfSystem(sid);
        if (s.damage >= 1 && (!room || (room.fires.length === 0 && room.breaches.length === 0))) {
          s.damage = Math.max(0, s.damage - 1);
          break;
        }
      }
    }
  }

  function tickFtl(dt) {
    var run = Game.run;
    var player = Game.player;
    if (run.ftlCharge >= 1) return;
    if (!player.canChargeFtl()) return;
    if (!Game.combat && run.beaconResolved) {
      // safe beacon: ready after ~3s grace
      run.ftlGrace = (run.ftlGrace || 0) + dt;
      if (run.ftlGrace >= 3) {
        run.ftlCharge = 1;
        AudioEngine.play("ftlReady");
      }
      return;
    }
    var t = player.ftlChargeTime();
    var before = run.ftlCharge;
    run.ftlCharge = Math.min(1, run.ftlCharge + dt / t);
    if (before < 1 && run.ftlCharge >= 1) AudioEngine.play("ftlReady");
  }

  function updateAudioLoops() {
    var player = Game.player;
    var fires = false, breaches = false;
    for (var i = 0; i < player.rooms.length; i++) {
      if (player.rooms[i].fires.length) fires = true;
      if (player.rooms[i].breaches.length) breaches = true;
    }
    AudioEngine.setLoop("fire", fires);
    AudioEngine.setLoop("breach", breaches);
    var avgO2 = 0;
    for (var r = 0; r < player.rooms.length; r++) avgO2 += player.rooms[r].o2;
    avgO2 /= player.rooms.length;
    AudioEngine.setLoop("alarm", player.hull <= 10 || avgO2 < 25);
    AudioEngine.setCombat(!!(Game.combat && Game.combat.active));
  }

  function checkEndConditions() {
    var player = Game.player;
    var enc = Game.combat;
    // player defeat has priority (§1.3 step 9)
    var aliveCrew = 0;
    for (var i = 0; i < player.crew.length; i++) if (!player.crew[i].dead && !player.crew[i].isDrone) aliveCrew++;
    if (player.hull <= 0 || player.destroyed) return endRun(false, "The hull gave way. The ship is gone.");
    if (aliveCrew === 0) return endRun(false, "With no one left alive at the helm, the ship drifts forever.");
    if (enc && enc.active && enc.enemy.destroyed) {
      onEnemyDestroyed(enc);
    }
    if (enc && enc.active && !enc.enemy.automated && !enc.enemy.destroyed) {
      var eCrew = 0;
      for (var c = 0; c < enc.enemy.crew.length; c++) if (!enc.enemy.crew[c].dead && !enc.enemy.crew[c].isDrone) eCrew++;
      if (eCrew === 0 && enc.enemy.intruders.filter(function (x) { return !x.dead && x.homeShip === enc.enemy; }).length === 0) {
        if (enc.enemy.isBoss) {
          if (!enc.enemy.aiTakeover) {
            enc.enemy.aiTakeover = true;
            enc.enemy.aiEvasionOverride = enc.enemy.bossPhaseData.evasion.ai;
            enc.enemyAI.surrenderChecked = true;
            toast(T.flagshipAI);
          }
        } else {
          onEnemyCrewWiped(enc);
        }
      }
    }
  }

  // ==========================================================================
  // Render
  // ==========================================================================
  function screenLabel() {
    var s = Game.state;
    if (s !== "flight") return s;
    if (Game.eventModal) return Game.eventModal.isSurrender ? "flight.surrender" : "flight.event";
    if (Game.storeOpen) return "flight.store";
    if (Game.overviewOpen) return "flight.overview";
    if (Game.mapOpen) return "flight.map";
    if (Game.pauseMenu) return Game.showControls ? "flight.controls" : "flight.pauseMenu";
    if (Game.combat) return "flight.combat";
    return "flight";
  }

  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var t = Game.time;
    window.SF_SCREEN = screenLabel();
    if (Game.shake > 0) {
      ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
    }
    switch (Game.state) {
      case "menu": Screens.drawMainMenu(ctx, W, H, t); break;
      case "credits": Screens.drawCredits(ctx, W, H, t); break;
      case "hangar": Screens.drawHangar(ctx, W, H, t); break;
      case "stats": Screens.drawStats(ctx, W, H, t); break;
      case "options": Screens.drawOptions(ctx, W, H, t); break;
      case "sectorSelect": Screens.drawSectorSelect(ctx, W, H, t); break;
      case "styleguide": Screens.drawStyleGuide(ctx, W, H, t); break;
      case "flight":
      case "gameover":
      case "victory":
        renderFlight(t);
        break;
    }
    // confirm dialog & toasts on top of everything
    if (Game.confirmDialog) drawConfirm();
    drawToasts();
    // jump flash
    if (Game.jumpAnim > 0) Art.jumpFlash(ctx, W, H, 1 - Game.jumpAnim / 0.4);
  }

  // World layers for art-direction pipelines (pixel mode renders low-res)
  var worldLayers = [null, null];
  function getWorldLayer(i, w, h) {
    var c = worldLayers[i];
    if (!c || c.width !== w || c.height !== h) {
      c = document.createElement("canvas");
      c.width = w; c.height = h;
      worldLayers[i] = c;
    }
    return c;
  }

  function renderFlight(t) {
    var dir = Game.artDir || "vector";
    // background by beacon
    var beacon = Game.map ? Game.map.currentBeacon() : null;
    var kind = "space";
    if (Game.hazards) {
      if (Game.hazards.type === "nebula") kind = "nebula";
      else if (Game.hazards.type === "sun") kind = "sun";
      else if (Game.hazards.type === "asteroid") kind = "asteroid";
      else if (Game.hazards.type === "ionStorm") kind = "ionStorm";
    }
    var seed = Game.run.runSeed + (Game.run.currentBeaconId + 1) * 131 + Game.run.sectorNumber * 17;

    if (dir === "pixel") {
      // chunky low-res world: cached dithered background + one live world layer
      Art.backgroundPixel(ctx, seed, kind, W, H, t, 3);
      HUD.drawUnder(ctx, W, H, t);
      Art.pixelPass(ctx, W, H, "flightWorld", function (g) {
        HUD.drawWorld(g, "player", t);
        HUD.drawWorld(g, "enemy", t);
      });
    } else {
      Art.background(ctx, seed, kind, W, H, t);
      HUD.drawUnder(ctx, W, H, t);
      HUD.drawWorld(ctx, "player", t);
      HUD.drawWorld(ctx, "enemy", t);
      if (dir === "neon") Art.bloomPass(ctx, W, H, 0.42);
    }

    // red vignette at low hull
    if (Game.player.hull <= Game.player.hullMax * 0.25) {
      var pulse = 0.18 + 0.1 * Math.sin(t * 3);
      var g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
      g.addColorStop(0, "rgba(180,40,30,0)");
      g.addColorStop(1, "rgba(180,40,30," + pulse + ")");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    HUD.drawOver(ctx, W, H, t);
    // modals in priority order (eased open: scale 0.94 -> 1 over ~160ms, §6)
    var mf = Math.min(1, (t - (Game.modalOpenedAt != null ? Game.modalOpenedAt : -9)) / 0.16);
    var ms = 0.94 + 0.06 * (1 - Math.pow(1 - mf, 3));
    var modalUp = Game.storeOpen || Game.overviewOpen || Game.mapOpen || Game.eventModal;
    window.SF_TRANSIENT = !!(modalUp && ms < 1);
    if (modalUp && ms < 1) {
      ctx.save();
      ctx.translate(W / 2 * (1 - ms), H / 2 * (1 - ms));
      ctx.scale(ms, ms);
    }
    if (Game.storeOpen) Screens.drawStore(ctx, W, H, t);
    else if (Game.overviewOpen) Screens.drawOverview(ctx, W, H, t);
    else if (Game.mapOpen) Screens.drawBeaconMap(ctx, W, H, t);
    if (Game.eventModal) Screens.drawEventDialogue(ctx, W, H, t);
    if (modalUp && ms < 1) ctx.restore();
    if (Game.pauseMenu) Screens.drawPauseMenu(ctx, W, H);
    if (Game.showHelp) Screens.drawHelpOverlay(ctx, W, H);
    if (Game.state === "gameover") Screens.drawGameOver(ctx, W, H, t, false);
    if (Game.state === "victory") Screens.drawGameOver(ctx, W, H, t, true);
    // art-direction finishing passes
    if (dir === "neon") {
      Art.scanlines(ctx, W, H, 0.05);
      Art.vignette(ctx, W, H, 0.26);
    } else if (dir === "painterly") {
      Art.grade(ctx, W, H);
      Art.grain(ctx, W, H, t, 0.05);
      Art.vignette(ctx, W, H, 0.3);
    } else if (dir === "pixel") {
      Art.vignette(ctx, W, H, 0.18);
    }
    // hit flash
    if (Game.player.hitFlash > 0) {
      ctx.fillStyle = "rgba(255,255,255," + Game.player.hitFlash * 6 + ")";
      ctx.fillRect(0, 0, W, H);
      Game.player.hitFlash -= 1 / 60;
    }
    // pause dim (§16.6)
    if (Game.paused && !anyModal() && !Game.hidePauseBanner) {
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.fillRect(0, 0, W, H);
    }
  }

  function drawConfirm() {
    var d = Game.confirmDialog;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, W, H);
    var w = 700, lines = PixelFont.wrap(d.text, 2, w - 80);
    var h = 140 + lines.length * 22;
    var x = (W - w) / 2, y = (H - h) / 2;
    Art.panel(ctx, x, y, w, h, { fill: P.uiParchment, cut: 14 });
    for (var i = 0; i < lines.length; i++) {
      PixelFont.drawText(ctx, lines[i], x + w / 2, y + 30 + i * 22, { scale: 2, align: "center", color: "#20201E" });
    }
    var mx = Game.mouse.x, my = Game.mouse.y;
    var yesHover = mx > x + 120 && mx < x + 280 && my > y + h - 70 && my < y + h - 26;
    var noHover = mx > x + w - 280 && mx < x + w - 120 && my > y + h - 70 && my < y + h - 26;
    Art.button(ctx, x + 120, y + h - 70, 160, 44, T.yes, { hover: yesHover });
    Art.button(ctx, x + w - 280, y + h - 70, 160, 44, T.no, { hover: noHover });
    d.yesR = { x: x + 120, y: y + h - 70, w: 160, h: 44 };
    d.noR = { x: x + w - 280, y: y + h - 70, w: 160, h: 44 };
  }

  function drawToasts() {
    // hold toasts (no draw, no countdown) while a modal owns the screen
    if (anyModal() && Game.state === "flight") return;
    for (var i = Game.toasts.length - 1; i >= 0; i--) {
      var to = Game.toasts[i];
      to.t -= 1 / 60;
      if (to.t <= 0) { Game.toasts.splice(i, 1); continue; }
      var y = H - 300 - i * 60;
      Art.panel(ctx, 20, y, Math.max(300, PixelFont.textWidth(to.text, 2) + 60), 46, { fill: "#22211E", cut: 10 });
      if (to.icon) Icons.drawIcon(ctx, to.icon, 30, y + 10, 26, P.selectionYellow);
      PixelFont.drawText(ctx, to.text, to.icon ? 66 : 36, y + 14, { scale: 2, color: "#FFF" });
    }
  }
  function toast(text, icon) {
    // ellipsize on a word boundary; a mid-word hard clip reads as a bug
    var max = 84;
    if (text.length > max) {
      var cutAt = text.lastIndexOf(" ", max);
      text = text.substring(0, cutAt > 40 ? cutAt : max) + "...";
    }
    Game.toasts.unshift({ text: text, icon: icon, t: 4 });
    if (Game.toasts.length > 4) Game.toasts.pop();
  }
  Game.toast = toast;

  // ==========================================================================
  // Input
  // ==========================================================================
  function onMouseDown(e) {
    AudioEngine.unlock();
    var c = canvasCoords(e);
    Game.mouse.x = c.x; Game.mouse.y = c.y;
    var right = e.button === 2;
    if (right) e.preventDefault();
    // confirm dialog eats input
    if (Game.confirmDialog) {
      var d = Game.confirmDialog;
      if (ptIn(d.yesR, c)) { Game.confirmDialog = null; AudioEngine.play("uiClick"); d.fn(); }
      else if (ptIn(d.noR, c)) { Game.confirmDialog = null; AudioEngine.play("uiClick"); }
      return;
    }
    if (Game.state === "flight" || Game.state === "gameover" || Game.state === "victory") {
      // modal screens first
      if (Game.state !== "flight" || Game.eventModal || Game.mapOpen || Game.storeOpen || Game.overviewOpen || Game.pauseMenu || Game.showHelp) {
        Screens.click(c.x, c.y, e.shiftKey, right);
        return;
      }
      HUD.click(c.x, c.y, e.shiftKey, right);
    } else {
      Screens.click(c.x, c.y, e.shiftKey, right);
    }
  }
  function ptIn(r, c) { return r && c.x >= r.x && c.x < r.x + r.w && c.y >= r.y && c.y < r.y + r.h; }

  function onKeyDown(e) {
    AudioEngine.unlock();
    if (Game.renameInput) return; // typing in DOM field
    var k = e.key;
    if (Game.state !== "flight") {
      if (k === "Escape") {
        if (Game.state === "options") { Save.saveProfile(); Game.state = Game.optionsReturn === "flight" ? "flight" : "menu"; if (Game.optionsReturn === "flight") Game.pauseMenu = true; }
        else if (Game.state === "stats" || Game.state === "credits") Game.state = Game.statsReturn === "flight" ? "flight" : "menu";
      }
      if (k === "f" || k === "F") Game.applyFullscreen(true);
      return;
    }
    // flight keys (§18)
    if (k === " ") {
      e.preventDefault();
      if (!anyModal()) { Game.paused = !Game.paused; }
      return;
    }
    if (k === "Escape") {
      if (Game.eventModal) return; // events must be answered
      if (Game.confirmDialog) { Game.confirmDialog = null; return; }
      if (Game.showControls) { Game.showControls = false; return; }
      if (Game.storeOpen) { Game.closeStore(); return; }
      if (Game.overviewOpen) { Game.closeOverview(); return; }
      if (Game.mapOpen) { Game.closeMap(); return; }
      if (Game.showHelp) { Game.showHelp = false; return; }
      Game.pauseMenu = !Game.pauseMenu;
      return;
    }
    if (anyModal() && !Game.mapOpen) return;
    var num = parseInt(k, 10);
    if (num >= 1 && num <= 4) {
      var idx = num - 1;
      if (e.shiftKey) {
        var slot = Game.player.weapons[idx];
        if (slot) {
          if (slot.powered) Sim.Combat.depowerWeapon(Game.player, slot, true);
          else Sim.Combat.powerWeapon(Game.player, slot);
        }
      } else Game.clickWeaponSlot(idx);
      return;
    }
    if (num >= 5 && num <= 8) { Game.toggleDrone(num - 5); return; }
    switch (k.toLowerCase()) {
      case "a": Game.autoFire = !Game.autoFire; AudioEngine.play("uiClick"); break;
      case "m": Game.mapOpen ? Game.closeMap() : Game.openMap(); break;
      case "j":
        if (!Game.mapOpen) Game.openMap();
        else if ((Game.run.ftlCharge >= 1 || (Game.run.cheats && Game.run.cheats.teleport)) && Game.map.selectedBeacon != null) Game.jumpToSelected();
        break;
      case "u": Game.openOverview("systems"); break;
      case "c": Game.openOverview("crew"); break;
      case "i": Game.openOverview("inventory"); break;
      case "o": Game.player.setAllDoors(true, e.shiftKey); break;
      case "d": Game.player.setAllDoors(false, true); break;
      case "r":
        if (e.shiftKey) Game.saveStations();
        else Game.returnToStations();
        break;
      case "f": Game.applyFullscreen(true); break;
      case "tab": e.preventDefault(); Game.mapOpen ? Game.closeMap() : Game.openMap(); break;
    }
  }

  // ==========================================================================
  // Ship construction
  // ==========================================================================
  Game.buildPlayerShip = function (def, crewNames) {
    var ship = new Sim.Ship({
      isPlayer: true, def: def, name: def.name, cls: def.cls,
      hullStyle: def.hullStyle, hullMax: 30, reactor: def.reactor,
      layout: def.layout, systems: def.systems,
      droneSlots: def.droneSlots || 3, noAirlocks: def.noAirlocks
    });
    ship.firstShieldUpgrade100 = !!def.firstShieldUpgrade100;
    ship.teleporterPads = def.teleporterPads || 2;
    // crew in system rooms
    var stations = ["piloting", "engines", "weapons", "shields", "medbay", "oxygen", "sensors", "doors"];
    for (var i = 0; i < def.crew.length; i++) {
      var c = new Sim.Crew(def.crew[i], (crewNames && crewNames[i]) || RNG.vol.pick(GAME_DATA.crewNames), ship);
      var room = ship.roomOfSystem(stations[i % stations.length]) || ship.rooms[i % ship.rooms.length];
      ship.addCrew(c, room.id);
    }
    // weapons
    for (var w = 0; w < def.weapons.length; w++) ship.weapons.push(new Sim.Combat.WeaponSlot(def.weapons[w], ship));
    // drones
    for (var d = 0; d < def.drones.length; d++) ship.drones.push(new Sim.Combat.DroneSlot(def.drones[d], ship));
    // augments
    ship.augments = def.augments.slice();
    // initial power allocation
    autoPower(ship);
    if (ship.hasAugment("zoltan_shield")) { ship.zoltanShield = 5; ship.zoltanShieldMax = 5; }
    return ship;
  };

  function autoPower(ship) {
    var prio = ["shields", "engines", "oxygen", "medbay", "weapons", "droneCtrl", "teleporter", "cloaking", "artillery"];
    var guard = 0;
    var progressing = true;
    while (progressing && guard++ < 100) {
      progressing = false;
      for (var i = 0; i < prio.length; i++) {
        if (ship.canAddPower(prio[i])) {
          // weapons/drones need only as much as their gear uses (+padding)
          ship.addPower(prio[i], true);
          progressing = true;
        }
      }
    }
    // power up weapons that fit
    for (var w = 0; w < ship.weapons.length; w++) Sim.Combat.powerWeapon(ship, ship.weapons[w]);
    ship.shieldLayers = ship.maxShieldLayers();
  }

  // ==========================================================================
  // Run lifecycle
  // ==========================================================================
  Game.toHangar = function () {
    Save.clearRun();
    Game.state = "hangar";
    Game.hangarPreviewShip = null;
  };

  Game.startRun = function (def, difficulty, shipName) {
    var seed = RNG.newRunSeed();
    RNG.run = new RngStream(seed);
    Game.stats = { scrapCollected: 0, crewLost: 0 };
    Game.runFlags = {
      killedNothing: true, noUpgrades: true, noStoreRepairs: true,
      firedMissile: false, usedDrone: false, boughtNothing: true, crewDeaths: 0
    };
    var run = {
      runSeed: seed,
      difficulty: difficulty,
      shipId: def.id,
      shipName: (shipName || def.name).substring(0, 20),
      shipFamily: def.family,
      sectorNumber: 1,
      sectorRow: 0,
      sectorTree: Sim.GameMap.generateSectorTree(RNG.run),
      resources: {
        scrap: GAME_DATA.difficulty[difficulty].startingScrap,
        fuel: def.stores.fuel, missiles: def.stores.missiles, droneParts: def.stores.droneParts
      },
      questFlags: {},
      usedEvents: {},
      scoreScrap: 0,
      beaconsVisited: 0,
      shipsDefeated: 0,
      ftlCharge: 0,
      beaconResolved: false,
      jumpsSinceFlagship: 0,
      flagship: null
    };
    Game.run = run;
    run.sectorNode = run.sectorTree[0][0];
    run.sector = { name: run.sectorNode.name, type: run.sectorNode.type };
    Game.player = Game.buildPlayerShip(def, Screens.hangar.crewNames);
    // hangar cheat toggles
    var ch = (Screens.hangar && Screens.hangar.cheats) || {};
    run.cheats = (ch.railgun || ch.scrap || ch.teleport || ch.upgraded)
      ? { railgun: !!ch.railgun, scrap: !!ch.scrap, teleport: !!ch.teleport, upgraded: !!ch.upgraded }
      : null;
    if (run.cheats) {
      var p = Game.player;
      if (run.cheats.scrap) run.resources.scrap = 15000;
      if (run.cheats.upgraded) {
        p.reactorLevel = GAME_DATA.reactorMax;
        for (var csid in p.systems) {
          if (p.systems.hasOwnProperty(csid)) p.systems[csid].level = p.systems[csid].def.maxLevel;
        }
        p.shieldLayers = p.maxShieldLayers();
      }
      if (run.cheats.railgun) {
        if (p.weapons.length >= p.weaponSlots) p.weaponSlots = p.weapons.length + 1;
        p.weapons.push(new Sim.Combat.WeaponSlot("em_railgun", p));
      }
    }
    Game.map = new Sim.MapController(run);
    Game.hazards = new Sim.Hazards();
    Game.achv = makeAchievements();
    enterSector(true);
    Game.state = "flight";
    Game.paused = false;
    AudioEngine.setSectorFlavor(run.sector.type === "nebula" ? "nebula" : run.sector.type === "hostile" ? "hostile" : "civilian");
    Save.saveRun();
  };

  function enterSector(first) {
    var run = Game.run;
    var isLast = run.sectorNumber === 8;
    var gen = Sim.GameMap.generateBeacons(run.sector.name, run.sector.type, RNG.run, isLast);
    run.beacons = gen.beacons;
    run.startId = gen.startId;
    run.exitId = gen.exitId;
    run.currentBeaconId = gen.startId;
    Game.map.fleetPos = -2.0;
    Game.map.fleetDelay = 0;
    run.ftlCharge = 0;
    run.ftlGrace = 0;
    if (isLast) setupLastStand();
    Game.map.updateVisibility();
    arriveAtBeacon(run.startId, true);
    if (run.sectorNumber >= 5) awardAchievement("sector5");
    if (run.sectorNumber >= 8) awardAchievement("sector8");
  }

  // ==========================================================================
  // Beacon arrival & events
  // ==========================================================================
  function arriveAtBeacon(beaconId, isSectorEntry) {
    var run = Game.run;
    run.currentBeaconId = beaconId;
    var beacon = run.beacons[beaconId];
    run.beaconResolved = false;
    run.ftlCharge = 0;
    run.ftlGrace = 0;
    Game.selectedCrew = [];
    Game.armedWeapon = null;
    Game.combat = null;
    Sim.Combat.reset();
    Game.currentStore = null;

    // per-beacon resets
    var player = Game.player;
    if (player.hasAugment("zoltan_shield")) { player.zoltanShield = 5; player.zoltanShieldMax = 5; }
    if (player.hasAugment("pre_igniter")) {
      for (var w = 0; w < player.weapons.length; w++) {
        if (player.weapons[w].powered) player.weapons[w].charge = 9999;
      }
    }
    // external drones lost on jump (unless recovery arm) (§8)
    for (var d = 0; d < player.drones.length; d++) {
      var slot = player.drones[d];
      if (slot.def.type !== "crew" && slot.deployed) {
        if (player.hasAugment("drone_arm")) run.resources.droneParts++;
        slot.deployed = false;
        slot.powered = false;
        slot.entity = null;
        slot.destroyed = false;
        slot.respawnT = 0;
      }
    }
    player.teleportCooldown = 0;
    player.cloakActive = 0;
    player.cloakCooldown = 0;

    // hazard
    var hz = beacon.overtaken ? "asb" : beacon.hazard;
    if (hz === "nebula" || beacon.nebula && !hz) hz = beacon.hazard === "ionStorm" ? "ionStorm" : "nebula";
    Game.hazards.set(hz === "asb" && !beacon.overtaken ? null : hz);

    if (!isSectorEntry) {
      run.beaconsVisited++;
      Game.profile.stats.beaconsExplored++;
    }

    // Last Stand: flagship & base logic
    if (run.sectorNumber === 8 && run.flagship) {
      if (beacon.isBase) {
        // Federation Base beacon
        showEventText("The Federation Base fills your viewport, its docks swarming with the last loyal ships. Hold the line: the flagship must not reach this beacon.", []);
      }
      if (run.flagship.beaconId === beaconId && run.flagship.phase <= 3) {
        startFlagshipFight();
        return;
      }
    }
    if (beacon.type === "repair" && !beacon.visited) {
      beacon.visited = true;
      player.hull = Math.min(player.hullMax, player.hull + 15);
      var sc = RNG.run.int(22, 44);
      run.resources.scrap += sc;
      run.resources.fuel += 5;
      run.resources.missiles += 4;
      run.resources.droneParts += 5;
      run.beaconResolved = true;
      showEventText("A Federation repair station takes you in. Yard crews swarm the hull while the quartermaster refills your bunkers.", ["+15 hull", "+" + sc + " scrap", "+5 fuel", "+4 missiles", "+5 drone parts"]);
      Save.saveRun();
      return;
    }

    // resolve event
    var ev = Sim.Events.pickForBeacon(beacon);
    beacon.visited = true;
    Game.map.updateVisibility();
    presentEvent(ev, beacon);
    Save.saveRun();
  }

  function presentEvent(ev, beacon) {
    var run = Game.run;
    Game.modalOpenedAt = Game.time;
    // event-level hazard
    if (ev.hazard && ev.hazard !== "none" && !beacon.overtaken) Game.hazards.set(ev.hazard);
    Game.eventModal = {
      id: ev.id,
      text: ev.text,
      choices: ev.choices,
      isResult: false,
      def: ev
    };
    if (beacon.questEvent === ev.id) beacon.questEvent = null;
    Game.paused = false;
  }

  function showEventText(text, rewards, thenFight) {
    Game.modalOpenedAt = Game.time;
    Game.eventModal = {
      text: text,
      rewards: rewards || [],
      choices: [{ label: "Continue...", outcomes: [{ weight: 100, effects: {} }] }],
      isResult: true,
      thenFight: thenFight || null
    };
  }

  Game.chooseEventOption = function (choice) {
    var modal = Game.eventModal;
    AudioEngine.play("uiClick");
    if (modal.isResult) {
      Game.eventModal = null;
      if (modal.thenFight) beginCombat(modal.thenFight);
      else if (modal.thenStore) Game.openStore();
      else if (modal.thenVictory) doVictory();
      else Game.run.beaconResolved = !Game.combat;
      if (modal.surrenderAccept) resolveSurrenderAccept();
      return;
    }
    if (modal.isSurrender) {
      Game.eventModal = null;
      if (choice.surrenderAccept) acceptSurrender();
      else refuseSurrender();
      return;
    }
    var result = Sim.Events.resolveChoice(modal.def, choice);
    // trades
    if (result.trade) applyTrade(result.trade);
    if (result.startedFight) {
      Game.eventModal = null;
      if (result.text) showEventText(result.text, result.rewards, result.fight);
      else beginCombat(result.fight);
      return;
    }
    if (result.openedStore) {
      Game.eventModal = null;
      Game.run.beaconResolved = true;
      Game.openStore();
      return;
    }
    if (result.text || (result.rewards && result.rewards.length)) {
      showEventText(result.text || "...", result.rewards);
      Game.run.beaconResolved = true;
    } else {
      Game.eventModal = null;
      Game.run.beaconResolved = true;
    }
    Save.saveRun();
  };

  function applyTrade(trade) {
    var res = Game.run.resources;
    if (trade.buy) {
      var total = trade.price * trade.qty;
      var afford = Math.min(trade.qty, Math.floor(res.scrap / trade.price));
      if (afford > 0) {
        res.scrap -= afford * trade.price;
        res[trade.buy === "fuel" ? "fuel" : trade.buy] += afford;
        AudioEngine.play("coin");
        Game.runFlags.boughtNothing = Game.runFlags.boughtNothing; // trades don't count as store purchases
      }
    } else if (trade.sell) {
      if (res[trade.sell] >= trade.qty) {
        res[trade.sell] -= trade.qty;
        res.scrap += trade.gain;
        AudioEngine.play("coin");
      }
    }
  }

  // ==========================================================================
  // Combat lifecycle
  // ==========================================================================
  function beginCombat(fight) {
    var run = Game.run;
    fight = fight || {};
    var enemy;
    if (fight.boss === "prototype") {
      enemy = buildFlagship(1, true);
    } else {
      var arch = fight.archetype;
      if (!arch) {
        var faction = GAME_DATA.sectorFactionOf[run.sector.name] || "pirate";
        var opts = [];
        for (var i = 0; i < GAME_DATA.enemyArchetypes.length; i++) {
          var a = GAME_DATA.enemyArchetypes[i];
          if (a.faction === faction && !a.elite) opts.push(a.id);
        }
        if (faction === "pirate" || run.sector.name === "Civilian Sector") opts.push("auto_scout", "pirate_scout", "pirate_fighter");
        arch = RNG.run.pick(opts.length ? opts : ["pirate_fighter"]);
      }
      enemy = Sim.generateEnemyShip(arch, run.sectorNumber, RNG.run);
    }
    Game.combat = new Sim.Combat.Encounter(enemy, {
      hazard: fight.hazard, overtaken: fight.overtaken,
      strandedReward: fight.strandedReward, questReward: fight.questReward,
      crewKillBonus: fight.crewKillBonus
    });
    if (fight.surrenderCrew) enemy.slaver = true;
    if (fight.hazard) Game.hazards.set(fight.hazard);
    if (Game.hazards.type === "ionStorm") { Game.player.ionStorm = true; enemy.ionStorm = true; }
    Game.run.beaconResolved = false;
    onAutoPause("enemyFirstSighted");
    showTip("firstCombat");
    AudioEngine.setCombat(true);
    if (Game.achv) Game.achv.onCombatStart();
  }
  Game.beginCombat = beginCombat;

  function onEnemyDestroyed(enc) {
    enc.active = false;
    var enemy = enc.enemy;
    AudioEngine.play("explosion");
    AudioEngine.setCombat(false);
    if (window.HUD) {
      var dp = HUD.shipCenterPt(enemy);
      FX.debris(dp.x, dp.y, true);
    }
    Game.shake = 0.25;
    // player crew aboard the dying ship die (§5.3)
    for (var i = enemy.intruders.length - 1; i >= 0; i--) {
      var c = enemy.intruders[i];
      if (c.homeShip === Game.player && !c.dead) c.die();
    }
    if (enemy.isBoss) { onFlagshipPhaseDown(enc); return; }
    Game.run.shipsDefeated++;
    Game.profile.stats.shipsDefeated++;
    Game.runFlags.killedNothing = false;
    if (Game.achv) Game.achv.onEnemyDestroyed(enemy);
    grantCombatReward(enc, false);
    Game.combat = null;
    Game.run.beaconResolved = true;
    Save.saveRun();
  }

  function onEnemyCrewWiped(enc) {
    enc.active = false;
    var enemy = enc.enemy;
    AudioEngine.setCombat(false);
    Game.run.shipsDefeated++;
    Game.profile.stats.shipsDefeated++;
    Game.runFlags.killedNothing = false;
    if (Game.achv) { Game.achv.onEnemyDestroyed(enemy); Game.achv.onCrewKill(enc); }
    grantCombatReward(enc, true);
    Game.combat = null;
    Game.run.beaconResolved = true;
    Save.saveRun();
  }

  function grantCombatReward(enc, crewKill) {
    var run = Game.run;
    var S = run.sectorNumber + GAME_DATA.difficulty[run.difficulty].scrapTierShift;
    var rewards = [];
    var res = run.resources;
    if (enc.overtaken || enc.strandedReward) {
      var fuelGain = res.fuel <= 0 ? 4 : 1;
      res.fuel += fuelGain;
      rewards.push("+" + fuelGain + " fuel");
      showEventText(crewKill ? "The rebel ship drifts crewless. There is no time to salvage - the fleet is all around you." :
        "The rebel ship breaks apart. Deep in occupied space there is nothing else to claim.", rewards);
      return;
    }
    var tier = crewKill ? "high" : "medium";
    var scrap = GAME_DATA.rewardTier(tier, S, RNG.run);
    var fx = { scrap: [scrap, scrap] };
    var out = Sim.Events.applyEffects(fx, null);
    rewards = rewards.concat(out.rewards);
    // extras (§12.5)
    if (RNG.run.chance(25)) { var f = RNG.run.int(1, 3); res.fuel += f; rewards.push("+" + f + " fuel"); }
    if (RNG.run.chance(15)) { var m = RNG.run.int(1, 2); res.missiles += m; rewards.push("+" + m + " missiles"); }
    if (RNG.run.chance(10)) { res.droneParts += 1; rewards.push("+1 drone part"); }
    var dropMult = crewKill ? 2 : 1;
    if (RNG.run.chance(8 * dropMult)) {
      var wid = Sim.Events.rollWeaponDrop(S);
      if (wid) { Sim.Events.giveWeapon(wid); rewards.push("+" + GAME_DATA.weaponById[wid].name); }
    } else if (RNG.run.chance(4 * dropMult)) {
      var did = Sim.Events.rollDroneDrop(S);
      if (did) { Sim.Events.giveDrone(did); rewards.push("+" + GAME_DATA.droneById[did].name); }
    } else if (RNG.run.chance(2 * dropMult)) {
      var aid = Sim.Events.rollAugmentDrop(S);
      if (aid) { Sim.Events.giveAugment(aid); rewards.push("+" + GAME_DATA.augmentById[aid].name); }
    }
    // quest rewards
    if (enc.questReward === "defector") {
      var out2 = Sim.Events.applyEffects({ gainCrew: "random", revealMap: 4 }, null);
      rewards = rewards.concat(out2.rewards);
      rewards.push("Fleet intelligence: beacons revealed");
    } else if (enc.questReward === "bounty") {
      var out3 = Sim.Events.applyEffects({ tier: "high" }, null);
      rewards = rewards.concat(out3.rewards);
    } else if (enc.questReward === "stronghold") {
      Game.map.markQuestBeacon("stronghold_3");
      rewards.push("The stronghold's prototype gantry is exposed - destination marked");
    } else if (enc.questReward === "fed_unlock") {
      Game.unlockShip("fed_a", { rewards: rewards });
      Game.run.questFlags.stronghold_done = true;
    } else if (enc.questReward === "mantis_unlock" && crewKill) {
      Game.unlockShip("mantis_a", { rewards: rewards });
    }
    var text = crewKill ?
      "The enemy ship floats silent, every station abandoned mid-task. Your boarding teams walk its corridors and take what the dead no longer need." :
      "The enemy ship blossoms into debris. Salvage drones sweep the wreck for anything the blast spared.";
    showEventText(text, rewards);
  }

  // ---- surrender (§7.10, §2.9) --------------------------------------------
  Game.onSurrenderOffer = function (offer) {
    var enc = Game.combat;
    if (!enc || !enc.active) return;
    Game.eventModal = {
      text: offer.text,
      isSurrender: true,
      choices: [
        { label: "Accept their offer.", surrenderAccept: true, outcomes: [{ weight: 100, effects: {} }] },
        { label: "Refuse.", outcomes: [{ weight: 100, effects: {} }] }
      ]
    };
  };
  function acceptSurrender() {
    var enc = Game.combat;
    if (!enc) return;
    enc.active = false;
    enc.surrendered = true;
    AudioEngine.setCombat(false);
    var offer = enc.surrenderData;
    var run = Game.run;
    var S = run.sectorNumber + GAME_DATA.difficulty[run.difficulty].scrapTierShift;
    var fx = {};
    if (offer.reward.tier) fx.tier = offer.reward.tier;
    if (offer.reward.fuel) fx.fuel = offer.reward.fuel;
    if (offer.reward.missiles) fx.missiles = offer.reward.missiles;
    if (offer.reward.gainCrew) fx.gainCrew = offer.reward.gainCrew;
    if (offer.reward.gainWeapon) fx.gainWeapon = offer.reward.gainWeapon;
    var out = Sim.Events.applyEffects(fx, null);
    showEventText("The enemy powers down its weapons and transfers the tribute. Within moments its FTL drive flares and it is gone.", out.rewards);
    Game.combat = null;
    run.beaconResolved = true;
    Save.saveRun();
  }
  function refuseSurrender() {
    var enc = Game.combat;
    if (enc) {
      enc.surrenderData = null; // fight to the death, no second offer
    }
  }

  Game.onEnemyFled = function () {
    AudioEngine.setCombat(false);
    Game.map.doubleAdvanceNext = true; // §9.4
    showEventText(T.enemyEscapes + " Its report will pull the rebel vanguard closer.", []);
    Game.combat = null;
    Game.run.beaconResolved = true;
    Save.saveRun();
  };
  Game.onEnemyFtlCharging = function () {
    toast(T.enemyFtl, "danger");
  };
  Game.onIntruders = function () {
    onAutoPause("intrudersDetected");
  };

  // ==========================================================================
  // Flagship (§15)
  // ==========================================================================
  function setupLastStand() {
    var run = Game.run;
    // base = beacon closest to center
    var best = null, bestD = 1e9;
    for (var i = 0; i < run.beacons.length; i++) {
      var b = run.beacons[i];
      var d = Math.abs(b.x - 0.55) + Math.abs(b.y - 0.5);
      if (d < bestD && b.type !== "start") { bestD = d; best = b; }
    }
    best.isBase = true;
    best.known = true;
    best.type = "neutral";
    // flagship starts 3 beacons right of the base
    var candidates = [];
    for (var j = 0; j < run.beacons.length; j++) {
      if (run.beacons[j].x > best.x && run.beacons[j].type !== "start") candidates.push(run.beacons[j]);
    }
    candidates.sort(function (a, b2) { return b2.x - a.x; });
    var fsBeacon = candidates[Math.min(2, candidates.length - 1)] || run.beacons[run.exitId];
    run.flagship = run.flagship || {
      phase: 1, beaconId: fsBeacon.id, baseId: best.id,
      jumps: 0, atBase: 0, destroyedPods: [], survivors: 11, waiting: 0
    };
    if (run.flagship.beaconId == null) run.flagship.beaconId = fsBeacon.id;
    // arrival grants (§15.1)
    Game.player.hull = Math.min(Game.player.hullMax, Game.player.hull + 10);
    run.resources.fuel += 10;
    toast("+10 hull repairs, +10 fuel: the Federation's last gift", "hull");
  }

  function buildFlagship(phase, prototype) {
    var run = Game.run;
    var pdata = GAME_DATA.flagship["phase" + phase];
    var scale = prototype ? 2 / 3 : 1;
    var diff = GAME_DATA.difficulty[run.difficulty];
    // layout: main body + 4 detached pods (isolated, §15.2)
    var rooms = [], id = 0;
    function add(x, y, w2, h2, sys) { rooms.push({ id: id++, x: x, y: y, w: w2, h: h2, sys: sys || null }); }
    add(0, 3, 2, 2, "engines");
    add(2, 2, 2, 1, "oxygen");
    add(2, 3, 2, 2, "shields");
    add(4, 3, 2, 2, "medbay");
    add(4, 2, 2, 1, "doors");
    add(6, 3, 2, 2, pdata.droneCtrl ? "droneCtrl" : phase === 3 ? "teleporter" : "cloaking");
    add(6, 2, 2, 1, "sensors");
    add(8, 3, 2, 2, null);
    add(10, 3, 1, 2, "piloting");
    // isolated pods (gap row y=0, no adjacency with body)
    add(1, 0, 2, 1, "pod1");
    add(4, 0, 2, 1, "pod2");
    add(7, 0, 2, 1, "pod3");
    add(10, 0, 2, 1, "pod4");
    var systems = {
      engines: pdata.engines, oxygen: 2, shields: 8, medbay: 3, piloting: 3,
      doors: 3, sensors: 2
    };
    if (phase === 1 && !prototype) systems.cloaking = 2;
    if (prototype) systems.cloaking = 1;
    if (pdata.droneCtrl) systems.droneCtrl = pdata.droneCtrl;
    if (phase === 3) systems.teleporter = 2;
    systems.pod1 = 2; systems.pod2 = 2; systems.pod3 = 2; systems.pod4 = 2;

    var ship = new Sim.Ship({
      isPlayer: false, name: prototype ? "Prototype Dreadnought" : "Rebel Flagship",
      cls: prototype ? "Prototype Dreadnought" : "Rebel Flagship",
      hullStyle: "boss", hullMax: Math.max(8, Math.round(pdata.hull * scale)),
      reactor: 99, layout: { rooms: rooms, airlocks: [] }, systems: systems,
      faction: "rebel"
    });
    ship.isBoss = true;
    ship.prototype = !!prototype;
    ship.bossPhase = phase;
    ship.bossPhaseData = pdata;
    ship.elite = true;
    ship.bossChargeMult = GAME_DATA.flagship.bossChargeByArtLevel[pdata.artilleryLevel] * (prototype ? 1.4 : 1);
    // shield layers per difficulty
    var layers = prototype ? 3 : (phase === 1 || phase === 2 || phase === 3) ? diff.flagshipShieldLayers : 4;
    ship.systems.shields.level = layers * 2;
    // weapons in pods
    for (var w = 0; w < pdata.weapons.length; w++) {
      var slot = new Sim.Combat.WeaponSlot(pdata.weapons[w], ship);
      slot.podSys = "pod" + (w + 1);
      slot.powered = true;
      slot.charge = RNG.vol.float(0, 4);
      ship.weapons.push(slot);
      // carry over destroyed pods (§15.3)
      if (!prototype && run.flagship && run.flagship.destroyedPods.indexOf(slot.podSys) >= 0) {
        ship.sys(slot.podSys).damage = ship.sys(slot.podSys).level;
        slot.powered = false;
      }
    }
    // drones (phase 2)
    if (pdata.drones) {
      for (var d = 0; d < pdata.drones.length; d++) ship.drones.push(new Sim.Combat.DroneSlot(pdata.drones[d], ship));
      ship.droneSlots = pdata.drones.length;
    }
    // crew: survivors from earlier phases
    var crewCount = prototype ? 7 : (phase === 1 ? pdata.crewCount : Math.max(0, run.flagship.survivors));
    for (var c = 0; c < crewCount; c++) {
      var crew = new Sim.Crew("human", "Rebel", ship);
      // main body rooms only (0..8)
      ship.addCrew(crew, rooms[c % 9].id);
    }
    if (crewCount === 0) {
      ship.aiTakeover = true;
      ship.aiEvasionOverride = pdata.evasion.ai;
    } else {
      ship.aiEvasionOverride = pdata.evasion.manned;
    }
    // super shield (phase 3)
    if (pdata.superShield && !prototype) {
      ship.zoltanShield = pdata.superShield;
      ship.zoltanShieldMax = pdata.superShield;
    }
    Sim.fillEnemyPower(ship);
    ship.shieldLayers = ship.maxShieldLayers();
    // surge state
    ship.surgeT = pdata.surge ? RNG.vol.float(pdata.surge.cooldown[0], pdata.surge.cooldown[1]) : 0;
    ship.surgeWarnT = 0;
    ship.surgeCount = 0;
    ship.surgeDrones = [];
    return ship;
  }

  function startFlagshipFight() {
    var run = Game.run;
    var enemy = buildFlagship(run.flagship.phase, false);
    Game.combat = new Sim.Combat.Encounter(enemy, {});
    Game.combat.enemyAI.surrenderChecked = true; // never surrenders
    Game.hazards.set(null);
    AudioEngine.setSectorFlavor("boss");
    AudioEngine.setCombat(true);
    onAutoPause("enemyFirstSighted");
    showEventText(run.flagship.phase === 1 ?
      "The Rebel Flagship. It fills the scope like a fortress with engines - four isolated weapon pods, shields the color of a wall. Somewhere behind it, the Federation Base is counting on you." :
      "The flagship returns, scarred where you burned it last time. It has not finished with you, nor you with it.", []);
  }

  function bossTick(ship, dt) {
    // pod weapon gating
    for (var i = 0; i < ship.weapons.length; i++) {
      var slot = ship.weapons[i];
      if (slot.podSys) {
        var pod = ship.sys(slot.podSys);
        var alive = pod && pod.effectiveLevel() > 0;
        if (!alive && slot.powered) { slot.powered = false; slot.charge = 0; }
        if (alive && !slot.powered) slot.powered = true;
        if (slot.def.missiles) { /* boss missile pod never consumes ammo (§15.3) */ }
      }
    }
    var pdata = ship.bossPhaseData;
    if (!pdata.surge) return;
    if (ship.surgeWarnT > 0) {
      ship.surgeWarnT -= dt;
      if (ship.surgeWarnT <= 0) fireSurge(ship, pdata);
      return;
    }
    ship.surgeT -= dt;
    if (ship.surgeT <= 0) {
      ship.surgeWarnT = pdata.surge.warningSecs;
      ship.surgeT = RNG.vol.float(pdata.surge.cooldown[0], pdata.surge.cooldown[1]);
      AudioEngine.play("alarm");
    }
    // surge drones fire
    for (var sdi = ship.surgeDrones.length - 1; sdi >= 0; sdi--) {
      var sd = ship.surgeDrones[sdi];
      sd.t -= dt;
      if (sd.t <= 0) {
        sd.t = 1.6;
        sd.fires--;
        var def = { cls: "laser", damage: 1, fire: 10, breach: 0, shots: 1, name: "Surge Drone" };
        Sim.Combat.spawnProjectile(ship, Game.player, def, Sim.Combat.pickRandomRoom(Game.player).id, { fromDrone: true });
        AudioEngine.play("laser");
        if (sd.fires <= 0) ship.surgeDrones.splice(sdi, 1);
      }
    }
  }
  function fireSurge(ship, pdata) {
    ship.surgeCount++;
    if (pdata.surge.type === "drones") {
      var n = GAME_DATA.difficulty[Game.run.difficulty].flagshipSurgeDrones;
      for (var i = 0; i < n; i++) ship.surgeDrones.push({ fires: 2, t: RNG.vol.float(0.2, 2) });
      toast(T.powerSurge, "danger");
    } else {
      // laser barrage; every 4th restores super-shield (§15.2)
      if (ship.surgeCount % 4 === 0) {
        ship.zoltanShield = ship.zoltanShieldMax;
        toast("The flagship's super-shield re-ignites!", "danger");
      } else {
        for (var s = 0; s < 7; s++) {
          var def = { cls: "laser", damage: 1, fire: 30, breach: 21, shots: 1, name: "Barrage" };
          Sim.Combat.spawnProjectile(ship, Game.player, def, Sim.Combat.pickRandomRoom(Game.player).id, { flight: 0.6 + s * 0.06 });
        }
        AudioEngine.play("laser");
        toast(T.powerSurge, "danger");
      }
    }
  }

  function onFlagshipPhaseDown(enc) {
    var run = Game.run;
    var enemy = enc.enemy;
    if (enemy.prototype) {
      // stronghold quest prototype
      Game.run.shipsDefeated++;
      var rewards = [];
      Game.unlockShip("fed_a", { rewards: rewards });
      run.questFlags.stronghold_done = true;
      var out = Sim.Events.applyEffects({ tier: "high" }, null);
      showEventText("The prototype dreadnought dies in its cradle, taking half the stronghold's gantry with it. The Federation will hear of this.", out.rewards.concat(rewards));
      Game.combat = null;
      run.beaconResolved = true;
      Save.saveRun();
      return;
    }
    // record survivors & destroyed pods
    var survivors = 0;
    for (var i = 0; i < enemy.crew.length; i++) if (!enemy.crew[i].dead && !enemy.crew[i].isDrone) survivors++;
    run.flagship.survivors = survivors;
    for (var p = 1; p <= 4; p++) {
      var pod = enemy.sys("pod" + p);
      if (pod && pod.effectiveLevel() === 0 && run.flagship.destroyedPods.indexOf("pod" + p) < 0) {
        run.flagship.destroyedPods.push("pod" + p);
      }
    }
    if (run.flagship.phase >= 3) {
      // VICTORY
      Game.combat = null;
      doVictory();
      return;
    }
    run.flagship.phase++;
    // jumps away 1 beacon toward base, waits 1 player turn (§15.1)
    moveFlagshipTowardBase();
    run.flagship.waiting = 1;
    var S1 = 1 + GAME_DATA.difficulty[run.difficulty].scrapTierShift;
    var out2 = Sim.Events.applyEffects({ tier: "high" }, null);
    showEventText(T.flagshipRetreat + " Its escorts drag the burning hull into jump formation. It will be back - watch the map.", out2.rewards);
    Game.combat = null;
    run.beaconResolved = true;
    Save.saveRun();
  }

  function moveFlagshipTowardBase() {
    var run = Game.run;
    var fs = run.flagship;
    if (!fs || fs.phase > 3) return;
    var cur = run.beacons[fs.beaconId];
    var base = run.beacons[fs.baseId];
    if (cur.id === base.id) return;
    var best = null, bestD = 1e9;
    for (var i = 0; i < cur.edges.length; i++) {
      var b = run.beacons[cur.edges[i]];
      var d = Math.abs(b.x - base.x) + Math.abs(b.y - base.y);
      if (d < bestD) { bestD = d; best = b; }
    }
    if (best) fs.beaconId = best.id;
    if (fs.beaconId === fs.baseId) {
      fs.atBase = (fs.atBase || 0);
      toast(T.baseAttack + "!", "danger");
    }
  }

  function flagshipOnPlayerJump() {
    var run = Game.run;
    var fs = run.flagship;
    if (!fs || run.sectorNumber !== 8 || fs.phase > 3) return;
    if (fs.waiting > 0) { fs.waiting--; return; }
    fs.jumps++;
    if (fs.beaconId === fs.baseId) {
      fs.atBase = (fs.atBase || 0) + 1;
      if (fs.atBase >= 3) {
        endRun(false, "The Federation Base burns. The war is lost.");
      } else {
        toast(T.baseAttack + " - " + (3 - fs.atBase) + " jumps to destruction", "danger");
      }
      return;
    }
    if (fs.jumps % 2 === 0) moveFlagshipTowardBase();
  }

  // ==========================================================================
  // Map / jumping (§9)
  // ==========================================================================
  Game.openMap = function () {
    if (Game.eventModal) return;
    Game.mapOpen = true;
    Game.modalOpenedAt = Game.time;
    Game.map.selectedBeacon = null;
    showTip("firstMap");
  };
  Game.closeMap = function () { Game.mapOpen = false; };
  Game.optShowPaths = true;

  Game.jumpToSelected = function () {
    var run = Game.run;
    var magic = run.cheats && run.cheats.teleport;
    if (Game.map.selectedBeacon == null) return;
    if (!magic && (run.ftlCharge < 1 || run.resources.fuel <= 0)) return;
    var target = Game.map.selectedBeacon;
    // mid-combat escape: no reward (§7.9)
    if (Game.combat && Game.combat.active) {
      Game.combat.active = false;
      Game.combat = null;
      AudioEngine.setCombat(false);
    }
    if (!magic) run.resources.fuel--;
    Game.map.advanceFleet();
    flagshipOnPlayerJump();
    Game.mapOpen = false;
    Game.map.selectedBeacon = null;
    Game.jumpAnim = 0.4;
    AudioEngine.play("ftlJump");
    arriveAtBeacon(target, false);
  };

  Game.waitAtBeacon = function () {
    var run = Game.run;
    // waiting counts as a jump (§9.4)
    Game.map.advanceFleet();
    flagshipOnPlayerJump();
    Game.mapOpen = false;
    run.ftlCharge = 0; run.ftlGrace = 0;
    var respondChance = Game.map.distressToggle ? 50 : 30;
    var rebelChance = Game.map.distressToggle ? 30 : 20;
    if (RNG.run.chance(respondChance)) {
      var ev = GAME_DATA.eventById[RNG.run.pick(["fuel_responder_trader", "fuel_responder_donor", "fuel_responder_pirate"])];
      presentEvent(ev, Game.map.currentBeacon());
    } else if (RNG.run.chance(rebelChance)) {
      presentEvent(GAME_DATA.eventById.fuel_rebel_catchup, Game.map.currentBeacon());
    } else {
      showEventText("You drift at the beacon, engines cold, watching the red edge of the map creep closer. No one comes.", []);
    }
    Save.saveRun();
  };

  Game.leaveSector = function () {
    var run = Game.run;
    var cur = Game.map.currentBeacon();
    var magic = run.cheats && run.cheats.teleport;
    if (!cur || cur.type !== "exit" || (run.ftlCharge < 1 && !magic)) return;
    if (run.sectorNumber >= 8) return;
    Game.mapOpen = false;
    Game.state = "sectorSelect";
    Game.pendingSectorPick = null;
  };

  Game.confirmSectorPick = function () {
    if (!Game.pendingSectorPick) return;
    var run = Game.run;
    run.sectorNumber++;
    run.sectorNode = Game.pendingSectorPick.node;
    run.sectorRow = Game.pendingSectorPick.row;
    run.sector = { name: run.sectorNode.name, type: run.sectorNode.type };
    // hidden crystal sector redirect
    if (run.questFlags.crystal_gate && !run.questFlags.crystal_done) {
      run.sector = { name: "Hidden Crystal Worlds", type: "nebula" };
      run.questFlags.crystal_done = true;
    }
    Game.pendingSectorPick = null;
    Game.state = "flight";
    Game.jumpAnim = 0.4;
    AudioEngine.play("ftlJump");
    AudioEngine.setSectorFlavor(run.sectorNumber === 8 ? "boss" : run.sector.type === "nebula" ? "nebula" : run.sector.type === "hostile" ? "hostile" : "civilian");
    enterSector();
    // crystal sector: Ancestry beacon
    if (run.sector.name === "Hidden Crystal Worlds") {
      Game.map.markQuestBeacon("ancestry");
    }
    Save.saveRun();
  };

  // ==========================================================================
  // Store (§12)
  // ==========================================================================
  Game.openStore = function () {
    var beacon = Game.map.currentBeacon();
    if (!beacon) return;
    if (!beacon.storeStock) beacon.storeStock = generateStoreStock();
    Game.currentStore = beacon.storeStock;
    Game.storeOpen = true;
    Game.modalOpenedAt = Game.time;
    Game.storeSelected = null;
    Game.run.beaconResolved = true;
    showTip("firstStore");
  };
  Game.closeStore = function () {
    Game.storeOpen = false;
    Save.saveRun();
  };
  Game.repairPricePerPoint = function () {
    var s = Game.run.sectorNumber;
    return s <= 3 ? 2 : s <= 6 ? 3 : 4;
  };

  function generateStoreStock() {
    var run = Game.run;
    var S = run.sectorNumber;
    var rarityCap = 2 + Math.ceil(S / 2);
    var rng = RNG.run;
    var stock = {
      supplies: {
        fuel: rng.int(GAME_DATA.prices.fuelStock[0], GAME_DATA.prices.fuelStock[1]),
        missiles: rng.int(GAME_DATA.prices.missileStock[0], GAME_DATA.prices.missileStock[1]),
        droneParts: rng.int(GAME_DATA.prices.dronePartStock[0], GAME_DATA.prices.dronePartStock[1])
      },
      categories: []
    };
    // category pool weighted by sector type
    var pool = ["WEAPONS", "DRONES", "AUGMENTATIONS", "CREW", "SYSTEMS"];
    var weights = { WEAPONS: 3, DRONES: 2, AUGMENTATIONS: 2, CREW: 2, SYSTEMS: 3 };
    if (run.sector.type === "civilian") { weights.CREW = 3; weights.DRONES = 3; }
    if (run.sector.type === "hostile") { weights.WEAPONS = 4; }
    var count = rng.int(2, 4);
    var chosen = [];
    var guard = 0;
    while (chosen.length < count && guard++ < 30) {
      var cat = rng.weighted(pool, function (p) { return chosen.indexOf(p) >= 0 ? 0.01 : weights[p]; });
      if (chosen.indexOf(cat) < 0) chosen.push(cat);
    }
    for (var i = 0; i < chosen.length; i++) {
      stock.categories.push(buildCategory(chosen[i], rarityCap, rng));
    }
    return stock;
  }

  function buildCategory(kind, rarityCap, rng) {
    var items = [];
    var i;
    if (kind === "WEAPONS") {
      var wpool = [];
      for (i = 0; i < GAME_DATA.weapons.length; i++) {
        var w = GAME_DATA.weapons[i];
        if (w.bossOnly || w.rarity === 0 || w.rarity > rarityCap || w.price == null) continue;
        wpool.push(w);
      }
      for (i = 0; i < 3 && wpool.length; i++) {
        var wd = rng.weighted(wpool, function (x) { return 6 - x.rarity; });
        wpool.splice(wpool.indexOf(wd), 1);
        items.push({
          kind: "weapon", id: wd.id, name: wd.name, icon: "weapons", price: wd.price,
          flavor: wd.flavor, statLines: Tooltips.weaponStats(wd),
          tip: wd.name + ": " + (wd.flavor || ""), tipText: Tooltips.tipForClass(wd.cls),
          warn: wd.missiles && Game.run.resources.missiles === 0 ? T.noMissilesWarn : null
        });
      }
    } else if (kind === "DRONES") {
      var dpool = [];
      for (i = 0; i < GAME_DATA.drones.length; i++) {
        if (GAME_DATA.drones[i].rarity > rarityCap) continue;
        dpool.push(GAME_DATA.drones[i]);
      }
      for (i = 0; i < 3 && dpool.length; i++) {
        var dd = rng.weighted(dpool, function (x) { return 6 - x.rarity; });
        dpool.splice(dpool.indexOf(dd), 1);
        items.push({
          kind: "drone", id: dd.id, name: dd.name, icon: "droneCtrl", price: dd.price,
          flavor: dd.desc, tip: dd.name + ": " + dd.desc, tipText: T.tipDrone,
          warn: !Game.player.sys("droneCtrl") ? T.noDroneSystem : null
        });
      }
    } else if (kind === "AUGMENTATIONS") {
      var apool = [];
      for (i = 0; i < GAME_DATA.augments.length; i++) {
        var a = GAME_DATA.augments[i];
        if (a.price == null || a.rarity === 0 || a.rarity > rarityCap) continue;
        apool.push(a);
      }
      for (i = 0; i < 3 && apool.length; i++) {
        var ad = rng.weighted(apool, function (x) { return 6 - x.rarity; });
        apool.splice(apool.indexOf(ad), 1);
        items.push({
          kind: "augment", id: ad.id, name: ad.name, icon: "augment", price: ad.price,
          flavor: ad.effect, tip: ad.name + ": " + ad.effect, tipText: T.tipAugment
        });
      }
    } else if (kind === "CREW") {
      var races = ["human", "engi", "mantis", "rock", "zoltan", "slug"];
      for (i = 0; i < 3; i++) {
        var race = rng.pick(races);
        items.push({
          kind: "crew", id: race, name: GAME_DATA.races[race].name, icon: "crew",
          price: GAME_DATA.prices.crew[race],
          flavor: GAME_DATA.races[race].special,
          tip: GAME_DATA.races[race].name + ": " + GAME_DATA.races[race].special,
          tipText: T.tipCrewSell
        });
      }
    } else { // SYSTEMS
      var sysPool = [];
      for (var sid in GAME_DATA.prices.systems) {
        if (!GAME_DATA.prices.systems.hasOwnProperty(sid)) continue;
        if (!Game.player.sys(sid)) sysPool.push(sid);
      }
      rng.shuffle(sysPool);
      for (i = 0; i < Math.min(3, sysPool.length); i++) {
        var sdef = GAME_DATA.systems[sysPool[i]];
        items.push({
          kind: "system", id: sysPool[i], name: sdef.name, icon: sysPool[i],
          price: GAME_DATA.prices.systems[sysPool[i]],
          flavor: sdef.desc, tip: sdef.name + ": " + sdef.desc
        });
      }
    }
    return { label: kind === "SYSTEMS" ? T.systems : kind === "WEAPONS" ? T.weapons : kind === "DRONES" ? T.drones : kind === "AUGMENTATIONS" ? T.augmentations : T.crew, items: items };
  }

  Game.storeBuySupply = function (key, price) {
    var res = Game.run.resources;
    var stock = Game.currentStore;
    if (res.scrap < price || stock.supplies[key] <= 0) return;
    res.scrap -= price;
    stock.supplies[key]--;
    res[key]++;
    Game.runFlags.boughtNothing = false;
    AudioEngine.play("coin");
    Save.saveRun();
  };

  Game.storeRepair = function (points) {
    var res = Game.run.resources;
    var per = Game.repairPricePerPoint();
    var missing = Game.player.hullMax - Game.player.hull;
    points = Math.min(points, missing, Math.floor(res.scrap / per));
    if (points <= 0) return;
    res.scrap -= points * per;
    Game.player.hull += points;
    Game.runFlags.noStoreRepairs = false;
    Game.runFlags.boughtNothing = false;
    AudioEngine.play("coin");
    if (Game.achv) Game.achv.onHullRepaired();
    Save.saveRun();
  };

  Game.storeBuyItem = function (item) {
    var res = Game.run.resources;
    if (item.sold || res.scrap < item.price) return;
    var ship = Game.player;
    if (item.kind === "weapon") {
      if (ship.weapons.length >= ship.weaponSlots && ship.cargo.length >= 4) return;
      Sim.Events.giveWeapon(item.id);
    } else if (item.kind === "drone") {
      if (ship.drones.length >= ship.droneSlots && ship.cargo.length >= 4) return;
      Sim.Events.giveDrone(item.id);
    } else if (item.kind === "augment") {
      if (ship.augments.length >= 3) return;
      Sim.Events.giveAugment(item.id);
    } else if (item.kind === "crew") {
      if (ship.crew.length >= 8) return;
      var c = new Sim.Crew(item.id, RNG.vol.pick(GAME_DATA.crewNames), ship);
      ship.addCrew(c, ship.rooms[0].id);
      Game.stats.crewHired = (Game.stats.crewHired || 0) + 1;
      Game.profile.stats.crewHired++;
    } else if (item.kind === "system") {
      if (ship.sys(item.id)) return;
      var room = null;
      for (var i = 0; i < ship.rooms.length; i++) if (!ship.rooms[i].sys) { room = ship.rooms[i]; break; }
      if (!room) return;
      var lvl = item.id === "droneCtrl" ? 2 : 1;
      ship.installSystem(item.id, lvl);
      room.sys = item.id;
      if (item.id === "droneCtrl") {
        // starter drone schematic (§3.2)
        var starter = RNG.run.pick(["combat_1", "defense_1", "system_repair"]);
        Sim.Events.giveDrone(starter);
        toast("+" + GAME_DATA.droneById[starter].name + " (starter schematic)", "droneCtrl");
      }
    }
    res.scrap -= item.price;
    item.sold = true;
    Game.storeSelected = null;
    Game.runFlags.boughtNothing = false;
    AudioEngine.play("coin");
    if (Game.achv) Game.achv.check();
    Save.saveRun();
  };

  Game.storeSellItem = function (item) {
    var ship = Game.player;
    var res = Game.run.resources;
    if (item.kind === "weapon") {
      var slot = ship.weapons[item.idx];
      if (!slot) return;
      Sim.Combat.depowerWeapon(ship, slot, true);
      ship.weapons.splice(item.idx, 1);
    } else if (item.kind === "drone") {
      var ds = ship.drones[item.idx];
      if (!ds) return;
      if (ds.entity && ds.entity.crewBody) ds.entity.crewBody.die();
      ship.drones.splice(item.idx, 1);
    } else if (item.kind === "augment") {
      ship.augments.splice(item.idx, 1);
    } else if (item.kind === "cargo") {
      ship.cargo.splice(item.idx, 1);
    } else if (item.kind === "fuel") {
      if (res.fuel <= 0) return;
      res.fuel--;
    } else if (item.kind === "missiles") {
      if (res.missiles <= 0) return;
      res.missiles--;
    } else if (item.kind === "droneParts") {
      if (res.droneParts <= 0) return;
      res.droneParts--;
    }
    res.scrap += item.price;
    AudioEngine.play("coin");
    Save.saveRun();
  };

  // ==========================================================================
  // Ship overview actions (§2.6)
  // ==========================================================================
  Game.openOverview = function (tab) {
    if (Game.eventModal) return;
    Screens.setOverviewTab(tab || "systems");
    Game.overviewOpen = true;
    Game.modalOpenedAt = Game.time;
    Game.overviewPurchases = [];
  };
  Game.closeOverview = function () {
    Game.overviewOpen = false;
    Game.overviewPurchases = [];
    Save.saveRun();
  };
  Game.buySystemLevel = function (sid) {
    var ship = Game.player;
    var s = ship.sys(sid);
    var res = Game.run.resources;
    if (!s) return; // systems installed at stores only
    var def = GAME_DATA.systems[sid];
    if (s.level >= def.maxLevel) return;
    var cost = def.upgradeCost[s.level + 1];
    if (sid === "shields" && ship.firstShieldUpgrade100 && s.level === 1) cost = 100;
    if (cost == null || res.scrap < cost) return;
    res.scrap -= cost;
    s.level++;
    Game.overviewPurchases.push({ type: "system", sid: sid, cost: cost });
    Game.runFlags.noUpgrades = false;
    AudioEngine.play("coin");
    if (Game.achv) Game.achv.check();
  };
  Game.refundSystemLevel = function (sid) {
    // refund only levels bought this visit, full price
    for (var i = Game.overviewPurchases.length - 1; i >= 0; i--) {
      var pu = Game.overviewPurchases[i];
      if (pu.type === "system" && pu.sid === sid) {
        var s = Game.player.sys(sid);
        if (s && s.level > 1) {
          s.level--;
          if (s.power > s.effectiveLevel()) s.power = s.effectiveLevel();
          Game.run.resources.scrap += pu.cost;
          Game.overviewPurchases.splice(i, 1);
          Game.player.syncShieldLayers();
          AudioEngine.play("uiClick");
        }
        return;
      }
    }
  };
  Game.buyReactorBar = function () {
    if (Game.combat) return; // not in combat (§4.2)
    var ship = Game.player;
    var res = Game.run.resources;
    if (ship.reactorLevel >= GAME_DATA.reactorMax) return;
    var cost = GAME_DATA.reactorCost(ship.reactorLevel + 1);
    if (res.scrap < cost) return;
    res.scrap -= cost;
    ship.reactorLevel++;
    Game.overviewPurchases.push({ type: "reactor", cost: cost });
    Game.runFlags.noUpgrades = false;
    AudioEngine.play("coin");
  };
  Game.undoOverviewPurchases = function () {
    var ship = Game.player;
    while (Game.overviewPurchases.length) {
      var pu = Game.overviewPurchases.pop();
      if (pu.type === "system") {
        var s = ship.sys(pu.sid);
        if (s && s.level > 1) {
          s.level--;
          if (s.power > s.effectiveLevel()) s.power = s.effectiveLevel();
        }
      } else if (pu.type === "reactor") {
        ship.reactorLevel--;
      }
      Game.run.resources.scrap += pu.cost;
    }
    ship.syncShieldLayers();
    AudioEngine.play("uiClick");
  };
  Game.unequipWeapon = function (idx) {
    var ship = Game.player;
    var slot = ship.weapons[idx];
    if (!slot || ship.cargo.length >= 4) return;
    Sim.Combat.depowerWeapon(ship, slot, true);
    ship.cargo.push({ type: "weapon", id: slot.id });
    ship.weapons.splice(idx, 1);
  };
  Game.unequipDrone = function (idx) {
    var ship = Game.player;
    var slot = ship.drones[idx];
    if (!slot || ship.cargo.length >= 4) return;
    if (slot.entity && slot.entity.crewBody) slot.entity.crewBody.die();
    ship.cargo.push({ type: "drone", id: slot.id });
    ship.drones.splice(idx, 1);
  };
  Game.equipFromCargo = function (idx) {
    var ship = Game.player;
    var item = ship.cargo[idx];
    if (!item) return;
    if (item.type === "weapon") {
      if (ship.weapons.length >= ship.weaponSlots) return;
      ship.weapons.push(new Sim.Combat.WeaponSlot(item.id, ship));
    } else {
      if (!ship.sys("droneCtrl") || ship.drones.length >= ship.droneSlots) return;
      ship.drones.push(new Sim.Combat.DroneSlot(item.id, ship));
    }
    ship.cargo.splice(idx, 1);
  };
  Game.swapWeapons = function (a, b) {
    var ws = Game.player.weapons;
    if (!ws[a] || !ws[b]) return;
    var t = ws[a]; ws[a] = ws[b]; ws[b] = t;
  };
  Game.dismissCrew = function (crew) {
    crew.dead = true;
    Game.player.removeCrew(crew);
    var idx = Game.player.crew.indexOf(crew);
    if (idx >= 0) Game.player.crew.splice(idx, 1);
  };

  // ==========================================================================
  // Crew & weapon UI actions
  // ==========================================================================
  Game.clickWeaponSlot = function (idx) {
    var ship = Game.player;
    var slot = ship.weapons[idx];
    if (!slot) return;
    if (!slot.powered) {
      if (!Sim.Combat.powerWeapon(ship, slot)) return;
    }
    if (Game.armedWeapon === idx) { Game.armedWeapon = null; Game.beamDrag = null; return; }
    Game.armedWeapon = idx;
    Game.beamDrag = null;
    AudioEngine.play("uiClick");
  };
  Game.rightClickWeaponSlot = function (idx) {
    // right-click = depower immediately (charge is kept on manual depower);
    // the stored target survives so re-powering resumes where you left off
    var ship = Game.player;
    var slot = ship.weapons[idx];
    if (!slot) return;
    if (slot.powered) {
      Sim.Combat.depowerWeapon(ship, slot, true);
      AudioEngine.play("uiClick");
    } else {
      slot.target = null; // right-click on an unpowered slot clears its target
    }
    if (Game.armedWeapon === idx) Game.armedWeapon = null;
  };
  Game.toggleDrone = function (idx) {
    var ship = Game.player;
    var slot = ship.drones[idx];
    if (!slot) return;
    if (slot.powered) Sim.Combat.depowerDrone(ship, slot);
    else Sim.Combat.powerDrone(ship, slot);
    AudioEngine.play("uiClick");
  };
  Game.armTeleport = function (mode) {
    Game.teleportArm = mode;
  };
  Game.saveStations = function () {
    for (var i = 0; i < Game.player.crew.length; i++) {
      var c = Game.player.crew[i];
      if (!c.dead && !c.isDrone && c.ship === Game.player) c.savedStation = { room: c.room, tile: c.tile };
    }
    toast("Crew stations saved", "savepos");
  };
  Game.returnToStations = function () {
    for (var i = 0; i < Game.player.crew.length; i++) {
      var c = Game.player.crew[i];
      if (!c.dead && !c.isDrone && c.savedStation && c.ship === Game.player) c.orderTo(c.savedStation.room, c.savedStation.tile);
    }
  };

  // ==========================================================================
  // Auto-pause, tips, confirm, rename
  // ==========================================================================
  function onAutoPause(kind) {
    var o = Game.profile.options;
    var map = { enemyFirstSighted: "apEnemy", intrudersDetected: "apIntruders", hullBreach: "apBreach", fireStarted: "apFire", crewMemberDied: "apCrewDeath" };
    if (o[map[kind]]) Game.paused = true;
  }
  Game.onAutoPause = onAutoPause;

  function showTip(id) {
    if (!Game.profile.options.showTips) return;
    if (Game.profile.tipsShown[id]) return;
    Game.profile.tipsShown[id] = true;
    Save.saveProfile();
    var text = GAME_DATA.helpTips[id];
    if (text) toast(T.tip + ": " + text, null);
  }
  Game.showTip = showTip;

  Game.confirm = function (text, fn) {
    Game.confirmDialog = { text: text, fn: fn };
  };

  // DOM rename inputs
  function makeInput(x, y, w, value, done) {
    var overlay = document.getElementById("domOverlay");
    var input = document.createElement("input");
    input.value = value;
    input.maxLength = 20;
    var r = canvas.getBoundingClientRect();
    var scale = r.width / W;
    overlay.style.left = r.left + "px";
    overlay.style.top = r.top + "px";
    input.style.left = (x * scale) + "px";
    input.style.top = (y * scale) + "px";
    input.style.width = (w * scale) + "px";
    overlay.appendChild(input);
    Game.renameInput = input;
    input.focus();
    input.select();
    function finish() {
      var v = input.value.substring(0, 20) || value;
      overlay.removeChild(input);
      Game.renameInput = null;
      done(v);
    }
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") finish();
      if (e.key === "Escape") { input.value = value; finish(); }
      e.stopPropagation();
    });
    input.addEventListener("blur", finish);
  }
  Game.beginRename = function () {
    makeInput(560, 20, 400, Screens.hangar.shipName || "", function (v) {
      Screens.hangar.shipName = v;
    });
  };
  Game.beginRenameCrew = function (idx) {
    makeInput(760, 860, 240, Screens.hangar.crewNames[idx] || "", function (v) {
      Screens.hangar.crewNames[idx] = v.substring(0, 12);
    });
  };
  Game.beginRenameCrewLive = function (crew) {
    makeInput(760, 500, 240, crew.name, function (v) {
      crew.name = v.substring(0, 12);
    });
  };

  Game.applyFullscreen = function (toggle) {
    var o = Game.profile.options;
    if (toggle) { o.fullscreen = !o.fullscreen; Save.saveProfile(); }
    try {
      if (o.fullscreen && !document.fullscreenElement) document.documentElement.requestFullscreen();
      else if (!o.fullscreen && document.fullscreenElement) document.exitFullscreen();
    } catch (e) {}
  };

  // ==========================================================================
  // Run end: score, unlocks, high scores (§14.3)
  // ==========================================================================
  function computeScore() {
    var run = Game.run;
    var mult = GAME_DATA.difficulty[run.difficulty].scoreMult;
    return Math.floor((run.scoreScrap + 10 * run.beaconsVisited + 20 * run.shipsDefeated) * mult);
  }

  function endRun(victory, reason) {
    if (Game.state === "gameover" || Game.state === "victory") return;
    var run = Game.run;
    Game.finalScore = computeScore();
    Game.defeatReason = reason || null;
    // high scores
    var entry = {
      ship: run.shipName, score: Game.finalScore, sector: run.sectorNumber,
      difficulty: run.difficulty, victory: victory
    };
    var hs = Game.profile.highScores;
    Game.newHighScore = hs.length === 0 || Game.finalScore > (hs[0] ? hs[0].score : 0);
    hs.push(entry);
    hs.sort(function (a, b) { return b.score - a.score; });
    Game.profile.highScores = hs.slice(0, 10);
    Game.profile.stats.scrapCollected += Game.stats.scrapCollected || 0;
    if (victory) {
      Game.profile.stats.gamesWon++;
      awardAchievement("win_" + run.difficulty.toLowerCase());
      // unlock next ship in chain (§14.5 fallback)
      var chain = ["kestrel", "engi", "fed", "zoltan", "mantis", "slug", "rock", "stealth"];
      var pos = chain.indexOf(run.shipFamily);
      if (pos >= 0 && pos < chain.length - 1) Game.unlockShip(chain[pos + 1] + "_a", null);
      if (Game.achv) Game.achv.onVictory();
    } else {
      Game.profile.stats.gamesLost++;
    }
    if (Game.achv) Game.achv.checkShipB();
    Save.saveProfile();
    Save.clearRun();
    Game.state = victory ? "victory" : "gameover";
    if (!victory) AudioEngine.play("explosion");
    AudioEngine.setCombat(false);
  }
  function doVictory() { endRun(true); }

  Game.unlockShip = function (shipId, out) {
    if (!GAME_DATA.shipById[shipId]) return;
    if (Game.profile.unlockedShips[shipId]) return;
    Game.profile.unlockedShips[shipId] = true;
    Save.saveProfile();
    toast("Ship unlocked: " + GAME_DATA.shipById[shipId].name, "ship");
    AudioEngine.play("achievement");
    if (out && out.rewards) out.rewards.push("Ship unlocked: " + GAME_DATA.shipById[shipId].name);
    // Your Own Fleet check
    var allA = true;
    for (var i = 0; i < GAME_DATA.ships.length; i++) {
      if (GAME_DATA.ships[i].variant === "A" && !Game.profile.unlockedShips[GAME_DATA.ships[i].id]) allA = false;
    }
    if (allA) awardAchievement("all_a");
  };

  function awardAchievement(id) {
    if (Game.profile.achievements[id]) return;
    Game.profile.achievements[id] = true;
    Save.saveProfile();
    var def = null;
    for (var i = 0; i < GAME_DATA.achievements.length; i++) if (GAME_DATA.achievements[i].id === id) def = GAME_DATA.achievements[i];
    if (!def) {
      for (var fam in GAME_DATA.shipAchievements) {
        if (!GAME_DATA.shipAchievements.hasOwnProperty(fam)) continue;
        for (var j = 0; j < GAME_DATA.shipAchievements[fam].length; j++) {
          if (GAME_DATA.shipAchievements[fam][j].id === id) def = GAME_DATA.shipAchievements[fam][j];
        }
      }
    }
    if (Game.profile.options.achPopups) {
      toast("Achievement: " + (def ? def.name : id), "trophy");
      AudioEngine.play("achievement");
    }
    if (Game.achv) Game.achv.checkShipB();
  }
  Game.awardAchievement = awardAchievement;

  // ==========================================================================
  // Achievements engine (subset of hooks; §14.6)
  // ==========================================================================
  function makeAchievements() {
    var A = {
      dodgeStreak: 0, beamBest: 0, boardingDroneKills: {},
      fightDamageTaken: 0, enemyFiredYet: false
    };
    A.onDodge = function () {
      if (Game.player.evasionLastComputed >= 35) {
        A.dodgeStreak = 0; // dodge resets the "hit streak"
      }
    };
    A.hitStreak = 0;
    A.onPlayerHit = function () {
      if (Game.player.evasionLastComputed >= 35) {
        A.hitStreak++;
        if (A.hitStreak >= 5) awardAchievement("low_odds");
      } else A.hitStreak = 0;
    };
    A.onShieldAbsorbHit = function () { A.onPlayerHit(); };
    A.onPlayerDealtDamage = function () {};
    A.onCombatStart = function () {
      A.enemyFiredYet = false;
      A.fightDamageTaken = 0;
      A.hitStreak = 0;
    };
    A.onBeamSweep = function (roomsHit, enemy) {
      if (enemy && roomsHit >= enemy.rooms.length) awardAchievement("slice_dice");
    };
    A.onEnemyDestroyed = function (enemy) {
      // Trustworthy Autopilot: all crew on enemy ship
      var allAboard = Game.player.crew.length > 0;
      for (var i = 0; i < Game.player.crew.length; i++) {
        var c = Game.player.crew[i];
        if (!c.dead && !c.isDrone && c.ship === Game.player) allAboard = false;
      }
      if (allAboard) awardAchievement("autopilot");
      // pre-igniter alpha strike
      if (Game.player.hasAugment("pre_igniter") && !A.enemyFiredYet) awardAchievement("never_saw_it");
      // scorched earth: every room on fire
      var allFire = enemy.rooms.length > 0;
      for (var r = 0; r < enemy.rooms.length; r++) if (enemy.rooms[r].fires.length === 0) allFire = false;
      if (allFire) awardAchievement("scorched");
    };
    A.onCrewKill = function (enc) {};
    A.trackBoardingDrone = function (body) {
      body.killTracker = { kills: 0 };
    };
    A.onVictory = function () {
      // Crystal: win with crystal crew
      for (var i = 0; i < Game.player.crew.length; i++) {
        if (!Game.player.crew[i].dead && Game.player.crew[i].race === "crystal") awardAchievement("crystal_3");
      }
    };
    A.onHullRepaired = function () {};
    A.check = function () {
      var run = Game.run, player = Game.player;
      if (!run) return;
      // sector milestones with run flags
      if (run.sectorNumber >= 5) {
        if (Game.runFlags.killedNothing) awardAchievement("peace_envoy");
        if (Game.runFlags.noUpgrades) awardAchievement("stock_hull");
        if (Game.runFlags.noStoreRepairs) awardAchievement("field_medic");
      }
      if (run.sectorNumber >= 8) {
        if (!Game.runFlags.firedMissile) awardAchievement("ballistophobia");
        if (!Game.runFlags.usedDrone) awardAchievement("technophobia");
        if (Game.runFlags.boughtNothing) awardAchievement("off_the_land");
        if ((Game.stats.crewLost || 0) === 0) awardAchievement("no_redshirts");
      }
      if (Game.profile.stats.scrapCollected + (Game.stats.scrapCollected || 0) >= 10000) awardAchievement("greed");
      if (Game.profile.stats.shipsDefeated >= 1000) awardAchievement("warlord");
      // kestrel: united federation & full arsenal
      if (run.shipFamily === "kestrel") {
        var races = {};
        var count = 0;
        for (var i = 0; i < player.crew.length; i++) {
          var c = player.crew[i];
          if (!c.dead && !c.isDrone && !races[c.race]) { races[c.race] = true; count++; }
        }
        if (count >= 6) awardAchievement("kestrel_1");
        var sysCount = 0;
        for (var sid in player.systems) if (player.systems.hasOwnProperty(sid)) sysCount++;
        if (sysCount >= 11) awardAchievement("kestrel_2");
      }
      // asphyxiation
      var enemy = Game.combat && Game.combat.enemy;
      if (enemy && !enemy.automated && enemy.crew.length) {
        var below = true;
        for (var r = 0; r < enemy.rooms.length; r++) if (enemy.rooms[r].o2 >= 5) below = false;
        if (below) awardAchievement("asphyxiation");
      }
    };
    A.hull1Seen = false;
    A.checkTick = function () {
      var player = Game.player;
      if (player.hull === 1) A.hull1Seen = true;
      if (A.hull1Seen && player.hull === player.hullMax && Game.run.shipFamily === "kestrel") awardAchievement("kestrel_3");
    };
    A.checkShipB = function () {
      // 2 of 3 ship achievements -> unlock layout B (§14.6)
      for (var fam in GAME_DATA.shipAchievements) {
        if (!GAME_DATA.shipAchievements.hasOwnProperty(fam)) continue;
        var list = GAME_DATA.shipAchievements[fam];
        var n = 0;
        for (var i = 0; i < list.length; i++) if (Game.profile.achievements[list[i].id]) n++;
        if (n >= 2) Game.unlockShip(fam + "_b", null);
      }
    };
    return A;
  }

  Game.onHullDamage = function (ship, dmg) {
    if (ship.isPlayer) {
      if (dmg >= 2) Game.shake = 0.15;
      if (Game.achv) { Game.achv.onPlayerHit(); Game.achv.checkTick(); }
    } else if (Game.achv) {
      Game.achv.enemyFiredYet = Game.achv.enemyFiredYet; // no-op
    }
  };
  Game.onCrewDeath = function (crew) {
    if (Game.achv && crew.killedByDrone) {}
    if (Game.achv) Game.achv.check();
  };

  // ==========================================================================
  // Save / continue / exits
  // ==========================================================================
  Game.saveAndExitToMenu = function () {
    Save.saveRun();
    Game.state = "menu";
    Game.pauseMenu = false;
    AudioEngine.setCombat(false);
  };
  Game.abandonToHangar = function () {
    Save.clearRun();
    Game.pauseMenu = false;
    Game.state = "hangar";
    Game.hangarPreviewShip = null;
  };
  Game.restartRun = function () {
    var def = GAME_DATA.shipById[Game.run.shipId];
    var diff = Game.run.difficulty;
    var name = Game.run.shipName;
    Save.clearRun();
    Game.pauseMenu = false;
    Game.startRun(def, diff, name);
  };
  Game.toMenuFromEnd = function () {
    Game.state = "menu";
  };

  Game.continueRun = function () {
    var p = Save.loadRun();
    if (p === "corrupt") {
      Game.confirm(T.saveCorrupt + ". Delete the corrupted save?", function () { Save.clearRun(); });
      return;
    }
    if (!p) return;
    // restore RNG determinism (§19.3)
    RNG.run = new RngStream(p.runSeed);
    RNG.run.restore(p.runSeed, p.rngCalls || 0);
    Game.stats = p.stats || {};
    Game.runFlags = p.runFlags || {};
    var def = GAME_DATA.shipById[p.shipId];
    var run = {
      runSeed: p.runSeed, difficulty: p.difficulty, shipId: p.shipId,
      shipName: p.shipName, shipFamily: p.shipFamily,
      sectorNumber: p.sectorNumber, sectorRow: p.sectorRow,
      sectorTree: p.sectorTree,
      resources: p.resources, questFlags: p.questFlags || {}, usedEvents: p.usedEvents || {},
      scoreScrap: p.scoreScrap || 0, beaconsVisited: p.beaconsVisited || 0,
      shipsDefeated: p.shipsDefeated || 0,
      beacons: p.beacons, startId: p.startId, exitId: p.exitId,
      currentBeaconId: p.currentBeaconId,
      ftlCharge: 0, ftlGrace: 0, beaconResolved: true,
      jumpsSinceFlagship: p.jumpsSinceFlagship || 0,
      flagship: p.flagship || null,
      cheats: p.cheats || null
    };
    run.sectorNode = run.sectorTree[run.sectorNumber - 1][run.sectorRow] || run.sectorTree[run.sectorNumber - 1][0];
    run.sector = { name: p.sectorName, type: p.sectorType };
    Game.run = run;
    // rebuild ship
    var ship = Game.buildPlayerShip(def);
    var sp = p.ship;
    ship.hull = sp.hull;
    ship.reactorLevel = sp.reactor;
    // systems
    for (var sid in sp.systems) {
      if (!sp.systems.hasOwnProperty(sid)) continue;
      if (!ship.sys(sid)) {
        var room = null;
        for (var ri = 0; ri < ship.rooms.length; ri++) if (!ship.rooms[ri].sys) { room = ship.rooms[ri]; break; }
        ship.installSystem(sid, sp.systems[sid].level);
        if (room) room.sys = sid;
      }
      var s = ship.sys(sid);
      s.level = sp.systems[sid].level;
      s.damage = sp.systems[sid].damage;
      s.power = Math.min(sp.systems[sid].power, s.effectiveLevel());
    }
    // crew
    ship.crew = [];
    ship.intruders = [];
    for (var ci = 0; ci < sp.crew.length; ci++) {
      var cd = sp.crew[ci];
      var crew = new Sim.Crew(cd.race, cd.name, ship);
      crew.hp = cd.hp;
      crew.skills = cd.skills || crew.skills;
      crew.savedStation = cd.saved || null;
      ship.addCrew(crew, cd.room);
      crew.tile = cd.tile;
    }
    // weapons
    ship.weapons = [];
    for (var wi = 0; wi < sp.weapons.length; wi++) {
      var slot = new Sim.Combat.WeaponSlot(sp.weapons[wi].id, ship);
      slot.charge = sp.weapons[wi].charge || 0;
      ship.weapons.push(slot);
    }
    // drones
    ship.drones = [];
    for (var di = 0; di < sp.drones.length; di++) ship.drones.push(new Sim.Combat.DroneSlot(sp.drones[di].id, ship));
    ship.augments = sp.augments || [];
    ship.cargo = sp.cargo || [];
    if (ship.weapons.length > ship.weaponSlots) ship.weaponSlots = ship.weapons.length;
    if (ship.hasAugment("zoltan_shield")) { ship.zoltanShield = 5; ship.zoltanShieldMax = 5; }
    Game.player = ship;
    // re-power weapons after power restore
    for (var wj = 0; wj < ship.weapons.length; wj++) {
      if (sp.weapons[wj] && sp.weapons[wj].powered) Sim.Combat.powerWeapon(ship, ship.weapons[wj]);
    }
    ship.shieldLayers = ship.maxShieldLayers();
    Game.map = new Sim.MapController(run);
    Game.map.fleetPos = p.fleetPos;
    Game.map.fleetDelay = p.fleetDelay || 0;
    Game.hazards = new Sim.Hazards();
    Game.achv = makeAchievements();
    Game.combat = null;
    Game.map.updateVisibility();
    // re-trigger the beacon encounter if it was mid-combat (§20: no mid-combat saving)
    var beacon = Game.map.currentBeacon();
    Game.hazards.set(beacon && beacon.nebula ? "nebula" : beacon ? beacon.hazard : null);
    Game.state = "flight";
    Game.paused = false;
    AudioEngine.setSectorFlavor(run.sector.type === "nebula" ? "nebula" : run.sector.type === "hostile" ? "hostile" : "civilian");
  };

})();
