/* General Mathematics interactives: hero (drag the towns: shortest path and minimum spanning tree),
   boxplots, the 68–95–99.7% rule, least squares and residuals, transformations, smoothing, depreciation,
   loans and investments, transition matrices, Prim's and Dijkstra's algorithms, and critical paths. */
(function () {
  'use strict';
  const K = window.SIMKIT, S = window.SIMS;
  const num = (v, p) => { if (!isFinite(v)) return '–'; const t = +(+v).toPrecision(p || 4); return String(Math.abs(t) < 1e-12 ? 0 : t).replace('-', '−'); };
  const money = (x, d) => { d = d == null ? 2 : d; return (x < -1e-9 ? '−$' : '$') + Math.abs(x).toLocaleString('en-AU', { minimumFractionDigits: d, maximumFractionDigits: d }).replace(/,/g, '\u2009'); };
  const box = (W, H, l, r, t, b) => ({ x: l, y: t, w: W - l - r, h: H - t - b });
  function dot(ctx, x, y, r, fill, stroke, lw) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.lineWidth = lw || 2; ctx.strokeStyle = stroke; ctx.stroke(); } }
  function clipBox(ctx, b) { ctx.save(); ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.clip(); }
  function poly(ctx, pts, color, w, dash) {
    if (pts.length < 2) return;
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w || 2; ctx.lineJoin = 'round'; if (dash) ctx.setLineDash(dash);
    ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); ctx.restore();
  }
  function pill(ctx, x, y, text, c, hot) {
    ctx.save(); ctx.font = '600 12px ' + c.font;
    const w = ctx.measureText(text).width + 10, h = 18;
    ctx.fillStyle = hot ? c.acc : c.surface; ctx.strokeStyle = hot ? c.acc : c.line2; ctx.lineWidth = 1;
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x - w / 2, y - h / 2, w, h, 9); else ctx.rect(x - w / 2, y - h / 2, w, h);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = hot ? '#fff' : c.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y + 0.5);
    ctx.restore();
  }
  const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
  const sd = a => { const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) * (v - m), 0) / (a.length - 1)); };
  function lsq(xs, ys) {
    const mx = mean(xs), my = mean(ys); let sxy = 0, sxx = 0, syy = 0;
    xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) * (x - mx); syy += (ys[i] - my) * (ys[i] - my); });
    const b = sxx ? sxy / sxx : 0;
    return { b, a: my - b * mx, r: sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0 };
  }
  const corr = (xs, ys) => lsq(xs, ys).r;
  const eqn = (a, b, yl, xl) => yl + ' = ' + num(a) + (b < 0 ? ' − ' : ' + ') + num(Math.abs(b)) + ' × ' + xl;
  const ptr = (cv, e) => { const rc = cv.cv.getBoundingClientRect(); return [(e.clientX - rc.left) * cv.W / rc.width, (e.clientY - rc.top) * cv.H / rc.height]; };
  const median = s => { const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
  function fiveNum(data) {
    const s = data.slice().sort((p, q) => p - q), n = s.length, h = Math.floor(n / 2);
    return { s, n, min: s[0], max: s[n - 1], med: median(s), q1: median(s.slice(0, h)), q3: median(s.slice(n - h)) };
  }
  // a horizontal value axis along the bottom of box b
  function hAxis(ctx, b, lo, hi, c, fmt) {
    const X = v => b.x + (v - lo) / (hi - lo) * b.w;
    const step = K.niceStep(hi - lo, Math.max(3, Math.floor(b.w / 70)));
    ctx.save(); ctx.strokeStyle = c.line2; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(b.x, b.y + b.h); ctx.lineTo(b.x + b.w, b.y + b.h); ctx.stroke();
    ctx.font = '11px ' + c.mono; ctx.fillStyle = c.muted; ctx.textAlign = 'center';
    for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) {
      const px = X(v); ctx.beginPath(); ctx.moveTo(px, b.y + b.h); ctx.lineTo(px, b.y + b.h + 4); ctx.stroke();
      ctx.fillText(fmt ? fmt(v) : num(v), px, b.y + b.h + 16);
    }
    ctx.restore();
    return X;
  }

  /* ------------------------------------------------------------------ graph algorithms */
  function adj(edges) { const g = {}; edges.forEach(([a, b, w], i) => { (g[a] = g[a] || []).push([b, w, i]); (g[b] = g[b] || []).push([a, w, i]); }); return g; }
  function primSteps(names, edges, start) {
    const g = adj(edges), inT = new Set([start]), steps = [];
    while (inT.size < names.length) {
      let best = null;
      inT.forEach(u => (g[u] || []).forEach(([v, w, i]) => { if (!inT.has(v) && (!best || w < best.w)) best = { u, v, w, i }; }));
      if (!best) break;
      inT.add(best.v); steps.push(best);
    }
    return steps;
  }
  function dijkstraSteps(names, edges, start) {
    const g = adj(edges), dist = {}, prev = {}, done = new Set(), steps = [];
    names.forEach(n => { dist[n] = Infinity; }); dist[start] = 0;
    while (done.size < names.length) {
      let u = null; names.forEach(n => { if (!done.has(n) && (u === null || dist[n] < dist[u])) u = n; });
      if (u === null || dist[u] === Infinity) break;
      done.add(u);
      (g[u] || []).forEach(([v, w, i]) => { if (!done.has(v) && dist[u] + w < dist[v]) { dist[v] = dist[u] + w; prev[v] = [u, i]; } });
      steps.push({ u, dist: Object.assign({}, dist), prev: Object.assign({}, prev), done: new Set(done) });
    }
    return steps;
  }
  function pathTo(prev, t) { const vs = [t], es = []; while (prev[vs[0]]) { es.push(prev[vs[0]][1]); vs.unshift(prev[vs[0]][0]); } return { vs, es }; }

  /* ------------------------------------------------------------------ hero: drag the towns */
  S.heroGeneral = function (el) {
    el.innerHTML = '';
    const cvs = K.canvas(el, 0.8, { maxH: 440, minH: 260, label: 'A road network: drag the towns to see the shortest path from S to T and the minimum spanning tree update.' });
    cvs.wrap.style.border = '0'; cvs.wrap.style.borderRadius = '0';
    const cap = document.createElement('div'); cap.className = 'cap'; el.appendChild(cap);
    const V = { S: [0.1, 0.55], A: [0.36, 0.2], B: [0.34, 0.82], C: [0.6, 0.48], D: [0.68, 0.86], T: [0.9, 0.36] };
    const names = Object.keys(V);
    const E = [['S', 'A'], ['S', 'B'], ['A', 'B'], ['A', 'C'], ['B', 'C'], ['B', 'D'], ['C', 'D'], ['C', 'T'], ['D', 'T'], ['A', 'T']];
    const { ctx } = cvs;
    let drag = null;
    const P = n => [14 + V[n][0] * (cvs.W - 28), 14 + V[n][1] * (cvs.H - 28)];
    function draw() {
      const W = cvs.W, H = cvs.H, c = K.col();
      ctx.fillStyle = c.surface; ctx.fillRect(0, 0, W, H);
      const unit = 100 / Math.max(W, H);
      const edges = E.map(([a, b]) => { const p = P(a), q = P(b); return [a, b, Math.round(Math.hypot(p[0] - q[0], p[1] - q[1]) * unit)]; });
      const mst = new Set(primSteps(names, edges, 'S').map(s => s.i));
      const st = dijkstraSteps(names, edges, 'S'), last = st[st.length - 1], sp = pathTo(last.prev, 'T');
      const spSet = new Set(sp.es);
      edges.forEach(([a, b], i) => {
        const p = P(a), q = P(b);
        if (mst.has(i)) poly(ctx, [p, q], c.accSoft, 10);
        poly(ctx, [p, q], spSet.has(i) ? c.acc : c.line2, spSet.has(i) ? 3.4 : 1.6);
      });
      edges.forEach(([a, b, w], i) => { const p = P(a), q = P(b); pill(ctx, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2, String(w), c, spSet.has(i)); });
      names.forEach(n => { const p = P(n), key = n === 'S' || n === 'T'; dot(ctx, p[0], p[1], key ? 13 : 11, key ? c.acc : c.surface, c.acc, 2.4); K.text(ctx, n, p[0], p[1] + 4.5, { size: 13, bold: true, color: key ? '#fff' : c.ink, align: 'center', c }); });
      const total = [...mst].reduce((s, i) => s + edges[i][2], 0);
      cap.textContent = 'Drag the towns · shortest S → T: ' + sp.vs.join('–') + ' = ' + last.dist.T + ' km · minimum spanning tree (shaded): ' + total + ' km';
    }
    cvs.draw = draw; draw();
    const hit = (x, y) => names.find(n => { const p = P(n); return Math.hypot(p[0] - x, p[1] - y) < 22; });
    cvs.cv.addEventListener('pointerdown', e => { const [x, y] = ptr(cvs, e); drag = hit(x, y); if (drag) { cvs.cv.setPointerCapture(e.pointerId); e.preventDefault(); } });
    cvs.cv.addEventListener('pointermove', e => {
      const [x, y] = ptr(cvs, e);
      cvs.cv.style.cursor = drag || hit(x, y) ? 'grab' : '';
      if (!drag) return;
      V[drag] = [K.clamp((x - 14) / (cvs.W - 28), 0.04, 0.96), K.clamp((y - 14) / (cvs.H - 28), 0.04, 0.96)]; draw();
    });
    const up = () => { drag = null; };
    cvs.cv.addEventListener('pointerup', up); cvs.cv.addEventListener('pointercancel', up);
    const off = K.onTheme(draw);
    return () => { off(); cvs.destroy(); };
  };

  /* ------------------------------------------------------------------ boxplots */
  S.gmBoxplot = function (el) {
    return K.mount(el, 'Boxplot builder', 'Type your own data, or move the largest value and watch when it becomes an outlier. Q1 and Q3 are the medians of the lower and upper halves (leave the median out when n is odd). Outliers lie beyond Q1 − 1.5 × IQR or Q3 + 1.5 × IQR.', ({ body, add }) => {
      const cv = K.canvas(body, 0.42, { maxH: 280, minH: 210, label: 'Dot plot and boxplot of the data, with the fences and any outliers' });
      const ctl = K.controls(body);
      const lab = document.createElement('label'); lab.className = 'ctl';
      lab.innerHTML = '<span class="ctl-top"><span>Data (commas or spaces)</span></span><input type="text" inputmode="decimal" spellcheck="false" autocomplete="off">';
      ctl.appendChild(lab);
      const inp = lab.querySelector('input');
      inp.value = '3, 5, 6, 8, 9, 11, 12, 14, 15, 18, 32';
      const big = K.slider(ctl, { label: 'Largest value', min: 18, max: 60, step: 1, value: 32, fmt: v => num(v), onInput: upd });
      const ro = K.readout(body, [['five', 'Min, Q1, median, Q3, max'], ['iqr', 'IQR'], ['fence', 'Lower and upper fences'], ['out', 'Outliers'], ['ms', 'Mean, standard deviation']]);
      let base = [], st = null;
      function readInput() {
        const v = inp.value.split(/[\s,;]+/).filter(t => t !== '').map(Number).filter(x => isFinite(x));
        if (v.length < 4) { st = null; ro.set('five', 'enter at least 4 numbers', 'warn'); draw(); return; }
        base = v.sort((p, q) => p - q);
        const f = fiveNum(base), lo = base[base.length - 2], hiv = Math.max(base[base.length - 1], f.q3 + 4 * Math.max(f.q3 - f.q1, 1));
        const step = K.niceStep(Math.max(hiv - lo, 1), 60);
        big.input.min = lo; big.input.max = Math.ceil(hiv / step) * step; big.input.step = step;
        big.set(base[base.length - 1]);
        upd();
      }
      function upd() {
        if (base.length < 4) return;
        const d = base.slice(0, -1).concat([big.get()]);
        const f = fiveNum(d), iqr = f.q3 - f.q1, lf = f.q1 - 1.5 * iqr, uf = f.q3 + 1.5 * iqr;
        const ins = f.s.filter(x => x >= lf && x <= uf), outs = f.s.filter(x => x < lf || x > uf);
        st = { f, lf, uf, outs, wl: ins[0], wh: ins[ins.length - 1] };
        ro.set('five', [f.min, f.q1, f.med, f.q3, f.max].map(v => num(v)).join(', '));
        ro.set('iqr', num(iqr));
        ro.set('fence', num(lf) + ' and ' + num(uf));
        ro.set('out', outs.length ? outs.map(v => num(v)).join(', ') : 'none', outs.length ? 'warn' : '');
        ro.set('ms', num(mean(d), 4) + ', ' + num(sd(d), 4));
        draw();
      }
      function draw() {
        const { ctx, W, H } = cv, c = K.col(); K.clear(ctx, W, H, c);
        if (!st) return;
        const f = st.f;
        let lo = Math.min(f.min, st.lf), hi = Math.max(f.max, st.uf); const pad = (hi - lo) * 0.05 || 1; lo -= pad; hi += pad;
        const b = box(W, H, 16, 16, 14, 30);
        const X = hAxis(ctx, b, lo, hi, c);
        ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = c.warn; ctx.lineWidth = 1.2;
        [st.lf, st.uf].forEach((v, i) => { const px = X(v); ctx.beginPath(); ctx.moveTo(px, b.y); ctx.lineTo(px, b.y + b.h); ctx.stroke(); K.text(ctx, i ? 'upper fence' : 'lower fence', px + (i ? -5 : 5), b.y + 10, { size: 11, color: c.warn, align: i ? 'right' : 'left', c }); });
        ctx.restore();
        const dy = b.y + b.h * 0.45, rr = Math.max(3, Math.min(5.5, b.w / (f.n * 3))), cnt = {};
        f.s.forEach(v => { cnt[v] = (cnt[v] || 0) + 1; dot(ctx, X(v), dy - (cnt[v] - 1) * (rr * 2 + 1), rr, v < st.lf || v > st.uf ? c.warn : c.acc); });
        const by = b.y + b.h * 0.76, bh = Math.min(32, b.h * 0.26);
        ctx.strokeStyle = c.ink; ctx.lineWidth = 1.8; ctx.beginPath();
        ctx.moveTo(X(st.wl), by); ctx.lineTo(X(f.q1), by); ctx.moveTo(X(f.q3), by); ctx.lineTo(X(st.wh), by);
        ctx.moveTo(X(st.wl), by - bh * 0.3); ctx.lineTo(X(st.wl), by + bh * 0.3); ctx.moveTo(X(st.wh), by - bh * 0.3); ctx.lineTo(X(st.wh), by + bh * 0.3);
        ctx.stroke();
        ctx.fillStyle = c.accSoft; ctx.fillRect(X(f.q1), by - bh / 2, X(f.q3) - X(f.q1), bh); ctx.strokeRect(X(f.q1), by - bh / 2, X(f.q3) - X(f.q1), bh);
        ctx.strokeStyle = c.acc; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(X(f.med), by - bh / 2); ctx.lineTo(X(f.med), by + bh / 2); ctx.stroke();
        st.outs.forEach(v => dot(ctx, X(v), by, 4.5, c.surface, c.warn, 2));
      }
      let t = 0;
      inp.addEventListener('input', () => { clearTimeout(t); t = setTimeout(readInput, 250); });
      cv.draw = draw; add(K.onTheme(draw)); add(cv.destroy); add(() => clearTimeout(t));
      readInput();
    });
  };

  /* ------------------------------------------------------------------ normal model */
  S.gmNormal = function (el) {
    const BELOW = { '-3': 0.15, '-2': 2.5, '-1': 16, '0': 50, '1': 84, '2': 97.5, '3': 99.85 };
    return K.mount(el, 'The 68–95–99.7% rule', 'Set the mean and standard deviation, then move x. The z-score counts standard deviations from the mean. For whole-number z-scores from −3 to 3, the rule gives the percentage below and above x.', ({ body, add }) => {
      const cv = K.canvas(body, 0.42, { maxH: 300, minH: 210, label: 'Normal curve with the area below x shaded' });
      const ctl = K.controls(body);
      const Mu = K.slider(ctl, { label: 'Mean μ', min: 20, max: 200, step: 5, value: 100, fmt: v => num(v), onInput: upd });
      const Sg = K.slider(ctl, { label: 'Standard deviation σ', min: 2, max: 30, step: 1, value: 15, fmt: v => num(v), onInput: upd });
      const Z = K.slider(ctl, { label: 'x', min: -7, max: 7, step: 1, value: 2, toVal: v => v / 2, fromVal: v => v * 2, fmt: z => num(Mu.get() + z * Sg.get()), onInput: upd });
      const ro = K.readout(body, [['z', 'z-score'], ['below', '% below x'], ['above', '% above x']]);
      function upd() {
        const z = Z.get(); Z.set(z);
        ro.set('z', '(' + num(Mu.get() + z * Sg.get()) + ' − ' + num(Mu.get()) + ') ÷ ' + num(Sg.get()) + ' = ' + num(z));
        const p = BELOW[String(z)];
        if (p != null) { ro.set('below', p + '%'); ro.set('above', num(100 - p) + '%'); }
        else { ro.set('below', 'not given by the rule', 'warn'); ro.set('above', 'use whole-number z', 'warn'); }
        draw();
      }
      function draw() {
        const { ctx, W, H } = cv, c = K.col(); K.clear(ctx, W, H, c);
        const mu = Mu.get(), sg = Sg.get(), z = Z.get();
        const b = box(W, H, 16, 16, 26, 30), lo = -3.9, hi = 3.9;
        const X = v => b.x + (v - lo) / (hi - lo) * b.w, f = t => Math.exp(-t * t / 2), Y = v => b.y + b.h - v * b.h * 0.95;
        ctx.save(); ctx.strokeStyle = c.line2; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(b.x, b.y + b.h); ctx.lineTo(b.x + b.w, b.y + b.h); ctx.stroke();
        ctx.font = '11px ' + c.mono; ctx.textAlign = 'center';
        for (let k = -3; k <= 3; k++) { const px = X(k); ctx.fillStyle = c.muted; ctx.fillText(num(mu + k * sg), px, b.y + b.h + 16); ctx.strokeStyle = c.grid; ctx.beginPath(); ctx.moveTo(px, b.y + b.h); ctx.lineTo(px, Y(f(k))); ctx.stroke(); }
        ctx.restore();
        ctx.beginPath(); ctx.moveTo(X(lo), Y(0));
        for (let i = 0; i <= 200; i++) { const t = lo + (Math.min(z, hi) - lo) * i / 200; ctx.lineTo(X(t), Y(f(t))); }
        ctx.lineTo(X(Math.min(z, hi)), Y(0)); ctx.closePath(); ctx.fillStyle = c.accSoft; ctx.fill();
        const pts = []; for (let i = 0; i <= 300; i++) { const t = lo + (hi - lo) * i / 300; pts.push([X(t), Y(f(t))]); }
        poly(ctx, pts, c.acc, 2.6);
        [['34%', 0.5, 0.4], ['34%', -0.5, 0.4], ['13.5%', 1.5, 0.12], ['13.5%', -1.5, 0.12], ['2.35%', 2.6, 0.1], ['2.35%', -2.6, 0.1]].forEach(([t, k, h]) => K.text(ctx, t, X(k), Y(h), { size: 11, color: c.ink2, align: 'center', c }));
        const px = X(K.clamp(z, lo, hi));
        ctx.strokeStyle = c.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, b.y - 8); ctx.lineTo(px, b.y + b.h); ctx.stroke();
        K.text(ctx, 'x = ' + num(mu + z * sg), px, b.y - 12, { size: 12, bold: true, align: 'center', c });
      }
      cv.draw = draw; add(K.onTheme(draw)); add(cv.destroy);
      upd();
    });
  };

  /* ------------------------------------------------------------------ least squares and residuals */
  S.gmRegression = function (el) {
    const resid = el.dataset.mode === 'residuals';
    const XS = [1, 2.5, 4, 5, 6.5, 8, 9.5, 11, 12.5, 14, 16, 18], NZ = [3, -4, 5, -2, 1, -6, 4, 2, -3, 6, -1, -5];
    const PRE = {
      lin: XS.map((x, i) => [x, 15 + 3.5 * x + 1.5 * NZ[i]]),
      curve: XS.map((x, i) => [x, 8 + 0.24 * x * x + 0.8 * NZ[i]]),
      out: XS.map((x, i) => [x, i === 10 ? 24 : 15 + 3.5 * x + 1.5 * NZ[i]])
    };
    const title = resid ? 'Residual plot explorer' : 'Least squares line explorer';
    const desc = resid ? 'Each residual is actual − predicted. Switch between data sets and drag points: a random scatter in the residual plot supports a linear model; a curve says the association is non-linear.' : 'Drag the points (or tap empty space to add one). The least squares line minimises the sum of the squared residuals and always passes through (x̄, ȳ).';
    return K.mount(el, title, desc, ({ body, add }) => {
      const cv = K.canvas(body, resid ? 0.8 : 0.56, { maxH: resid ? 540 : 400, minH: 260, label: 'Scatterplot with its least squares line' + (resid ? ' and residual plot' : '') });
      const ctl = K.controls(body);
      const D = K.select(ctl, { label: 'Data set', value: resid ? 'curve' : 'lin', options: [['lin', 'Linear'], ['curve', 'Curved'], ['out', 'Linear with an outlier']], onChange: reset });
      const R = K.check(ctl, { label: 'Show residuals', value: true, onChange: () => draw() });
      K.buttons(ctl, [{ label: 'Reset points', onClick: reset }]);
      const ro = K.readout(body, [['eq', 'Least squares line'], ['r', 'r and r²'], ['xy', 'Mean point (x̄, ȳ)'], ['ss', resid ? 'Residual pattern' : 'Sum of squared residuals']]);
      let pts = [], fit = null, M = null, drag = -1;
      const xr = [0, 20], yr = [0, 100];
      function reset() { pts = PRE[D.get()].map(p => p.slice()); upd(); }
      function upd() {
        const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
        fit = lsq(xs, ys);
        const res = pts.map(p => p[1] - (fit.a + fit.b * p[0]));
        fit.res = res;
        ro.set('eq', eqn(fit.a, fit.b, 'y', 'x'));
        ro.set('r', num(fit.r, 3) + ' and ' + num(fit.r * fit.r, 3));
        ro.set('xy', '(' + num(mean(xs), 3) + ', ' + num(mean(ys), 3) + ')');
        if (resid) {
          const mx = mean(xs), cur = Math.abs(corr(xs.map(x => (x - mx) * (x - mx)), res));
          ro.set('ss', cur > 0.6 ? 'clear curve: not linear' : 'no clear pattern: linear is reasonable', cur > 0.6 ? 'warn' : 'good');
        } else ro.set('ss', num(res.reduce((s, r) => s + r * r, 0), 4));
        draw();
      }
      function draw() {
        if (!fit) return;
        const { ctx, W, H } = cv, c = K.col(); K.clear(ctx, W, H, c);
        const top = resid ? box(W, H, 40, 14, 18, H * 0.42 + 26) : box(W, H, 40, 14, 18, 30);
        M = K.axes(ctx, top, xr, yr, c, { x: 'x', y: 'y' });
        clipBox(ctx, top);
        poly(ctx, [[M.X(xr[0]), M.Y(fit.a + fit.b * xr[0])], [M.X(xr[1]), M.Y(fit.a + fit.b * xr[1])]], c.acc, 2.6);
        if (R.get()) pts.forEach((p, i) => poly(ctx, [[M.X(p[0]), M.Y(p[1])], [M.X(p[0]), M.Y(p[1] - fit.res[i])]], c.warn, 1.4, [3, 3]));
        pts.forEach((p, i) => dot(ctx, M.X(p[0]), M.Y(p[1]), i === drag ? 7 : 5.5, c.ink, c.surface, 1.5));
        const mx = mean(pts.map(p => p[0])), my = mean(pts.map(p => p[1]));
        dot(ctx, M.X(mx), M.Y(my), 5, c.surface, c.acc, 2);
        ctx.restore();
        if (resid) {
          const lo = box(W, H, 40, 14, H * 0.58 + 6, 30), mr = Math.max(4, ...fit.res.map(Math.abs)) * 1.2;
          const N = K.axes(ctx, lo, xr, [-mr, mr], c, { x: 'x', y: 'residual' });
          ctx.strokeStyle = c.muted; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(lo.x, N.Y(0)); ctx.lineTo(lo.x + lo.w, N.Y(0)); ctx.stroke();
          pts.forEach((p, i) => dot(ctx, N.X(p[0]), N.Y(fit.res[i]), 5, c.warn));
        }
      }
      const near = (x, y) => { let k = -1, d = 18; pts.forEach((p, i) => { const e = Math.hypot(M.X(p[0]) - x, M.Y(p[1]) - y); if (e < d) { d = e; k = i; } }); return k; };
      const inv = (x, y) => [K.clamp(xr[0] + (x - M.X(xr[0])) / (M.X(xr[1]) - M.X(xr[0])) * (xr[1] - xr[0]), 0.2, 19.8), K.clamp(yr[0] + (M.Y(yr[0]) - y) / (M.Y(yr[0]) - M.Y(yr[1])) * (yr[1] - yr[0]), 1, 99)];
      cv.cv.addEventListener('pointerdown', e => {
        if (!M) return;
        const [x, y] = ptr(cv, e), top = resid ? cv.H * 0.58 : cv.H;
        if (y > top) return;
        drag = near(x, y);
        if (drag < 0 && pts.length < 30) { pts.push(inv(x, y)); drag = pts.length - 1; upd(); }
        cv.cv.setPointerCapture(e.pointerId); e.preventDefault();
      });
      cv.cv.addEventListener('pointermove', e => { if (drag < 0) return; const [x, y] = ptr(cv, e); pts[drag] = inv(x, y); upd(); });
      const up = () => { drag = -1; draw(); };
      cv.cv.addEventListener('pointerup', up); cv.cv.addEventListener('pointercancel', up);
      cv.draw = draw; add(K.onTheme(draw)); add(cv.destroy);
      reset();
    });
  };

  /* ------------------------------------------------------------------ transformations */
  S.gmTransform = function (el) {
    const NZ = [0.06, -0.05, 0.04, -0.07, 0.03, 0.05, -0.04, 0.02, -0.06, 0.07, -0.02, 0.04];
    const SETS = {
      up: { label: 'Increasing, getting steeper', xs: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], f: x => 4 + 0.6 * x * x },
      level: { label: 'Increasing, levelling off', xs: [1, 2, 3, 5, 7, 9, 12, 15, 18, 22, 26, 30], f: x => 8 + 30 * Math.log10(x) },
      decay: { label: 'Decreasing, levelling off', xs: [1, 1.5, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12], f: x => 4 + 90 / x }
    };
    const TR = {
      none: ['none', v => v, v => v, 'x', 'y'], x2: ['x²', v => v * v, null, 'x²', 'y'], logx: ['log x', v => Math.log10(v), null, 'log(x)', 'y'], invx: ['1/x', v => 1 / v, null, '1/x', 'y'],
      y2: ['y²', null, v => v * v, 'x', 'y²'], logy: ['log y', null, v => Math.log10(v), 'x', 'log(y)'], invy: ['1/y', null, v => 1 / v, 'x', '1/y']
    };
    return K.mount(el, 'Linearising with a transformation', 'Pick the shape of the data, then try transformations from the circle of transformations. The best one makes the scatterplot linear, gives r² close to 1 and leaves no pattern in the residuals.', ({ body, add }) => {
      const cv = K.canvas(body, 0.72, { maxH: 500, minH: 280, label: 'Transformed scatterplot with least squares line and residual plot' });
      const ctl = K.controls(body);
      const D = K.select(ctl, { label: 'Data shape', value: 'decay', options: Object.keys(SETS).map(k => [k, SETS[k].label]), onChange: upd });
      const T = K.select(ctl, { label: 'Transformation', value: 'none', options: Object.keys(TR).map(k => [k, TR[k][0]]), onChange: upd });
      const ro = K.readout(body, [['eq', 'Least squares line'], ['r2', 'r²'], ['res', 'Residuals']]);
      let st = null;
      function upd() {
        const s = SETS[D.get()], t = TR[T.get()];
        const raw = s.xs.map((x, i) => [x, s.f(x) * (1 + NZ[i])]);
        const fx_ = t[1] || (v => v), fy_ = t[2] || (v => v);
        const P = raw.map(([x, y]) => [fx_(x), fy_(y)]);
        const fit = lsq(P.map(p => p[0]), P.map(p => p[1])), res = P.map(p => p[1] - (fit.a + fit.b * p[0]));
        const mx = mean(P.map(p => p[0])), cur = Math.abs(corr(P.map(p => (p[0] - mx) * (p[0] - mx)), res));
        st = { P, fit, res, xl: t[3], yl: t[4] };
        ro.set('eq', eqn(fit.a, fit.b, t[4], t[3]));
        ro.set('r2', num(fit.r * fit.r, 3), fit.r * fit.r > 0.98 ? 'good' : '');
        ro.set('res', cur > 0.6 ? 'curved pattern' : 'no clear pattern', cur > 0.6 ? 'warn' : 'good');
        draw();
      }
      function range(a) { let lo = Math.min(...a), hi = Math.max(...a); const p = (hi - lo) * 0.08 || 1; return [lo - p, hi + p]; }
      function draw() {
        if (!st) return;
        const { ctx, W, H } = cv, c = K.col(); K.clear(ctx, W, H, c);
        const top = box(W, H, 46, 14, 18, H * 0.34 + 26), lo = box(W, H, 46, 14, H * 0.7 + 6, 30);
        const M = K.axes(ctx, top, range(st.P.map(p => p[0])), range(st.P.map(p => p[1])), c, { x: st.xl, y: st.yl });
        clipBox(ctx, top);
        const xr = range(st.P.map(p => p[0]));
        poly(ctx, [[M.X(xr[0]), M.Y(st.fit.a + st.fit.b * xr[0])], [M.X(xr[1]), M.Y(st.fit.a + st.fit.b * xr[1])]], c.acc, 2.4);
        st.P.forEach(p => dot(ctx, M.X(p[0]), M.Y(p[1]), 5, c.ink, c.surface, 1.5));
        ctx.restore();
        const mr = Math.max(...st.res.map(Math.abs)) * 1.25 || 1;
        const N = K.axes(ctx, lo, xr, [-mr, mr], c, { x: st.xl, y: 'residual' });
        ctx.strokeStyle = c.muted; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(lo.x, N.Y(0)); ctx.lineTo(lo.x + lo.w, N.Y(0)); ctx.stroke();
        st.P.forEach((p, i) => dot(ctx, N.X(p[0]), N.Y(st.res[i]), 4.5, c.warn));
      }
      cv.draw = draw; add(K.onTheme(draw)); add(cv.destroy);
      upd();
    });
  };

  /* ------------------------------------------------------------------ smoothing */
  S.gmSmooth = function (el) {
    const SEAS = [-8, 4, 12, -8], NZ = [2, -3, 1, 3, -2, 0, 3, -1, -3, 2, 1, -2, 3, -1, 0, 2];
    return K.mount(el, 'Smoothing a time series', 'Quarterly sales with a trend, seasonality and noise. Moving means and medians smooth out the seasonal ups and downs so the trend shows. Notice how many points each method loses at the ends, and how medians resist an outlier.', ({ body, add }) => {
      const cv = K.canvas(body, 0.5, { maxH: 360, minH: 240, label: 'Time series plot with a smoothed series overlaid' });
      const ctl = K.controls(body);
      const Mth = K.select(ctl, { label: 'Smoothing', value: 'm4', options: [['none', 'None'], ['m3', '3-point moving mean'], ['m5', '5-point moving mean'], ['m4', '4-point centred moving mean'], ['d3', '3-point moving median'], ['d5', '5-point moving median']], onChange: upd });
      const O = K.check(ctl, { label: 'Add an outlier (quarter 9)', value: false, onChange: upd });
      const ro = K.readout(body, [['m', 'Method'], ['lost', 'Points lost at each end'], ['v', 'Smoothed value at quarter 9']]);
      let st = null;
      function upd() {
        const y = NZ.map((n, t) => 40 + 1.5 * t + SEAS[t % 4] + n + (O.get() && t === 8 ? 28 : 0));
        const m = Mth.get(), sm = y.map(() => null);
        const win = (t, k, fn) => { const a = y.slice(t - k, t + k + 1); return a.length === 2 * k + 1 && t - k >= 0 ? fn(a) : null; };
        const med = a => a.slice().sort((p, q) => p - q)[(a.length - 1) / 2];
        y.forEach((v, t) => {
          if (m === 'm3') sm[t] = win(t, 1, mean); else if (m === 'm5') sm[t] = win(t, 2, mean);
          else if (m === 'd3') sm[t] = win(t, 1, med); else if (m === 'd5') sm[t] = win(t, 2, med);
          else if (m === 'm4' && t >= 2 && t + 2 < y.length) sm[t] = (mean(y.slice(t - 2, t + 2)) + mean(y.slice(t - 1, t + 3))) / 2;
        });
        st = { y, sm, m };
        const lost = { none: 0, m3: 1, d3: 1, m5: 2, d5: 2, m4: 2 }[m];
        ro.set('m', Mth.input.options[Mth.input.selectedIndex].text);
        ro.set('lost', String(lost));
        ro.set('v', sm[8] == null ? (m === 'none' ? num(y[8], 3) + ' (raw)' : '–') : num(sm[8], 4));
        draw();
      }
      function draw() {
        if (!st) return;
        const { ctx, W, H } = cv, c = K.col(); K.clear(ctx, W, H, c);
        const b = box(W, H, 40, 14, 18, 30);
        const M = K.axes(ctx, b, [0.5, st.y.length + 0.5], [0, Math.max(...st.y) * 1.12], c, { x: 'quarter', y: 'sales ($000)' });
        poly(ctx, st.y.map((v, t) => [M.X(t + 1), M.Y(v)]), c.line2, 1.6);
        st.y.forEach((v, t) => dot(ctx, M.X(t + 1), M.Y(v), 3.5, O.get() && t === 8 ? c.warn : c.ink2));
        const seg = []; st.sm.forEach((v, t) => { if (v != null) seg.push([M.X(t + 1), M.Y(v)]); });
        poly(ctx, seg, c.acc, 3);
        seg.forEach(p => dot(ctx, p[0], p[1], 4, c.acc, c.surface, 1.5));
      }
      cv.draw = draw; add(K.onTheme(draw)); add(cv.destroy);
      upd();
    });
  };

  /* ------------------------------------------------------------------ depreciation */
  S.gmDepreciation = function (el) {
    return K.mount(el, 'Flat rate, unit cost or reducing balance?', 'Flat rate and unit cost depreciation subtract the same amount each year (a straight line). Reducing balance multiplies by the same factor (a curve that never reaches zero). Change the rates and find where the two values cross.', ({ body, add }) => {
      const cv = K.canvas(body, 0.5, { maxH: 360, minH: 240, label: 'Value of an asset over ten years under linear and reducing balance depreciation' });
      const ctl = K.controls(body);
      const V0 = K.slider(ctl, { label: 'Purchase price', min: 5000, max: 80000, step: 1000, value: 40000, fmt: v => money(v, 0), onInput: upd });
      const Lm = K.select(ctl, { label: 'Linear method', value: 'flat', options: [['flat', 'Flat rate (% of price per year)'], ['unit', 'Unit cost (per km, 15 000 km per year)']], onChange: upd });
      const Fr = K.slider(ctl, { label: 'Flat rate (% per year)', min: 2, max: 25, step: 0.5, value: 10, fmt: v => num(v) + '%', onInput: upd });
      const Uc = K.slider(ctl, { label: 'Unit cost ($ per km)', min: 0.05, max: 0.5, step: 0.01, value: 0.2, fmt: v => '$' + v.toFixed(2), onInput: upd });
      const Rr = K.slider(ctl, { label: 'Reducing balance (% per year)', min: 2, max: 40, step: 0.5, value: 20, fmt: v => num(v) + '%', onInput: upd });
      const Ny = K.slider(ctl, { label: 'Year n', min: 0, max: 10, step: 1, value: 3, fmt: v => String(v), onInput: upd });
      const ro = K.readout(body, [['rl', 'Recurrence relations'], ['lin', 'Linear value after n years'], ['red', 'Reducing balance value after n years'], ['cross', 'Which is lower?']]);
      let st = null;
      function upd() {
        const v0 = V0.get(), unit = Lm.get() === 'unit';
        Fr.el.style.display = unit ? 'none' : ''; Uc.el.style.display = unit ? '' : 'none';
        const d = unit ? Uc.get() * 15000 : v0 * Fr.get() / 100, R = 1 - Rr.get() / 100, n = Ny.get();
        const lin = t => Math.max(0, v0 - d * t), red = t => v0 * Math.pow(R, t);
        st = { v0, lin, red };
        ro.set('rl', 'V₀ = ' + money(v0, 0) + ': Vₙ₊₁ = Vₙ − ' + money(d, 0) + ' and Vₙ₊₁ = ' + num(R, 4) + 'Vₙ');
        ro.set('lin', money(lin(n)));
        ro.set('red', money(red(n)));
        ro.set('cross', lin(n) < red(n) - 0.005 ? 'linear (year ' + n + ')' : red(n) < lin(n) - 0.005 ? 'reducing balance (year ' + n + ')' : 'equal (year ' + n + ')');
        draw(n);
      }
      function draw(n) {
        if (!st) return;
        if (n == null) n = Ny.get();
        const { ctx, W, H } = cv, c = K.col(); K.clear(ctx, W, H, c);
        const b = box(W, H, 58, 14, 18, 30);
        const M = K.axes(ctx, b, [0, 10], [0, st.v0 * 1.05], c, { x: 'years', y: 'value ($)', yfmt: v => v >= 1000 ? (v / 1000) + 'k' : String(v) });
        const L = [], Rd = []; for (let t = 0; t <= 10; t++) { L.push([M.X(t), M.Y(st.lin(t))]); Rd.push([M.X(t), M.Y(st.red(t))]); }
        poly(ctx, L, c.warn, 2.4); poly(ctx, Rd, c.acc, 2.4);
        L.forEach(p => dot(ctx, p[0], p[1], 3.5, c.warn)); Rd.forEach(p => dot(ctx, p[0], p[1], 3.5, c.acc));
        ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = c.muted; ctx.beginPath(); ctx.moveTo(M.X(n), b.y); ctx.lineTo(M.X(n), b.y + b.h); ctx.stroke(); ctx.restore();
        K.text(ctx, '● linear', b.x + b.w - 120, b.y + 12, { size: 12, color: c.warn, c });
        K.text(ctx, '● reducing balance', b.x + b.w - 120, b.y + 28, { size: 12, color: c.acc, c });
      }
      cv.draw = () => draw(); add(K.onTheme(() => draw())); add(cv.destroy);
      upd();
    });
  };

  /* ------------------------------------------------------------------ loans and investments */
  S.gmLoan = function (el) {
    const invest = el.dataset.mode === 'invest';
    if (invest) return K.mount(el, 'Growing an annuity investment', 'Vₙ₊₁ = RVₙ + d, compounding monthly. The gap between the balance and the total deposited is the interest earned, and it snowballs: interest is earned on earlier interest.', ({ body, add }) => {
      const cv = K.canvas(body, 0.5, { maxH: 360, minH: 240, label: 'Balance of an investment over time, split into deposits and interest' });
      const ctl = K.controls(body);
      const P0 = K.slider(ctl, { label: 'Initial deposit', min: 0, max: 50000, step: 1000, value: 5000, fmt: v => money(v, 0), onInput: upd });
      const Dp = K.slider(ctl, { label: 'Monthly deposit', min: 0, max: 2000, step: 50, value: 200, fmt: v => money(v, 0), onInput: upd });
      const Rt = K.slider(ctl, { label: 'Interest rate (% p.a.)', min: 0, max: 12, step: 0.1, value: 4.8, fmt: v => v.toFixed(1) + '%', onInput: upd });
      const Yr = K.slider(ctl, { label: 'Years', min: 1, max: 40, step: 1, value: 10, fmt: v => String(v), onInput: upd });
      const ro = K.readout(body, [['rr', 'Recurrence relation'], ['fv', 'Final balance'], ['dep', 'Total deposited'], ['int', 'Interest earned']]);
      let st = null;
      function upd() {
        const R = 1 + Rt.get() / 1200, d = Dp.get(), n = Yr.get() * 12;
        const bal = [P0.get()], dep = [P0.get()];
        for (let i = 1; i <= n; i++) { bal.push(bal[i - 1] * R + d); dep.push(dep[i - 1] + d); }
        st = { bal, dep, n };
        ro.set('rr', 'V₀ = ' + money(P0.get(), 0) + ', Vₙ₊₁ = ' + num(R, 6) + 'Vₙ + ' + money(d, 0));
        ro.set('fv', money(bal[n])); ro.set('dep', money(dep[n])); ro.set('int', money(bal[n] - dep[n]), 'good');
        draw();
      }
      function draw() {
        if (!st) return;
        const { ctx, W, H } = cv, c = K.col(); K.clear(ctx, W, H, c);
        const b = box(W, H, 58, 14, 18, 30), top = Math.max(st.bal[st.n], 1) * 1.08;
        const M = K.axes(ctx, b, [0, st.n / 12], [0, top], c, { x: 'years', y: 'balance ($)', yfmt: v => v >= 1000 ? (v / 1000) + 'k' : String(v) });
        const B = st.bal.map((v, i) => [M.X(i / 12), M.Y(v)]), Dd = st.dep.map((v, i) => [M.X(i / 12), M.Y(v)]);
        ctx.beginPath(); B.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); for (let i = Dd.length - 1; i >= 0; i--) ctx.lineTo(Dd[i][0], Dd[i][1]); ctx.closePath(); ctx.fillStyle = c.accSoft; ctx.fill();
        poly(ctx, Dd, c.warn, 2, [5, 4]); poly(ctx, B, c.acc, 2.6);
        K.text(ctx, '— balance', b.x + 10, b.y + 12, { size: 12, color: c.acc, c });
        K.text(ctx, '- - total deposited', b.x + 10, b.y + 28, { size: 12, color: c.warn, c });
      }
      cv.draw = draw; add(K.onTheme(draw)); add(cv.destroy);
      upd();
    });
    return K.mount(el, 'Reducing balance loan', 'Vₙ₊₁ = RVₙ − d with monthly payments. Early payments are mostly interest, so the balance falls slowly at first. Raise the payment or cut the rate and watch the loan shorten and the total interest drop.', ({ body, add }) => {
      const cv = K.canvas(body, 0.5, { maxH: 360, minH: 240, label: 'Balance of a reducing balance loan over time' });
      const ctl = K.controls(body);
      const P0 = K.slider(ctl, { label: 'Amount borrowed', min: 10000, max: 800000, step: 10000, value: 300000, fmt: v => money(v, 0), onInput: upd });
      const Rt = K.slider(ctl, { label: 'Interest rate (% p.a.)', min: 1, max: 12, step: 0.1, value: 6, fmt: v => v.toFixed(1) + '%', onInput: upd });
      const Pm = K.slider(ctl, { label: 'Monthly payment', min: 100, max: 8000, step: 10, value: 1940, fmt: v => money(v, 0), onInput: upd });
      const ro = K.readout(body, [['first', 'Payment 1: interest + principal'], ['n', 'Number of payments'], ['last', 'Final payment'], ['int', 'Total interest']]);
      let st = null;
      function upd() {
        const r = Rt.get() / 1200, d = Pm.get(), bal = [P0.get()];
        const i1 = bal[0] * r;
        ro.set('first', money(i1) + ' + ' + money(d - i1), d <= i1 ? 'bad' : '');
        if (d <= i1 + 0.005) { st = { bal: [bal[0], bal[0]], never: true }; ro.set('n', 'never repaid', 'bad'); ro.set('last', '–'); ro.set('int', d === i1 ? 'interest only' : 'balance grows', 'bad'); draw(); return; }
        let paid = 0, last = d;
        while (bal[bal.length - 1] > 1e-6 && bal.length < 1201) {
          const b = bal[bal.length - 1], owe = b * (1 + r);
          if (owe <= d) { last = owe; paid += owe; bal.push(0); break; }
          paid += d; bal.push(owe - d);
        }
        st = { bal, never: false };
        const n = bal.length - 1;
        ro.set('n', n + ' (' + num(n / 12, 3) + ' years)', n > 360 ? 'warn' : '');
        ro.set('last', money(last));
        ro.set('int', money(paid - P0.get()));
        draw();
      }
      function draw() {
        if (!st) return;
        const { ctx, W, H } = cv, c = K.col(); K.clear(ctx, W, H, c);
        const b = box(W, H, 58, 14, 18, 30), yrs = Math.max(1, (st.bal.length - 1) / 12);
        const M = K.axes(ctx, b, [0, st.never ? 30 : yrs], [0, st.bal[0] * 1.08], c, { x: 'years', y: 'balance ($)', yfmt: v => v >= 1000 ? (v / 1000) + 'k' : String(v) });
        if (st.never) { poly(ctx, [[M.X(0), M.Y(st.bal[0])], [M.X(30), M.Y(st.bal[0])]], c.bad, 2.6); K.text(ctx, 'The payment doesn’t cover the interest', b.x + 10, b.y + 14, { size: 12, color: c.bad, c }); return; }
        poly(ctx, [[M.X(0), M.Y(st.bal[0])], [M.X(yrs), M.Y(0)]], c.line2, 1.4, [5, 4]);
        poly(ctx, st.bal.map((v, i) => [M.X(i / 12), M.Y(v)]), c.acc, 2.8);
        K.text(ctx, 'dashed: a straight-line fall, for comparison', b.x + b.w - 4, b.y + 12, { size: 11, color: c.muted, align: 'right', c });
      }
      cv.draw = draw; add(K.onTheme(draw)); add(cv.destroy);
      upd();
    });
  };

  /* ------------------------------------------------------------------ transition matrices */
  S.gmMarkov = function (el) {
    return K.mount(el, 'Two-state transition matrix', 'A fixed population of 1000 moves between A and B each week. Move the switching rates and the starting split: for a regular matrix the state settles to the same steady state whatever the start.', ({ body, add }) => {
      const cv = K.canvas(body, 0.5, { maxH: 360, minH: 240, label: 'Numbers in states A and B over 20 weeks, approaching the steady state' });
      const ctl = K.controls(body);
      const Pa = K.slider(ctl, { label: 'A → B each week', min: 0, max: 1, step: 0.05, value: 0.2, fmt: v => Math.round(v * 100) + '%', onInput: upd });
      const Pb = K.slider(ctl, { label: 'B → A each week', min: 0, max: 1, step: 0.05, value: 0.3, fmt: v => Math.round(v * 100) + '%', onInput: upd });
      const A0 = K.slider(ctl, { label: 'Starting number in A', min: 0, max: 1000, step: 50, value: 500, fmt: v => v + ' (B ' + (1000 - v) + ')', onInput: upd });
      const Nn = K.slider(ctl, { label: 'Week n', min: 0, max: 20, step: 1, value: 3, fmt: v => String(v), onInput: upd });
      const ro = K.readout(body, [['T', 'T (columns: this week A, B)'], ['S', 'Sₙ (A, B)'], ['ss', 'Steady state (A, B)']]);
      let st = null;
      function upd() {
        const p = Pa.get(), q = Pb.get(), A = [A0.get()], B = [1000 - A0.get()];
        for (let i = 1; i <= 20; i++) { A.push((1 - p) * A[i - 1] + q * B[i - 1]); B.push(p * A[i - 1] + (1 - q) * B[i - 1]); }
        const n = Nn.get();
        st = { A, B, n, ss: p + q > 0 && p + q < 2 ? 1000 * q / (p + q) : null };
        ro.set('T', '[' + num(1 - p, 2) + ' ' + num(q, 2) + ' ; ' + num(p, 2) + ' ' + num(1 - q, 2) + ']');
        ro.set('S', num(A[n], 5) + ', ' + num(B[n], 5));
        ro.set('ss', st.ss == null ? (p + q === 0 ? 'no one ever moves' : 'flips every week: not regular') : num(st.ss, 4) + ', ' + num(1000 - st.ss, 4), st.ss == null ? 'warn' : 'good');
        draw();
      }
      function draw() {
        if (!st) return;
        const { ctx, W, H } = cv, c = K.col(); K.clear(ctx, W, H, c);
        const b = box(W, H, 44, 14, 18, 30);
        const M = K.axes(ctx, b, [0, 20], [0, 1000], c, { x: 'week', y: 'number' });
        if (st.ss != null) { poly(ctx, [[M.X(0), M.Y(st.ss)], [M.X(20), M.Y(st.ss)]], c.acc, 1.2, [5, 4]); poly(ctx, [[M.X(0), M.Y(1000 - st.ss)], [M.X(20), M.Y(1000 - st.ss)]], c.warn, 1.2, [5, 4]); }
        poly(ctx, st.A.map((v, i) => [M.X(i), M.Y(v)]), c.acc, 2.4); poly(ctx, st.B.map((v, i) => [M.X(i), M.Y(v)]), c.warn, 2.4);
        st.A.forEach((v, i) => dot(ctx, M.X(i), M.Y(v), i === st.n ? 6 : 3, c.acc)); st.B.forEach((v, i) => dot(ctx, M.X(i), M.Y(v), i === st.n ? 6 : 3, c.warn));
        K.text(ctx, '● A', b.x + b.w - 70, b.y + 12, { size: 12, color: c.acc, c }); K.text(ctx, '● B', b.x + b.w - 34, b.y + 12, { size: 12, color: c.warn, c });
      }
      cv.draw = draw; add(K.onTheme(draw)); add(cv.destroy);
      upd();
    });
  };

  /* ------------------------------------------------------------------ Prim's and Dijkstra's algorithms */
  S.gmNetwork = function (el) {
    const dij = el.dataset.mode === 'dijkstra';
    const POS = { A: [0.06, 0.5], B: [0.3, 0.12], C: [0.3, 0.88], D: [0.53, 0.47], E: [0.76, 0.12], F: [0.76, 0.88], G: [0.94, 0.5] };
    const names = Object.keys(POS);
    const LINKS = [['A', 'B'], ['A', 'C'], ['B', 'C'], ['B', 'D'], ['C', 'D'], ['B', 'E'], ['D', 'E'], ['D', 'F'], ['C', 'F'], ['E', 'G'], ['F', 'G'], ['D', 'G']];
    const W0 = [4, 3, 2, 5, 6, 7, 3, 4, 8, 5, 2, 6];
    const title = dij ? 'Dijkstra’s algorithm, one step at a time' : 'Prim’s algorithm, one step at a time';
    const desc = dij ? 'Each step makes the smallest temporary label permanent (bold) and updates its neighbours. Labels show the shortest distance found so far. Change the start, or shuffle the weights.' : 'Each step adds the cheapest edge joining the tree to a new vertex. Highlighted dashed edges are the candidates. Change the start vertex (the total never changes), or shuffle the weights.';
    return K.mount(el, title, desc, ({ body, add }) => {
      const cv = K.canvas(body, 0.56, { maxH: 380, minH: 240, label: dij ? 'Network with Dijkstra labels' : 'Network with the growing Prim tree' });
      const ctl = K.controls(body);
      const St = K.select(ctl, { label: 'Start vertex', value: 'A', options: names.map(n => [n, n]), onChange: reset });
      const Tg = dij ? K.select(ctl, { label: 'Destination', value: 'G', options: names.map(n => [n, n]), onChange: () => { show(); } }) : null;
      K.buttons(ctl, [
        { label: 'Next step', primary: true, onClick: () => { if (k < steps.length) { k++; show(); } } },
        { label: 'Run all', onClick: () => { k = steps.length; show(); } },
        { label: 'Reset', onClick: () => { k = 0; show(); } },
        { label: 'Shuffle weights', onClick: () => { wts = wts.map(() => 1 + Math.floor(Math.random() * 9)); reset(); } }
      ]);
      const ro = K.readout(body, dij ? [['perm', 'Permanent so far'], ['lab', 'Labels'], ['path', 'Shortest path to destination']] : [['last', 'Last edge added'], ['tree', 'Tree edges'], ['tot', 'Total weight']]);
      let wts = W0.slice(), steps = [], k = 0;
      const edges = () => LINKS.map(([a, b], i) => [a, b, wts[i]]);
      function reset() { steps = dij ? dijkstraSteps(names, edges(), St.get()) : primSteps(names, edges(), St.get()); k = 0; show(); }
      function show() {
        if (dij) {
          const s = k ? steps[k - 1] : null;
          ro.set('perm', s ? [...s.done].join(', ') : 'none yet (start ' + St.get() + ' = 0)');
          ro.set('lab', s ? names.map(n => n + ' ' + (s.dist[n] === Infinity ? '∞' : s.dist[n])).join(' · ') : '–');
          const t = Tg.get();
          if (s && s.done.has(t)) { const p = pathTo(s.prev, t); ro.set('path', p.vs.join('–') + ' = ' + s.dist[t], 'good'); }
          else ro.set('path', 'not yet: ' + t + ' isn’t permanent');
        } else {
          const done = steps.slice(0, k);
          ro.set('last', k ? done[k - 1].u + done[k - 1].v + ' (' + done[k - 1].w + ')' : 'none yet');
          ro.set('tree', done.length ? done.map(s => s.u + s.v).join(', ') : '–');
          ro.set('tot', done.reduce((a, s) => a + s.w, 0) + (k === steps.length ? ' (complete)' : ''), k === steps.length ? 'good' : '');
        }
        draw();
      }
      function draw() {
        const { ctx, W, H } = cv, c = K.col(); K.clear(ctx, W, H, c);
        const P = n => [24 + POS[n][0] * (W - 48), 22 + POS[n][1] * (H - 44)];
        const E = edges();
        let tree = new Set(), cand = new Set(), inT = new Set([St.get()]), hot = new Set(), s = null;
        if (!dij) { steps.slice(0, k).forEach(st => { tree.add(st.i); inT.add(st.v); }); if (k < steps.length) E.forEach(([a, b], i) => { if (inT.has(a) !== inT.has(b)) cand.add(i); }); }
        else { s = k ? steps[k - 1] : null; if (s) names.forEach(n => { if (s.prev[n] && s.done.has(n)) tree.add(s.prev[n][1]); }); if (s && s.done.has(Tg.get())) pathTo(s.prev, Tg.get()).es.forEach(i => hot.add(i)); }
        E.forEach(([a, b], i) => {
          const p = P(a), q = P(b);
          if (hot.has(i)) poly(ctx, [p, q], c.acc, 4.5);
          else if (tree.has(i)) poly(ctx, [p, q], dij ? c.accSoft : c.acc, dij ? 7 : 4);
          else if (cand.has(i)) poly(ctx, [p, q], c.warn, 2, [6, 4]);
          poly(ctx, [p, q], c.line2, 1.2);
        });
        E.forEach(([a, b, w], i) => { const p = P(a), q = P(b); pill(ctx, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2, String(w), c, tree.has(i) && !dij || hot.has(i)); });
        names.forEach(n => {
          const p = P(n), inside = dij ? (s && s.done.has(n)) || (!s && n === St.get()) : inT.has(n);
          dot(ctx, p[0], p[1], 13, inside ? c.acc : c.surface, c.acc, 2);
          K.text(ctx, n, p[0], p[1] + 4.5, { size: 13, bold: true, align: 'center', color: inside ? '#fff' : c.ink, c });
          if (dij) {
            const d = s ? s.dist[n] : (n === St.get() ? 0 : Infinity), perm = s ? s.done.has(n) : false;
            const above = POS[n][1] > 0.5;
            K.text(ctx, d === Infinity ? '∞' : String(d), p[0], above ? p[1] + 30 : p[1] - 19, { size: 13, bold: perm, align: 'center', color: perm ? c.acc : c.muted, c });
          }
        });
      }
      cv.draw = draw; add(K.onTheme(draw)); add(cv.destroy);
      reset();
    });
  };

  /* ------------------------------------------------------------------ critical path analysis */
  S.gmCPA = function (el) {
    const ACT = { A: [4, []], B: [3, []], C: [3, ['A']], D: [7, ['A']], E: [6, ['B', 'C']], F: [2, ['C']], G: [3, ['D', 'F']], H: [4, ['E']] };
    const ORDER = 'ABCDEFGH'.split('');
    const NODE = [[30, 110], [130, 40], [130, 180], [210, 110], [290, 40], [290, 180], [390, 110]];
    const EDGE = { A: [0, 1], B: [0, 2], C: [1, 3], D: [1, 4], F: [3, 4], E: [2, 5], G: [4, 6], H: [5, 6] };
    return K.mount(el, 'Critical path explorer', 'The project from this page. Pick an activity and change its duration: ESTs, LSTs, floats and the critical path update. Make a non-critical activity longer than its float and the critical path switches.', ({ body, add }) => {
      const cv = K.canvas(body, 0.5, { maxH: 340, minH: 220, label: 'Activity network with the critical path highlighted' });
      const ctl = K.controls(body);
      const dur = {}; ORDER.forEach(a => { dur[a] = ACT[a][0]; });
      const Ac = K.select(ctl, { label: 'Activity', value: 'D', options: ORDER.map(a => [a, a + ' (originally ' + ACT[a][0] + ' days)']), onChange: () => { Dv.set(dur[Ac.get()]); } });
      const Dv = K.slider(ctl, { label: 'Duration (days)', min: 1, max: 14, step: 1, value: 7, fmt: v => String(v), onInput: v => { dur[Ac.get()] = v; upd(); } });
      K.buttons(ctl, [{ label: 'Reset durations', onClick: () => { ORDER.forEach(a => { dur[a] = ACT[a][0]; }); Dv.set(dur[Ac.get()]); upd(); } }]);
      const ro = K.readout(body, [['fin', 'Minimum completion time'], ['cp', 'Critical activities'], ['fl', 'Floats (non-critical)']]);
      let st = null;
      function upd() {
        const est = {}, lst = {};
        ORDER.forEach(a => { est[a] = Math.max(0, ...ACT[a][1].map(p => est[p] + dur[p])); });
        const fin = Math.max(...ORDER.map(a => est[a] + dur[a]));
        ORDER.slice().reverse().forEach(a => { const nx = ORDER.filter(b => ACT[b][1].includes(a)); lst[a] = (nx.length ? Math.min(...nx.map(b => lst[b])) : fin) - dur[a]; });
        const crit = new Set(ORDER.filter(a => lst[a] === est[a]));
        st = { est, lst, fin, crit, dummy: crit.has('C') && crit.has('E') && est.C + dur.C === est.E };
        ro.set('fin', fin + ' days', fin === 17 ? '' : 'warn');
        ro.set('cp', ORDER.filter(a => crit.has(a)).join(', '));
        ro.set('fl', ORDER.filter(a => !crit.has(a)).map(a => a + ' ' + (lst[a] - est[a])).join(' · ') || 'none');
        draw();
      }
      function draw() {
        if (!st) return;
        const { ctx, W, H } = cv, c = K.col(); K.clear(ctx, W, H, c);
        const s = Math.min((W - 20) / 420, (H - 16) / 210), ox = (W - 420 * s) / 2, oy = (H - 210 * s) / 2;
        const P = i => [ox + NODE[i][0] * s, oy + NODE[i][1] * s];
        const seg = (i, j, color, w, dash) => {
          const p = P(i), q = P(j), dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy), r = 10;
          const a = [p[0] + dx / L * r, p[1] + dy / L * r], b = [q[0] - dx / L * r, q[1] - dy / L * r];
          if (dash) { ctx.save(); ctx.setLineDash([5, 4]); }
          K.arrow(ctx, a[0], a[1], b[0], b[1], color, w, 9);
          if (dash) ctx.restore();
        };
        ORDER.forEach(a => { const [i, j] = EDGE[a], cr = st.crit.has(a); seg(i, j, cr ? c.acc : c.ink2, cr ? 3 : 1.6); });
        seg(3, 2, st.dummy ? c.acc : c.ink2, st.dummy ? 3 : 1.6, true);
        ORDER.forEach(a => {
          const [i, j] = EDGE[a], p = P(i), q = P(j), mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
          const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy), o1 = 17, o2 = 31;
          const nx = -dy / L, ny = dx / L, sgn = (a === 'B' || a === 'E' || a === 'H' || a === 'C' || a === 'F') ? 1 : -1;
          const o = [o1 * sgn, o2 * sgn];
          K.text(ctx, a + ', ' + dur[a], mx + nx * o[0], my + ny * o[0] + 4, { size: 12, bold: st.crit.has(a), align: 'center', color: st.crit.has(a) ? c.acc : c.ink, c });
          K.text(ctx, st.est[a] + ' / ' + st.lst[a], mx + nx * o[1], my + ny * o[1] + 4, { size: 10.5, align: 'center', color: c.muted, mono: true, c });
        });
        NODE.forEach((n, i) => { const p = P(i); dot(ctx, p[0], p[1], 8, c.s3, c.ink2, 1.4); });
        K.text(ctx, 'EST / LST shown beside each activity', ox + 4, oy + 210 * s - 2, { size: 11, color: c.muted, c });
      }
      cv.draw = draw; add(K.onTheme(draw)); add(cv.destroy);
      upd();
    });
  };
})();
