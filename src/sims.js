/* Project tile animations. Traffic physics ported from phantom-traffic / phantom-evolve-gametheory
   (IDM + FollowerStopper, src/engine.js and src/evolve.js); circuit states from darwin-board demo-trace.json. */
const Sims = (function () {
  const TAU2 = Math.PI * 2;
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif';

  function palette() {
    const root = document.documentElement, s = getComputedStyle(root);
    const v = (n, d) => s.getPropertyValue(n).trim() || d;
    const light = root.getAttribute('data-theme') === 'light';
    return { light, fg: v('--fg', '#f5f5f7'), link: v('--link', '#2997ff'), card: light ? '#f5f5f7' : '#161617' };
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function mount(canvas, sim, opts) {
    const reduced = !!(opts && opts.reduced);
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, raf = 0, last = 0, visible = true, dead = false, pal = palette();
    const size = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight, d = Math.min(2, window.devicePixelRatio || 1);
      if (!w || !h || w > 4000 || h > 4000) return false;
      if (w === W && h === H) return true;
      W = w; H = h;
      canvas.width = Math.round(W * d); canvas.height = Math.round(H * d);
      ctx.setTransform(d, 0, 0, d, 0, 0);
      if (sim.resize) sim.resize(W, H);
      return true;
    };
    const paint = () => { ctx.clearRect(0, 0, W, H); ctx.globalAlpha = 1; sim.draw(ctx, W, H, pal); };
    const frame = t => {
      if (dead) return;
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016;
      last = t;
      if (!visible || !W) return;
      sim.update(dt); paint();
    };
    const detach = sim.attach ? sim.attach(canvas) : null;
    size();
    if (reduced && sim.warm) sim.warm();
    if (W) paint();
    if (!reduced) raf = requestAnimationFrame(frame);
    const ro = new ResizeObserver(() => { if (size()) paint(); });
    ro.observe(canvas);
    const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; last = 0; });
    io.observe(canvas);
    const mo = new MutationObserver(() => { pal = palette(); if (W) paint(); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return { stop() { if (detach) detach(); dead = true; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); mo.disconnect(); } };
  }

  /* ---------- Cellular automaton: Drossel–Schwabl forest fire ---------- */
  function forestFire() {
    const S = 12, R = 4.2;
    let cols = 0, rows = 0, g = null, acc = 0;
    const seed = () => {
      g = new Uint8Array(cols * rows);
      for (let i = 0; i < g.length; i++) g[i] = Math.random() < 0.55 ? 1 : 0;
      g[Math.floor(Math.random() * g.length)] = 2;
    };
    const step = () => {
      const n = new Uint8Array(g.length);
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const i = y * cols + x, v = g[i];
        if (v === 2) n[i] = 0;
        else if (v === 1) {
          const burn = (x > 0 && g[i - 1] === 2) || (x < cols - 1 && g[i + 1] === 2) || (y > 0 && g[i - cols] === 2) || (y < rows - 1 && g[i + cols] === 2);
          n[i] = burn || Math.random() < 0.00025 ? 2 : 1;
        } else n[i] = Math.random() < 0.01 ? 1 : 0;
      }
      g = n;
    };
    return {
      resize(W, H) {
        const c = Math.max(1, Math.floor(W / S)), r = Math.max(1, Math.floor(H / S));
        if (c !== cols || r !== rows) { cols = c; rows = r; seed(); }
      },
      update(dt) { acc += dt; while (acc > 0.11) { acc -= 0.11; step(); } },
      warm() { for (let i = 0; i < 80; i++) step(); },
      draw(ctx, W, H, p) {
        if (!g) return;
        const ox = (W - cols * S) / 2 + S / 2, oy = (H - rows * S) / 2 + S / 2;
        const paths = [new Path2D(), new Path2D(), new Path2D()];
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
          const path = paths[g[y * cols + x]], cx = ox + x * S, cy = oy + y * S;
          path.moveTo(cx + R, cy); path.arc(cx, cy, R, 0, TAU2);
        }
        ctx.fillStyle = p.fg;
        ctx.globalAlpha = 0.08; ctx.fill(paths[0]);
        ctx.globalAlpha = 0.32; ctx.fill(paths[1]);
        ctx.globalAlpha = 1; ctx.fillStyle = '#ff9f0a'; ctx.fill(paths[2]);
      }
    };
  }

  /* ---------- Traffic engine (IDM + FollowerStopper), from phantom engine.js / evolve.js ---------- */
  const DT = 0.05, DELTA = 4.0, TAU = 0.8, A_MAX = 1.2, B_COMF = 2.0, S0 = 2.0, RING_LEN = 500, HUMAN_T = 1.1;
  const CLASSES = [
    { n: 'bike', len: 2.0, v0: 20, share: 0.40, w: 0.22 },
    { n: 'auto', len: 3.2, v0: 15, share: 0.25, w: 0.32 },
    { n: 'car', len: 4.5, v0: 18, share: 0.25, w: 0.36 },
    { n: 'truck', len: 8.0, v0: 13, share: 0.10, w: 0.44 }
  ];
  const STRAT = { N: 0, C: 1, D: 2 };
  const DEF = { T: 0.7, A: 1.8, V0: 18 };
  const PAY = { speed: 1.0, comfort: 0.15, fuel: 0.10 };
  const FS = { d1: 1.5, d2: 1.0, d3: 0.5, dx1: 4.5, dx2: 6.0, dx3: 7.5, RELAX: 0.5 };

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function idmP(v, s, dv, v0, T, aMax) {
    s = Math.max(s, 0.1);
    const sStar = S0 + Math.max(0, v * T + (v * dv) / (2 * Math.sqrt(aMax * B_COMF)));
    return aMax * (1 - Math.pow(v / v0, DELTA) - (sStar / s) * (sStar / s));
  }
  function fsAccel(v, s, vLead, U) {
    const dv = Math.min(vLead - v, 0);
    const dx1 = FS.dx1 + dv * dv / (2 * FS.d1), dx2 = FS.dx2 + dv * dv / (2 * FS.d2), dx3 = FS.dx3 + dv * dv / (2 * FS.d3);
    const vbar = Math.min(Math.max(vLead, 0), U);
    let vcmd;
    if (s <= dx1) vcmd = 0;
    else if (s <= dx2) vcmd = vbar * (s - dx1) / (dx2 - dx1);
    else if (s <= dx3) vcmd = vbar + (U - vbar) * (s - dx2) / (dx3 - dx2);
    else vcmd = U;
    return Math.max(-4, Math.min(A_MAX, (vcmd - v) / FS.RELAX));
  }
  function fuelRate(v, a) { return 0.10 + 0.03 * v + 0.60 * v * Math.max(0, a); }

  class Road {
    constructor(N, strat, seed) {
      this.N = N; this.L = RING_LEN; this.rng = mulberry32(seed); this.delay = Math.round(TAU / DT);
      this.x = new Float64Array(N); this.v = new Float64Array(N);
      this.len = new Float64Array(N); this.v0 = new Float64Array(N); this.cls = new Int8Array(N);
      this.strat = strat; this.forceTap = false; this.recording = false;
      for (let i = 0; i < N; i++) {
        let c = 2;
        if (strat[i] === STRAT.N) {
          const r = this.rng(); let acc = 0;
          for (let k = 0; k < CLASSES.length; k++) { acc += CLASSES[k].share; if (r <= acc) { c = k; break; } }
          this.len[i] = CLASSES[c].len; this.v0[i] = CLASSES[c].v0;
        } else { this.len[i] = 4.5; this.v0[i] = strat[i] === STRAT.C ? 18 : DEF.V0; }
        this.cls[i] = c;
      }
      for (let i = 0; i < N; i++) { this.x[i] = (i * this.L / N) % this.L; this.v[i] = this.v0[i] * 0.75; }
      for (let i = 0; i < N; i++) this.x[i] += (this.rng() - 0.5) * 0.4;
      this.histX = []; this.histV = [];
      for (let k = 0; k <= this.delay; k++) { this.histX.push(this.x.slice()); this.histV.push(this.v.slice()); }
      this.resetAcc();
    }
    resetAcc() { const N = this.N; this.acc = { spd: new Float64Array(N), a2: new Float64Array(N), fuel: new Float64Array(N), n: 0 }; }
    order() { return Array.from({ length: this.N }, (_, i) => i).sort((a, b) => this.x[a] - this.x[b]); }
    step() {
      const N = this.N, L = this.L, ord = this.order(), lead = new Int32Array(N);
      for (let k = 0; k < N; k++) lead[ord[k]] = ord[(k + 1) % N];
      const di = Math.max(0, this.histX.length - 1 - this.delay), xd = this.histX[di], vd = this.histV[di];
      let sumv = 0; for (let i = 0; i < N; i++) sumv += this.v[i];
      const U = Math.max(3, Math.min(18, (sumv / N) * 1.05));
      const a = new Float64Array(N);
      for (let i = 0; i < N; i++) {
        const j = lead[i], s = this.strat[i];
        if (s === STRAT.C) {
          a[i] = fsAccel(this.v[i], ((this.x[j] - this.x[i]) % L + L) % L - this.len[i], this.v[j], U);
        } else if (s === STRAT.D) {
          const gap = ((this.x[j] - this.x[i]) % L + L) % L - this.len[i];
          a[i] = Math.max(-4, Math.min(DEF.A, idmP(this.v[i], gap, this.v[i] - this.v[j], DEF.V0, DEF.T, DEF.A)));
        } else {
          const gap = ((xd[j] - xd[i]) % L + L) % L - this.len[i];
          a[i] = idmP(vd[i], gap, vd[i] - vd[j], this.v0[i], HUMAN_T, A_MAX);
          if (this.rng() < 0.03 * DT) a[i] -= 1.2;
        }
      }
      if (this.forceTap) {
        const t = ord[Math.floor(this.rng() * N)];
        if (this.strat[t] === STRAT.N) a[t] -= 6;
        this.forceTap = false;
      }
      for (let i = 0; i < N; i++) { this.v[i] = Math.max(0, this.v[i] + a[i] * DT); this.x[i] = ((this.x[i] + this.v[i] * DT) % L + L) % L; }
      this.histX.push(this.x.slice()); this.histV.push(this.v.slice());
      if (this.histX.length > this.delay + 4) { this.histX.shift(); this.histV.shift(); }
      if (this.recording) {
        for (let i = 0; i < N; i++) {
          this.acc.spd[i] += this.v[i] / this.v0[i];
          this.acc.a2[i] += a[i] * a[i];
          this.acc.fuel[i] += fuelRate(this.v[i], a[i]) * DT;
        }
        this.acc.n++;
      }
    }
    metrics() {
      let ms = 0, stop = 0;
      for (let i = 0; i < this.N; i++) { ms += this.v[i] / this.v0[i]; if (this.v[i] < 0.15 * this.v0[i]) stop++; }
      return { meanNorm: ms / this.N, stopFrac: stop / this.N };
    }
    classify(m, light) {
      const s = m.stopFrac, mn = m.meanNorm;
      if (s > 0.55 && mn < 0.15) return ['Gridlock', light ? '#c62828' : '#E5484D'];
      if (s > 0.32 || mn < 0.28) return ['Phantom jam', light ? '#d4501f' : '#F2724B'];
      if (mn < 0.62) return ['Jam forming', light ? '#a87700' : '#F2BE4B'];
      return ['Free flow', light ? '#1f8f5f' : '#37D08A'];
    }
    payoffs() {
      const pi = [0, 0, 0], count = [0, 0, 0], n = Math.max(1, this.acc.n);
      for (let i = 0; i < this.N; i++) {
        const s = this.strat[i];
        pi[s] += PAY.speed * this.acc.spd[i] / n - PAY.comfort * Math.sqrt(this.acc.a2[i] / n) - PAY.fuel * this.acc.fuel[i] / (n * DT);
        count[s]++;
      }
      for (let s = 0; s < 3; s++) if (count[s]) pi[s] /= count[s];
      return { pi, count };
    }
  }

  function avSlots(N, nav) { const s = []; for (let k = 0; k < nav; k++) s.push(Math.floor(k * N / nav)); return s; }

  const SPEED = { dark: ['#5BD6A8', '#FFD23F', '#FF6B5B'], light: ['#1f9e6e', '#c99400', '#e5484d'] };
  const AV = { dark: '#7FB3FF', light: '#2d6fe0' };
  const VIOLET = { dark: '#B79CFF', light: '#7a56d8' };

  function ringGeom(W, H) {
    const cx = W / 2, cy = H / 2, Rout = Math.min(W, H) / 2 - 6, band = clamp(Rout * 0.17, 14, 28), Rin = Rout - band;
    return { cx, cy, Rout, Rin, band, rm: (Rout + Rin) / 2 };
  }
  function drawRoad(ctx, g, p) {
    ctx.beginPath(); ctx.arc(g.cx, g.cy, g.Rout, 0, TAU2); ctx.arc(g.cx, g.cy, g.Rin, 0, TAU2, true);
    ctx.fillStyle = p.light ? '#e4e4e9' : '#1A1D23'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = p.light ? '#d2d2d7' : '#2A2E37';
    ctx.beginPath(); ctx.arc(g.cx, g.cy, g.Rout, 0, TAU2); ctx.stroke();
    ctx.beginPath(); ctx.arc(g.cx, g.cy, g.Rin, 0, TAU2); ctx.stroke();
  }
  function drawVehicles(ctx, g, road, colorOf) {
    for (let i = 0; i < road.N; i++) {
      const ang = road.x[i] / road.L * TAU2 - Math.PI / 2;
      const vx = g.cx + Math.cos(ang) * g.rm, vy = g.cy + Math.sin(ang) * g.rm;
      const lenPx = clamp(road.len[i] / road.L * TAU2 * g.rm, 3, 18), widPx = clamp(g.band * CLASSES[road.cls[i]].w, 3, 10);
      const c = colorOf(i);
      ctx.save(); ctx.translate(vx, vy); ctx.rotate(ang);
      if (c.glow) { ctx.shadowColor = c.col; ctx.shadowBlur = 9; }
      ctx.fillStyle = c.col; roundRect(ctx, -widPx / 2, -lenPx / 2, widPx, lenPx, 1.5); ctx.fill();
      ctx.restore();
    }
  }
  function speedColor(road, i, p) {
    const sp = road.v[i] / road.v0[i], k = p.light ? 'light' : 'dark';
    return SPEED[k][sp > 0.6 ? 0 : sp > 0.3 ? 1 : 2];
  }

  /* ---------- Phantom: ring road with one FollowerStopper AV ---------- */
  function phantomRing() {
    const N = 38, strat = new Int8Array(N); strat[0] = STRAT.C;
    const road = new Road(N, strat, 7);
    let acc = 0, tap = 0;
    const tick = () => { road.step(); tap += DT; if (tap > 16) { tap = 0; road.forceTap = true; } };
    return {
      update(dt) { acc += dt * 6; while (acc >= DT) { acc -= DT; tick(); } },
      warm() { for (let i = 0; i < 1400; i++) tick(); },
      draw(ctx, W, H, p) {
        const g = ringGeom(W, H), k = p.light ? 'light' : 'dark';
        drawRoad(ctx, g, p);
        drawVehicles(ctx, g, road, i => road.strat[i] === STRAT.C ? { col: AV[k], glow: true } : { col: speedColor(road, i, p) });
        const [label, col] = road.classify(road.metrics(), p.light);
        ctx.textAlign = 'center';
        ctx.fillStyle = col; ctx.font = `600 15px ${FONT}`; ctx.fillText(label, g.cx, g.cy - 2);
        ctx.fillStyle = p.fg; ctx.globalAlpha = 0.6; ctx.font = `12px ${FONT}`;
        ctx.fillText(`${N} vehicles | 1 autonomous`, g.cx, g.cy + 16);
        ctx.globalAlpha = 1; ctx.textAlign = 'left';
      }
    };
  }

  /* ---------- Phantom Evolve: cooperative vs defector AVs under logit replicator ---------- */
  function evolveRing() {
    const N = 40, nav = 12, slots = avSlots(N, nav), rng = mulberry32(11);
    const WARM = 8, GEN = 24, BETA = 12;
    let pC = 0.5, gen = 0, absorbed = 0, t = 0, acc = 0;
    const assign = strat => {
      const sh = slots.slice();
      for (let i = sh.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [sh[i], sh[j]] = [sh[j], sh[i]]; }
      const nC = Math.round(pC * nav);
      sh.forEach((idx, k) => { strat[idx] = k < nC ? STRAT.C : STRAT.D; });
    };
    const strat = new Int8Array(N); assign(strat);
    const road = new Road(N, strat, 23);
    const evolve = () => {
      const p = road.payoffs();
      if (p.count[1] > 0 && p.count[2] > 0) {
        const wc = pC * Math.exp(BETA * p.pi[1]), wd = (1 - pC) * Math.exp(BETA * p.pi[2]);
        pC = clamp(wc / (wc + wd), 0, 1);
      } else absorbed++;
      gen++;
      if (absorbed >= 2) { pC = 0.5; gen = 0; absorbed = 0; }
      assign(road.strat);
      road.resetAcc(); t = WARM;
    };
    const tick = () => {
      road.step(); t += DT;
      if (!road.recording && t >= WARM) { road.recording = true; road.resetAcc(); }
      if (road.recording && t >= WARM + GEN) evolve();
    };
    return {
      update(dt) { acc += dt * 8; while (acc >= DT) { acc -= DT; tick(); } },
      warm() { for (let i = 0; i < 2000; i++) tick(); },
      draw(ctx, W, H, p) {
        const g = ringGeom(W, H), k = p.light ? 'light' : 'dark';
        drawRoad(ctx, g, p);
        drawVehicles(ctx, g, road, i => {
          const s = road.strat[i];
          if (s === STRAT.C) return { col: AV[k], glow: true };
          if (s === STRAT.D) return { col: VIOLET[k], glow: true };
          return { col: speedColor(road, i, p) };
        });
        let nC = 0; for (const idx of slots) if (road.strat[idx] === STRAT.C) nC++;
        const share = nC / nav;
        ctx.textAlign = 'center'; ctx.fillStyle = p.fg;
        ctx.font = `600 15px ${FONT}`; ctx.fillText(`Generation ${gen}`, g.cx, g.cy - 10);
        ctx.globalAlpha = 0.7; ctx.font = `12px ${FONT}`;
        ctx.fillText(`Cooperative AVs ${Math.round(share * 100)}%`, g.cx, g.cy + 8);
        ctx.globalAlpha = 1;
        const bw = Math.min(96, g.Rin * 1.2), bx = g.cx - bw / 2, by = g.cy + 18;
        ctx.fillStyle = VIOLET[k]; roundRect(ctx, bx, by, bw, 5, 2.5); ctx.fill();
        if (share > 0) { ctx.fillStyle = AV[k]; roundRect(ctx, bx, by, Math.max(5, bw * share), 5, 2.5); ctx.fill(); }
        ctx.textAlign = 'left';
      }
    };
  }

  /* ---------- Darwin Board: reconfigurable RC filter (demo-trace.json states) ---------- */
  function darwinCircuit() {
    const PH = [
      { t: 'Commissioned', d: 'R1 1.0 kΩ | C5, C6, C8 | 132 nF | 1,179 Hz', mask: 176, r: 'R1  1.0 kΩ', fault: -1, dur: 3.6 },
      { t: 'Fault detected', d: 'C8 open | 7.18 dB error', mask: 176, r: 'R1  1.0 kΩ', fault: 7, dur: 2.8 },
      { t: 'Recovered', d: 'R2 2.2 kΩ | C1, C3, C5, C7 | 59.67 nF | 1,201 Hz', mask: 85, r: 'R2  2.2 kΩ', fault: 7, dur: 4.4 }
    ];
    let ph = 0, pt = 0, time = 0;
    const sw = new Float64Array(8);
    for (let i = 0; i < 8; i++) sw[i] = (PH[0].mask >> i) & 1;
    return {
      update(dt) {
        time += dt; pt += dt;
        if (pt > PH[ph].dur) { pt = 0; ph = (ph + 1) % PH.length; }
        const m = PH[ph].mask;
        for (let i = 0; i < 8; i++) sw[i] += (((m >> i) & 1) - sw[i]) * Math.min(1, dt * 6);
      },
      warm() { ph = 2; for (let i = 0; i < 8; i++) sw[i] = (PH[2].mask >> i) & 1; },
      draw(ctx, W, H, p) {
        const P = PH[ph], m = 16, red = p.light ? '#d70015' : '#ff453a';
        ctx.textAlign = 'left';
        ctx.font = `600 13px ${FONT}`; ctx.fillStyle = ph === 1 ? red : p.fg; ctx.fillText(P.t, m, 18);
        ctx.font = `12px ${FONT}`; ctx.fillStyle = p.fg; ctx.globalAlpha = 0.7; ctx.fillText(P.d, m, 36); ctx.globalAlpha = 1;

        const y0 = Math.max(70, H / 2 - 48), x0 = m + 30, x1 = W - m - 38;
        const rw = clamp((x1 - x0) * 0.16, 40, 64), rx0 = x0 + 8, rx1 = rx0 + rw;
        const bank0 = Math.max(rx1 + 28, x0 + (x1 - x0) * 0.3), bank1 = x1 - 22;
        const pl = Math.min(8, (bank1 - bank0) / 7 * 0.3);
        const bx = i => bank0 + (bank1 - bank0) * i / 7, xn = (bank0 + bank1) / 2;
        const y1 = y0 + 26, ys = y1 + 20, yc = ys + 12, y2 = yc + 30;

        ctx.font = `12px ${FONT}`; ctx.fillStyle = p.fg; ctx.globalAlpha = 0.7;
        ctx.fillText('Vin', m, y0 + 4); ctx.textAlign = 'right'; ctx.fillText('Vout', W - m, y0 + 4);
        ctx.textAlign = 'center'; ctx.globalAlpha = 1; ctx.font = `600 12px ${FONT}`;
        ctx.fillText(P.r, rx0 + rw / 2, y0 - 16);

        ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = p.fg; ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(rx0, y0);
        for (let k = 0; k < 6; k++) ctx.lineTo(rx0 + (k + 0.5) * rw / 6, y0 + (k % 2 ? 8 : -8));
        ctx.lineTo(rx1, y0); ctx.lineTo(x1, y0);
        ctx.moveTo(xn, y0); ctx.lineTo(xn, y1); ctx.moveTo(bx(0), y1); ctx.lineTo(bx(7), y1);
        ctx.stroke();
        ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(bx(0), y2); ctx.lineTo(bx(7) + 16, y2); ctx.lineTo(bx(7) + 16, y2 + 6);
        ctx.moveTo(bx(7) + 8, y2 + 6); ctx.lineTo(bx(7) + 24, y2 + 6); ctx.moveTo(bx(7) + 11, y2 + 10); ctx.lineTo(bx(7) + 21, y2 + 10);
        ctx.moveTo(bx(7) + 14, y2 + 14); ctx.lineTo(bx(7) + 18, y2 + 14); ctx.stroke();

        ctx.globalAlpha = 1; ctx.strokeStyle = p.link; ctx.setLineDash([3, 9]); ctx.lineDashOffset = -time * 40;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(rx0, y0); ctx.moveTo(rx1, y0); ctx.lineTo(x1, y0); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = p.link; ctx.beginPath(); ctx.arc(xn, y0, 3.5, 0, TAU2); ctx.fill();

        for (let i = 0; i < 8; i++) {
          const x = bx(i), s = sw[i], faulted = P.fault === i;
          const col = faulted ? red : s > 0.5 ? p.link : p.fg;
          ctx.strokeStyle = col;
          ctx.globalAlpha = faulted ? (ph === 1 ? 0.55 + 0.45 * Math.sin(time * 10) : 0.7) : 0.22 + 0.78 * s;
          const a = (1 - s) * 0.55, bl = ys - y1 - 4;
          ctx.beginPath();
          ctx.moveTo(x, y1); ctx.lineTo(x, y1 + 4);
          ctx.lineTo(x + Math.sin(a) * bl, y1 + 4 + Math.cos(a) * bl);
          ctx.moveTo(x, ys); ctx.lineTo(x, yc);
          ctx.moveTo(x - pl, yc); ctx.lineTo(x + pl, yc);
          const gap = faulted ? 11 : 5;
          ctx.moveTo(x - pl, yc + gap); ctx.lineTo(x + pl, yc + gap);
          ctx.moveTo(x, yc + gap); ctx.lineTo(x, y2);
          ctx.stroke();
          if (s > 0.5 && !faulted) {
            ctx.setLineDash([2, 6]); ctx.lineDashOffset = -time * 30; ctx.globalAlpha = 0.9;
            ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y1 + 4); ctx.moveTo(x, ys); ctx.lineTo(x, yc); ctx.stroke();
            ctx.setLineDash([]);
          }
          ctx.globalAlpha = faulted ? 1 : 0.6; ctx.fillStyle = faulted ? red : p.fg; ctx.font = `10px ${FONT}`;
          ctx.fillText(`C${i + 1}`, x, y2 + 26);
        }
        ctx.globalAlpha = 1; ctx.textAlign = 'left';
      }
    };
  }

  /* ---------- CPCS: doorway tripwire with ByteTrack-style boxes ---------- */
  function cpcsDoor() {
    let W = 400, H = 240, people = [], nextId = 17, spawn = 0.3, inC = 0, outC = 0;
    const add = () => {
      const up = Math.random() < 0.66;
      people.push({ id: nextId++, x: W * (0.2 + Math.random() * 0.6), y: up ? H + 24 : -24, vy: (up ? -1 : 1) * (34 + Math.random() * 18),
        ph: Math.random() * 6, counted: false, flash: 0, how: '', coast: Math.random() < 0.25, hidden: false });
    };
    const update = dt => {
      spawn -= dt; if (spawn <= 0) { add(); spawn = 0.8 + Math.random() * 0.9; }
      const ly = H / 2, band = 10;
      for (const q of people) {
        q.y += q.vy * dt; q.ph += dt * 3; q.x += Math.sin(q.ph) * 6 * dt;
        q.hidden = q.coast && Math.abs(q.y - ly) < 24;
        if (!q.counted && ((q.vy < 0 && q.y < ly - band) || (q.vy > 0 && q.y > ly + band))) {
          q.counted = true; q.flash = 1; q.how = q.coast ? 'coast' : 'live';
          if (q.vy < 0) inC++; else outC++;
        }
        q.flash = Math.max(0, q.flash - dt * 0.7);
      }
      people = people.filter(q => q.y > -40 && q.y < H + 40);
    };
    return {
      resize(w, h) { W = w; H = h; },
      update,
      warm() { for (let i = 0; i < 260; i++) update(0.05); },
      draw(ctx, w, h, p) {
        const m = 6, ly = h / 2, green = p.light ? '#248a3d' : '#30d158';
        ctx.save();
        roundRect(ctx, m, m, w - 2 * m, h - 2 * m, 16);
        ctx.fillStyle = p.fg; ctx.globalAlpha = 0.04; ctx.fill();
        ctx.globalAlpha = 0.12; ctx.strokeStyle = p.fg; ctx.lineWidth = 1; ctx.stroke();
        ctx.clip();
        ctx.globalAlpha = 0.12; ctx.fillStyle = p.link; ctx.fillRect(m, ly - 10, w - 2 * m, 20);
        ctx.globalAlpha = 0.9; ctx.strokeStyle = p.link; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(m, ly); ctx.lineTo(w - m, ly); ctx.stroke();
        ctx.globalAlpha = 0.55; ctx.fillStyle = p.fg; ctx.font = `11px ${FONT}`; ctx.textAlign = 'right';
        ctx.fillText('Inside bus', w - m - 12, m + 56); ctx.fillText('Bus stop', w - m - 12, h - m - 12);
        ctx.textAlign = 'left';
        for (const q of people) {
          ctx.globalAlpha = 0.22; ctx.fillStyle = p.fg;
          ctx.beginPath(); ctx.ellipse(q.x, q.y + 2, 11, 6.5, 0, 0, TAU2); ctx.fill();
          ctx.globalAlpha = 0.65; ctx.beginPath(); ctx.arc(q.x, q.y, 5.5, 0, TAU2); ctx.fill();
          const col = q.flash > 0 ? green : p.link;
          ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.globalAlpha = q.hidden ? 0.5 : 1;
          if (q.hidden) ctx.setLineDash([3, 3]);
          ctx.strokeRect(q.x - 15, q.y - 15, 30, 30); ctx.setLineDash([]);
          const tag = q.flash > 0 ? `${q.vy < 0 ? 'IN' : 'OUT'} +1 | ${q.how}` : `ID ${q.id}`;
          ctx.font = `600 10px ${FONT}`;
          const tw = ctx.measureText(tag).width + 8;
          ctx.globalAlpha = q.hidden ? 0.5 : 1; ctx.fillStyle = col; ctx.fillRect(q.x - 15, q.y - 29, tw, 14);
          ctx.fillStyle = '#fff'; ctx.fillText(tag, q.x - 11, q.y - 18.5);
        }
        ctx.restore();
        ctx.save(); roundRect(ctx, m, m, w - 2 * m, h - 2 * m, 16); ctx.clip();
        const fade = ctx.createLinearGradient(0, m, 0, m + 44);
        fade.addColorStop(0, p.card); fade.addColorStop(0.7, p.card); fade.addColorStop(1, p.card + '00');
        ctx.globalAlpha = 1; ctx.fillStyle = fade; ctx.fillRect(m, m, w - 2 * m, 44); ctx.restore();
        ctx.globalAlpha = 1; ctx.fillStyle = p.fg; ctx.font = `600 13px ${FONT}`;
        ctx.fillText(`In ${inC}  |  Out ${outC}  |  Onboard ${Math.max(0, inC - outC)}`, m + 14, m + 22);
      }
    };
  }

  /* ---------- NeuroSensorOS: 96-neuron spiking liquid fed by 8 features ---------- */
  function liquidState() {
    const rng = mulberry32(96), N = 96, F = 8, HIST = 70, TICK = 0.03;
    const nodes = [];
    for (let i = 0; i < N; i++) { const a = rng() * TAU2, r = Math.sqrt(rng()); nodes.push({ u: Math.cos(a) * r, w: Math.sin(a) * r, v: rng() * 0.5, f: 0, ref: 0, inh: rng() < 0.2 }); }
    const edges = [], out = nodes.map(() => []);
    nodes.forEach((n, i) => {
      const near = nodes.map((o, j) => [j, (o.u - n.u) ** 2 + (o.w - n.w) ** 2]).filter(d => d[0] !== i).sort((a, b) => a[1] - b[1]).slice(0, 10);
      for (let k = 0; k < 3; k++) {
        const j = near[Math.floor(rng() * near.length)][0];
        out[i].push(edges.length);
        edges.push({ a: i, b: j, wt: n.inh ? -0.55 : 0.42 + rng() * 0.2, glow: 0 });
      }
    });
    const left = nodes.map((n, i) => [i, n.u]).sort((a, b) => a[1] - b[1]).slice(0, 40).map(d => d[0]);
    const inputs = [];
    for (let k = 0; k < F; k++) { const s = []; for (let j = 0; j < 5; j++) s.push(left[Math.floor(rng() * left.length)]); inputs.push(s); }
    const hist = Array.from({ length: F }, () => new Array(HIST).fill(0.5));
    let I = new Float64Array(N), t = 0, acc = 0;
    const feat = k => {
      const base = 0.5 + 0.32 * Math.sin(t * (0.5 + 0.21 * k) + k * 1.7) + 0.12 * Math.sin(t * (1.9 + 0.4 * k));
      return clamp(base + (rng() - 0.5) * 0.12, 0, 1);
    };
    const tick = () => {
      t += TICK;
      const next = new Float64Array(N);
      for (let k = 0; k < F; k++) {
        const v = feat(k); hist[k].push(v); hist[k].shift();
        for (const idx of inputs[k]) I[idx] += v * 0.24;
      }
      for (const e of edges) e.glow *= 0.8;
      for (let i = 0; i < N; i++) {
        const n = nodes[i];
        n.v = n.v * 0.86 + I[i] + (rng() - 0.5) * 0.05; n.f *= 0.8;
        if (n.ref > 0) { n.ref--; n.v = 0; continue; }
        if (n.v > 1) {
          n.v = 0; n.ref = 2; n.f = 1;
          for (const ei of out[i]) { const e = edges[ei]; e.glow = 1; next[e.b] += e.wt; }
        }
      }
      I = next;
    };
    return {
      update(dt) { acc += dt; let n = 0; while (acc >= TICK && n++ < 4) { acc -= TICK; tick(); } if (acc > TICK) acc = 0; },
      warm() { for (let i = 0; i < 200; i++) tick(); },
      draw(ctx, W, H, p) {
        const m = 14, tw = Math.min(110, W * 0.24), cx = tw + (W - tw) / 2 + 6, rx = (W - tw) / 2 - 22, ry = H / 2 - 26, cy = H / 2 - 6;
        const pos = n => [cx + n.u * rx, cy + n.w * ry];
        const rowY = k => 16 + (H - 52) * (k + 0.5) / F;
        ctx.lineWidth = 1;
        ctx.strokeStyle = p.fg; ctx.globalAlpha = 0.05;
        ctx.beginPath();
        for (let k = 0; k < F; k++) for (const idx of inputs[k]) { const [x, y] = pos(nodes[idx]); ctx.moveTo(m + tw, rowY(k)); ctx.lineTo(x, y); }
        ctx.stroke();
        ctx.globalAlpha = 0.08; ctx.beginPath();
        for (const e of edges) { const [x1, y1] = pos(nodes[e.a]), [x2, y2] = pos(nodes[e.b]); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); }
        ctx.stroke();
        ctx.strokeStyle = p.link;
        for (const e of edges) if (e.glow > 0.08) {
          const [x1, y1] = pos(nodes[e.a]), [x2, y2] = pos(nodes[e.b]);
          ctx.globalAlpha = e.glow * 0.7; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        }
        ctx.lineWidth = 1.3; ctx.strokeStyle = p.fg; ctx.globalAlpha = 0.55;
        for (let k = 0; k < F; k++) {
          const y = rowY(k); ctx.beginPath();
          for (let j = 0; j < HIST; j++) { const x = m + tw * j / (HIST - 1), yy = y + (0.5 - hist[k][j]) * 12; j ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); }
          ctx.stroke();
        }
        for (const n of nodes) {
          const [x, y] = pos(n);
          if (n.f > 0.1) { ctx.fillStyle = p.link; ctx.globalAlpha = 0.35 + 0.65 * n.f; ctx.beginPath(); ctx.arc(x, y, 2.4 + n.f * 2.2, 0, TAU2); ctx.fill(); }
          else { ctx.fillStyle = p.fg; ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, TAU2); ctx.fill(); }
        }
        ctx.globalAlpha = 0.6; ctx.fillStyle = p.fg; ctx.font = `11px ${FONT}`;
        ctx.textAlign = 'left'; ctx.fillText('8 sensor features', m, H - 8);
        ctx.textAlign = 'center'; ctx.fillText('96-neuron spiking liquid', cx, H - 8);
        ctx.textAlign = 'left'; ctx.globalAlpha = 1;
      }
    };
  }


  /* ---------- Contact: rippling dot field that lights up under the pointer ---------- */
  function contactField() {
    const S = 16;
    let t = 0, px = -999, py = -999, tx = -999, ty = -999, el = null, onMove, onLeave;
    return {
      attach(canvas) {
        el = canvas.parentElement;
        onMove = e => { const r = canvas.getBoundingClientRect(); tx = e.clientX - r.left; ty = e.clientY - r.top; if (px < -900) { px = tx; py = ty; } };
        onLeave = () => { tx = -999; ty = -999; };
        el.addEventListener('pointermove', onMove); el.addEventListener('pointerleave', onLeave);
        return () => { el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerleave', onLeave); };
      },
      update(dt) {
        t += dt;
        if (tx < -900) { px = -999; py = -999; } else { px += (tx - px) * Math.min(1, dt * 10); py += (ty - py) * Math.min(1, dt * 10); }
      },
      draw(ctx, W, H, p) {
        const cols = Math.ceil(W / S) + 1, rows = Math.ceil(H / S) + 1, ox = (W - (cols - 1) * S) / 2, oy = (H - (rows - 1) * S) / 2;
        const base = new Path2D();
        ctx.fillStyle = p.link;
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
          const cx = ox + x * S, cy = oy + y * S;
          const wave = 0.5 + 0.5 * Math.sin(cx * 0.018 + t * 0.9) * Math.cos(cy * 0.03 - t * 0.6);
          const d = Math.hypot(cx - px, cy - py), near = d < 150 ? 1 - d / 150 : 0;
          if (near > 0.02) {
            ctx.globalAlpha = 0.15 + 0.75 * near * near;
            ctx.beginPath(); ctx.arc(cx, cy, 1.4 + 1.8 * near + wave * 0.6, 0, TAU2); ctx.fill();
          } else {
            const r = 1.1 + wave * 0.9;
            base.moveTo(cx + r, cy); base.arc(cx, cy, r, 0, TAU2);
          }
        }
        ctx.globalAlpha = 0.16; ctx.fillStyle = p.fg; ctx.fill(base); ctx.globalAlpha = 1;
      }
    };
  }


  /* ---------- Contact: pointer-following light with a gentle 3D tilt ---------- */
  function contactGlow() {
    const rgba = (hex, a) => {
      let h = String(hex).replace('#', '').trim();
      if (h.length === 3) h = h.split('').map(c => c + c).join('');
      const n = parseInt(h, 16) || 0x2997ff;
      return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
    };
    let t = 0, W = 0, H = 0, px = null, py = null, tx = null, ty = null, rx = 0, ry = 0, el = null;
    return {
      attach(canvas) {
        el = canvas.parentElement;
        el.style.willChange = 'transform';
        const move = e => { const r = canvas.getBoundingClientRect(); tx = e.clientX - r.left; ty = e.clientY - r.top; };
        const leave = () => { tx = null; ty = null; };
        el.addEventListener('pointermove', move); el.addEventListener('pointerleave', leave);
        return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); el.style.transform = ''; };
      },
      resize(w, h) { W = w; H = h; },
      update(dt) {
        t += dt;
        const hover = tx !== null;
        const gx = hover ? tx : W * (0.5 + 0.32 * Math.sin(t * 0.35)), gy = hover ? ty : H * (0.5 + 0.3 * Math.sin(t * 0.53 + 1));
        if (px === null) { px = gx; py = gy; }
        const k = Math.min(1, dt * (hover ? 7 : 1.5));
        px += (gx - px) * k; py += (gy - py) * k;
        const trx = hover ? (0.5 - ty / H) * 5 : 0, tryy = hover ? (tx / W - 0.5) * 7 : 0;
        const kt = Math.min(1, dt * 6);
        rx += (trx - rx) * kt; ry += (tryy - ry) * kt;
        if (el) el.style.transform = `perspective(1400px) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg)`;
      },
      draw(ctx, w, h, p) {
        const x = px === null ? w / 2 : px, y = py === null ? h / 2 : py;
        const r = Math.max(w, h) * 0.6;
        let g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, rgba(p.link, p.light ? 0.2 : 0.3)); g.addColorStop(0.45, rgba(p.link, p.light ? 0.07 : 0.1)); g.addColorStop(1, rgba(p.link, 0));
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        const x2 = w - x * 0.7, y2 = h - y * 0.6, r2 = r * 0.7;
        g = ctx.createRadialGradient(x2, y2, 0, x2, y2, r2);
        g.addColorStop(0, rgba(p.fg, p.light ? 0.05 : 0.07)); g.addColorStop(1, rgba(p.fg, 0));
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      }
    };
  }

  return { mount, contactField, contactGlow, forestFire, phantomRing, evolveRing, darwinCircuit, cpcsDoor, liquidState };
})();

export default Sims;
