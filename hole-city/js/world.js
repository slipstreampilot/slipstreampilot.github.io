// World state: the list of swallowable objects and a spatial grid over the ones still standing.
// Object states: 'static' (scripted or resting, no physics body), 'active' (has a physics body),
// 'gone' (swallowed).
(function () {
  const W = {};
  const yawQ = (a) => [0, Math.sin(a / 2), 0, Math.cos(a / 2)];
  W.yawQ = yawQ;

  W.init = function (city) {
    W.city = city;
    W.objects = [];
    W.off = city.land.min - 200;
    W.grid = new HC.U.Grid(city.land.max - W.off + 200, 250);
    W.totalPoints = 0; W.eatenPoints = 0;
    let id = 0;
    for (const src of city.objects) {
      const def = HC.CATALOG[src.kind];
      const o = { id: id++, kind: src.kind, def, tint: src.tint, inst: src.inst, x: src.x, z: src.z, rot: src.rot || 0,
        p: [src.x, 0, src.z], q: yawQ(src.rot || 0), state: 'static', body: null, mover: src.mover ? Object.assign({}, src.mover) : null };
      W.objects.push(o);
      W.totalPoints += def.points;
    }
    if (HC.Movers) HC.Movers.init(W);
    for (const o of W.objects) { o.entry = { ref: o, x: o.x - W.off, y: o.z - W.off }; W.grid.insert(o.entry); }
  };

  W.query = function (x, z, r, out = []) {
    const tmp = W.grid.query(x - W.off, z - W.off, r);
    for (let i = 0; i < tmp.length; i++) { const o = tmp[i].ref; if (o.state !== 'gone' && o.state !== 'captured') out.push(o); }
    return out;
  };
  W.moved = function (o) { const e = o.entry; e.x = o.x - W.off; e.y = o.z - W.off; W.grid.move(e); };
  W.markGone = function (o) { o.state = 'gone'; W.grid.remove(o.entry); W.eatenPoints += o.def.points; };

  HC.World = W;
})();
