/* ==========================================================================
   Summary sheet designer: build the pre-written notes sheet you take into the exam
   (or a SAC) from the site's own content — key points, formulas, traps, key ideas,
   worked examples, diagrams, tables, glossary terms, constants, your saved notes —
   plus your own blocks. Blocks auto-pack into columns, page by page, at real paper
   size, with a live "how full" meter; print it or download a print-ready file.
   ========================================================================== */
(function () {
  'use strict';
  const A = window.GUIDE_APP;
  if (!A) return;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = A.esc, store = A.store;
  const MM = 96 / 25.4;                    // CSS px per mm
  const GAP = 2.5;                          // mm between columns
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const norm = s => String(s).toLowerCase().replace(/\\[a-z]+/g, ' ').replace(/[’']/g, "'").replace(/[^a-z0-9α-ωΔλ' ]+/g, ' ').replace(/\s+/g, ' ').trim();

  /* ------------------------------------------------------------ paper */
  const PAPER = {
    'x-a4': { w: 210, h: 297, pages: 4, label: 'Exam: 2 × A4, both sides', names: ['Sheet 1 · front', 'Sheet 1 · back', 'Sheet 2 · front', 'Sheet 2 · back'] },
    'x-a3': { w: 297, h: 420, pages: 2, label: 'Exam: 1 × A3, both sides', names: ['Front', 'Back'] },
    'a4-2': { w: 210, h: 297, pages: 2, label: 'A4, both sides', names: ['Front', 'Back'] },
    'a4-1': { w: 210, h: 297, pages: 1, label: 'A4, one side', names: ['Page'] },
    'a3-1': { w: 297, h: 420, pages: 1, label: 'A3, one side', names: ['Page'] }
  };
  const DEF_SET = { paper: 'x-a4', orient: 'p', cols: 3, font: 7, margin: 6, mono: false };

  /* ------------------------------------------------------------ what the VCAA formula sheet already gives you */
  // Physics: matched against formula labels (topic pages) and card titles (formula-sheet page), checked against
  // the 2025 VCAA Physics formula sheet. 'part' = some of the block is on the sheet, some isn't.
  const GIVEN = {
    physics: {
      // formula boxes on topic pages, matched by the start of their label
      yes: ["newton's second law", 'constant acceleration equations', 'momentum', 'impulse–momentum theorem', 'kinetic energy', "hooke's law",
        'universal gravitation', 'field strength', 'force between two point charges', 'uniform field', 'force on a conductor',
        'magnetic force on a moving charge', 'radius of the path', 'magnetic flux', "faraday's law", 'ideal transformer', 'transmission-line losses',
        'the wave equation', 'path difference conditions', 'fringe spacing', 'photon energy', 'de broglie wavelength', 'lorentz factor',
        'time dilation', 'length contraction', 'rest energy', 'total and kinetic energy'],
      part: ['describing the motion', 'centripetal acceleration and force', 'strain potential energy', 'energy gained through a potential difference',
        'rms values', "einstein's photoelectric", 'momentum of a photon', 'photon emitted or absorbed'],
      // cards on the formula-sheet page, by exact title
      cards: {
        yes: ['constant acceleration', "newton's second law", 'springs', 'gravitation', 'point charges', 'force on a current', 'charge in a magnetic field',
          'magnetic flux', "faraday's law", 'ideal transformer', 'transmission lines', 'waves', 'interference', 'photons', 'special relativity', 'mass energy'],
        part: ['uniform circular motion', 'momentum and impulse', 'work and energy', 'uniform electric field', 'ac values', 'power and resistance',
          'photoelectric effect', 'de broglie wavelength', 'atomic transitions']
      }
    }
  };
  function givenFor(sid, label, card) {
    const g = GIVEN[sid]; if (!g || !label) return '';
    const l = norm(label.replace(/\\\(.*?\\\)/g, ''));
    const has = list => list.map(norm).includes(l);
    if (card) return has(g.cards.yes) ? 'yes' : has(g.cards.part) ? 'part' : '';
    const hit = list => list.map(norm).some(p => l === p || l.startsWith(p + ' '));
    if (hit(g.part)) return 'part';
    return hit(g.yes) ? 'yes' : '';
  }

  /* ------------------------------------------------------------ HTML <-> light markdown */
  // Blocks are edited as plain text: **bold**, *italic*, "- " bullets, \( \) and \[ \] maths, blank line = paragraph.
  function md(node) {
    let s = '';
    node.childNodes.forEach(c => {
      if (c.nodeType === 3) { s += c.nodeValue.replace(/\s+/g, ' '); return; }
      if (c.nodeType !== 1) return;
      const tag = c.tagName.toLowerCase();
      if (tag === 'strong' || tag === 'b') { const x = md(c).trim(); if (x) s += '**' + x + '**'; }
      else if (tag === 'em' || tag === 'i') { const x = md(c).trim(); if (x) s += '*' + x + '*'; }
      else if (tag === 'br') s += '\n';
      else if (/^(p|div|figcaption|h[2-6]|blockquote|aside|dd|dt)$/.test(tag)) s += '\n\n' + md(c).trim() + '\n\n';
      else if (tag === 'ul' || tag === 'ol') {
        let i = 0;
        s += '\n\n' + Array.from(c.children).filter(li => li.tagName === 'LI').map(li => (tag === 'ol' ? (++i) + '. ' : '- ') + md(li).trim().replace(/\s*\n+\s*/g, ' ')).join('\n') + '\n\n';
      }
      else if (tag === 'sub' || tag === 'sup') s += '<' + tag + '>' + md(c) + '</' + tag + '>';
      else if (/^(svg|script|style|button|figure|table|canvas)$/.test(tag)) { /* not text */ }
      else s += md(c);
    });
    return s;
  }
  const toMd = node => md(node).replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const MATH = /\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)/g;
  function inl(x) {
    return x.replace(/\*\*([^*]+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*\w])\*([^*\s](?:[^*]*?[^*\s])?)\*(?![*\w])/g, '$1<i>$2</i>');
  }
  function protect(src) {
    const maths = [];
    const s = esc(String(src || '').replace(MATH, m => { maths.push(m); return '\u0001' + (maths.length - 1) + '\u0002'; }))
      .replace(/&lt;(\/?)(sub|sup|u)&gt;/g, '<$1$2>');
    return { s, back: h => h.replace(/\u0001(\d+)\u0002/g, (m, i) => esc(maths[+i])) };
  }
  function mdInline(src) { const p = protect(src); return p.back(inl(p.s)); }
  function mdHtml(src) {
    const p = protect(src), out = [];
    p.s.split(/\n\s*\n/).forEach(b => {
      let list = null, para = [];
      const flushP = () => { if (para.length) { out.push('<p>' + para.map(inl).join('<br>') + '</p>'); para = []; } };
      const flushL = () => { if (list) { out.push('<' + list.t + '>' + list.items.map(x => '<li>' + inl(x) + '</li>').join('') + '</' + list.t + '>'); list = null; } };
      b.split('\n').forEach(l => {
        if (!l.trim()) return;
        const m = l.match(/^\s*(?:([-•*])|(\d+)[.)])\s+(.*)$/), h = l.match(/^\s*#{1,3}\s+(.*)$/);
        if (m) { flushP(); const t = m[2] ? 'ol' : 'ul'; if (list && list.t !== t) flushL(); if (!list) list = { t, items: [] }; list.items.push(m[3]); }
        else if (h) { flushP(); flushL(); out.push('<h5>' + inl(h[1]) + '</h5>'); }
        else { flushL(); para.push(l.trim()); }
      });
      flushP(); flushL();
    });
    return p.back(out.join(''));
  }

  /* ------------------------------------------------------------ pulling blocks out of a topic page */
  const KIND = {
    point: 'Key points', formula: 'Formula', key: 'Key idea', trap: 'Trick alert', tip: 'Exam tip', we: 'Worked example',
    fig: 'Diagram', tbl: 'Table', def: 'Definition', deep: 'Going deeper', note: 'Note', head: 'Heading', brk: 'Column break', pbrk: 'Page break'
  };
  const SECTIONS = [['point', 'Key points'], ['formula', 'Formulas'], ['key', 'Key ideas'], ['tip', 'Exam tips'], ['trap', 'Trick alerts'],
    ['we', 'Worked examples'], ['fig', 'Diagrams'], ['tbl', 'Tables'], ['def', 'Definitions'], ['deep', 'Going deeper'], ['note', 'My saved notes']];
  const QBOX = '.we, .pq, .mcq, .exq, .exp, .quiz, .sim';
  function extract(t) {
    if (t._sheet) return t._sheet;
    const tp = document.createElement('template'); tp.innerHTML = t.html;
    const root = tp.content, items = [], n = {};
    const sid = t.subject, label = t.short || t.title;
    const add = (kind, o) => { n[kind] = (n[kind] || 0) + 1; items.push(Object.assign({ ref: t.id + '|' + kind + n[kind], kind, tid: t.id, from: label }, o)); };
    let sec = '';
    $$('h2, li, .eq, aside.c-trap, aside.c-key, aside.c-exam, aside.c-def, aside.c-deep, .we, figure.fig, .tbl, dl.gloss > dt, .fs-card', root).forEach(el => {
      if (el.tagName === 'H2') { sec = el.textContent.trim(); return; }
      if (sec === 'Practice') return;
      const inQ = el.parentElement && el.parentElement.closest(QBOX);
      if (el.tagName === 'LI') {
        if (sec === 'Summary' && el.parentElement.parentNode === root) add('point', { title: '', md: toMd(el), q: el.getAttribute('data-q') || '' });
        return;
      }
      if (inQ) return;
      if (el.matches('.fs-card')) {
        const c = el.cloneNode(true), h = $('h4', c), title = h ? h.textContent.trim() : sec;
        if (h) h.remove();
        $$('a', c).forEach(a => a.remove());
        add('formula', { title, md: toMd(c), given: givenFor(sid, title, true) });
      } else if (el.matches('.eq')) {
        if (el.closest('.fs-card')) return;
        const c = el.cloneNode(true), lab = $('.eq-label', c), title = lab ? toMd(lab) : sec;
        if (lab) lab.remove();
        add('formula', { title, md: toMd(c), given: givenFor(sid, lab ? lab.textContent : '') });
      } else if (el.matches('aside')) {
        const kind = el.classList.contains('c-trap') ? 'trap' : el.classList.contains('c-exam') ? 'tip' : el.classList.contains('c-def') ? 'def' : el.classList.contains('c-deep') ? 'deep' : 'key';
        const title = el.getAttribute('data-title') || KIND[kind];
        const short = title.replace(/^(Trick alert|Key idea|Exam tip|Going deeper)s?:\s*/i, '');
        add(kind, { title: short ? short.replace(/^(['"‘“]?)(\p{Ll})/u, (m, q, c) => q + c.toUpperCase()) : title, md: toMd(el) });
      } else if (el.matches('.we')) {
        const part = sel => { const x = $(':scope > ' + sel, el); return x ? toMd(x) : ''; };
        const q = part('.we-q'), steps = $$(':scope > .we-s', el).map(s => toMd(s)).filter(Boolean), a = part('.we-a');
        add('we', { title: el.getAttribute('data-title') || 'Worked example', md: (q ? '**Q:** ' + q + '\n\n' : '') + steps.join('\n\n') + (a ? '\n\n**A:** ' + a : '') });
      } else if (el.matches('figure.fig')) {
        if ($('canvas, .sim, input, button', el)) return;
        const c = el.cloneNode(true), cap = $('figcaption', c);
        if (cap) cap.remove();
        if (!$('svg, img', c)) return;
        add('fig', { title: sec, html: c.innerHTML.trim(), md: cap ? toMd(cap) : '', w: 100 });
      } else if (el.matches('.tbl')) {
        const tb = $('table', el); if (!tb) return;
        add('tbl', { title: sec, html: tb.outerHTML, md: '' });
      } else if (el.matches('dt')) {
        const dd = el.nextElementSibling && el.nextElementSibling.tagName === 'DD' ? el.nextElementSibling.cloneNode(true) : null;
        if (!dd) return;
        $$('a', dd).forEach(a => a.remove());
        add('def', { title: el.textContent.trim(), md: toMd(dd) });
      }
    });
    return (t._sheet = items);
  }
  // saved notes from "Ask Claude" (stored by ai.js)
  function savedNotes(sid) {
    const all = store.get('mynotes', {}), out = [];
    Object.keys(all).forEach(tid => {
      const t = A.topic(tid); if (!t || t.subject !== sid) return;
      (all[tid] || []).forEach(nt => out.push({ ref: tid + '|mine-' + nt.id, kind: 'note', tid, from: t.short || t.title, title: nt.title || 'My note', md: String(nt.md || '').replace(/\$\$([\s\S]+?)\$\$/g, '\\[$1\\]').replace(/(^|[^\\$])\$([^$\n]+?)\$/g, '$1\\($2\\)') }));
    });
    return out;
  }

  /* ------------------------------------------------------------ state */
  const KEY = 'sheets';
  let ST = store.get(KEY, null);
  function blankSheet(sid, name) { return { id: uid(), sid, name: name || 'My ' + (A.subject(sid) ? A.subject(sid).short : '') + ' sheet', set: Object.assign({}, DEF_SET), blocks: [], upd: Date.now() }; }
  function sheetsFor(sid) {
    if (!ST || !Array.isArray(ST.list)) ST = { list: [], cur: {} };
    ST.cur = ST.cur || {};
    let list = ST.list.filter(s => s.sid === sid);
    if (!list.length) { const s = blankSheet(sid); ST.list.push(s); list = [s]; ST.cur[sid] = s.id; save(true); }
    return list;
  }
  let saveT;
  function save(now) { clearTimeout(saveT); const go = () => store.set(KEY, ST); if (now) go(); else saveT = setTimeout(go, 300); }

  /* ------------------------------------------------------------ the designer */
  let V = null;   // current mounted view
  function mount(slot) {
    if (slot.dataset.ready) return;
    slot.dataset.ready = '1';
    const sid = slot.dataset.subject || (A.current() && A.current().subject) || 'physics';
    const subj = A.subject(sid);
    if (!subj) { slot.innerHTML = '<p class="ln">This subject isn\'t available.</p>'; return; }
    sheetsFor(sid);
    $('#main').classList.add('sh-wide');
    slot.innerHTML = shellHTML(subj);
    V = { slot, sid, subj, sel: null, undo: [], cache: new Map(), loc: {}, src: store.get('sheetSrc:' + sid, ''), q: '', zoom: store.get('sheetZoom', 'fit') };
    if (!V.src || !srcExists(V.src)) V.src = 'pack:' + subj.groups.find(g => studyOf(g).length).key;
    $('.sh-src', slot).value = V.src;
    let framed = false; try { framed = window.self !== window.top; } catch (e) { framed = true; }
    if (framed) {
      const pr = $('[data-act="print"]', slot), dl = $('[data-act="download"]', slot);
      pr.className = 'btn'; dl.className = 'btn primary'; dl.after(pr);
      $('.sh-printhint', slot).textContent = 'Printing straight from this window may be blocked here: download the file, open it in your browser and print at 100% scale, margins “None”, double-sided.';
    }
    wire();
    drawSheetBar(); drawSettings(); drawLib(); layout();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (V && V.slot === slot) { V.cache.clear(); layout(); } });
  }
  const cur = () => { const list = sheetsFor(V.sid); return list.find(s => s.id === ST.cur[V.sid]) || list[0]; };
  const studyOf = g => g.topics.map(id => A.topic(id)).filter(t => t && !t.special);
  const refTopics = subj => subj.order.filter(t => t.special === 'reference');
  function srcExists(src) {
    if (src === 'custom' || src === 'mine') return true;
    if (src.startsWith('pack:')) return V.subj.groups.some(g => 'pack:' + g.key === src);
    if (src.startsWith('t:')) return !!A.topic(src.slice(2));
    return false;
  }

  function shellHTML(subj) {
    let opts = '<optgroup label="Your own"><option value="custom">Your own blocks: heading, text, formula, breaks</option></optgroup>';
    subj.groups.forEach(g => {
      const ts = studyOf(g); if (!ts.length) return;
      opts += '<optgroup label="' + esc(g.eyebrow) + '"><option value="pack:' + g.key + '">⚡ Quick packs: all of ' + esc(g.eyebrow) + '</option>' +
        ts.map(t => '<option value="t:' + t.id + '">' + esc((t.short || t.title).replace(/<[^>]+>/g, '')) + '</option>').join('') + '</optgroup>';
    });
    const refs = refTopics(subj);
    opts += '<optgroup label="Reference">' + refs.map(t => '<option value="t:' + t.id + '">' + esc(t.short || t.title) + '</option>').join('') + '<option value="mine">My saved notes (from Ask Claude)</option></optgroup>';
    return '<div class="sh">' +
      '<div class="sh-bar sh-sheets"><select class="sh-pick" aria-label="Your sheets"></select><input class="sh-name" maxlength="60" aria-label="Sheet name">' +
        '<span class="sim-btns"><button class="btn" type="button" data-act="new">New</button><button class="btn" type="button" data-act="dup">Duplicate</button><button class="btn ghost" type="button" data-act="del">Delete</button>' +
        '<button class="btn ghost" type="button" data-act="undo" disabled>Undo</button></span></div>' +
      '<div class="sh-bar sh-set"></div>' +
      '<div class="sh-meter" aria-live="polite"></div>' +
      '<div class="sh-body">' +
        '<aside class="sh-side">' +
          '<div class="sh-tabs" role="tablist"><button type="button" role="tab" data-tab="add" aria-selected="true">Add blocks</button><button type="button" role="tab" data-tab="list" aria-selected="false">On the sheet <span class="sh-n"></span></button></div>' +
          '<div class="sh-pane" data-pane="add">' +
            '<input type="search" class="sh-q" placeholder="Search everything: fringe, flux, trap…" aria-label="Search blocks">' +
            '<select class="sh-src" aria-label="Where to add from">' + opts + '</select>' +
            (GIVEN[subj.id] ? '<label class="sh-chk"><input type="checkbox" class="sh-hidegiven"> Hide formulas already on the VCAA formula sheet</label>' : '') +
            '<div class="sh-lib"></div>' +
          '</div>' +
          '<div class="sh-pane" data-pane="list" hidden><p class="sh-hint">Drag to reorder (or use the arrows). Tap a block to edit it.</p><ol class="sh-outline"></ol></div>' +
          '<div class="sh-edit" hidden></div>' +
        '</aside>' +
        '<section class="sh-view" aria-label="Sheet preview"><div class="sh-zoom"><span class="sh-hint">Zoom</span><span class="sh-seg">' + [['fit', 'Fit'], ['1', '100%'], ['1.5', '150%'], ['2', '200%']].map(([v, l]) => '<button type="button" data-zoom="' + v + '">' + l + '</button>').join('') + '</span></div><div class="sh-pages"></div></section>' +
      '</div>' +
      '<div class="sh-bar sh-out"><button class="btn primary" type="button" data-act="print">Print / save as PDF</button><button class="btn" type="button" data-act="download">Download print-ready file</button>' +
        '<span class="sh-hint sh-printhint">Print at 100% scale with margins set to “None”, double-sided (flip on long edge).</span></div>' +
      '<div class="sh-paper sh-light sh-meas" aria-hidden="true"><div class="sh-col"></div></div>' +
      '<svg class="sh-defs" width="0" height="0" aria-hidden="true" focusable="false">' + markerDefs() + '</svg>' +
    '</div>';
  }
  // the site's arrowheads, re-declared inside the paper so they take the paper's (always light) colours
  function markerDefs() {
    const d = document.querySelector('svg defs marker[id^="ah-"]');
    if (!d) return '';
    return '<defs>' + $$('marker[id^="ah-"]', d.closest('defs')).map(m => m.outerHTML.replace(/id="ah-/, 'id="sh-ah-')).join('') + '</defs>';
  }

  /* ------------------------------------------------------------ top bars */
  function drawSheetBar() {
    const list = sheetsFor(V.sid), s = cur();
    $('.sh-pick', V.slot).innerHTML = list.map(x => '<option value="' + x.id + '"' + (x.id === s.id ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('');
    $('.sh-name', V.slot).value = s.name;
    $('[data-act="del"]', V.slot).disabled = list.length < 2 && !s.blocks.length;
    $('[data-act="undo"]', V.slot).disabled = !V.undo.length;
  }
  function drawSettings() {
    const s = cur().set;
    const opt = (v, l, on) => '<option value="' + v + '"' + (String(on) === String(v) ? ' selected' : '') + '>' + l + '</option>';
    $('.sh-set', V.slot).innerHTML =
      '<label>Paper <select data-set="paper">' + Object.keys(PAPER).map(k => opt(k, PAPER[k].label, s.paper)).join('') + '</select></label>' +
      '<label>Orientation <select data-set="orient">' + opt('p', 'Portrait', s.orient) + opt('l', 'Landscape', s.orient) + '</select></label>' +
      '<label>Columns <select data-set="cols">' + [1, 2, 3, 4, 5, 6].map(n => opt(n, n, s.cols)).join('') + '</select></label>' +
      '<label class="sh-range">Text size <input type="range" data-set="font" min="5" max="11" step="0.5" value="' + s.font + '"><output>' + s.font + ' pt</output></label>' +
      '<label>Margins <select data-set="margin">' + opt(4, 'Tiny', s.margin) + opt(6, 'Narrow', s.margin) + opt(10, 'Normal', s.margin) + opt(15, 'Wide', s.margin) + '</select></label>' +
      '<label class="sh-chk"><input type="checkbox" data-set="mono"' + (s.mono ? ' checked' : '') + '> Black &amp; white</label>';
  }

  /* ------------------------------------------------------------ library */
  const onSheet = () => { const m = new Map(); cur().blocks.forEach(b => { if (b.ref) m.set(b.ref, (m.get(b.ref) || 0) + 1); }); return m; };
  function itemsOf(src) {
    if (src === 'mine') return savedNotes(V.sid);
    if (src.startsWith('t:')) { const t = A.topic(src.slice(2)); return t ? extract(t) : []; }
    return [];
  }
  function allItems() {
    if (V.all) return V.all;
    const ts = V.subj.order.filter(t => !t.special || t.special === 'reference');
    return (V.all = ts.flatMap(extract).map(it => Object.assign(it, { _n: norm(it.title + ' ' + it.md + ' ' + it.from) })));
  }
  function givenBadge(g) { return g === 'yes' ? '<span class="sh-given" title="This is on the VCAA formula sheet you get in the exam">On VCAA sheet</span>' : g === 'part' ? '<span class="sh-given part" title="Some of this is on the VCAA formula sheet">Partly on VCAA sheet</span>' : ''; }
  function itemHTML(it, added) {
    let prev;
    if (it.kind === 'fig') prev = '<div class="sh-it-fig">' + it.html + '</div>' + (it.md ? '<div class="sh-it-md">' + mdHtml(it.md) + '</div>' : '');
    else if (it.kind === 'tbl') prev = '<div class="sh-it-tbl">' + it.html + '</div>';
    else prev = '<div class="sh-it-md">' + mdHtml(it.md) + '</div>';
    return '<div class="sh-it sh-k-' + it.kind + '" data-ref="' + esc(it.ref) + '">' +
      '<div class="sh-it-h"><span class="sh-chip">' + KIND[it.kind] + '</span>' + (it.title ? '<b>' + mdInline(it.title) + '</b>' : '') + givenBadge(it.given) +
      '<button class="btn sh-add' + (added ? ' on' : '') + '" type="button" data-add="' + esc(it.ref) + '" aria-pressed="' + !!added + '">' + (added ? '✓ Added' : '+ Add') + '</button></div>' +
      '<div class="sh-it-b">' + prev + '</div>' + (V.q ? '<div class="sh-it-from">' + esc(it.from) + '</div>' : '') + '</div>';
  }
  function drawLib() {
    const lib = $('.sh-lib', V.slot), have = onSheet();
    const hideGiven = !!(V.slot.querySelector('.sh-hidegiven') || {}).checked;
    const keep = it => !(hideGiven && it.kind === 'formula' && it.given === 'yes');
    V.byRef = {};
    let h = '';
    if (V.q) {
      const words = norm(V.q).split(' ').filter(Boolean);
      const hits = allItems().concat(savedNotes(V.sid).map(it => Object.assign(it, { _n: norm(it.title + ' ' + it.md) }))).filter(it => keep(it) && words.every(w => it._n.includes(w))).slice(0, 60);
      hits.forEach(it => { V.byRef[it.ref] = it; });
      h = hits.length ? '<p class="sh-hint">' + hits.length + (hits.length === 60 ? '+' : '') + ' matching block' + (hits.length > 1 ? 's' : '') + '</p>' + hits.map(it => itemHTML(it, have.get(it.ref))).join('') : '<p class="sh-hint">Nothing matches “' + esc(V.q) + '”.</p>';
    } else if (V.src === 'custom') {
      h = '<p class="sh-hint">Add your own blocks, then tap one on the sheet to write in it. Text supports **bold**, *italic*, “- ” bullets and maths like \\( v = f\\lambda \\).</p><div class="sh-custom">' +
        [['head', 'Heading', 'Splits the sheet into sections'], ['note', 'Text', 'Anything you want to remember'], ['formula', 'Formula', 'Your own formula with notes'],
          ['point', 'Bullet list', 'Quick list of facts'], ['brk', 'Column break', 'Start a new column here'], ['pbrk', 'Page break', 'Start a new page here']]
          .map(([k, l, d]) => '<button class="sh-cust sh-k-' + k + '" type="button" data-custom="' + k + '"><b>+ ' + l + '</b><span>' + d + '</span></button>').join('') + '</div>';
    } else if (V.src.startsWith('pack:')) {
      const g = V.subj.groups.find(x => 'pack:' + x.key === V.src), ts = studyOf(g);
      const count = k => { const per = ts.map(t => topicPack(t, PACKS[k], k === 'full' || k === 'points', have).filter(b => b.kind !== 'head').length); return k === 'full' || k === 'points' ? per.filter(Boolean).length : per.reduce((a, x) => a + x, 0); };
      const packs = [
        ['full', 'Topic packs', 'For every topic: a heading, its key points, formulas, key ideas and trick alerts.', count('full')],
        ['points', 'Key points', 'One block of key points per topic, under a topic heading.', count('points')],
        ['formula', 'All formulas', 'Every formula box from these topics.', count('formula')]
      ];
      if (GIVEN[V.sid]) packs.push(['notgiven', 'Formulas NOT on the VCAA sheet', 'The derived results you have to remember yourself (banked tracks, loops, orbits…).', count('notgiven')]);
      packs.push(['trap', 'All trick alerts', 'The mistakes examiners see every year.', count('trap')],
        ['key', 'All key ideas', 'The big ideas boxed on each topic page.', count('key')]);
      h = '<p class="sh-hint"><b>' + esc(g.eyebrow) + '</b>: ' + esc(g.title) + ' (' + ts.length + ' topics). Packs skip anything already on your sheet.</p><div class="sh-packs">' +
        packs.map(([k, l, d, c]) => '<button class="sh-pack" type="button" data-pack="' + k + '"' + (c ? '' : ' disabled') + '><b>' + l + '</b><span>' + d + '</span><em>' + (c ? (k === 'full' || k === 'points' ? c + ' topic' + (c > 1 ? 's' : '') : '+' + c + ' block' + (c > 1 ? 's' : '')) : 'All on your sheet') + '</em></button>').join('') + '</div>';
    } else {
      const items = itemsOf(V.src).filter(keep);
      items.forEach(it => { V.byRef[it.ref] = it; });
      const t = V.src.startsWith('t:') ? A.topic(V.src.slice(2)) : null;
      if (t && !t.special) h += '<div class="sh-topic-acts"><button class="btn" type="button" data-pack-topic="' + t.id + '">+ Topic pack</button><span class="sh-hint">heading, key points, formulas, key ideas and traps</span><a class="sh-open" href="#' + t.id + '">Open topic ↗</a></div>';
      if (!items.length) h += '<p class="sh-hint">' + (V.src === 'mine' ? 'No saved notes yet. Use “Ask Claude” on a topic and save an answer to My notes, and it shows up here.' : 'Nothing to add from this page.') + '</p>';
      SECTIONS.forEach(([k, label]) => {
        const its = items.filter(it => it.kind === k); if (!its.length) return;
        h += '<div class="sh-sec"><div class="sh-sec-h"><b>' + label + '</b><span>' + its.length + '</span>' +
          (its.length > 1 ? '<button class="btn ghost" type="button" data-addall="' + k + '">' + (k === 'point' ? '+ All as one block' : '+ Add all') + '</button>' : '') + '</div>' +
          its.map(it => itemHTML(it, have.get(it.ref))).join('') + '</div>';
      });
    }
    lib.innerHTML = h;
    A.renderMath(lib);
    $$('.sh-it-fig svg', lib).forEach(s => s.removeAttribute('width'));
  }

  /* ------------------------------------------------------------ editing the sheet */
  function snap() {
    const s = cur();
    V.undo.push(JSON.stringify({ id: s.id, name: s.name, set: s.set, blocks: s.blocks }));
    if (V.undo.length > 40) V.undo.shift();
    $('[data-act="undo"]', V.slot).disabled = false;
  }
  function undo() {
    const raw = V.undo.pop(); if (!raw) return;
    const o = JSON.parse(raw), s = sheetsFor(V.sid).find(x => x.id === o.id);
    if (s) { s.name = o.name; s.set = o.set; s.blocks = o.blocks; ST.cur[V.sid] = s.id; }
    changed({ bar: true, settings: true });
  }
  function changed(o = {}) {
    cur().upd = Date.now(); save();
    if (o.bar) drawSheetBar(); else $('[data-act="undo"]', V.slot).disabled = !V.undo.length;
    if (o.settings) drawSettings();
    if (o.lib !== false) drawLib();
    if (V.sel && !cur().blocks.some(b => b.id === V.sel)) select(null);
    layout();
  }
  function blockFrom(it) {
    const b = { id: uid(), kind: it.kind, ref: it.ref, title: it.title || '', md: it.md || '', from: it.from };
    if (it.html) b.html = it.html;
    if (it.kind === 'fig') b.w = it.w || 100;
    if (it.given) b.given = it.given;
    return b;
  }
  function insert(blocks) {
    if (!blocks.length) return;
    snap();
    const s = cur(), at = V.sel ? s.blocks.findIndex(b => b.id === V.sel) + 1 : s.blocks.length;
    s.blocks.splice(at || s.blocks.length, 0, ...blocks);
    changed();
    A.toast(blocks.length === 1 ? 'Added to your sheet' : blocks.length + ' blocks added');
  }
  const PACKS = { full: ['point', 'formula', 'key', 'trap'], points: ['point'], formula: ['formula'], notgiven: ['formula', 'notgiven'], trap: ['trap'], key: ['key'] };
  function topicPack(t, kinds, head, have) {
    have = have || onSheet();
    const out = [];
    const its = extract(t).filter(it => kinds.includes(it.kind) && !have.get(it.ref) && (kinds.includes('notgiven') ? it.given !== 'yes' : true));
    const pts = have.get(t.id + '|points') ? [] : its.filter(it => it.kind === 'point'), rest = its.filter(it => it.kind !== 'point');
    if (head && !have.get(t.id + '|head') && (pts.length || rest.length)) out.push({ id: uid(), kind: 'head', ref: t.id + '|head', title: (t.short || t.title).replace(/<[^>]+>/g, ''), md: '', from: t.short || t.title });
    if (pts.length) out.push({ id: uid(), kind: 'point', ref: t.id + '|points', title: '', md: pts.map(p => '- ' + p.md.replace(/\s*\n+\s*/g, ' ')).join('\n'), from: t.short || t.title });
    rest.forEach(it => out.push(blockFrom(it)));
    return out;
  }
  function addPack(k) {
    const g = V.subj.groups.find(x => 'pack:' + x.key === V.src); if (!g) return;
    const have = onSheet();
    insert(studyOf(g).flatMap(t => topicPack(t, PACKS[k], k === 'full' || k === 'points', have)));
  }
  function addCustom(k) {
    const b = { id: uid(), kind: k, title: '', md: '' };
    if (k === 'head') b.title = 'Heading';
    if (k === 'note') { b.title = 'Note'; b.md = 'Write anything here.'; }
    if (k === 'formula') { b.title = 'My formula'; b.md = '\\[ F_{\\text{net}} = ma \\]\nWhat each symbol means, and when it applies.'; }
    if (k === 'point') { b.title = 'Remember'; b.md = '- First point\n- Second point'; }
    insert([b]);
    if (k !== 'brk' && k !== 'pbrk') select(b.id, true);
  }
  function removeRef(ref) {
    snap();
    const s = cur(); s.blocks = s.blocks.filter(b => b.ref !== ref);
    changed();
  }
  function move(id, d) {
    const s = cur(), i = s.blocks.findIndex(b => b.id === id), j = i + d;
    if (i < 0 || j < 0 || j >= s.blocks.length) return;
    snap();
    const [b] = s.blocks.splice(i, 1); s.blocks.splice(j, 0, b);
    changed({ lib: false });
  }
  function moveTo(id, targetId, after) {
    if (id === targetId) return;
    const s = cur(), i = s.blocks.findIndex(b => b.id === id); if (i < 0) return;
    snap();
    const [b] = s.blocks.splice(i, 1);
    let j = s.blocks.findIndex(x => x.id === targetId);
    if (j < 0) j = s.blocks.length; else if (after) j++;
    s.blocks.splice(j, 0, b);
    changed({ lib: false });
  }
  function drop(id) {
    snap();
    const s = cur(); s.blocks = s.blocks.filter(b => b.id !== id);
    if (V.sel === id) V.sel = null;
    changed();
    select(null);
  }

  /* ------------------------------------------------------------ block editor */
  function select(id, focus) {
    V.sel = id;
    $$('.sb.sel', V.slot).forEach(x => x.classList.remove('sel'));
    const ed = $('.sh-edit', V.slot), panes = $$('.sh-tabs, .sh-pane', V.slot);
    const b = id && cur().blocks.find(x => x.id === id);
    if (!b) { ed.hidden = true; ed.innerHTML = ''; panes.forEach(p => { p.hidden = p.classList.contains('sh-pane') && p.dataset.pane !== V.tab; }); $$('.sh-tabs', V.slot).forEach(p => { p.hidden = false; }); return; }
    $$('.sb[data-id="' + id + '"]', V.slot).forEach(x => x.classList.add('sel'));
    panes.forEach(p => { p.hidden = true; });
    ed.hidden = false; V.editSnap = false;
    const isText = !/^(brk|pbrk)$/.test(b.kind), hasBody = isText && b.kind !== 'head';
    const orig = b.ref && findItem(b.ref);
    ed.innerHTML = '<div class="sh-edit-h"><span class="sh-chip sh-k-' + b.kind + '">' + KIND[b.kind] + '</span>' + (b.from ? '<span class="sh-hint">' + esc(b.from) + '</span>' : '') + givenBadge(b.given) + '<button class="btn primary" type="button" data-act="done">Done</button></div>' +
      (isText ? '<label class="sh-f">' + (b.kind === 'head' ? 'Heading' : 'Title (leave blank for none)') + '<input class="sh-e-title" value="' + esc(b.title || '') + '"></label>' : '<p class="sh-hint">' + (b.kind === 'brk' ? 'Everything after this starts in the next column.' : 'Everything after this starts on the next page.') + '</p>') +
      (hasBody ? '<label class="sh-f">' + (b.kind === 'fig' ? 'Caption' : 'Text') + '<textarea class="sh-e-md" rows="' + (b.kind === 'fig' ? 3 : 9) + '" spellcheck="true">' + esc(b.md || '') + '</textarea></label>' +
        '<p class="sh-hint">**bold** · *italic* · start a line with “- ” for a bullet · \\( v = f\\lambda \\) inline maths · \\[ \\dots \\] maths on its own line · blank line = new paragraph. Cut words: every line costs space.</p>' : '') +
      (b.kind === 'fig' ? '<label class="sh-f sh-range">Diagram width <input type="range" class="sh-e-w" min="25" max="100" step="5" value="' + (b.w || 100) + '"><output>' + (b.w || 100) + '%</output></label>' : '') +
      (isText ? '<div class="sh-f">Text size <span class="sh-seg">' + [[0.8, 'Smaller'], [1, 'Normal'], [1.2, 'Bigger']].map(([v, l]) => '<button type="button" data-fs="' + v + '" aria-pressed="' + ((b.fs || 1) === v) + '">' + l + '</button>').join('') + '</span></div>' : '') +
      '<div class="sh-edit-acts sim-btns"><button class="btn" type="button" data-act="up">↑ Earlier</button><button class="btn" type="button" data-act="down">↓ Later</button><button class="btn" type="button" data-act="copy">Duplicate</button>' +
      (orig ? '<button class="btn ghost" type="button" data-act="reset">Reset to original</button>' : '') + '<button class="btn ghost sh-del" type="button" data-act="drop">Delete</button></div>';
    const view = $('.sh-side', V.slot);
    if (focus) { const f = $('.sh-e-md, .sh-e-title', ed); if (f) { f.focus(); if (f.select && b.kind !== 'head') f.setSelectionRange(f.value.length, f.value.length); } }
    if (window.innerWidth <= 960) view.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  function findItem(ref) {
    const tid = ref.split('|')[0], t = A.topic(tid);
    if (!t) return null;
    if (ref.endsWith('|points')) { const pts = extract(t).filter(i => i.kind === 'point'); return pts.length ? { md: pts.map(p => '- ' + p.md.replace(/\s*\n+\s*/g, ' ')).join('\n'), title: '' } : null; }
    return extract(t).find(i => i.ref === ref) || savedNotes(V.sid).find(i => i.ref === ref) || null;
  }
  let typeT;
  function editField(fn) {
    const b = cur().blocks.find(x => x.id === V.sel); if (!b) return;
    if (!V.editSnap) { snap(); V.editSnap = true; }
    fn(b);
    cur().upd = Date.now(); save();
    clearTimeout(typeT); typeT = setTimeout(() => layout(), 220);
  }

  /* ------------------------------------------------------------ layout: pack blocks into columns, page by page */
  function geom(set) {
    const P = PAPER[set.paper] || PAPER['x-a4'];
    const [pw, ph] = set.orient === 'l' ? [P.h, P.w] : [P.w, P.h];
    const m = +set.margin, W = pw - 2 * m, H = ph - 2 * m, cols = +set.cols;
    return { P, pw, ph, m, W, H, cols, cw: (W - (cols - 1) * GAP) / cols, allowed: P.pages };
  }
  function blockHTML(b) {
    const title = b.title ? '<div class="sb-t">' + mdInline(b.title) + '</div>' : '';
    let body = '';
    if (b.kind === 'fig') body = '<div class="sb-figbox" style="width:' + (b.w || 100) + '%">' + (b.html || '').replace(/url\(#ah-/g, 'url(#sh-ah-') + '</div>' + (b.md ? '<div class="sb-cap">' + mdHtml(b.md) + '</div>' : '');
    else if (b.kind === 'tbl') body = '<div class="sb-tblbox">' + (b.html || '') + '</div>' + (b.md ? '<div class="sb-b">' + mdHtml(b.md) + '</div>' : '');
    else if (b.kind === 'brk' || b.kind === 'pbrk') body = '<span class="sb-brk-l">' + KIND[b.kind] + '</span>';
    else if (b.md) body = '<div class="sb-b">' + mdHtml(b.md) + '</div>';
    return '<div class="sb sb-' + b.kind + '" data-id="' + b.id + '"' + (b.fs && b.fs !== 1 ? ' style="font-size:' + b.fs + 'em"' : '') + ' draggable="true">' + title + body +
      (b.given ? '<span class="sb-given' + (b.given === 'part' ? ' part' : '') + '" title="' + (b.given === 'part' ? 'Partly on' : 'On') + ' the VCAA formula sheet">VCAA</span>' : '') + '</div>';
  }
  function fit(node, colPx) {
    // KaTeX can't wrap inside a formula: shrink anything wider than the column (down to 50%)
    const base = 1.1;
    for (let pass = 0; pass < 2; pass++) {
      $$('.katex-display', node).forEach(d => {
        const k = d.firstElementChild; if (!k) return;
        const need = d.scrollWidth, have = d.clientWidth;
        if (have > 0 && need > have + 0.5) { const curF = parseFloat(k.style.fontSize) || base; k.style.fontSize = Math.max(base * 0.5, curF * have / need * 0.97).toFixed(3) + 'em'; }
      });
    }
    $$('.katex', node).forEach(k => {
      if (k.parentElement.classList.contains('katex-display')) return;
      const w = k.getBoundingClientRect().width;
      if (w > colPx * 0.98) k.style.fontSize = Math.max(0.5, (colPx * 0.96) / w).toFixed(3) + 'em';
    });
    $$('.sb-tblbox table', node).forEach(tb => {
      const w = tb.scrollWidth, have = tb.parentElement.clientWidth;
      if (w > have + 0.5) tb.style.fontSize = Math.max(0.55, have / w * 0.97).toFixed(3) + 'em';
    });
  }
  function layout() {
    if (!V || !V.slot.isConnected) return;
    const sh = cur(), set = sh.set, G = geom(set);
    const meas = $('.sh-meas', V.slot), col = $('.sh-col', meas);
    meas.style.fontSize = set.font + 'pt';
    col.style.width = G.cw + 'mm';
    col.innerHTML = '';
    const colPx = G.cw * MM, Hpx = G.H * MM, ctx = G.cw.toFixed(2) + '|' + set.font;
    const nodes = sh.blocks.map(b => {
      const raw = blockHTML(b), key = ctx + '|' + raw, hit = V.cache.get(key);
      const tmp = document.createElement('div'); tmp.innerHTML = hit || raw;
      const node = tmp.firstElementChild; col.appendChild(node);
      if (!hit) {
        if (typeof window.renderMathInElement === 'function') {
          try { window.renderMathInElement(node, { delimiters: [{ left: '\\[', right: '\\]', display: true }, { left: '\\(', right: '\\)', display: false }], throwOnError: false }); } catch (e) { /* leave raw */ }
        }
        $$('svg', node).forEach(s => { s.removeAttribute('width'); s.removeAttribute('height'); });
        fit(node, colPx);
        if (V.cache.size > 600) V.cache.clear();
        V.cache.set(key, node.outerHTML);
      }
      return node;
    });
    // greedy packing, in order: fill a column top to bottom, then the next column, then the next page
    const pages = [], loc = {};
    const newPage = () => { const p = { cols: Array.from({ length: G.cols }, () => ({ nodes: [], used: 0 })) }; pages.push(p); return p; };
    let p = newPage(), c = 0, y = 0;
    const nextCol = () => { c++; y = 0; if (c >= G.cols) { p = newPage(); c = 0; } };
    nodes.forEach((node, i) => {
      const b = sh.blocks[i];
      if (b.kind === 'brk') { if (y > 0) nextCol(); p.cols[c].nodes.push(node); loc[b.id] = [pages.length, c + 1]; return; }
      if (b.kind === 'pbrk') { if (y > 0 || c > 0) { p = newPage(); c = 0; y = 0; } p.cols[c].nodes.push(node); loc[b.id] = [pages.length, c + 1]; return; }
      const h = node.offsetHeight, mb = parseFloat(getComputedStyle(node).marginBottom) || 0;
      // a heading never sits alone at the bottom of a column: it moves with the start of the block after it
      let need = h;
      if (b.kind === 'head') { const nx = nodes[i + 1], nb = sh.blocks[i + 1]; if (nx && nb && !/brk$/.test(nb.kind)) need = h + mb + Math.min(nx.offsetHeight, Hpx * 0.25); }
      if (y > 0 && y + need > Hpx + 0.5) nextCol();
      node.classList.toggle('too-tall', h > Hpx + 0.5);
      p.cols[c].nodes.push(node); p.cols[c].used = Math.min(Hpx, y + h);
      loc[b.id] = [pages.length, c + 1];
      y += h + mb;
    });
    V.loc = loc;
    // keep at least the allowed number of pages visible, so you can see the space you have
    while (pages.length < G.allowed) newPage();
    // build the page boxes
    const box = $('.sh-pages', V.slot);
    box.innerHTML = '';
    const names = G.P.names;
    const fills = [];
    pages.forEach((pg, pi) => {
      const used = pg.cols.reduce((a, x) => a + x.used, 0), pct = Math.round(100 * used / (G.cols * Hpx));
      const over = pi >= G.allowed;
      fills.push({ pct, over, name: names[pi] || 'Page ' + (pi + 1) });
      const wrap = document.createElement('div'); wrap.className = 'sh-pg' + (over ? ' over' : '');
      wrap.innerHTML = '<div class="sh-pg-lab"><b>' + esc(over ? 'Page ' + (pi + 1) + ': over your limit' : names[pi] || 'Page ' + (pi + 1)) + '</b><span>' + pct + '% full</span></div>' +
        '<div class="sh-pg-box"><div class="sh-paper sh-light' + (set.mono ? ' sh-mono' : '') + '" style="width:' + G.pw + 'mm;height:' + G.ph + 'mm;font-size:' + set.font + 'pt">' +
        '<div class="sh-cols" style="left:' + G.m + 'mm;top:' + G.m + 'mm;width:' + G.W + 'mm;height:' + G.H + 'mm;gap:' + GAP + 'mm"></div></div></div>';
      const colsEl = $('.sh-cols', wrap);
      pg.cols.forEach(cl => { const ce = document.createElement('div'); ce.className = 'sh-col'; ce.style.width = G.cw + 'mm'; ce.style.height = G.H + 'mm'; cl.nodes.forEach(n => ce.appendChild(n)); colsEl.appendChild(ce); });
      box.appendChild(wrap);
    });
    if (!sh.blocks.length) {
      const first = $('.sh-cols', box);
      if (first) first.insertAdjacentHTML('afterbegin', '<div class="sh-empty"><b>Your sheet is empty</b><span>Pick blocks on the left: start with a ⚡ quick pack, a topic, or search. They pack into columns in order, and the meter shows how much space you have left.</span></div>');
    }
    if (V.sel) $$('.sb[data-id="' + V.sel + '"]', box).forEach(x => x.classList.add('sel'));
    V.geom = G; V.pagesN = pages.length;
    scale();
    drawMeter(fills, G);
    drawOutline();
  }
  function scale() {
    if (!V || !V.geom) return;
    const view = $('.sh-view', V.slot), G = V.geom;
    const avail = Math.max(200, view.clientWidth - 2), z = V.zoom || 'fit';
    const s = z === 'fit' ? Math.min(1, avail / (G.pw * MM)) : +z;
    $$('[data-zoom]', view).forEach(x => x.setAttribute('aria-pressed', x.dataset.zoom === z));
    view.classList.toggle('zoomed', z !== 'fit');
    $$('.sh-pg-box', view).forEach(bx => { bx.style.width = G.pw * MM * s + 'px'; bx.style.height = G.ph * MM * s + 'px'; const pp = bx.firstElementChild; pp.style.transform = 'scale(' + s + ')'; });
  }
  function drawMeter(fills, G) {
    const m = $('.sh-meter', V.slot), over = fills.filter(f => f.over), tall = $$('.sh-pages .sb.too-tall', V.slot).length;
    const n = cur().blocks.filter(b => !/brk$/.test(b.kind)).length;
    let msg;
    if (over.length) msg = '<span class="sh-warn">Doesn\'t fit: ' + over.length + ' extra page' + (over.length > 1 ? 's' : '') + ' beyond ' + esc(G.P.label.replace(/^Exam: /, '')) + '. Cut words, drop blocks, shrink the text, or add a column.</span>';
    else if (!n) msg = '<span class="sh-hint">' + esc(G.P.label) + ' · ' + G.cols + ' columns · ' + cur().set.font + ' pt</span>';
    else msg = '<span class="sh-ok">Fits</span><span class="sh-hint">' + n + ' block' + (n > 1 ? 's' : '') + ' on ' + esc(G.P.label.replace(/^Exam: /, '')) + '</span>';
    if (tall) msg += '<span class="sh-warn">' + tall + ' block' + (tall > 1 ? 's are' : ' is') + ' taller than a column and get cut off (outlined in red).</span>';
    m.innerHTML = '<div class="sh-fills">' + fills.map(f => '<div class="sh-fill' + (f.over ? ' over' : '') + '" title="' + esc(f.name) + ': ' + f.pct + '% full"><span>' + esc(f.name) + '</span><i style="width:' + Math.min(100, f.pct) + '%"></i><b>' + f.pct + '%</b></div>').join('') + '</div><div class="sh-msg">' + msg + '</div>';
  }
  function drawOutline() {
    const s = cur(), ol = $('.sh-outline', V.slot), names = V.geom.P.names;
    $('.sh-n', V.slot).textContent = s.blocks.length || '';
    if (!s.blocks.length) { ol.innerHTML = '<li class="sh-hint">Nothing on your sheet yet.</li>'; return; }
    ol.innerHTML = s.blocks.map((b, i) => {
      const lc = V.loc[b.id], first = (b.title || b.md || '').replace(MATH, m => m.replace(/^\\[([]\s*|\s*\\[)\]]$/g, '')).replace(/[*#]/g, '').replace(/\s+/g, ' ').slice(0, 70);
      return '<li class="sh-o sh-k-' + b.kind + (b.id === V.sel ? ' sel' : '') + '" data-id="' + b.id + '" draggable="true"><span class="sh-grip" aria-hidden="true">⋮⋮</span><span class="sh-chip">' + KIND[b.kind] + '</span>' +
        '<span class="sh-o-t">' + esc(first || KIND[b.kind]) + '</span>' + (lc ? '<span class="sh-o-loc' + (lc[0] > V.geom.allowed ? ' over' : '') + '">' + esc((names[lc[0] - 1] || 'p' + lc[0]).replace('Sheet ', 'S').replace(' · ', ' ')) + ' · col ' + lc[1] + '</span>' : '') +
        '<span class="sh-o-b"><button type="button" data-o="up" aria-label="Move earlier"' + (i ? '' : ' disabled') + '>↑</button><button type="button" data-o="down" aria-label="Move later"' + (i < s.blocks.length - 1 ? '' : ' disabled') + '>↓</button><button type="button" data-o="drop" aria-label="Delete">✕</button></span></li>';
    }).join('');
  }

  /* ------------------------------------------------------------ print + download */
  function pagesMarkup() {
    const papers = $$('.sh-pg .sh-paper', V.slot), has = p => !!$('.sb:not(.sb-brk):not(.sb-pbrk)', p);
    let last = papers.length - 1; while (last > 0 && !has(papers[last])) last--;   // no blank trailing pages
    return papers.slice(0, last + 1).map(p => {
      const c = p.cloneNode(true);
      c.style.transform = '';
      $$('.sel, .too-tall', c).forEach(x => x.classList.remove('sel', 'too-tall'));
      $$('[draggable]', c).forEach(x => x.removeAttribute('draggable'));
      $$('.sh-empty', c).forEach(x => x.remove());
      return c.outerHTML;
    }).join('');
  }
  function pageCss() {
    const G = V.geom;
    return '@page { size: ' + G.pw + 'mm ' + G.ph + 'mm; margin: 0; }';
  }
  function doPrint() {
    if (V.pagesN > V.geom.allowed) A.toast('Heads up: this is longer than ' + V.geom.P.label.replace(/^Exam: /, ''));
    const host = document.createElement('div'); host.id = 'sh-print';
    host.innerHTML = '<svg class="sh-defs" width="0" height="0" aria-hidden="true">' + markerDefs() + '</svg>' + pagesMarkup();
    document.body.appendChild(host);
    const st = document.createElement('style'); st.id = 'sh-print-css'; st.textContent = pageCss(); document.head.appendChild(st);
    document.documentElement.classList.add('sh-printing');
    let done = false;
    const end = () => { if (done) return; done = true; host.remove(); st.remove(); document.documentElement.classList.remove('sh-printing'); window.removeEventListener('afterprint', end); };
    window.addEventListener('afterprint', end);
    try { window.print(); } catch (e) { end(); }
    setTimeout(() => { if (!window.matchMedia('print').matches) end(); }, 1500);
  }
  let DLP = null;
  function dlCap() {
    if (DLP) return DLP;
    try { DLP = window.claude && typeof window.claude.use === 'function' ? window.claude.use('downloads').catch(() => null) : Promise.resolve(null); } catch (e) { DLP = Promise.resolve(null); }
    return DLP;
  }
  function download() {
    const s = cur(), css = $$('style').map(x => x.textContent).filter(x => !/^@page/.test(x)).join('\n');
    const html = '<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' + esc(s.name) + '</title>' +
      '<style>' + css + '</style><style>' + pageCss() + '\nhtml, body { background: #8e8e93 !important; margin: 0; padding: 0; }\nbody::before, body::after { display: none !important; }\n' +
      '.sh-x-bar { position: sticky; top: 0; z-index: 2; display: flex; gap: 12px; align-items: center; justify-content: center; flex-wrap: wrap; padding: 10px 16px; background: #1d1d1f; color: #fff; font: 14px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }\n' +
      '.sh-x-bar button { font: inherit; font-weight: 600; padding: 7px 16px; border-radius: 99px; border: 0; background: #0a84ff; color: #fff; cursor: pointer; }\n' +
      '.sh-x-pages { padding: 16px 0; }\n.sh-x-pages .sh-paper { margin: 0 auto 16px; box-shadow: 0 6px 24px rgba(0,0,0,.35); }\n' +
      '@media print { html, body { background: #fff !important; } .sh-x-bar { display: none; } .sh-x-pages { padding: 0; } .sh-x-pages .sh-paper { margin: 0; box-shadow: none; break-after: page; } .sh-x-pages .sh-paper:last-child { break-after: auto; } .sb-given, .sb-brk-l { display: none !important; } }\n' +
      '</style></head><body><div class="sh-x-bar"><span>' + esc(s.name) + ' · ' + esc(V.geom.P.label) + '. Print at 100% scale, margins “None”, double-sided.</span><button type="button" onclick="window.print()">Print / save as PDF</button></div>' +
      '<div class="sh-x-pages"><svg class="sh-defs" width="0" height="0" aria-hidden="true">' + markerDefs() + '</svg>' + pagesMarkup() + '</div></body></html>';
    const name = (s.name || 'summary-sheet').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase().slice(0, 60) + '.html';
    const blob = new Blob([html], { type: 'text/html' });
    const fallback = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); };
    dlCap().then(dl => {
      if (!dl) { fallback(); return; }
      dl.save({ filename: name, data: blob }).then(() => A.toast('Saved ' + name), err => { if (!err || err.code !== 'declined') fallback(); });
    });
  }

  /* ------------------------------------------------------------ events */
  function wire() {
    const root = V.slot;
    root.addEventListener('click', e => {
      const t = e.target;
      const add = t.closest('[data-add]');
      if (add) {
        const ref = add.dataset.add, have = onSheet().get(ref);
        if (have) removeRef(ref); else { const it = V.byRef[ref]; if (it) insert([blockFrom(it)]); }
        return;
      }
      const all = t.closest('[data-addall]');
      if (all) {
        const k = all.dataset.addall, have = onSheet(), its = Object.values(V.byRef).filter(it => it.kind === k && !have.get(it.ref));
        if (k === 'point') { const tt = A.topic(V.src.slice(2)); if (tt) insert(topicPack(tt, ['point'], false)); }
        else insert(its.map(blockFrom));
        return;
      }
      const pk = t.closest('[data-pack]'); if (pk) { addPack(pk.dataset.pack); return; }
      const pt = t.closest('[data-pack-topic]'); if (pt) { const tt = A.topic(pt.dataset.packTopic); if (tt) insert(topicPack(tt, ['point', 'formula', 'key', 'trap'], true)); return; }
      const cu = t.closest('[data-custom]'); if (cu) { addCustom(cu.dataset.custom); return; }
      const tab = t.closest('[data-tab]');
      if (tab) { V.tab = tab.dataset.tab; $$('[data-tab]', root).forEach(b => b.setAttribute('aria-selected', b === tab)); $$('.sh-pane', root).forEach(p => { p.hidden = p.dataset.pane !== V.tab; }); return; }
      const zm = t.closest('[data-zoom]'); if (zm) { V.zoom = zm.dataset.zoom; store.set('sheetZoom', V.zoom); scale(); return; }
      const fs = t.closest('[data-fs]');
      if (fs) { editField(b => { b.fs = +fs.dataset.fs; }); $$('[data-fs]', root).forEach(x => x.setAttribute('aria-pressed', x === fs)); clearTimeout(typeT); layout(); return; }
      const o = t.closest('[data-o]');
      if (o) { const id = o.closest('[data-id]').dataset.id; if (o.dataset.o === 'up') move(id, -1); else if (o.dataset.o === 'down') move(id, 1); else drop(id); return; }
      const act = t.closest('[data-act]');
      if (act) {
        const a = act.dataset.act, s = cur();
        if (a === 'new') { snap(); const n = blankSheet(V.sid, 'Sheet ' + (sheetsFor(V.sid).length + 1)); n.set = Object.assign({}, s.set); ST.list.push(n); ST.cur[V.sid] = n.id; select(null); changed({ bar: true, settings: true }); A.toast('New sheet'); }
        else if (a === 'dup') { snap(); const n = JSON.parse(JSON.stringify(s)); n.id = uid(); n.name = s.name + ' (copy)'; n.blocks.forEach(b => { b.id = uid(); }); ST.list.push(n); ST.cur[V.sid] = n.id; select(null); changed({ bar: true }); A.toast('Duplicated'); }
        else if (a === 'del') {
          if (!act.dataset.armed) { act.dataset.armed = '1'; act.textContent = 'Tap again to delete'; setTimeout(() => { if (act.isConnected) { delete act.dataset.armed; act.textContent = 'Delete'; } }, 3000); return; }
          snap(); ST.list = ST.list.filter(x => x.id !== s.id); const rest = sheetsFor(V.sid); ST.cur[V.sid] = rest[0].id; select(null); changed({ bar: true, settings: true });
        }
        else if (a === 'undo') undo();
        else if (a === 'print') doPrint();
        else if (a === 'download') download();
        else if (a === 'done') select(null);
        else if (a === 'up' && V.sel) move(V.sel, -1);
        else if (a === 'down' && V.sel) move(V.sel, 1);
        else if (a === 'drop' && V.sel) drop(V.sel);
        else if (a === 'copy' && V.sel) { const b = s.blocks.find(x => x.id === V.sel); if (b) { const c = JSON.parse(JSON.stringify(b)); c.id = uid(); delete c.ref; insert([c]); select(c.id); } }
        else if (a === 'reset' && V.sel) { const b = s.blocks.find(x => x.id === V.sel), it = b && b.ref && findItem(b.ref); if (it) { snap(); b.title = it.title || ''; b.md = it.md || ''; delete b.fs; if (b.kind === 'fig') b.w = 100; changed({ lib: false }); select(b.id); } }
        return;
      }
      const oli = t.closest('.sh-o[data-id]'); if (oli) { select(oli.dataset.id); return; }
      const sb = t.closest('.sh-pages .sb[data-id]');
      if (sb) { e.preventDefault(); select(sb.dataset.id); return; }
      if (t.closest('.sh-pages') && !t.closest('.sb')) select(null);
    });
    root.addEventListener('change', e => {
      const t = e.target;
      if (t.matches('.sh-pick')) { ST.cur[V.sid] = t.value; V.undo = []; select(null); changed({ bar: true, settings: true }); return; }
      if (t.matches('.sh-src')) { V.src = t.value; store.set('sheetSrc:' + V.sid, V.src); drawLib(); $('.sh-lib', root).scrollTop = 0; return; }
      if (t.matches('.sh-hidegiven')) { drawLib(); return; }
      if (t.dataset.set) {
        snap();
        const k = t.dataset.set, s = cur();
        s.set[k] = t.type === 'checkbox' ? t.checked : (k === 'paper' || k === 'orient' ? t.value : +t.value);
        if (k === 'paper' && /a3/.test(t.value) && s.set.cols < 4 && s.set.orient === 'p') { s.set.cols = 4; drawSettings(); }
        changed({ lib: false });
      }
    });
    root.addEventListener('input', e => {
      const t = e.target;
      if (t.matches('.sh-name')) { cur().name = t.value || 'Untitled sheet'; save(); const o = $('.sh-pick option:checked', root); if (o) o.textContent = cur().name; return; }
      if (t.matches('.sh-q')) { clearTimeout(V.qT); V.qT = setTimeout(() => { V.q = t.value.trim(); drawLib(); }, 160); return; }
      if (t.dataset.set === 'font') { t.nextElementSibling.textContent = t.value + ' pt'; return; }
      if (t.matches('.sh-e-title')) editField(b => { b.title = t.value; });
      else if (t.matches('.sh-e-md')) editField(b => { b.md = t.value; });
      else if (t.matches('.sh-e-w')) { t.nextElementSibling.textContent = t.value + '%'; editField(b => { b.w = +t.value; }); }
    });
    root.addEventListener('keydown', e => {
      if (e.key === 'Escape' && V.sel) { select(null); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey && !e.target.matches('input, textarea')) { e.preventDefault(); undo(); }
    });
    // drag to reorder: blocks on the sheet, and rows in the outline
    let dragId = null;
    root.addEventListener('dragstart', e => {
      const it = e.target.closest && e.target.closest('.sh-pages .sb[data-id], .sh-o[data-id]');
      if (!it) return;
      dragId = it.dataset.id; e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', dragId); } catch (err) { /* old browsers */ }
      it.classList.add('dragging');
    });
    root.addEventListener('dragend', () => { dragId = null; $$('.dragging, .drop-b, .drop-a', root).forEach(x => x.classList.remove('dragging', 'drop-b', 'drop-a')); });
    const target = e => e.target.closest && e.target.closest('.sh-pages .sb[data-id], .sh-o[data-id]');
    root.addEventListener('dragover', e => {
      const it = dragId && target(e); if (!it) return;
      e.preventDefault();
      const r = it.getBoundingClientRect(), after = e.clientY > r.top + r.height / 2;
      $$('.drop-b, .drop-a', root).forEach(x => x.classList.remove('drop-b', 'drop-a'));
      it.classList.add(after ? 'drop-a' : 'drop-b');
    });
    root.addEventListener('drop', e => {
      const it = dragId && target(e); if (!it) return;
      e.preventDefault();
      const r = it.getBoundingClientRect(), after = e.clientY > r.top + r.height / 2;
      moveTo(dragId, it.dataset.id, after);
    });
    V.tab = 'add';
    if ('ResizeObserver' in window) { V.ro = new ResizeObserver(() => scale()); V.ro.observe($('.sh-view', root)); }
    else window.addEventListener('resize', scale);
  }

  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', () => { if (V && V.slot.isConnected) { V.cache.clear(); clearTimeout(V.fT); V.fT = setTimeout(layout, 120); } });
  function check() {
    const main = $('#main'); if (!main) return;
    const slot = $('[data-slot="sheet"]', main);
    if (!slot) { main.classList.remove('sh-wide'); if (V && V.ro) V.ro.disconnect(); V = null; return; }
    mount(slot);
  }
  window.addEventListener('guide:render', check);
  window.GUIDE_SHEET = { mount, toMd, mdHtml, extract, givenFor };
  check();
})();
