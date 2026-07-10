/* STARFALL - optional PNG sprite pipeline.
   Drop ship sprites into assets/ships/<hullStyle>.png and they replace the
   code-drawn hulls automatically. Weapon art in assets/weapons/<weaponId>.png,
   crew portraits in assets/crew/<race>.png, system icons in
   assets/icons/<sysId>.png. Missing files fall back to the procedural
   generators, so the game always runs even with an empty assets folder. */
"use strict";

var Assets = (function () {
  var sprites = {};   // hullStyle -> {img, w, h, anchors, mounts}
  var weapons = {};   // weaponId -> {img, w, h}
  var crew = {};      // race -> {img, w, h}
  var icons = {};     // sysId -> {img, w, h}
  var HULL_STYLES = [
    "kestrel", "kestrel2", "engi", "fed", "zoltan", "mantis", "slug", "rock",
    "stealth", "crystal", "rebel", "pirate", "mantisE", "engiE", "zoltanE",
    "rockE", "slugE", "auto", "boss"
  ];

  function loadSet(manifest, dir, store) {
    var list = manifest || [];
    for (var i = 0; i < list.length; i++) {
      (function (id) {
        var img = new Image();
        img.onload = function () {
          store[id] = { img: img, w: img.naturalWidth, h: img.naturalHeight };
        };
        img.onerror = function () { /* listed but unreadable: fallback */ };
        img.src = dir + "/" + id + ".png";
      })(list[i]);
    }
  }

  function loadAll() {
    // Only files declared in the manifests are requested, so a partial
    // sprite set never spams the console with 404s.
    var manifest = window.SHIP_SPRITE_MANIFEST || [];
    for (var i = 0; i < manifest.length; i++) {
      if (HULL_STYLES.indexOf(manifest[i]) < 0) continue;
      (function (style) {
        var img = new Image();
        img.onload = function () {
          sprites[style] = {
            img: img, w: img.naturalWidth, h: img.naturalHeight,
            anchors: (window.SHIP_SPRITE_ANCHORS || {})[style] || null,
            mounts: (window.SHIP_SPRITE_MOUNTS || {})[style] || null
          };
        };
        img.onerror = function () { /* listed but unreadable: procedural fallback */ };
        img.src = "assets/ships/" + style + ".png";
      })(manifest[i]);
    }
    loadSet(window.WEAPON_SPRITE_MANIFEST, "assets/weapons", weapons);
    loadSet(window.CREW_SPRITE_MANIFEST, "assets/crew", crew);
    loadSet(window.ICON_SPRITE_MANIFEST, "assets/icons", icons);
  }

  function shipSprite(style) { return sprites[style] || null; }
  function weaponSprite(id) { return weapons[id] || null; }
  function crewPortrait(race) { return crew[race] || null; }
  function iconSprite(id) { return icons[id] || null; }

  loadAll();

  return {
    shipSprite: shipSprite, weaponSprite: weaponSprite,
    crewPortrait: crewPortrait, iconSprite: iconSprite,
    HULL_STYLES: HULL_STYLES
  };
})();
