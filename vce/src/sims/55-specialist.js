/* Specialist Mathematics interactives: hero (powers of z on an Argand diagram), rational-function
   graphs, roots of complex numbers, slope fields with Euler's method, and the distribution of sample means. */
(function () {
  'use strict';
  const K = window.SIMKIT, S = window.SIMS;
  const fx = (x, d) => { if (!isFinite(x)) return '–'; const v = Math.abs(x) < 1e-12 ? 0 : x; return v.toFixed(d == null ? 3 : d); };
  const box = (W, H, l, r, t, b) => ({ x: l, y: t, w: W - l - r, h: H - t - b });
  function clipBox(ctx, b) { ctx.save(); ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.clip(); }
  function dot(ctx, x, y, r, fill, stroke) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.lineWidth = 2; ctx.strokeStyle = stroke; ctx.stroke(); } }
  function curve(ctx, f, M, xr, yr, color, width, dash) {
    const n = 600, span = yr[1] - yr[0];
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width || 2.2; if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    let pen = false, prev = null;
    for (let i = 0; i <= n; i++) {
      const x = xr[0] + (xr[1] - xr[0]) * i / n;
      let y; try { y = f(x); } catch (e) { y = NaN; }
      if (!isFinite(y) || (prev !== null && Math.abs(y - prev) > span * 1.5)) { pen = false; prev = isFinite(y) ? y : null; continue; }
      const yc = K.clamp(y, yr[0] - span, yr[1] + span);
      if (!pen) { ctx.moveTo(M.X(x), M.Y(yc)); pen = true; } else ctx.lineTo(M.X(x), M.Y(yc));
      prev = y;
    }
    ctx.stroke(); ctx.restore();
  }
  // square-ish mapping centred on the origin for Argand diagrams
  function argand(b, R) {
    const s = Math.min(b.w, b.h) / (2 * R), cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    return { X: v => cx + v * s, Y: v => cy - v * s, s, cx, cy, inv: (px, py) => [(px - cx) / s, (cy - py) / s] };
  }
  function argAxes(ctx, b, M, c, R) {
    ctx.save(); ctx.strokeStyle = c.grid; ctx.lineWidth = 1;
    const st = K.niceStep(2 * R, 6);
    for (let v = -Math.floor(R / st) * st; v <= R + 1e-9; v += st) {
      ctx.beginPath(); ctx.moveTo(M.X(v), b.y); ctx.lineTo(M.X(v), b.y + b.h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(b.x, M.Y(v)); ctx.lineTo(b.x + b.w, M.Y(v)); ctx.stroke();
    }
    ctx.strokeStyle = c.muted; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(b.x, M.cy); ctx.lineTo(b.x + b.w, M.cy); ctx.moveTo(M.cx, b.y); ctx.lineTo(M.cx, b.y + b.h); ctx.stroke();
    ctx.restore();
    K.text(ctx, 'Re', b.x + b.w - 4, M.cy - 6, { size: 11, color: c.muted, align: 'right', c });
    K.text(ctx, 'Im', M.cx + 6, b.y + 12, { size: 11, color: c.muted, c });
  }
  const polar = (r, t) => (Math.abs(r - Math.round(r)) < 1e-9 ? Math.round(r) : fx(r, 3)) + ' cis(' + fmtAngle(t) + ')';
  function fmtAngle(t) {
    // show as a multiple of π when it's a simple fraction
    const q = t / Math.PI;
    for (const d of [1, 2, 3, 4, 6, 8, 12, 5, 7, 9, 10]) {
      const n = Math.round(q * d);
      if (Math.abs(q * d - n) < 1e-6) {
        if (n === 0) return '0';
        const sgn = n < 0 ? '−' : '', a = Math.abs(n);
        return sgn + (a === 1 ? '' : a) + 'π' + (d === 1 ? '' : '/' + d);
      }
    }
    return fx(t, 3);
  }
  const princ = t => { let a = t % (2 * Math.PI); if (a <= -Math.PI) a += 2 * Math.PI; if (a > Math.PI) a -= 2 * Math.PI; return a; };

  /* ------------------------------------------------------------------ hero: powers of z */
  S.heroSpec = function (el) {
    el.innerHTML = '';
    const cvs = K.canvas(el, 0.8, { maxH: 440, minH: 260, label: 'Argand diagram: drag z to see its powers z, z², z³, … spiral by De Moivre’s theorem.' });
    cvs.wrap.style.border = '0'; cvs.wrap.style.borderRadius = '0';
    const cap = document.createElement('div'); cap.className = 'cap'; el.appendChild(cap);
    let z = [1.0, 0.5];
    const R = 2;
    const { ctx } = cvs;
    function draw() {
      const W = cvs.W, H = cvs.H, c = K.col();
      ctx.fillStyle = c.surface; ctx.fillRect(0, 0, W, H);
      const b = box(W, H, 14, 14, 14, 14);
      const M = argand(b, R); cvs._M = M;
      argAxes(ctx, b, M, c, R);
      ctx.save(); ctx.strokeStyle = c.line2; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.arc(M.cx, M.cy, M.s, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      const r = Math.hypot(z[0], z[1]), t = Math.atan2(z[1], z[0]);
      // smooth spiral r^s cis(s t) for s in [0, 6]
      clipBox(ctx, b);
      ctx.strokeStyle = c.accSoft; ctx.lineWidth = 6; ctx.beginPath();
      for (let i = 0; i <= 300; i++) { const s = 6 * i / 300, rr = Math.pow(r, s), a = s * t; const px = M.X(rr * Math.cos(a)), py = M.Y(rr * Math.sin(a)); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
      for (let n = 1; n <= 6; n++) {
        const rr = Math.pow(r, n), a = n * t, x = rr * Math.cos(a), y = rr * Math.sin(a);
        ctx.strokeStyle = n === 1 ? c.acc : c.line2; ctx.lineWidth = n === 1 ? 2.4 : 1.2;
        ctx.beginPath(); ctx.moveTo(M.cx, M.cy); ctx.lineTo(M.X(x), M.Y(y)); ctx.stroke();
        dot(ctx, M.X(x), M.Y(y), n === 1 ? 8 : 5, n === 1 ? c.acc : c.n, c.surface);
        if (n > 1) K.text(ctx, 'z' + K.sup(n), M.X(x) + 8, M.Y(y) - 6, { size: 12, color: c.ink2, c });
      }
      ctx.restore();
      cap.textContent = 'Drag z · |z| = ' + fx(r, 2) + ' · Arg z = ' + fx(t, 2) + ' · zⁿ = |z|ⁿ cis(n·Arg z)';
    }
    cvs.draw = draw; draw();
    let drag = false;
    const toZ = e => { const rc = cvs.cv.getBoundingClientRect(); const M = cvs._M; const p = M.inv((e.clientX - rc.left) * cvs.W / rc.width, (e.clientY - rc.top) * cvs.H / rc.height); const m = Math.hypot(p[0], p[1]); const k = m > 1.35 ? 1.35 / m : m < 0.25 ? 0.25 / Math.max(m, 1e-6) : 1; return [p[0] * k, p[1] * k]; };
    cvs.cv.addEventListener('pointerdown', e => { drag = true; cvs.cv.setPointerCapture(e.pointerId); z = toZ(e); draw(); e.preventDefault(); });
    cvs.cv.addEventListener('pointermove', e => { if (drag) { z = toZ(e); draw(); } });
    const up = () => { drag = false; };
    cvs.cv.addEventListener('pointerup', up); cvs.cv.addEventListener('pointercancel', up);
    const off = K.onTheme(draw);
    return () => { off(); cvs.destroy(); };
  };

  /* ------------------------------------------------------------------ rational graphs */
  S.rationalGraph = function (el) {
    return K.mount(el, 'Rational function explorer', 'Two families from the study design. Quotient: y = (x² + b)/(x − c) has a vertical asymptote x = c and an oblique asymptote y = x + c. Reciprocal: y = 1/(x² + bx + c) has vertical asymptotes at the zeros of the quadratic. Move the sliders and watch the asymptotes and turning points update.', ({ body, add }) => {
      const cv = K.canvas(body, 0.62, { maxH: 440, label: 'Graph of a rational function with its asymptotes' });
      const ctl = K.controls(body);
      const Mo = K.select(ctl, { label: 'Family', value: 'quot', options: [['quot', 'y = (x² + b)/(x − c)'], ['recip', 'y = 1/(x² + bx + c)']], onChange: upd });
      const B = K.slider(ctl, { label: 'b', min: -6, max: 6, step: 0.5, value: 3, fmt: v => v.toFixed(1), onInput: upd });
      const C = K.slider(ctl, { label: 'c', min: -4, max: 4, step: 0.5, value: 1, fmt: v => v.toFixed(1), onInput: upd });
      const ro = K.readout(body, [['rule', 'Rule'], ['asy', 'Asymptotes'], ['tp', 'Turning points'], ['note', 'Note']]);
      let st = null;
      function upd() {
        const b = B.get(), c = C.get(), mode = Mo.get();
        const n = v => (Math.round(v * 100) / 100).toString().replace('-', '−');
        const sg = v => (v < 0 ? ' − ' : ' + ') + n(Math.abs(v));
        if (mode === 'quot') {
          const k = b + c * c;
          const f = x => (x * x + b) / (x - c);
          const tps = k > 0 ? [c - Math.sqrt(k), c + Math.sqrt(k)].map(x => [x, f(x)]) : [];
          st = { f, va: k !== 0 ? [c] : [], obl: [1, c], ha: null, tps, hole: k === 0 ? [c, 2 * c] : null };
          ro.set('rule', 'y = x' + (c ? sg(c) : '') + (k ? sg(k) + '/(x' + (c ? sg(-c) : '') + ')' : ''));
          ro.set('asy', k !== 0 ? 'x = ' + n(c) + ', y = x' + (c ? sg(c) : '') : 'none (the graph is a line)');
          ro.set('tp', tps.length ? tps.map(p => '(' + fx(p[0], 2) + ', ' + fx(p[1], 2) + ')').join(', ') : 'none');
          ro.set('note', k === 0 ? 'b + c² = 0: the factor cancels, leaving a line with a hole at x = ' + n(c) : k > 0 ? 'b + c² > 0: two turning points' : 'b + c² < 0: no turning points (always increasing)');
        } else {
          const D = b * b - 4 * c, f = x => 1 / (x * x + b * x + c);
          const va = D > 0 ? [(-b - Math.sqrt(D)) / 2, (-b + Math.sqrt(D)) / 2] : D === 0 ? [-b / 2] : [];
          const xm = -b / 2, ym = c - b * b / 4;
          const tps = ym !== 0 ? [[xm, 1 / ym]] : [];
          st = { f, va, obl: null, ha: 0, tps, hole: null };
          ro.set('rule', 'y = 1/(x²' + (b ? sg(b) + 'x' : '') + (c ? sg(c) : '') + ')');
          ro.set('asy', (va.length ? 'x = ' + va.map(v => fx(v, 2)).join(', x = ') + ', ' : '') + 'y = 0');
          ro.set('tp', tps.length ? '(' + fx(xm, 2) + ', ' + fx(1 / ym, 3) + ')' + (ym > 0 ? ' local max' : ' local max (between asymptotes)') : 'none');
          ro.set('note', D > 0 ? 'Δ > 0: two vertical asymptotes; the graph is negative between them' : D === 0 ? 'Δ = 0: one vertical asymptote; graph positive everywhere else' : 'Δ < 0: no vertical asymptotes; the minimum of the quadratic becomes the maximum of y');
        }
        draw();
      }
      function draw() {
        if (!st) return;
        const { ctx, W, H } = cv, c = K.col();
        K.clear(ctx, W, H, c);
        const b = box(W, H, 36, 12, 12, 26);
        const xr = [-8, 8], yh = 8 * b.h / b.w * 1.3, yr = [-yh, yh];
        const M = K.axes(ctx, b, xr, yr, c, { x: 'x', y: 'y' });
        ctx.strokeStyle = c.muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(M.X(0), b.y); ctx.lineTo(M.X(0), b.y + b.h); ctx.stroke();
        clipBox(ctx, b);
        ctx.setLineDash([5, 5]); ctx.strokeStyle = c.warn; ctx.lineWidth = 1.3;
        st.va.forEach(x => { ctx.beginPath(); ctx.moveTo(M.X(x), b.y); ctx.lineTo(M.X(x), b.y + b.h); ctx.stroke(); });
        if (st.obl) { const [m, k] = st.obl; ctx.beginPath(); ctx.moveTo(M.X(xr[0]), M.Y(m * xr[0] + k)); ctx.lineTo(M.X(xr[1]), M.Y(m * xr[1] + k)); ctx.stroke(); }
        if (st.ha !== null) { ctx.beginPath(); ctx.moveTo(b.x, M.Y(st.ha)); ctx.lineTo(b.x + b.w, M.Y(st.ha)); ctx.stroke(); }
        ctx.setLineDash([]);
        curve(ctx, st.f, M, xr, yr, c.acc, 2.8);
        st.tps.forEach(p => { if (Math.abs(p[1]) < yh) dot(ctx, M.X(p[0]), M.Y(p[1]), 5.5, c.n, c.surface); });
        if (st.hole) dot(ctx, M.X(st.hole[0]), M.Y(st.hole[1]), 5, c.surface, c.acc);
        ctx.restore();
      }
      cv.draw = draw; add(K.onTheme(draw)); add(cv.destroy);
      upd();
    });
  };

  /* ------------------------------------------------------------------ roots of complex numbers */
  S.complexRoots = function (el) {
    return K.mount(el, 'Roots of zⁿ = a cis φ', 'The n solutions of zⁿ = a cis φ all have modulus a^(1/n) and are spaced 2π/n apart, forming a regular polygon. Change n, a and φ and watch the polygon rotate and resize.', ({ body, add }) => {
      const cv = K.canvas(body, 0.62, { maxH: 440, label: 'Argand diagram showing the nth roots of a complex number as a regular polygon' });
      const ctl = K.controls(body);
      const N = K.slider(ctl, { label: 'n', min: 2, max: 8, step: 1, value: 3, fmt: v => String(v), onInput: upd });
      const A = K.slider(ctl, { label: 'a (modulus of the right side)', min: 1, max: 16, step: 1, value: 8, fmt: v => String(v), onInput: upd });
      const P = K.slider(ctl, { label: 'φ (argument)', min: -12, max: 12, step: 1, value: Math.PI / 2, toVal: v => v * Math.PI / 12, fromVal: v => Math.round(v * 12 / Math.PI), fmt: v => fmtAngle(v), onInput: upd });
      const ro = K.readout(body, [['eq', 'Equation'], ['mod', 'Modulus of each root'], ['roots', 'Roots (principal arguments)']]);
      let st = null;
      function upd() {
        const n = N.get(), a = A.get(), phi = P.get(), r = Math.pow(a, 1 / n);
        const roots = []; for (let k = 0; k < n; k++) roots.push(princ((phi + 2 * k * Math.PI) / n));
        roots.sort((p, q) => p - q);
        st = { n, a, phi, r, roots };
        ro.set('eq', 'z' + K.sup(n) + ' = ' + polar(a, princ(phi)));
        ro.set('mod', a + '^(1/' + n + ') = ' + fx(r, 3));
        ro.set('roots', roots.map(t => polar(r, t)).join(',  '));
        draw();
      }
      function draw() {
        if (!st) return;
        const { ctx, W, H } = cv, c = K.col();
        K.clear(ctx, W, H, c);
        const b = box(W, H, 12, 12, 12, 12);
        const R = Math.max(2.2, st.r * 1.3);
        const M = argand(b, R);
        argAxes(ctx, b, M, c, R);
        ctx.save(); ctx.strokeStyle = c.line2; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.arc(M.cx, M.cy, st.r * M.s, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        const pts = st.roots.map(t => [M.X(st.r * Math.cos(t)), M.Y(st.r * Math.sin(t))]);
        if (st.n > 2) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fillStyle = c.accSoft; ctx.fill(); ctx.strokeStyle = c.acc; ctx.lineWidth = 2; ctx.stroke(); }
        else { ctx.strokeStyle = c.acc; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[1][0], pts[1][1]); ctx.stroke(); }
        pts.forEach((p, i) => { ctx.strokeStyle = c.line2; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(M.cx, M.cy); ctx.lineTo(p[0], p[1]); ctx.stroke(); dot(ctx, p[0], p[1], 6, c.acc, c.surface); });
        K.text(ctx, 'radius ' + fx(st.r, 2) + ' · spacing 2π/' + st.n, b.x + 6, b.y + 14, { size: 12, color: c.ink2, c });
      }
      cv.draw = draw; add(K.onTheme(draw)); add(cv.destroy);
      upd();
    });
  };

  /* ------------------------------------------------------------------ slope field + Euler */
  const DES = {
    x: { name: 'dy/dx = x', f: (x, y) => x },
    y: { name: 'dy/dx = y', f: (x, y) => y },
    xy: { name: 'dy/dx = x + y', f: (x, y) => x + y },
    log: { name: 'dy/dx = y(4 − y)/4 (logistic)', f: (x, y) => y * (4 - y) / 4 },
    circ: { name: 'dy/dx = −x/y', f: (x, y) => -x / y },
    sin: { name: 'dy/dx = sin x', f: (x, y) => Math.sin(x) }
  };
  S.slopeField = function (el) {
    return K.mount(el, 'Slope field and Euler’s method', 'Each segment has gradient dy/dx at that point. Tap or click the field to choose an initial condition: the solid curve is the true solution, the dots are Euler’s method with step h. Smaller h hugs the curve more closely.', ({ body, add }) => {
      const cv = K.canvas(body, 0.62, { maxH: 440, label: 'Slope field with a solution curve and Euler approximation' });
      const ctl = K.controls(body);
      const D = K.select(ctl, { label: 'Differential equation', value: 'xy', options: Object.entries(DES).map(([k, v]) => [k, v.name]), onChange: upd });
      const Hs = K.slider(ctl, { label: 'Euler step h', min: 0.1, max: 1, step: 0.05, value: 0.5, fmt: v => v.toFixed(2), onInput: upd });
      const E = K.check(ctl, { label: 'Show Euler steps', value: true, onChange: upd });
      const ro = K.readout(body, [['ic', 'Initial condition'], ['eu', 'Euler estimate at x₀ + 2'], ['tr', 'Solution at x₀ + 2'], ['err', 'Error']]);
      let p0 = [-2, 0], st = null;
      const xr = [-4, 4];
      function rk(f, x, y, h) { const k1 = f(x, y), k2 = f(x + h / 2, y + h * k1 / 2), k3 = f(x + h / 2, y + h * k2 / 2), k4 = f(x + h, y + h * k3); return y + h * (k1 + 2 * k2 + 2 * k3 + k4) / 6; }
      function trace(f, x0, y0, dir, yr) {
        const out = [[x0, y0]]; let x = x0, y = y0; const h = 0.01 * dir;
        for (let i = 0; i < 1200; i++) { const ny = rk(f, x, y, h); if (!isFinite(ny) || Math.abs(ny) > 60 || (x + h) < xr[0] || (x + h) > xr[1]) break; x += h; y = ny; out.push([x, y]); if (y < yr[0] - 4 || y > yr[1] + 4) break; }
        return out;
      }
      function upd() {
        const de = DES[D.get()], h = Hs.get();
        const [x0, y0] = p0;
        const steps = Math.round(2 / h), eu = [[x0, y0]];
        let x = x0, y = y0;
        for (let i = 0; i < steps; i++) { y = y + h * de.f(x, y); x = x + h; eu.push([x, y]); }
        let ty = y0, tx = x0; for (let i = 0; i < 200; i++) { ty = rk(de.f, tx, ty, 0.01); tx += 0.01; }
        st = { de, eu, euY: y, trY: ty, steps, h };
        ro.set('ic', 'y(' + fx(x0, 2) + ') = ' + fx(y0, 2));
        ro.set('eu', isFinite(y) ? fx(y, 3) + ' (' + steps + ' steps)' : '–');
        ro.set('tr', isFinite(ty) ? fx(ty, 3) : '–');
        ro.set('err', isFinite(y - ty) ? fx(y - ty, 3) : '–', Math.abs(y - ty) < 0.05 ? 'good' : '');
        draw();
      }
      function draw() {
        if (!st) return;
        const { ctx, W, H } = cv, c = K.col();
        K.clear(ctx, W, H, c);
        const b = box(W, H, 34, 12, 12, 26);
        const yh = 4 * b.h / b.w, yr = [-yh, yh];
        const M = K.axes(ctx, b, xr, yr, c, { x: 'x', y: 'y' });
        ctx.strokeStyle = c.muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(M.X(0), b.y); ctx.lineTo(M.X(0), b.y + b.h); ctx.stroke();
        cv._M = M; cv._b = b; cv._yr = yr;
        clipBox(ctx, b);
        const sx = b.w / (xr[1] - xr[0]), sy = b.h / (yr[1] - yr[0]);
        const gx = 0.5, L = 11;
        ctx.strokeStyle = c.muted; ctx.lineWidth = 1.4;
        for (let x = xr[0] + gx / 2; x < xr[1]; x += gx) for (let y = Math.ceil(yr[0] / gx) * gx; y <= yr[1]; y += gx) {
          const m = st.de.f(x, y); if (!isFinite(m)) continue;
          const dx = 1, dy = m, len = Math.hypot(dx * sx, dy * sy), ux = dx * sx / len * L, uy = dy * sy / len * L;
          ctx.beginPath(); ctx.moveTo(M.X(x) - ux / 2, M.Y(y) + uy / 2); ctx.lineTo(M.X(x) + ux / 2, M.Y(y) - uy / 2); ctx.stroke();
        }
        const pts = trace(st.de.f, p0[0], p0[1], -1, yr).reverse().concat(trace(st.de.f, p0[0], p0[1], 1, yr).slice(1));
        ctx.strokeStyle = c.acc; ctx.lineWidth = 2.6; ctx.beginPath();
        pts.forEach((p, i) => i ? ctx.lineTo(M.X(p[0]), M.Y(p[1])) : ctx.moveTo(M.X(p[0]), M.Y(p[1]))); ctx.stroke();
        if (E.get()) {
          ctx.strokeStyle = c.warn; ctx.lineWidth = 1.8; ctx.beginPath();
          st.eu.forEach((p, i) => i ? ctx.lineTo(M.X(p[0]), M.Y(p[1])) : ctx.moveTo(M.X(p[0]), M.Y(p[1]))); ctx.stroke();
          st.eu.forEach(p => dot(ctx, M.X(p[0]), M.Y(p[1]), 4.5, c.warn, c.surface));
        }
        dot(ctx, M.X(p0[0]), M.Y(p0[1]), 6.5, c.ink, c.surface);
        ctx.restore();
      }
      cv.cv.addEventListener('pointerdown', e => {
        const M = cv._M, b = cv._b; if (!M) return;
        const rc = cv.cv.getBoundingClientRect(), px = (e.clientX - rc.left) * cv.W / rc.width, py = (e.clientY - rc.top) * cv.H / rc.height;
        if (px < b.x || px > b.x + b.w || py < b.y || py > b.y + b.h) return;
        const x = xr[0] + (px - b.x) / b.w * (xr[1] - xr[0]), y = cv._yr[1] - (py - b.y) / b.h * (cv._yr[1] - cv._yr[0]);
        p0 = [Math.round(x * 4) / 4, Math.round(y * 4) / 4];
        if (D.get() === 'circ' && p0[1] === 0) p0[1] = 0.25;
        upd();
      });
      cv.draw = draw; add(K.onTheme(draw)); add(cv.destroy);
      upd();
    });
  };

  /* ------------------------------------------------------------------ distribution of sample means */
  let spare = null;
  function randn() { if (spare !== null) { const s = spare; spare = null; return s; } let u = 0; while (u === 0) u = Math.random(); const v = Math.random(); const r = Math.sqrt(-2 * Math.log(u)); spare = r * Math.sin(2 * Math.PI * v); return r * Math.cos(2 * Math.PI * v); }
  const POPS = {
    exp: { name: 'Right-skewed (exponential, μ = 2, σ = 2)', mu: 2, sd: 2, draw: () => -2 * Math.log(1 - Math.random()), pdf: x => x < 0 ? 0 : 0.5 * Math.exp(-x / 2), xr: [0, 8] },
    uni: { name: 'Uniform on [0, 6] (μ = 3, σ ≈ 1.73)', mu: 3, sd: Math.sqrt(3), draw: () => 6 * Math.random(), pdf: x => (x >= 0 && x <= 6 ? 1 / 6 : 0), xr: [-0.5, 6.5] },
    nor: { name: 'Normal (μ = 4, σ = 1.5)', mu: 4, sd: 1.5, draw: () => 4 + 1.5 * randn(), pdf: x => Math.exp(-((x - 4) ** 2) / (2 * 2.25)) / (1.5 * Math.sqrt(2 * Math.PI)), xr: [-0.5, 8.5] }
  };
  S.sampleMeans = function (el) {
    return K.mount(el, 'Distribution of the sample mean', 'Pick a population and a sample size n, then draw samples. The histogram shows the sample means; the curve is the normal approximation N(μ, σ²/n). Even a skewed population gives nearly normal sample means once n is large (central limit theorem).', ({ body, add }) => {
      const cv = K.canvas(body, 0.58, { maxH: 420, label: 'Histogram of simulated sample means with the normal approximation' });
      const ctl = K.controls(body);
      const P = K.select(ctl, { label: 'Population', value: 'exp', options: Object.entries(POPS).map(([k, v]) => [k, v.name]), onChange: reset });
      const N = K.slider(ctl, { label: 'Sample size n', min: 1, max: 50, step: 1, value: 5, fmt: v => String(v), onInput: reset });
      K.buttons(body, [
        { label: 'Draw 1 sample', onClick: () => draw1(1) },
        { label: 'Draw 500 samples', primary: true, onClick: () => draw1(500) },
        { label: 'Clear', onClick: reset }
      ]);
      const ro = K.readout(body, [['cnt', 'Samples drawn'], ['mean', 'Mean of x̄ values (theory μ)'], ['sd', 'sd of x̄ values (theory σ/√n)'], ['last', 'Last sample mean']]);
      let means = [], last = null;
      function reset() { means = []; last = null; report(); draw(); }
      function draw1(k) {
        const pop = POPS[P.get()], n = N.get();
        for (let j = 0; j < k; j++) { let s = 0; for (let i = 0; i < n; i++) s += pop.draw(); means.push(s / n); }
        last = means[means.length - 1]; report(); draw();
      }
      function report() {
        const pop = POPS[P.get()], n = N.get(), m = means.length;
        const avg = m ? means.reduce((a, b) => a + b, 0) / m : NaN;
        const sd = m > 1 ? Math.sqrt(means.reduce((a, b) => a + (b - avg) ** 2, 0) / (m - 1)) : NaN;
        ro.set('cnt', String(m));
        ro.set('mean', (m ? fx(avg, 3) : '–') + ' (' + fx(pop.mu, 2) + ')');
        ro.set('sd', (m > 1 ? fx(sd, 3) : '–') + ' (' + fx(pop.sd / Math.sqrt(n), 3) + ')');
        ro.set('last', last === null ? '–' : fx(last, 3));
      }
      function draw() {
        const { ctx, W, H } = cv, c = K.col();
        K.clear(ctx, W, H, c);
        const pop = POPS[P.get()], n = N.get(), se = pop.sd / Math.sqrt(n);
        const b = box(W, H, 40, 12, 14, 28), xr = pop.xr;
        const bins = 48, bw = (xr[1] - xr[0]) / bins, counts = new Array(bins).fill(0);
        means.forEach(v => { const i = Math.floor((v - xr[0]) / bw); if (i >= 0 && i < bins) counts[i]++; });
        const dens = counts.map(k => means.length ? k / (means.length * bw) : 0);
        const peak = Math.max(1 / (se * Math.sqrt(2 * Math.PI)), ...dens, 0.3);
        const yr = [0, peak * 1.12];
        const M = K.axes(ctx, b, xr, yr, c, { x: 'x̄', y: 'density' });
        clipBox(ctx, b);
        // population pdf (faint)
        curve(ctx, pop.pdf, M, xr, yr, c.muted, 1.4, [5, 5]);
        ctx.fillStyle = c.accSoft; ctx.strokeStyle = c.acc; ctx.lineWidth = 1;
        dens.forEach((d, i) => { if (!d) return; const x0 = M.X(xr[0] + i * bw), x1 = M.X(xr[0] + (i + 1) * bw), y = M.Y(d); ctx.fillRect(x0, y, x1 - x0 - 1, M.Y(0) - y); ctx.strokeRect(x0, y, x1 - x0 - 1, M.Y(0) - y); });
        curve(ctx, x => Math.exp(-((x - pop.mu) ** 2) / (2 * se * se)) / (se * Math.sqrt(2 * Math.PI)), M, xr, yr, c.n, 2.4);
        if (last !== null) { ctx.strokeStyle = c.v; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(M.X(last), b.y); ctx.lineTo(M.X(last), b.y + b.h); ctx.stroke(); }
        ctx.restore();
        K.text(ctx, 'N(μ, σ²/n)', b.x + b.w - 8, b.y + 16, { size: 12, color: c.n, bold: true, align: 'right', c });
        K.text(ctx, 'population (dashed)', b.x + b.w - 8, b.y + 32, { size: 11.5, color: c.muted, align: 'right', c });
      }
      cv.draw = draw; add(K.onTheme(draw)); add(cv.destroy);
      reset();
    });
  };
})();
