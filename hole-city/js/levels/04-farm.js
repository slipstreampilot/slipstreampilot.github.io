// Level 4 — Cluckington Farm: rolling countryside. A patchwork of crop fields cut by winding dirt
// lanes, paddocks full of animals, two farmsteads with red barns and silos, a duck pond and orchard,
// a little village crossroads with a market, and a grand windmill on its hill to finish on.
(function () {
  const COL = {
    grass: '#86D957', grass2: '#7BCF4D', hill: '#9BE36A', hill2: '#ACEB7A', sand: '#FFE3A1', edge: '#C98B55',
    dirt: '#D9A66B', rut: '#C08850', yard: '#E2B97F', gravel: '#E9DCC8', mud: '#A8784A',
    wheat: '#F2CF5B', wheat2: '#E6BE45', soil: '#B9844F', soil2: '#A8743F', corn: '#A6D85A', leaf: '#6FCB4A', leaf2: '#5FBE40',
    lavender: '#B79BFF', lavender2: '#9D80F0', pond: '#46C8F0', pond2: '#7FDBFF', pondEdge: '#E9E4D2', green: '#9EE070',
  };
  const SKIN = '#FFD3B0', TIRE = '#2B2D42', GLASS = '#9FE7FF', DARK = '#3A3F58', WOOD = '#B07A4A', WOOD2 = '#8D5A3B', RED = '#D93A35', WHITE = '#FFFFFF';

  function kinds(def) {
    // ---------------- crops & tiny critters (1 pt) ----------------
    def('farm_chicken', { w: 10, d: 7, h: 12, points: 1, mass: 2, tints: ['#FFFFFF', '#FFFFFF', '#E8A15A', '#C8703A'], mover: 'walk',
      build(g) {
        g.ball(-0.5, 5.5, 0, 3.6, '#FFF', { tint: true, sx: 1.25, sy: 1 }); g.ball(-4, 7.5, 0, 2.2, '#FFF', { tint: true, sy: 1.3 });
        g.ball(3, 8.6, 0, 2.3, '#FFF', { tint: true }); g.block(3.2, 10.4, 0, 2.4, 1.6, 0.8, '#FF3B3B'); g.block(5.3, 8.4, 0, 1.6, 0.9, 1, '#FFB400'); g.block(4.6, 7.2, 0, 0.8, 1.4, 0.6, '#FF3B3B');
        g.ball(4, 9.2, 1.2, 0.45, '#2B2D42'); g.ball(4, 9.2, -1.2, 0.45, '#2B2D42');
        g.block(0, 0, 1, 0.7, 2.6, 0.7, '#FF9B2F'); g.block(0, 0, -1, 0.7, 2.6, 0.7, '#FF9B2F');
      } });
    def('farm_corn', { w: 10, d: 10, h: 40, points: 1, mass: 2,
      build(g) {
        g.cyl(0, 0, 0, 0.9, 1.3, 36, 5, '#5DBB3F');
        for (let i = 0; i < 4; i++) { const a = i * 1.7, y = 8 + i * 7; g.box(Math.cos(a) * 4, y, -Math.sin(a) * 4, 9, 0.8, 2.6, i % 2 ? '#6FCB4A' : '#58B83A', { ry: a, rz: -0.5 }); }
        g.ball(1.6, 24, 0, 2.2, '#FFD23F', { sy: 2.2 }); g.box(2.4, 22, 0, 1, 9, 3, '#8ED65A', { rz: -0.2 });
        g.block(0, 36, 0, 0.6, 4, 0.6, '#E8D07A'); g.block(0, 38, 0, 4, 0.6, 0.6, '#E8D07A', { ry: 0.6 });
      } });
    def('farm_cabbage', { w: 13, d: 13, h: 10, points: 1, mass: 2, tints: ['#7BD35A', '#9BE36A', '#B48CFF', '#6CC35A'],
      build(g) {
        for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; g.ball(Math.cos(a) * 3.6, 2.4, Math.sin(a) * 3.6, 3.2, '#FFF', { tint: true, sy: 0.55, sx: 1.2 }); }
        g.ball(0, 4.8, 0, 4.4, '#FFF', { tint: true, detail: 1, sy: 0.95 }); g.ball(0, 5.4, 0, 3.4, '#E8FFD6', { sy: 0.9 });
      } });
    def('farm_sunflower', { w: 14, d: 10, h: 52, points: 1, mass: 2,
      build(g) {
        g.cyl(0, 0, 0, 1, 1.4, 42, 5, '#4FAE3A'); g.box(3, 18, 0, 8, 0.8, 4, '#5FBE40', { rz: -0.4 }); g.box(-3, 26, 0, 8, 0.8, 4, '#5FBE40', { rz: 0.4 });
        g.cyl(0, 38, 2.5, 7, 7, 1.6, 10, '#FFC21F', { rx: 1.2 }); g.cyl(0, 38.4, 3.6, 3.6, 3.6, 1.6, 8, '#7A4A2A', { rx: 1.2 });
        for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.box(Math.cos(a) * 7.5, 45 + Math.sin(a) * 7.5 * 0.36, 2.4 + Math.sin(a) * 7.5 * -0.93 * 0, 4, 4, 1, '#FFD84A', { rx: 1.2, rz: a }); }
      } });
    def('farm_fence', { w: 32, d: 4, h: 18, points: 1, mass: 15,
      build(g) {
        for (const x of [-14, 14]) g.block(x, 0, 0, 3.4, 18, 3.4, '#9A6343');
        g.block(0, 6, 0, 32, 2.6, 1.6, '#C08F5E'); g.block(0, 13, 0, 32, 2.6, 1.6, '#C08F5E'); g.box(0, 9.5, 0, 30, 2, 1.2, '#C08F5E', { rz: 0.24 });
      } });

    // ---------------- farm animals ----------------
    def('farm_sheep', { w: 22, d: 13, h: 18, points: 2, mass: 60, mover: 'walk',
      build(g) {
        g.ball(-1, 10, 0, 6.5, '#FFFFFF', { sx: 1.35 }); g.ball(-4, 13, 0, 4.5, '#F4F1EA'); g.ball(2, 13.5, 0, 4.5, '#F4F1EA');
        g.ball(8.5, 11.5, 0, 3.2, '#3B3B3B', { sx: 1.2 }); g.block(7.5, 13.2, 3, 3, 1.2, 1.6, '#3B3B3B'); g.block(7.5, 13.2, -3, 3, 1.2, 1.6, '#3B3B3B');
        g.ball(9.4, 12.6, 1.6, 0.6, '#FFFFFF'); g.ball(9.4, 12.6, -1.6, 0.6, '#FFFFFF');
        for (const [x, z] of [[-5, -3], [5, -3], [-5, 3], [5, 3]]) g.block(x, 0, z, 1.8, 6, 1.8, '#3B3B3B');
      } });
    def('farm_pig', { w: 24, d: 14, h: 16, points: 2, mass: 90, mover: 'walk',
      build(g) {
        g.ball(0, 8, 0, 6.6, '#FFB3C7', { sx: 1.5, sy: 0.95 }); g.cyl(10, 6, 0, 2.8, 2.8, 3, 8, '#FF9AB4', { rz: Math.PI / 2 }); g.ball(11.6, 7.6, 1, 0.6, '#C25A7A'); g.ball(11.6, 7.6, -1, 0.6, '#C25A7A');
        g.cone(7, 12, 3, 2, 3, 4, '#FF9AB4', { rx: 0.4 }); g.cone(7, 12, -3, 2, 3, 4, '#FF9AB4', { rx: -0.4 }); g.ball(8.5, 10.5, 2.4, 0.6, '#2B2D42'); g.ball(8.5, 10.5, -2.4, 0.6, '#2B2D42');
        g.box(-10.5, 10, 0, 3, 1, 1, '#FF9AB4', { rz: 0.8 }); g.ball(-11.5, 11.5, 0, 1.2, '#FF9AB4');
        for (const [x, z] of [[-5, -3.5], [5, -3.5], [-5, 3.5], [5, 3.5]]) g.block(x, 0, z, 2.4, 4, 2.4, '#FF9AB4');
        g.ball(-3, 4, 4.5, 2, '#A8784A', { sy: 0.5 });
      } });
    def('farm_cow', { w: 48, d: 24, h: 38, points: 4, mass: 600, tints: ['#2B2D42', '#8D5A3B', '#2B2D42'], mover: 'walk',
      build(g) {
        g.block(-2, 14, 0, 34, 15, 20, '#FFFFFF');
        g.block(-8, 21, 10.1, 10, 7, 0.6, '#FFF', { tint: true }); g.block(5, 16, 10.1, 8, 6, 0.6, '#FFF', { tint: true }); g.block(-4, 17, -10.1, 12, 8, 0.6, '#FFF', { tint: true }); g.block(-6, 29, 0, 10, 0.6, 12, '#FFF', { tint: true });
        g.block(19, 22, 0, 10, 11, 12, '#FFFFFF'); g.block(19, 28, 0, 6, 4, 12.4, '#FFF', { tint: true }); g.block(24.5, 21, 0, 3, 6, 10, '#FFB3C7');
        g.block(17, 33, 4.5, 2, 4, 2, '#F4E1C1'); g.block(17, 33, -4.5, 2, 4, 2, '#F4E1C1'); g.block(17, 29, 7, 3, 2, 3, '#FFFFFF'); g.block(17, 29, -7, 3, 2, 3, '#FFFFFF');
        g.ball(23, 27, 3.5, 0.9, '#2B2D42'); g.ball(23, 27, -3.5, 0.9, '#2B2D42');
        for (const [x, z] of [[-13, -6], [9, -6], [-13, 6], [9, 6]]) g.block(x, 0, z, 4, 14, 4, '#FFFFFF');
        g.block(-6, 10, 0, 7, 4, 7, '#FFB3C7'); g.box(-20, 20, 0, 1.4, 14, 1.4, '#FFFFFF', { rz: 0.25 }); g.ball(-21.5, 13, 0, 1.8, '#2B2D42');
        g.ball(0, 37, 0, 0.01, '#FFFFFF');
      } });
    def('farm_horse', { w: 52, d: 20, h: 48, points: 5, mass: 500, tints: ['#8D5A3B', '#C8873E', '#F4E1C1', '#3B3B3B', '#A0522D'], mover: 'walk',
      build(g) {
        g.block(-3, 20, 0, 32, 14, 16, '#FFF', { tint: true });
        g.box(15, 34, 0, 9, 20, 10, '#FFF', { tint: true, rz: -0.55 }); g.block(23, 36, 0, 14, 8, 9, '#FFF', { tint: true }); g.block(30, 36, 0, 3, 6, 8, '#F4E1C1');
        g.box(13, 38, 0, 3, 18, 3, '#3B2A20', { rz: -0.55 }); g.block(19, 44, 2.5, 2, 4, 1.6, '#FFF', { tint: true }); g.block(19, 44, -2.5, 2, 4, 1.6, '#FFF', { tint: true });
        g.ball(25, 40, 4.6, 0.8, '#2B2D42'); g.ball(25, 40, -4.6, 0.8, '#2B2D42');
        for (const [x, z] of [[-15, -5], [9, -5], [-15, 5], [9, 5]]) { g.block(x, 0, z, 3.6, 20, 3.6, '#FFF', { tint: true }); g.block(x, 0, z, 4, 3, 4, '#3B2A20'); }
        g.box(-21, 22, 0, 3, 18, 3, '#3B2A20', { rz: 0.35 }); g.block(-4, 34, 0, 10, 1.6, 17, '#E84A5F');
      } });

    // ---------------- farm props ----------------
    def('farm_haybale', { w: 26, d: 16, h: 15, points: 2, mass: 35,
      build(g) {
        g.block(0, 0, 0, 26, 14, 16, '#F2CF5B'); g.block(0, 14, 0, 24, 1, 14, '#F7DC7A');
        for (const x of [-7, 7]) { g.block(x, 0, 0, 1.2, 14.4, 16.4, '#B07A4A'); g.block(x, 14, 0, 1.2, 1.4, 14.4, '#B07A4A'); }
        g.panel('z+', -3, 7, 8.1, 6, 1, '#E6BE45'); g.panel('z+', 5, 4, 8.1, 7, 1, '#E6BE45');
      } });
    def('farm_roundbale', { w: 26, d: 24, h: 24, points: 3, mass: 250, tints: ['#F2CF5B', '#F2CF5B', '#FFFFFF', '#F2CF5B'],
      build(g) {
        g.cyl(0, 0, -13, 11.5, 11.5, 26, 12, '#FFF', { tint: true, rx: Math.PI / 2 });
        g.cyl(0, 0.6, -13.4, 8.6, 8.6, 26.8, 12, '#F7DC7A', { rx: Math.PI / 2 }); g.cyl(0, 2.6, -13.6, 4.4, 4.4, 27.2, 8, '#E6BE45', { rx: Math.PI / 2 });
      } });
    def('farm_scarecrow', { w: 32, d: 10, h: 54, points: 3, mass: 20, tints: ['#E8322E', '#2F7BFF', '#2FB24A', '#9B5DE5'],
      build(g) {
        g.block(0, 0, 0, 3, 40, 3, WOOD2); g.block(0, 30, 0, 30, 2.5, 2.5, WOOD2);
        g.block(0, 24, 0, 12, 14, 7, '#FFF', { tint: true }); g.block(0, 26, 3.6, 12, 1.2, 0.4, '#FFE58A'); g.block(-9, 29, 0, 8, 5, 5, '#FFF', { tint: true }); g.block(9, 29, 0, 8, 5, 5, '#FFF', { tint: true });
        g.ball(-14.5, 31, 0, 2.2, '#F2CF5B'); g.ball(14.5, 31, 0, 2.2, '#F2CF5B'); g.block(0, 14, 0, 9, 10, 6, '#3D63B8');
        g.ball(0, 42, 0, 5.2, '#F4E1C1'); g.ball(-1.8, 43, 4.6, 0.8, '#2B2D42'); g.ball(1.8, 43, 4.6, 0.8, '#2B2D42'); g.block(0, 40, 4.8, 3.6, 0.6, 0.4, '#2B2D42');
        g.cyl(0, 45.5, 0, 10, 10, 1.2, 10, '#E6BE45'); g.cone(0, 46.5, 0, 5.6, 7, 8, '#E6BE45');
        g.ball(11, 34.5, 0, 2.2, '#2B2D42'); g.block(13.4, 35, 0, 1.8, 0.8, 0.8, '#FFB400');
      } });
    def('farm_beehive', { w: 18, d: 18, h: 26, points: 2, mass: 30, tints: ['#FFFFFF', '#FFE58A', '#AEEBFF', '#FFC6DC'],
      build(g) {
        for (const [x, z] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) g.block(x, 0, z, 1.6, 5, 1.6, WOOD2);
        g.block(0, 5, 0, 16, 7, 16, '#FFF', { tint: true }); g.block(0, 12.3, 0, 16, 6, 16, '#FFF', { tint: true }); g.block(0, 12, 0, 16.4, 0.6, 16.4, '#D9C27A');
        g.block(0, 18.5, 0, 18, 2, 18, '#C08F5E'); g.block(0, 6, 8.2, 6, 1.4, 0.6, '#2B2D42');
        for (const [x, y, z] of [[9, 22, 4], [-7, 24, -6], [3, 25, 9]]) { g.ball(x, y, z, 1.3, '#FFD23F', { sx: 1.3 }); g.block(x, y, z, 0.6, 2.4, 2.4, '#2B2D42'); }
      } });
    def('farm_dairy', { hs: 0.9, w: 340, d: 300, h: 284, points: 85, mass: 400000, tints: ['#D93A35', '#C8322E', '#E05A3A'],
      build(g) {
        g.block(0, 0, 0, 340, 104, 260, '#FFF', { tint: true }); g.block(0, 0, 0, 342, 8, 262, WHITE);
        g.cyl(0, 104 - 171, 0, 128, 128, 342, 8, '#FFF', { tint: true, rx: Math.PI / 2, rz: Math.PI / 2 });
        g.cyl(0, 104 - 166, 0, 136, 136, 332, 8, '#A9463A', { rx: Math.PI / 2, rz: Math.PI / 2 });
        for (const s of [-1, 1]) { for (const x of [-110, -37, 37, 110]) g.box(x, 222, s * 48, 56, 1.5, 30, '#BFEFFF', { rx: s * 0.393 }); g.box(0, 159, s * 116, 330, 1.5, 6, WHITE, { rx: s * 1.18 }); }
        g.box(0, 240, 0, 336, 4, 10, WHITE);
        for (const s of [-1, 1]) { g.block(s * 170.5, 0, 130.5, 5, 104, 5, WHITE); g.block(s * 170.5, 0, -130.5, 5, 104, 5, WHITE); }
        for (const x of [-110, 0, 110]) { g.panel('z+', x, 40, 130.4, 64, 80, '#7A2A26'); g.block(x, 0, 131, 68, 4, 2, WHITE); g.block(x, 80, 131, 68, 4, 2, WHITE); g.box(x, 40, 131.6, 3, 100, 1.2, WHITE, { rz: 0.68 }); g.box(x, 40, 131.6, 3, 100, 1.2, WHITE, { rz: -0.68 }); }
        for (const x of [-140, -55, 55, 140]) g.panel('z-', x, 60, -130.4, 30, 22, WHITE);
        g.block(0, 0, 140, 300, 5, 20, '#E9DCC8'); for (const x of [-120, -40, 40, 120]) g.cyl(x, 5, 146, 2.6, 2.6, 52, 6, WHITE); g.box(0, 60, 141, 304, 4, 22, '#5E6378', { rx: 0.25 });
        for (const x of [-100, 0, 100]) { g.block(x, 232, 0, 30, 20, 30, WHITE); g.gable(x, 252, 0, 36, 36, 14, '#5E6378'); }
        g.cyl(0, 266, 0, 0.8, 0.8, 18, 4, DARK); g.block(5, 278, 0, 12, 5, 1, DARK); g.ball(0, 274, 0, 1.6, '#FFD23F');
        g.panel('x+', 170.4, 160, 0, 120, 40, WHITE); g.panel('x+', 170.5, 160, 0, 108, 28, '#2FB24A');
      } });
    def('farm_appletree', { w: 30, d: 30, h: 98, points: 6, mass: 700, tints: ['#3FBF5A', '#4FCB60', '#36B04E'],
      build(g) {
        g.cyl(0, 0, 0, 4, 6, 44, 7, '#8D5A3B'); g.box(6, 40, 0, 3, 16, 3, '#8D5A3B', { rz: -0.6 });
        g.ball(0, 64, 0, 30, '#FFF', { tint: true }); g.ball(15, 70, 9, 17, '#FFF', { tint: true }); g.ball(-14, 74, -8, 17, '#FFF', { tint: true }); g.ball(2, 85, -2, 15, '#FFF', { tint: true });
        const A = [[16, 60, 22], [-20, 58, 16], [24, 72, -6], [-6, 52, 26], [8, 80, 18], [-24, 70, -10], [10, 56, -26], [-12, 84, 14], [26, 62, 10], [0, 92, 6]];
        for (const [x, y, z] of A) g.ball(x, y, z, 3, '#FF3B3B');
        g.ball(-8, 1.5, 14, 3, '#FF3B3B'); g.ball(10, 1.5, -12, 3, '#FF3B3B');
      } });

    // ---------------- vehicles ----------------
    def('farm_tractor', { w: 72, d: 44, h: 56, points: 6, mass: 3000, tints: ['#E8322E', '#2FB24A', '#2F7BFF', '#FF9F1C'], mover: 'drive',
      build(g) {
        g.block(10, 12, 0, 40, 18, 22, '#FFF', { tint: true }); g.block(10, 30, 0, 36, 1.6, 20, '#FFF', { tint: true }); g.panel('x+', 30.3, 20, 0, 14, 10, '#2B2D42');
        g.block(-14, 12, 0, 24, 10, 34, '#FFF', { tint: true }); g.block(-14, 22, 0, 22, 26, 26, '#2B2D42'); g.block(-14, 23, 0, 22.6, 22, 26.6, GLASS);
        g.block(-14, 48, 0, 30, 3, 32, '#FFF', { tint: true }); g.block(-13, 22, 0, 10, 6, 10, '#3A3F58');
        g.cyl(22, 30, -6, 1.6, 1.6, 22, 6, DARK); g.cyl(22, 51, -6, 2.2, 1.6, 3, 6, DARK);
        for (const z of [-17, 17]) { g.cyl(-16, 0, z, 16, 16, 9, 12, TIRE, { rx: Math.PI / 2 }); g.cyl(-16, 0, z * 1.03, 8, 8, 9.4, 8, '#FFD23F', { rx: Math.PI / 2 }); }
        for (const z of [-14, 14]) { g.cyl(24, 0, z, 9, 9, 6, 10, TIRE, { rx: Math.PI / 2 }); g.cyl(24, 0, z * 1.03, 4.5, 4.5, 6.4, 8, '#FFD23F', { rx: Math.PI / 2 }); }
        g.panel('x+', 30.4, 24, 7, 4, 4, '#FFF7C2'); g.panel('x+', 30.4, 24, -7, 4, 4, '#FFF7C2');
      } });
    def('farm_pickup', { w: 86, d: 42, h: 40, points: 5, mass: 1600, tints: ['#2F7BFF', '#E8322E', '#F8F8FF', '#2FB24A', '#FFC312', '#8C93B0'], mover: 'drive',
      build(g) {
        g.block(0, 6, 0, 86, 14, 42, '#FFF', { tint: true }); g.block(14, 20, 0, 30, 15, 38, '#FFF', { tint: true });
        g.panel('x+', 29.3, 28, 0, 32, 10, GLASS); g.panel('x-', -1.3, 28, 0, 32, 10, GLASS); g.panel('z+', 14, 28, 19.3, 22, 9, GLASS); g.panel('z-', 14, 28, -19.3, 22, 9, GLASS);
        g.block(-22, 20, 0, 40, 0.6, 38, '#5A4A3A'); for (const z of [-20, 20]) g.block(-22, 20, z, 42, 6, 2, '#FFF', { tint: true }); g.block(-42, 20, 0, 2, 6, 40, '#FFF', { tint: true });
        g.block(-22, 20.6, 0, 26, 13, 16, '#F2CF5B'); g.block(-14, 20.6, 0, 1, 13.4, 16.4, '#B07A4A'); g.block(-30, 20.6, 0, 1, 13.4, 16.4, '#B07A4A');
        for (const x of [-27, 27]) for (const z of [-19, 19]) g.cyl(x, 0, z, 7, 7, 5, 10, TIRE, { rx: Math.PI / 2 });
        g.panel('x+', 43.2, 13, 13, 6, 4, '#FFF7C2'); g.panel('x+', 43.2, 13, -13, 6, 4, '#FFF7C2'); g.block(43, 6, 0, 2, 5, 40, '#C9CCD9');
      } });
    def('farm_combine', { w: 150, d: 84, h: 84, points: 14, mass: 12000, tints: ['#2FB24A', '#FFC312', '#E8322E'], mover: 'drive',
      build(g) {
        g.block(-10, 18, 0, 90, 44, 56, '#FFF', { tint: true }); g.block(-30, 62, 0, 50, 10, 48, '#FFF', { tint: true });
        g.block(26, 46, 0, 26, 30, 34, '#FFFFFF'); g.block(26.5, 50, 0, 26.4, 20, 34.4, GLASS); g.block(26, 76, 0, 30, 3, 38, '#FFF', { tint: true });
        g.block(56, 4, 0, 30, 18, 84, '#FFF', { tint: true }); g.cyl(62, 12, -42, 10, 10, 84, 6, '#FFD23F', { rx: Math.PI / 2 });
        for (let i = 0; i < 9; i++) g.block(70, 4, -38 + i * 9.5, 6, 2, 2, '#C9CCD9');
        g.box(-40, 74, -24, 70, 6, 6, '#FFF', { tint: true, ry: 0.5, rz: 0.15 });
        for (const z of [-30, 30]) { g.cyl(8, 0, z, 20, 20, 12, 12, TIRE, { rx: Math.PI / 2 }); g.cyl(8, 0, z * 1.05, 9, 9, 12.4, 8, '#FFD23F', { rx: Math.PI / 2 }); }
        for (const z of [-26, 26]) g.cyl(-44, 0, z, 12, 12, 8, 10, TIRE, { rx: Math.PI / 2 });
        g.panel('z+', -10, 40, 28.3, 60, 10, '#FFFFFF'); g.panel('z-', -10, 40, -28.3, 60, 10, '#FFFFFF');
      } });

    // ---------------- small farm buildings ----------------
    def('farm_coop', { w: 64, d: 50, h: 56, points: 8, mass: 1500, tints: ['#FFD95C', '#FF7B72', '#7BE0AD', '#5CC8FF', '#FFFFFF'],
      build(g) {
        for (const [x, z] of [[-26, -18], [26, -18], [-26, 18], [26, 18]]) g.block(x, 0, z, 4, 12, 4, WOOD2);
        g.block(0, 12, 0, 56, 26, 40, '#FFF', { tint: true }); g.gable(0, 38, 0, 64, 50, 18, RED);
        g.panel('z+', -12, 22, 20.3, 12, 12, '#3A2A20'); g.panel('z+', 12, 26, 20.3, 14, 8, GLASS); g.block(0, 38, 0, 6, 1, 52, WHITE);
        g.box(-12, 6, 30, 10, 1.6, 20, WOOD, { rx: 0.6 }); g.block(32, 12, 0, 6, 14, 30, '#FFF', { tint: true }); g.gable(32, 26, 0, 8, 32, 6, RED);
        g.ball(-12, 26, 21, 2.6, '#FFFFFF'); g.block(-12, 28.4, 21, 1.6, 1.2, 0.6, '#FF3B3B');
      } });
    def('farm_stall', { w: 66, d: 50, h: 58, points: 8, mass: 900, tints: ['#FF5A5F', '#2F7BFF', '#2FB24A', '#FF9F1C', '#9B5DE5'],
      build(g) {
        for (const [x, z] of [[-30, -22], [30, -22], [-30, 22], [30, 22]]) g.block(x, 0, z, 3, 44, 3, WOOD2);
        g.block(0, 0, 10, 60, 18, 24, WOOD); g.block(0, 18, 10, 62, 2, 26, WOOD2);
        for (let i = 0; i < 4; i++) { const x = -21 + i * 14; g.box(x, 22, 12, 12, 4, 18, '#C08F5E', { rx: -0.3 }); for (let k = 0; k < 3; k++) g.ball(x - 3 + k * 3, 25, 12 + (k % 2) * 3 - 2, 2.6, ['#FF3B3B', '#FF9F1C', '#7BD35A', '#B48CFF'][i]); }
        for (let i = 0; i < 8; i++) g.box(-26.25 + i * 7.5, 47, 0, 7.5, 2, 54, i % 2 ? WHITE : '#FFF', { tint: i % 2 === 0, rx: 0 });
        g.gable(0, 49, 0, 62, 54, 9, '#FFF', { tint: true }); g.block(0, 36, 25, 30, 8, 1.4, '#FFF7E0');
        g.block(-14, 0, -12, 14, 10, 12, '#C08F5E'); g.ball(-14, 11, -12, 4, '#FF9F1C', { sy: 0.7 });
      } });

    // ---------------- buildings ----------------
    def('farm_farmhouse', { w: 180, d: 150, h: 176, points: 26, mass: 45000, tints: ['#FFFFFF', '#FFF1B8', '#CDEBFF', '#FFD9C9', '#D9F5D0'],
      build(g) {
        g.block(0, 0, -10, 170, 112, 120, '#FFF', { tint: true }); g.block(0, 0, -10, 176, 6, 126, '#B9A994');
        g.gable(0, 112, -10, 184, 134, 54, '#7A4A3A'); g.block(50, 130, -30, 18, 46, 18, '#B5523B'); g.block(50, 174, -30, 22, 3, 22, '#8C93B0');
        g.block(0, 0, 62, 176, 6, 28, WOOD); for (let i = 0; i < 7; i++) g.block(-84 + i * 28, 6, 74, 3, 40, 3, WHITE);
        g.block(0, 46, 64, 182, 4, 32, '#7A4A3A', { rx: 0 }); g.block(0, 12, 75, 176, 1.6, 1.6, WHITE); g.block(0, 22, 75, 176, 1.6, 1.6, WHITE);
        g.panel('z+', 0, 22, 50.4, 24, 40, '#8D5A3B'); for (const x of [-50, 50]) { g.panel('z+', x, 26, 50.4, 26, 26, GLASS); g.panel('z+', x - 18, 26, 50.5, 6, 26, '#2F6BB8'); g.panel('z+', x + 18, 26, 50.5, 6, 26, '#2F6BB8'); }
        for (const x of [-50, 0, 50]) { g.panel('z+', x, 82, 50.4, 24, 26, GLASS); g.panel('z-', x, 70, -70.4, 24, 26, GLASS); }
        for (const z of [-40, 20]) { g.panel('x+', 85.4, 70, z, 26, 26, GLASS); g.panel('x-', -85.4, 70, z, 26, 26, GLASS); }
        g.block(0, 112, 48, 40, 34, 22, '#FFF', { tint: true }); g.gable(0, 146, 48, 44, 26, 18, '#7A4A3A', { ry: Math.PI / 2 }); g.panel('z+', 0, 126, 59.4, 18, 18, GLASS);
        for (let i = 0; i < 6; i++) g.ball(-80 + i * 32, 10, 84, 5, ['#FF5A8A', '#FFD23F', '#FF8C42'][i % 3]);
      } });
    def('farm_barn', { w: 200, d: 260, h: 236, points: 50, mass: 120000, tints: ['#D93A35', '#D93A35', '#C8322E', '#2F7BFF', '#E8B04A'],
      build(g) {
        g.block(0, 0, 0, 200, 112, 260, '#FFF', { tint: true });
        g.cyl(0, 112 - 131, 0, 100, 100, 262, 8, '#FFF', { tint: true, rx: Math.PI / 2 });
        g.cyl(0, 112 - 128, 0, 107, 107, 256, 8, '#5E6378', { rx: Math.PI / 2 });
        g.block(0, 0, 0, 202, 6, 262, WHITE); for (const s of [-1, 1]) { g.block(s * 100.5, 0, 130.5, 5, 112, 5, WHITE); g.block(s * 100.5, 0, -130.5, 5, 112, 5, WHITE); }
        g.panel('z+', 0, 46, 131.4, 92, 92, '#FFF', { tint: true }); g.block(0, 0, 131.5, 96, 96, 1.6, WHITE);
        for (const s of [-1, 1]) g.box(0, 46, 132.6, 4, 126, 1.2, WHITE, { rz: s * 0.78 }); g.block(0, 92, 132, 100, 4, 3, WHITE); g.block(0, 0, 132, 4, 92, 2.5, WHITE);
        g.panel('z+', 0, 146, 132.4, 46, 40, '#7A2A26'); g.block(0, 125, 132.6, 50, 3, 1.4, WHITE); g.block(0, 166, 132.6, 50, 3, 1.4, WHITE);
        g.block(0, 170, 133, 3, 10, 6, WHITE); g.cyl(0, 178, 134, 6, 6, 2, 8, '#FFD23F', { rx: Math.PI / 2 });
        for (const z of [-80, 0, 80]) for (const s of [-1, 1]) g.panel(s > 0 ? 'x+' : 'x-', s * 100.4, 60, z, 30, 26, WHITE);
        for (const z of [-80, 0, 80]) for (const s of [-1, 1]) g.panel(s > 0 ? 'x+' : 'x-', s * 100.5, 60, z, 24, 20, '#7A2A26');
        g.block(0, 207, -40, 34, 18, 34, WHITE); g.gable(0, 225, -40, 40, 40, 14, '#5E6378'); g.cyl(0, 236, -40, 0.8, 0.8, 16, 4, DARK); g.block(5, 248, -40, 10, 4, 1, DARK); g.ball(0, 245, -40, 1.6, '#FFD23F');
      } });
    def('farm_silo', { hs: 0.85, w: 80, d: 80, h: 300, points: 18, mass: 40000, tints: ['#D8DCE8', '#5C8DD6', '#E8E2D5', '#D93A35'],
      build(g) {
        g.cyl(0, 0, 0, 39, 40, 4, 14, '#C9C3B5'); g.cyl(0, 4, 0, 37, 37, 236, 14, '#FFF', { tint: true });
        for (let i = 1; i < 6; i++) g.cyl(0, 4 + i * 40, 0, 37.8, 37.8, 3, 14, '#FFFFFF');
        g.ball(0, 240, 0, 37.4, '#EDEFF5', { sy: 0.62, detail: 1 }); g.cyl(0, 260, 0, 6, 8, 12, 8, '#C9CCD9'); g.ball(0, 274, 0, 4, RED);
        g.block(0, 0, 38, 10, 240, 2, '#8C93B0'); for (let y = 10; y < 240; y += 14) g.block(0, y, 39.4, 9, 1.4, 1.4, '#B8BDD0');
        g.panel('z+', 0, 190, 37.6, 40, 22, WHITE); g.panel('z+', 0, 190, 37.7, 32, 14, '#2FB24A');
      } });
    def('farm_elevator', { hs: 0.66, w: 400, d: 380, h: 660, points: 140, mass: 2500000, tints: ['#E8E2D5', '#F2EDE2', '#E3DCEB'],
      build(g) {
        g.block(0, 0, 0, 400, 16, 380, '#C9C3B5');
        for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { const x = -150 + i * 100, z = -40 + j * 100; g.cyl(x, 16, z, 48, 48, 420, 14, '#FFF', { tint: true }); g.cyl(x, 436, z, 48.4, 48.4, 6, 14, '#D8D2C4'); }
        g.block(0, 16, 30, 300, 420, 100, '#FFF', { tint: true });
        g.block(-60, 436, 10, 140, 180, 120, '#FFF', { tint: true }); g.gable(-60, 616, 10, 146, 126, 34, RED);
        g.panel('z+', 0, 380, 129.4, 380, 52, '#2B6CB0'); g.panel('z+', 0, 380, 129.5, 352, 32, '#FFFFFF'); g.panel('z+', 0, 380, 129.6, 330, 12, RED);
        for (let i = 0; i < 4; i++) g.panel('z+', -60 + (i - 1.5) * 30, 560, 70.4, 16, 30, GLASS);
        g.box(130, 360, 10, 200, 14, 14, '#8C93B0', { rz: -0.9 }); g.block(180, 16, 120, 100, 70, 70, '#FFF', { tint: true }); g.gable(180, 86, 120, 106, 76, 22, RED);
        g.block(-100, 16, 172, 120, 70, 36, '#B9A994'); g.panel('z+', -100, 40, 190.4, 70, 50, '#5A4A3A');
        g.cyl(-60, 650, 10, 1.2, 1.2, 30, 4, DARK); g.block(-52, 672, 10, 16, 8, 0.8, '#FFD23F');
      } });
    def('farm_windmill', { hs: 0.74, w: 520, d: 520, h: 1000, points: 330, mass: 5000000,
      build(g) {
        // grassy hill with tulip beds and a picket path
        g.cyl(0, 0, 0, 240, 258, 30, 18, '#8FDB5C'); g.cyl(0, 30, 0, 200, 240, 24, 18, '#9EE36A');
        const TUL = ['#FF3B5C', '#FFD23F', '#FF8C42', '#FF6FB5', '#B388FF'];
        for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2; g.ball(Math.cos(a) * 215, 40, Math.sin(a) * 215, 8, TUL[i % 5]); }
        g.block(0, 54, 190, 60, 1, 60, '#E9DCC8');
        // brick base + octagonal tower
        g.cyl(0, 54, 0, 150, 160, 120, 8, '#C9604A', { ry: Math.PI / 8 }); g.cyl(0, 174, 0, 156, 156, 10, 8, '#F4EDE0', { ry: Math.PI / 8 });
        g.cyl(0, 184, 0, 168, 168, 8, 8, '#7A4A3A', { ry: Math.PI / 8 });
        for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; g.block(Math.cos(a) * 164, 192, Math.sin(a) * 164, 3, 24, 3, WHITE); }
        g.cyl(0, 214, 0, 166, 166, 3, 8, WHITE, { ry: Math.PI / 8 });
        g.cyl(0, 184, 0, 96, 140, 470, 8, '#FFF6E6', { ry: Math.PI / 8 });
        for (let i = 1; i < 4; i++) g.cyl(0, 184 + i * 118, 0, 140 - 44 * i * 118 / 470 + 1.6, 140 - 44 * i * 118 / 470 + 1.6, 6, 8, '#5E7FB8', { ry: Math.PI / 8 });
        g.panel('z+', 0, 54, 156.5, 46, 80, '#5A3A2A'); g.cyl(0, 132, 156, 23, 23, 2, 8, '#5A3A2A', { rx: Math.PI / 2 });
        for (const [y, r] of [[280, 128], [400, 116], [530, 104]]) { g.panel('z+', 0, y, r + 2, 30, 38, '#4F6FA8'); g.panel('z+', 0, y, r + 2.2, 22, 30, GLASS); }
        for (const s of [-1, 1]) { g.panel(s > 0 ? 'x+' : 'x-', s * 124, 330, 0, 28, 34, GLASS); }
        // cap
        g.cyl(0, 654, 0, 104, 100, 14, 8, '#7A4A3A', { ry: Math.PI / 8 }); g.ball(0, 668, 0, 108, '#D93A35', { sy: 0.7, detail: 1 }); g.cyl(0, 740, 0, 4, 6, 40, 6, DARK); g.ball(0, 782, 0, 8, '#FFD23F');
        g.block(0, 620, 120, 40, 40, 70, '#7A4A3A');
        // sails (X), hub at the front
        const HY = 640, HZ = 168;
        g.cyl(0, HY - 16, HZ - 10, 20, 20, 32, 8, '#5A3A2A', { rx: Math.PI / 2 }); g.ball(0, HY, HZ + 8, 16, '#FFD23F');
        for (let k = 0; k < 4; k++) {
          const a = Math.PI / 4 + k * Math.PI / 2, c = Math.cos(a), s = Math.sin(a), L = 360;
          g.box(c * L / 2, HY + s * L / 2, HZ, L, 9, 7, '#6B4A35', { rz: a });
          const ox = -s, oy = c; // lattice side
          for (let j = 0; j < 6; j++) { const t = 90 + j * 46; g.box(c * t + ox * 30, HY + s * t + oy * 30, HZ - 2, 4, 64, 3, '#8D6A4E', { rz: a }); }
          g.box(c * 235 + ox * 32, HY + s * 235 + oy * 32, HZ - 4, 270, 56, 2, '#FFF8EC', { rz: a });
          g.box(c * 235 + ox * 60, HY + s * 235 + oy * 60, HZ - 2, 270, 4, 4, '#6B4A35', { rz: a });
        }
      } });
  }

  // ---------------- helpers ----------------
  // HC.Geo.strip winds its quads clockwise (seen from above) while flat()/disc() wind counter-clockwise,
  // so strips render back-facing and darker. Detect the winding once and flip the width to compensate.
  let STRIP_SIGN = 0;
  function stripSign() {
    if (STRIP_SIGN) return STRIP_SIGN;
    const g = new HC.Geo(); g.strip(0, 0, 10, 0, 2, 0, '#FFFFFF'); const p = g.pos;
    STRIP_SIGN = ((p[5] - p[2]) * (p[6] - p[0]) - (p[3] - p[0]) * (p[8] - p[2])) >= 0 ? 1 : -1;
    return STRIP_SIGN;
  }
  const strip = (T, x0, z0, x1, z1, w, y, color) => T.strip(x0, z0, x1, z1, w * stripSign(), y, color);
  const path = (T, pts, w, y, color, closed = false) => { for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; strip(T, a[0], a[1], b[0], b[1], w, y, color); T.disc(a[0], a[1], w / 2, y, color, 16); } if (!closed) { const e = pts[pts.length - 1]; T.disc(e[0], e[1], w / 2, y, color, 16); } };
  // Smooth a coarse polyline (Chaikin) so lanes wind gently.
  function smooth(pts, closed, iters = 3) {
    let p = pts;
    for (let k = 0; k < iters; k++) {
      const out = []; const n = p.length;
      if (!closed) out.push(p[0]);
      for (let i = 0; i < (closed ? n : n - 1); i++) { const a = p[i], b = p[(i + 1) % n]; out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); }
      if (!closed) out.push(p[n - 1]);
      p = out;
    }
    return p;
  }
  function offsetLine(pts, off, closed) {
    const n = pts.length, out = [];
    for (let i = 0; i < n; i++) {
      const a = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
      const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; out.push([pts[i][0] - dz / l * off, pts[i][1] + dx / l * off]);
    }
    return out;
  }
  function distSeg(x, z, a, b) { const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1; let t = ((x - a[0]) * dx + (z - a[1]) * dz) / l2; t = Math.max(0, Math.min(1, t)); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); }
  function distLine(x, z, pts, closed) { let d = 1e9; for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) d = Math.min(d, distSeg(x, z, pts[i], pts[(i + 1) % pts.length])); return d; }
  function spread(T, n0) { const list = T.city.objects.slice(n0).filter((o) => o.mover); list.forEach((o, i) => { o.mover.t = i / list.length + 0.29 / list.length; }); }
  function fleet(T, weights, pts, n, speed, lane) { const n0 = T.city.objects.length; T.loopVehicles(weights, pts, n, [speed, speed], { lane }); spread(T, n0); }

  // ---------------- the map ----------------
  const C = [2500, 2500];
  const PASTURE = { n: 0 };
  let LANES = [];        // [{ pts, closed, w }]
  const ZONES = [];      // reserved circles/rects where fields don't put crops
  const nearLane = (x, z, pad = 0) => LANES.some((L) => distLine(x, z, L.pts, L.closed) < L.w / 2 + pad);
  const inZone = (x, z, pad = 0) => ZONES.some((Z) => Z.r != null ? Math.hypot(x - Z.x, z - Z.z) < Z.r + pad : (x > Z.x0 - pad && x < Z.x1 + pad && z > Z.z0 - pad && z < Z.z1 + pad));
  const busy = (x, z, pad = 0) => nearLane(x, z, pad) || inZone(x, z, pad);

  function buildLanes() {
    const NS = smooth([[2470, -300], [2540, 500], [2420, 1300], [2500, 2500], [2590, 3600], [2440, 4400], [2520, 5300]], false);
    const EW = smooth([[-300, 2530], [600, 2430], [1500, 2590], [2500, 2500], [3500, 2390], [4400, 2590], [5300, 2470]], false);
    const rr = [1350, 1470, 1270, 1410, 1250, 1440, 1350, 1290, 1460, 1310, 1420, 1260];
    const RING = smooth(rr.map((r, i) => [C[0] + Math.cos(i / 12 * Math.PI * 2) * r, C[1] + Math.sin(i / 12 * Math.PI * 2) * r]), true);
    const OUTER = smooth([[330, 420], [1200, 300], [2500, 380], [3800, 290], [4680, 400], [4720, 1300], [4640, 2500], [4730, 3700], [4640, 4640], [3700, 4720], [2500, 4630], [1300, 4720], [360, 4640], [290, 3700], [370, 2500], [270, 1300]], true);
    LANES = [{ pts: NS, closed: false, w: 104 }, { pts: EW, closed: false, w: 104 }, { pts: RING, closed: true, w: 92 }, { pts: OUTER, closed: true, w: 92 }];
  }

  function drawLanes(T) {
    for (const L of LANES) {
      path(T, L.pts, L.w + 14, 1.5, '#C99A62', L.closed);
      path(T, L.pts, L.w, 1.7, COL.dirt, L.closed);
      for (const off of [-L.w * 0.22, L.w * 0.22]) path(T, offsetLine(L.pts, off, L.closed), 9, 1.9, COL.rut, L.closed);
    }
    // village roundabout
    T.disc(C[0], C[1], 150, 2.1, COL.dirt, 32); T.disc(C[0], C[1], 70, 2.3, COL.green, 24); T.ring(C[0], C[1], 66, 74, 2.4, '#E9DCC8', 24);
  }

  // Patchwork fields on a jittered grid; crops in rows where a field grows them.
  const FIELD_TYPES = { wheat: 3, corn: 2, cabbage: 2, sunflower: 2, plowed: 1, lavender: 1.5, meadow: 1, pasture: 4, homestead: 3 };
  function fields(T, spawnSpots) {
    const xs = [-180, 520, 1250, 1950, 2550, 3150, 3800, 4450, 5180];
    const zs = [-180, 560, 1250, 1950, 2550, 3150, 3800, 4450, 5180];
    const jit = (v, i, n) => (i === 0 || i === n - 1) ? v : v + T.rng.range(-90, 90);
    const X = xs.map((v, i) => jit(v, i, xs.length)), Z = zs.map((v, i) => jit(v, i, zs.length));
    const cells = [];
    for (let j = 0; j < Z.length - 1; j++) for (let i = 0; i < X.length - 1; i++) {
      const x0 = X[i] + 16, x1 = X[i + 1] - 16, z0 = Z[j] + 16, z1 = Z[j + 1] - 16, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      if (inZone(cx, cz, -60) || Math.hypot(cx - C[0], cz - C[1]) < 800) continue;
      cells.push({ x0, x1, z0, z1, cx, cz, edge: i === 0 || j === 0 || i === X.length - 2 || j === Z.length - 2 });
    }
    // Fixed quotas (shuffled) keep the object count and points steady from seed to seed.
    const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(T.rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const inner = cells.filter((c) => !c.edge), outer = cells.filter((c) => c.edge);
    const IQ = shuffle(['corn', 'corn', 'corn', 'cabbage', 'cabbage', 'cabbage', 'sunflower', 'sunflower', 'wheat', 'wheat', 'wheat', 'pasture', 'pasture', 'pasture', 'pasture', 'pasture', 'homestead', 'homestead', 'homestead', 'homestead', 'lavender', 'lavender', 'plowed', 'plowed', 'pasture', 'homestead', 'wheat', 'meadow']);
    const OQ = shuffle(['wheat', 'wheat', 'wheat', 'meadow', 'meadow', 'sunflower', 'lavender', 'wheat', 'meadow', 'plowed', 'wheat', 'meadow', 'lavender', 'wheat', 'meadow', 'wheat', 'meadow', 'wheat', 'meadow', 'wheat', 'meadow', 'wheat', 'meadow', 'wheat', 'meadow', 'wheat', 'meadow', 'wheat']);
    inner.forEach((c, k) => { c.type = IQ[k % IQ.length]; }); outer.forEach((c, k) => { c.type = OQ[k % OQ.length]; });
    for (const c of cells) {
      const { x0, x1, z0, z1, cx, cz, type } = c;
      field(T, type, x0, z0, x1, z1);
      if (['corn', 'cabbage', 'sunflower', 'wheat'].includes(type) && !c.edge) spawnSpots.push([cx, cz]);
      // hedgerow along the bottom edge of the field
      for (let x = x0 + 20; x < x1 - 20; x += 44) if (!busy(x, z1 + 12, 10) && T.rng.chance(0.28)) T.put(T.rng.chance(0.85) ? 'bush' : 'farm_appletree', x, z1 + 12, T.rng() * 6);
    }
  }

  function field(T, type, dx0, dz0, dx1, dz1) {
    // Decals cover the whole cell; objects stay where rival holes can reach them (bots keep 220 off the shore).
    const x0 = Math.max(dx0, -30), z0 = Math.max(dz0, -30), x1 = Math.min(dx1, 5030), z1 = Math.min(dz1, 5030);
    const free = (x, z) => !busy(x, z, 18);
    const rows = (kind, sx, sz, chance = 1) => { for (let z = z0 + sz / 2 + 6; z < z1 - 6; z += sz) for (let x = x0 + sx / 2 + 6; x < x1 - 6; x += sx) if (free(x, z) && T.rng.chance(chance)) T.put(kind, x + T.rng.range(-2, 2), z, T.rng.range(-0.3, 0.3)); };
    const stripesZ = (a, b, n) => { const h = (dz1 - dz0) / n; for (let k = 0; k < n; k++) T.rect(dx0, dz0 + k * h, dx1, dz0 + (k + 1) * h, 0.6, k % 2 ? a : b); };
    if (type === 'wheat') {
      T.rect(dx0, dz0, dx1, dz1, 0.4, COL.wheat); stripesZ(COL.wheat, COL.wheat2, 12);
      T.scatter({ farm_roundbale: 3, farm_haybale: 2 }, { x0: x0 + 30, z0: z0 + 30, x1: x1 - 30, z1: z1 - 30 }, 22, { gap: 14, avoid: (x, z) => busy(x, z, 20) });
      if (T.rng.chance(0.5)) { const x = (x0 + x1) / 2, z = (z0 + z1) / 2; if (free(x, z)) T.put('farm_scarecrow', x, z, 0); }
    }
    if (['corn', 'cabbage', 'sunflower'].includes(type)) T.scatter({ farm_haybale: 3, farm_roundbale: 1, farm_scarecrow: 0.5, farm_chicken: 1 }, { x0: x0 + 20, z0: z0 + 20, x1: x1 - 20, z1: z1 - 20 }, 6, { gap: 6, avoid: (x, z) => busy(x, z, 20) });
    if (type === 'wheat') {} else if (type === 'corn') {
      T.rect(dx0, dz0, dx1, dz1, 0.4, COL.soil); stripesZ(COL.corn, COL.soil, Math.round((dz1 - dz0) / 72)); rows('farm_corn', 40, 72, 0.88);
    } else if (type === 'cabbage') {
      T.rect(dx0, dz0, dx1, dz1, 0.4, COL.soil); stripesZ(COL.soil, COL.soil2, Math.round((dz1 - dz0) / 72)); rows('farm_cabbage', 40, 72, 0.88);
      const x = (x0 + x1) / 2, z = (z0 + z1) / 2; if (free(x, z)) T.put('farm_scarecrow', x, z, 0);
    } else if (type === 'sunflower') {
      T.rect(dx0, dz0, dx1, dz1, 0.4, COL.leaf); stripesZ(COL.leaf, COL.leaf2, Math.round((dz1 - dz0) / 72)); rows('farm_sunflower', 40, 72, 0.88);
    } else if (type === 'plowed') {
      T.rect(dx0, dz0, dx1, dz1, 0.4, COL.soil); stripesZ(COL.soil, COL.soil2, 16);
      const x = (x0 + x1) / 2, z = (z0 + z1) / 2; if (free(x, z)) T.put('farm_scarecrow', x, z, 0);
      T.scatter({ farm_haybale: 1, farm_chicken: 1 }, { x0, z0, x1, z1 }, 5, { gap: 20, avoid: (x, z) => busy(x, z, 20) });
    } else if (type === 'lavender') {
      T.rect(dx0, dz0, dx1, dz1, 0.4, COL.lavender); stripesZ(COL.lavender, COL.lavender2, 14);
      T.scatter({ farm_beehive: 1 }, { x0: x0 + 20, z0: z0 + 20, x1: x1 - 20, z1: z1 - 20 }, 10, { gap: 14, avoid: (x, z) => busy(x, z, 16) });
    } else if (type === 'meadow') {
      T.rect(dx0, dz0, dx1, dz1, 0.4, COL.hill);
      T.scatter({ parktree: 2, farm_appletree: 2, bush: 2, pine: 1, flowerpot: 1, farm_roundbale: 1 }, { x0: x0 + 20, z0: z0 + 20, x1: x1 - 20, z1: z1 - 20 }, 16, { gap: 24, avoid: (x, z) => busy(x, z, 16) });
      if (!busy((x0 + x1) / 2, (z0 + z1) / 2, 80)) T.roamers(T.rng.chance(0.5) ? 'farm_cow' : 'farm_sheep', (x0 + x1) / 2, (z0 + z1) / 2, 120, 3, { speed: [10, 18] });
    } else if (type === 'homestead') {
      homestead(T, x0, z0, x1, z1);
    } else if (type === 'pasture') {
      paddock(T, x0 + 20, z0 + 20, x1 - 20, z1 - 20, ['horses', 'cows', 'sheep', 'cows', 'sheep', 'horses'][PASTURE.n++ % 6]);
    }
  }

  // A small family farm in a field cell: farmhouse, red barn, silo, coop and a chicken yard.
  function homestead(T, x0, z0, x1, z1) {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    T.rect(x0 + 10, z0 + 10, x1 - 10, z1 - 10, 0.5, COL.hill2);
    const spots = [['farm_barn', -150, -60, 140], ['farm_farmhouse', 140, -110, 110], ['farm_silo', -10, -170, 45], ['farm_coop', 130, 110, 40]];
    const ok = (x, z, r) => !nearLane(x, z, r) && x - r > x0 && x + r < x1 && z - r > z0 && z + r < z1;
    for (const [k, dx, dz, r] of spots) { const x = cx + dx, z = cz + dz; if (ok(x, z, r)) T.put(k, x, z, 0); }
    T.rect(cx - 40, cz + 30, cx + 220, cz + 210, 0.7, COL.yard);
    if (!nearLane(cx + 90, cz + 120, 60)) T.roamers('farm_chicken', cx + 90, cz + 120, 70, 4, { speed: [14, 26] });
    T.scatter({ farm_haybale: 3, farm_roundbale: 2, farm_chicken: 2, farm_pickup: 0.6, farm_tractor: 0.6, bush: 2, farm_scarecrow: 0.5 }, { x0: x0 + 30, z0: z0 + 30, x1: x1 - 30, z1: z1 - 30 }, 14, { gap: 16, avoid: (x, z) => nearLane(x, z, 24) });
  }

  // A fenced paddock with grazing animals, a trough and some hay.
  function paddock(T, x0, z0, x1, z1, what) {
    T.rect(x0, z0, x1, z1, 0.5, COL.hill2);
    const fence = (ax, az, bx, bz) => { const len = Math.hypot(bx - ax, bz - az), n = Math.floor(len / 40); for (let k = 0; k < n; k++) { const t = (k + 0.5) / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t; if (!busy(x, z, 6) && !(az === bz && Math.abs(x - (x0 + x1) / 2) < 40)) T.put('farm_fence', x, z, Math.atan2(-(bz - az), bx - ax)); } };
    fence(x0, z0, x1, z0); fence(x0, z1, x1, z1); fence(x0, z0, x0, z1); fence(x1, z0, x1, z1);
    let cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, r = Math.min(x1 - x0, z1 - z0) / 2 - 40;
    // Herd centre: the middle of the paddock, or the open spot furthest from any lane.
    if (busy(cx, cz, r * 0.5)) {
      let best = null, bd = -1;
      for (let k = 0; k < 40; k++) { const x = T.rng.range(x0 + 60, x1 - 60), z = T.rng.range(z0 + 60, z1 - 60); const d = Math.min(...LANES.map((L) => distLine(x, z, L.pts, L.closed) - L.w / 2)); if (d > bd && !inZone(x, z, 20)) { bd = d; best = [x, z]; } }
      if (!best || bd < 60) return;
      [cx, cz] = best; r = Math.min(r, bd - 20);
    }
    const n = what === 'sheep' ? 6 : what === 'cows' ? 6 : 4;
    const kind = what === 'sheep' ? 'farm_sheep' : what === 'cows' ? 'farm_cow' : 'farm_horse';
    T.roamers(kind, cx, cz, r * 0.8, n, { speed: what === 'horses' ? [30, 50] : [10, 20] });
    T.put('farm_roundbale', cx + r * 0.5, cz - r * 0.5, 0);
    T.scatter({ farm_haybale: 2, farm_roundbale: 1, bush: 1 }, { x0: x0 + 30, z0: z0 + 30, x1: x1 - 30, z1: z1 - 30 }, 4, { gap: 20, avoid: (x, z) => busy(x, z, 20) });
  }

  function windmillHill(T) {
    const x = 1100, z = 1080;
    T.disc(x, z, 520, 1.0, COL.hill, 40); T.disc(x, z, 430, 1.1, COL.hill2, 40);
    T.put('farm_windmill', x, z, 0);
    // sunflowers ring + picnic
    for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2, px = x + Math.cos(a) * 340, pz = z + Math.sin(a) * 340; if (!busy(px, pz, 10) || Math.hypot(px - x, pz - z) < 450) T.put('farm_sunflower', px, pz, 0); }
    for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2 + 0.1, px = x + Math.cos(a) * 395, pz = z + Math.sin(a) * 395; T.put(i % 2 ? 'flowerpot' : 'farm_sunflower', px, pz, 0); }
    for (const [dx, dz] of [[-300, 320], [300, 330]]) { T.put('bench', x + dx, z + dz, 0); }
    T.walkLoop(Array.from({ length: 16 }, (_, i) => [x + Math.cos(i / 16 * Math.PI * 2) * 300, z + Math.sin(i / 16 * Math.PI * 2) * 300]), 6, { person: 1 }, { dogChance: 0.3 });
  }

  function farmstead(T, ox, oz, flip) {
    // A working farm: two red barns, silos, farmhouse, coop with a chicken yard, machinery and hay.
    T.rect(ox - 650, oz - 600, ox + 650, oz + 600, 1.0, COL.yard);
    T.rect(ox - 640, oz - 590, ox + 640, oz + 590, 1.05, '#E8C48F');
    T.put('farm_barn', ox - 380, oz - 300, 0); T.put('farm_barn', ox - 80, oz - 300, 0, { tint: flip ? 3 : 0 });
    for (let k = 0; k < 3; k++) T.put('farm_silo', ox + 160 + k * 95, oz - 400, 0);
    T.put('farm_farmhouse', ox + 420, oz - 380, 0);
    T.put('farm_coop', ox + 200, oz - 150, 0); T.put('farm_coop', ox + 300, oz - 150, 0);
    T.rect(ox + 140, oz - 110, ox + 380, oz + 60, 1.2, '#D9B07A');
    T.roamers('farm_chicken', ox + 260, oz - 30, 90, 9, { speed: [14, 26] });
    T.put('farm_tractor', ox - 450, oz - 60, 0); T.put('farm_combine', ox - 230, oz - 70, 0); T.put('farm_pickup', ox + 490, oz - 200, Math.PI / 2);
    T.put('farm_beehive', ox + 470, oz - 40, 0); T.put('watertower', ox + 560, oz + 120, 0);
    for (let k = 0; k < 8; k++) T.put(k % 3 === 0 ? 'farm_roundbale' : 'farm_haybale', ox - 560 + k * 40, oz + 60 + (k % 2) * 22, 0);
    for (let k = 0; k < 6; k++) T.put('farm_roundbale', ox - 560 + k * 34, oz + 130, Math.PI / 2);
    T.scatter({ farm_chicken: 2, person: 1, farm_haybale: 2, dog: 1, bin: 1 }, { x0: ox - 620, z0: oz - 100, x1: ox + 620, z1: oz + 220 }, 24, { gap: 10, avoid: (x, z) => busy(x, z, 10) });
    // pig pens on the south side
    T.put('farm_dairy', ox + 390, oz + 410, 0, { tint: flip ? 1 : 0 });
    for (let p = 0; p < 2; p++) {
      const px0 = ox - 560 + p * 380, px1 = px0 + 330, pz0 = oz + 270, pz1 = oz + 560;
      T.rect(px0, pz0, px1, pz1, 1.15, COL.mud); T.disc((px0 + px1) / 2, (pz0 + pz1) / 2, 60, 1.25, '#8F6238', 16, 1.4, 0.8);
      const fence = (ax, az, bx, bz) => { const len = Math.hypot(bx - ax, bz - az), n = Math.floor(len / 40); for (let k = 0; k < n; k++) { const t = (k + 0.5) / n; T.put('farm_fence', ax + (bx - ax) * t, az + (bz - az) * t, Math.atan2(-(bz - az), bx - ax)); } };
      fence(px0, pz0, px1, pz0); fence(px0, pz1, px1, pz1); fence(px0, pz0, px0, pz1); fence(px1, pz0, px1, pz1);
      T.roamers(p === 1 ? 'farm_sheep' : 'farm_pig', (px0 + px1) / 2, (pz0 + pz1) / 2, 100, 6, { speed: [8, 16] });
      T.put('farm_haybale', px0 + 60, pz0 + 40, 0);
    }
  }

  // Farms tucked between the outer lane and the shore.
  function roadsideFarms(T) {
    const F = [[820, 110, 0, 'farm_farmhouse'], [1150, 120, 0, 'farm_barn'], [1900, 130, 0, 'farm_farmhouse'], [2850, 120, 0, 'farm_barn'], [3150, 100, 0, 'farm_farmhouse'],
      [800, 4890, Math.PI, 'farm_farmhouse'], [1700, 4900, Math.PI, 'farm_barn'], [2000, 4900, Math.PI, 'farm_farmhouse'], [3150, 4890, Math.PI, 'farm_barn'], [3450, 4900, Math.PI, 'farm_farmhouse'], [4350, 4880, Math.PI, 'farm_dairy'],
      [100, 1900, -Math.PI / 2, 'farm_farmhouse'], [100, 3100, -Math.PI / 2, 'farm_farmhouse'], [4900, 2000, Math.PI / 2, 'farm_farmhouse'], [4900, 3050, Math.PI / 2, 'farm_barn']];
    for (const [x, z, rot, k] of F) {
      const def = HC.CATALOG[k], r = Math.max(def.w, def.d) / 2 + 10;
      if (nearLane(x, z, r * 0.8)) continue;
      T.put(k, x, z, rot);
      const sx = Math.cos(rot), sz = -Math.sin(rot);
      const [ax, az] = [x + sx * (r + 60), z + sz * (r + 60)];
      if (!nearLane(ax, az, 50)) T.put(k === 'farm_farmhouse' ? 'farm_coop' : 'farm_silo', ax, az, rot);
      if (k === 'farm_farmhouse') T.roamers('farm_chicken', ax, az + (z < 2500 ? 70 : -70), 40, 2, { speed: [14, 24] });
    }
  }

  function village(T) {
    // Crossroads village: market square (NW), shops (NE), cottages (SW), co-op & cafe (SE).
    const [cx, cz] = C;
    T.put('parktree', cx, cz, 0);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; T.put('flowerpot', cx + Math.cos(a) * 52, cz + Math.sin(a) * 52, 0); }
    // NW market
    T.rect(cx - 560, cz - 520, cx - 110, cz - 110, 1.2, '#F3E3C8');
    for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) T.put('farm_stall', cx - 490 + k * 100, cz - 430 + r * 170, r ? Math.PI : 0);
    T.put('fountain', cx - 300, cz - 190, 0);
    T.scatter({ person: 6, farm_chicken: 3, farm_haybale: 2, cafeset: 1, farm_cabbage: 2, dog: 1 }, { x0: cx - 550, z0: cz - 510, x1: cx - 130, z1: cz - 130 }, 30, { gap: 4, avoid: (x, z) => busy(x, z, 6) });
    // NE shops
    T.rect(cx + 120, cz - 560, cx + 620, cz - 120, 1.2, '#F0E6F5');
    T.put('shop', cx + 260, cz - 400, Math.PI, { tint: 3 }); T.put('shop', cx + 500, cz - 400, Math.PI, { tint: 1 });
    T.put('watertower', cx + 540, cz - 190, 0);
    for (let k = 0; k < 5; k++) T.put(T.pick({ farm_pickup: 3, van: 1 }), cx + 180 + k * 70, cz - 200, Math.PI / 2);
    // SW cottages
    T.put('cottage', cx - 400, cz + 320, 0, { tint: 2 }); T.put('farm_farmhouse', cx - 200, cz + 420, 0, { tint: 1 });
    T.put('farm_coop', cx - 470, cz + 520, 0); T.roamers('farm_chicken', cx - 380, cz + 560, 60, 6, { speed: [14, 26] });
    // SE co-op cafe
    T.rect(cx + 120, cz + 120, cx + 600, cz + 600, 1.2, '#F7EAD6');
    T.put('shop', cx + 260, cz + 300, 0, { tint: 2 }); T.put('shop', cx + 480, cz + 300, 0, { tint: 0 });
    for (let k = 0; k < 5; k++) T.put('cafeset', cx + 180 + k * 75, cz + 480, 0);
    T.walkLoop([[cx - 200, cz - 200], [cx + 200, cz - 200], [cx + 200, cz + 200], [cx - 200, cz + 200]], 7, { person: 1 }, { dogChance: 0.3 });
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + 0.26; const x = cx + Math.cos(a) * 220, z = cz + Math.sin(a) * 220; if (!busy(x, z, 8)) T.put(i % 3 ? 'lamp' : 'bench', x, z, -a); }
  }

  function pondAndOrchard(T) {
    const px = 1050, pz = 3950;
    T.disc(px, pz, 300, 1.2, COL.pondEdge, 36, 1.2, 0.9); T.disc(px, pz, 270, 1.4, COL.pond2, 36, 1.2, 0.9); T.disc(px, pz, 220, 1.6, COL.pond, 36, 1.2, 0.9);
    T.roamers('duck', px, pz, 160, 8, { speed: [10, 20] });
    for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; const x = px + Math.cos(a) * 380, z = pz + Math.sin(a) * 340; if (!nearLane(x, z, 10)) T.put(i % 4 === 0 ? 'bench' : i % 2 ? 'bush' : 'farm_appletree', x, z, -a + Math.PI / 2); }
    T.walkLoop(Array.from({ length: 16 }, (_, i) => [px + Math.cos(i / 16 * Math.PI * 2) * 330, pz + Math.sin(i / 16 * Math.PI * 2) * 300]), 5, { person: 1 }, { dogChance: 0.4 });
    // orchard
    T.rect(1520, 3820, 2300, 4440, 1.0, COL.hill);
    for (let z = 3880; z < 4420; z += 90) for (let x = 1580; x < 2280; x += 80) if (!nearLane(x, z, 18)) T.put('farm_appletree', x + ((z / 90 | 0) % 2) * 30, z, T.rng() * 6);
    for (let k = 0; k < 8; k++) T.put('farm_beehive', 1560 + k * 30, 4470, 0);
    T.put('farm_pickup', 2200, 4480, 0); T.put('farm_stall', 2100, 4480, 0);
  }

  function edges(T) {
    // Sandy shore ring with a few picnic spots; tall pines around the edge hedge.
    for (let x = -20; x < 5030; x += 110) for (const z of [-10, 5010]) if (!busy(x, z, 10) && T.rng.chance(0.6)) T.put(T.pick({ pine: 2, parktree: 2, bush: 3, farm_appletree: 1 }), x + T.rng.range(-20, 20), z + T.rng.range(-30, 30), T.rng() * 6);
    for (let z = -20; z < 5030; z += 110) for (const x of [-10, 5010]) if (!busy(x, z, 10) && T.rng.chance(0.6)) T.put(T.pick({ pine: 2, parktree: 2, bush: 3, farm_appletree: 1 }), x + T.rng.range(-30, 30), z + T.rng.range(-20, 20), T.rng() * 6);
    T.beach({ duck: 2, beachball: 1, person: 2, farm_haybale: 1 }, 30);
    // mailboxes & lamps along the lanes
    for (const L of LANES) for (let i = 4; i < L.pts.length - 4; i += 9) {
      const [x, z] = L.pts[i], [x2, z2] = L.pts[i + 1], dx = x2 - x, dz = z2 - z, l = Math.hypot(dx, dz) || 1, ox = -dz / l * (L.w / 2 + 16), oz = dx / l * (L.w / 2 + 16);
      const k = T.pick({ mailbox: 1, farm_haybale: 2, farm_fence: 2, bush: 2, farm_scarecrow: 0.3 });
      if (!inZone(x + ox, z + oz, 10) && T.free(x + ox, z + oz, 12)) T.put(k, x + ox, z + oz, Math.atan2(-dz, dx));
    }
  }

  function traffic(T) {
    const [NS, EW, RING, OUTER] = LANES.map((L) => L.pts);
    const veh = { farm_tractor: 4, farm_pickup: 4 };
    fleet(T, veh, RING, 6, 95, 24); fleet(T, veh, RING.slice().reverse(), 6, 95, 24);
    fleet(T, Object.assign({ farm_combine: 1 }, veh), OUTER, 6, 80, 24); fleet(T, veh, OUTER.slice().reverse(), 5, 95, 24);
    const there = (p) => [...p, ...p.slice().reverse()];
    const cut = (p) => p.filter(([x, z]) => x > -40 && x < 5040 && z > -40 && z < 5040);
    fleet(T, veh, there(cut(NS)), 4, 100, 24); fleet(T, veh, there(cut(EW)), 4, 100, 24);
    // Farmers strolling the lanes.
    T.walkLoop(offsetLine(RING, 62, true), 8, { person: 1 }, { dogChance: 0.3, lane: 0 });
  }

  HC.Levels.add({
    id: 'farm', num: 4, name: 'Cluckington Farm', tagline: 'Patchwork fields · animals, barns & a windmill', icon: '🐄', colors: ['#7BD35A', '#FFC93D'],
    theme: { sky: '#9CE4FF', sea: { show: true, deep: '#1E9BE0', shallow: '#62DBF5', foam: 1 }, skirt: '#B9844F', hemiSky: '#F0FBFF', hemiGround: '#D7C48A', hemi: 1.5, sun: '#FFE7BF', sunI: 2.55 },
    mods: { botSkill: -0.1 },
    milestones: [['farm_tractor', '🚜 Tractors'], ['farm_coop', '🐔 Chicken coops'], ['farm_silo', '🛢️ Silos'], ['farm_combine', '🌾 Combines'], ['farm_farmhouse', '🏡 Farmhouses'], ['farm_barn', '🏚️ Red barns'], ['farm_dairy', '🐮 Dairy barns'], ['farm_elevator', '🏭 Grain elevators'], ['farm_windmill', '🌬️ THE WINDMILL']],
    kinds,
    generate(T) {
      ZONES.length = 0; PASTURE.n = 0;
      buildLanes();
      T.rect(-278, -278, 5278, 5278, -1.2, COL.edge); T.rect(-260, -260, 5260, 5260, -0.6, COL.sand); T.rect(-150, -150, 5150, 5150, -0.3, COL.grass);
      for (let i = 0; i < 18; i++) T.disc(T.rng.range(0, 5000), T.rng.range(0, 5000), T.rng.range(200, 420), -0.2, i % 2 ? COL.grass2 : COL.hill, 24, 1.3, 0.9);
      // Reserved areas first so fields steer around them.
      ZONES.push({ x: 1880, z: 1720, r: 300 }, { x: C[0], z: C[1], r: 700 }, { x: 1100, z: 1080, r: 540 }, { x0: 3350, z0: 380, x1: 4650, z1: 1580 }, { x0: 3350, z0: 3350, x1: 4650, z1: 4550 }, { x: 1050, z: 3950, r: 380 }, { x0: 1520, z0: 3820, x1: 2300, z1: 4500 });
      const spawnSpots = [];
      fields(T, spawnSpots);
      drawLanes(T);
      T.put('farm_elevator', 3000, 980, 0);
      T.put('farm_elevator', 2950, 3980, 0, { tint: 1 }); T.put('farm_elevator', 1880, 1720, 0, { tint: 2 });
      roadsideFarms(T);
      windmillHill(T);
      farmstead(T, 4000, 980, false); farmstead(T, 4000, 3950, true);
      village(T); pondAndOrchard(T); edges(T); traffic(T);
      // Spawns: middle of crop fields + village corners + farm yards.
      spawnSpots.sort(() => T.rng() - 0.5).slice(0, 12).forEach(([x, z]) => T.spawnAt(x, z));
      for (const [x, z] of [[2200, 2800], [2800, 2200], [4260, 1130], [4260, 4100], [1050, 3600], [1100, 1500]]) T.spawnAt(x, z);
    },
  });
})();
