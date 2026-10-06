/* ==========================================================================
   Summary sheet designer: build the pre-written notes sheet you take into the exam
   (or a SAC) from the site's own content (key points, formulas, traps, key ideas,
   worked examples, diagrams, tables, glossary terms, constants, your saved notes)
   plus your own blocks.
   - Blocks are split into parts (title, formula, explanation, question, working,
     answer, diagram, caption) that can each be shown or hidden. Titles are off by
     default: topic headings and area-of-study banners carry the structure instead.
   - Anything added from a topic drops into that topic's section (created in course
     order, under its area-of-study banner), coloured by area of study.
   - Blocks auto-pack into columns, page by page, at real paper size, with a live
     "how full" meter. Drag to reorder (mouse, touch, pen), print or download.
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

  /* ------------------------------------------------------------ paper + look */
  const PAPER = {
    'x-a4': { w: 210, h: 297, pages: 4, label: 'Exam: 2 × A4, both sides', names: ['Sheet 1 · front', 'Sheet 1 · back', 'Sheet 2 · front', 'Sheet 2 · back'] },
    'x-a3': { w: 297, h: 420, pages: 2, label: 'Exam: 1 × A3, both sides', names: ['Front', 'Back'] },
    'a4-2': { w: 210, h: 297, pages: 2, label: 'A4, both sides', names: ['Front', 'Back'] },
    'a4-1': { w: 210, h: 297, pages: 1, label: 'A4, one side', names: ['Page'] },
    'a3-1': { w: 297, h: 420, pages: 1, label: 'A3, one side', names: ['Page'] }
  };
  const DEF_SET = { paper: 'x-a4', orient: 'p', cols: 3, font: 7, margin: 6, theme: 'aos', titles: 'off', auto: true };
  const THEMES = [['aos', 'Area of study'], ['kind', 'Block type'], ['mono', 'Black & white']];
  const TITLES = [['off', 'Hidden'], ['run', 'Run-in'], ['line', 'Own line']];
  // one Apple system colour per area of study (0 = reference pages and anything outside an area of study)
  const AOS_COLOURS = ['Grey', 'Blue', 'Purple', 'Orange', 'Green', 'Pink'];
  // short banner names; anything else falls back to the group's own label
  const AOS_NAMES = {
    'physics:u3a1': 'Motion', 'physics:u3a2': 'Fields', 'physics:u3a3': 'Electricity generation',
    'physics:u4a1': 'Light, matter & relativity', 'physics:u4a2': 'Scientific investigation'
  };
  const settings = sh => {   // fill in settings added since a sheet was saved
    const s = Object.assign({}, DEF_SET, sh.set || {});
    if (sh.set && sh.set.mono && !sh.set.theme) s.theme = 'mono';
    return s;
  };

  /* ------------------------------------------------------------ what the VCAA formula sheet already gives you */
  // Physics: matched against formula labels (topic pages) and card titles (formula-sheet page), checked against
  // the 2025 VCAA Physics formula sheet. 'part' = some of the block is on the sheet, some isn't.
  const GIVEN = {
    physics: {
      yes: ["newton's second law", 'constant acceleration equations', 'momentum', 'impulse–momentum theorem', 'kinetic energy', "hooke's law",
        'universal gravitation', 'field strength', 'force between two point charges', 'uniform field', 'force on a conductor',
        'magnetic force on a moving charge', 'radius of the path', 'magnetic flux', "faraday's law", 'ideal transformer', 'transmission-line losses',
        'the wave equation', 'path difference conditions', 'fringe spacing', 'photon energy', 'de broglie wavelength', 'lorentz factor',
        'time dilation', 'length contraction', 'rest energy', 'total and kinetic energy'],
      part: ['describing the motion', 'centripetal acceleration and force', 'strain potential energy', 'energy gained through a potential difference',
        'rms values', "einstein's photoelectric", 'momentum of a photon', 'photon emitted or absorbed'],
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
  const tidy = s => s.replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const toMd = node => tidy(md(node));
  const MATH = /\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)/g;
  const DISPLAY = /\\\[[\s\S]*?\\\]/g;
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

  /* ------------------------------------------------------------ block kinds and their parts */
  const KIND = {
    point: 'Key points', formula: 'Formula', key: 'Key idea', trap: 'Trick alert', tip: 'Exam tip', we: 'Worked example',
    fig: 'Diagram', tbl: 'Table', def: 'Definition', deep: 'Going deeper', note: 'Note', head: 'Topic heading', aos: 'Banner',
    brk: 'Column break', pbrk: 'Page break'
  };
  // small tag in front of a block, so you can tell a trap from a key idea with titles off
  const PILL = { trap: 'Trap', key: 'Key', tip: 'Tip', we: 'Example', deep: 'Deeper' };
  // short labels for the outline list
  const SHORT = { point: 'Points', formula: 'Formula', key: 'Key', trap: 'Trap', tip: 'Tip', we: 'Example', fig: 'Diagram', tbl: 'Table', def: 'Term', deep: 'Deeper', note: 'Note', brk: 'Break', pbrk: 'Page break' };
  // the parts of each kind that can be shown or hidden (the title is handled separately)
  const PARTS = {
    formula: [['eq', 'Formula'], ['md', 'Explanation']],
    we: [['qs', 'Question'], ['md', 'Working'], ['ans', 'Answer']],
    fig: [['html', 'Diagram'], ['md', 'Caption']],
    tbl: [['html', 'Table'], ['md', 'Notes']]
  };
  const partsOf = b => PARTS[b.kind] || [['md', 'Text']];
  const LEVEL = { aos: 1, head: 2 };
  const levelOf = b => LEVEL[b.kind] || 3;
  const isBreak = b => b.kind === 'brk' || b.kind === 'pbrk';

  /* ------------------------------------------------------------ pulling blocks out of a topic page */
  const SECTIONS = [['point', 'Key points'], ['formula', 'Formulas'], ['key', 'Key ideas'], ['tip', 'Exam tips'], ['trap', 'Trick alerts'],
    ['we', 'Worked examples'], ['fig', 'Diagrams'], ['tbl', 'Tables'], ['def', 'Definitions'], ['deep', 'Going deeper'], ['note', 'My saved notes']];
  const QBOX = '.we, .pq, .mcq, .exq, .exp, .quiz, .sim';
  const splitEq = all => ({ eq: (all.match(DISPLAY) || []).join('\n'), md: tidy(all.replace(DISPLAY, '')) });
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
        if (sec === 'Summary' && el.parentElement.parentNode === root) add('point', { title: '', md: toMd(el) });
        return;
      }
      if (inQ) return;
      if (el.matches('.fs-card')) {
        const c = el.cloneNode(true), h = $('h4', c), title = h ? h.textContent.trim() : sec;
        if (h) h.remove();
        $$('a', c).forEach(a => a.remove());
        add('formula', Object.assign({ title, given: givenFor(sid, title, true) }, splitEq(toMd(c))));
      } else if (el.matches('.eq')) {
        if (el.closest('.fs-card')) return;
        const c = el.cloneNode(true), lab = $('.eq-label', c), title = lab ? toMd(lab) : sec;
        if (lab) lab.remove();
        add('formula', Object.assign({ title, given: givenFor(sid, lab ? lab.textContent : '') }, splitEq(toMd(c))));
      } else if (el.matches('aside')) {
        const kind = el.classList.contains('c-trap') ? 'trap' : el.classList.contains('c-exam') ? 'tip' : el.classList.contains('c-def') ? 'def' : el.classList.contains('c-deep') ? 'deep' : 'key';
        const title = el.getAttribute('data-title') || KIND[kind];
        const short = title.replace(/^(Trick alert|Key idea|Exam tip|Going deeper)s?:\s*/i, '');
        add(kind, { title: short ? short.replace(/^(['"‘“]?)(\p{Ll})/u, (m, q, c) => q + c.toUpperCase()) : title, md: toMd(el) });
      } else if (el.matches('.we')) {
        const part = sel => { const x = $(':scope > ' + sel, el); return x ? toMd(x) : ''; };
        add('we', { title: el.getAttribute('data-title') || 'Worked example', qs: part('.we-q'), md: $$(':scope > .we-s', el).map(s => toMd(s)).filter(Boolean).join('\n\n'), ans: part('.we-a') });
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

  /* ------------------------------------------------------------ course structure (areas of study, topic order) */
  let V = null;   // current mounted view
  const studyOf = g => g.topics.map(id => A.topic(id)).filter(t => t && !t.special);
  const refTopics = subj => subj.order.filter(t => t.special === 'reference');
  const tidOf = b => b.tid || (b.ref && !b.ref.startsWith('aos|') ? b.ref.split('|')[0] : null);
  const aosGroups = () => V.subj.groups.filter(g => g.quiz);
  const groupNo = key => { const i = aosGroups().findIndex(g => g.key === key); return i < 0 ? 0 : (i % 5) + 1; };
  const topicGroup = tid => { const t = A.topic(tid); return t && t.groupObj && t.groupObj.quiz ? t.groupObj : null; };
  const courseIdx = tid => { const i = V.subj.order.findIndex(t => t.id === tid); return i < 0 ? 1e4 : i; };
  // where a heading or banner sits in course order (banners just before their first topic)
  function orderOf(b) {
    if (b.kind === 'aos' && b.ref) { const g = V.subj.groups.find(x => 'aos|' + x.key === b.ref); const t = g && studyOf(g)[0]; return t ? courseIdx(t.id) - 0.5 : null; }
    if (b.kind === 'head' && tidOf(b)) return courseIdx(tidOf(b));
    return null;
  }
  // colour (0-5) of every block: its own area of study, else the section it sits in
  // (a colour picked on a banner or heading wins for everything in its section)
  function colours(blocks) {
    let ctx = 0, over1 = null, over2 = null;
    return blocks.map(b => {
      const L = levelOf(b);
      if (L === 1) { over1 = b.ac != null ? b.ac : null; over2 = null; }
      else if (L === 2) over2 = b.ac != null ? b.ac : null;
      let c = null;
      if (b.ac != null) c = b.ac;
      else if (L === 3 && over2 != null) c = over2;
      else if (L >= 2 && over1 != null) c = over1;
      else if (b.kind === 'aos' && b.ref) c = groupNo(b.ref.slice(4));
      else if (tidOf(b)) { const g = topicGroup(tidOf(b)); c = g ? groupNo(g.key) : 0; }
      if (c != null) ctx = c;
      return c != null ? c : ctx;
    });
  }

  /* ------------------------------------------------------------ the designer */
  function mount(slot) {
    if (slot.dataset.ready) return;
    slot.dataset.ready = '1';
    const sid = slot.dataset.subject || (A.current() && A.current().subject) || 'physics';
    const subj = A.subject(sid);
    if (!subj) { slot.innerHTML = '<p class="ln">This subject isn\'t available.</p>'; return; }
    sheetsFor(sid);
    $('#main').classList.add('sh-wide');
    slot.innerHTML = shellHTML(subj);
    V = { slot, sid, subj, sel: null, undo: [], cache: new Map(), loc: {}, coll: new Set(), src: store.get('sheetSrc:' + sid, ''), q: '', zoom: store.get('sheetZoom', 'fit'), tab: 'add' };
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
  function srcExists(src) {
    if (src === 'custom' || src === 'mine') return true;
    if (src.startsWith('pack:')) return V.subj.groups.some(g => 'pack:' + g.key === src);
    if (src.startsWith('t:')) return !!A.topic(src.slice(2));
    return false;
  }

  function shellHTML(subj) {
    let opts = '<optgroup label="Your own"><option value="custom">Your own blocks: banner, heading, text, formula, breaks</option></optgroup>';
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
      '<div class="sh-set"></div>' +
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
          '<div class="sh-pane" data-pane="list" hidden><div class="sh-o-bar"><p class="sh-hint">Drag to reorder, here or on the sheet (on a phone, use the ⋮⋮ handle). Banners and headings take their whole section. The tag on the right is where it sits: S1F·2 = sheet 1 front, column 2.</p>' +
            '<span class="sim-btns"><button class="btn ghost" type="button" data-ocoll="1">Collapse</button><button class="btn ghost" type="button" data-ocoll="0">Expand</button><button class="btn ghost" type="button" data-act="tidy">Sort into topics</button></span></div><ol class="sh-outline"></ol></div>' +
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
  const seg = (key, opts, on, cls) => '<span class="sh-seg' + (cls ? ' ' + cls : '') + '" role="group">' + opts.map(([v, l]) => '<button type="button" data-setv="' + key + '" value="' + v + '" aria-pressed="' + (String(on) === String(v)) + '">' + l + '</button>').join('') + '</span>';
  function drawSettings() {
    const s = settings(cur());
    const opt = (v, l, on) => '<option value="' + v + '"' + (String(on) === String(v) ? ' selected' : '') + '>' + l + '</option>';
    const pct = (s.font - 5) / 6 * 100;
    $('.sh-set', V.slot).innerHTML =
      '<div class="sh-set-g"><span class="sh-set-h">Paper</span>' +
        '<label class="sh-set-r"><span>Size</span><select data-set="paper">' + Object.keys(PAPER).map(k => opt(k, PAPER[k].label, s.paper)).join('') + '</select></label>' +
        '<div class="sh-set-r"><span>Orientation</span>' + seg('orient', [['p', 'Portrait'], ['l', 'Landscape']], s.orient) + '</div>' +
        '<div class="sh-set-r"><span>Margins</span>' + seg('margin', [[4, 'Tiny'], [6, 'Narrow'], [10, 'Normal'], [15, 'Wide']], s.margin) + '</div></div>' +
      '<div class="sh-set-g"><span class="sh-set-h">Layout</span>' +
        '<div class="sh-set-r"><span>Columns</span><span class="sh-step"><button type="button" data-step="-1" aria-label="Fewer columns"' + (s.cols <= 1 ? ' disabled' : '') + '>−</button><b>' + s.cols + '</b><button type="button" data-step="1" aria-label="More columns"' + (s.cols >= 6 ? ' disabled' : '') + '>+</button></span></div>' +
        '<label class="sh-set-r ctl"><span>Text size</span><input type="range" data-set="font" min="5" max="11" step="0.5" value="' + s.font + '" style="--p:' + pct + '%"><output>' + s.font + ' pt</output></label>' +
        '<div class="sh-set-r"><span>Block titles</span>' + seg('titles', TITLES, s.titles) + '</div></div>' +
      '<div class="sh-set-g"><span class="sh-set-h">Look</span>' +
        '<div class="sh-set-r"><span>Colour by</span>' + seg('theme', THEMES, s.theme, 'sh-seg-theme') + '</div>' +
        '<label class="sh-set-r ctl-check"><span>Topic headings &amp; area-of-study banners</span><input type="checkbox" data-set="auto"' + (s.auto ? ' checked' : '') + '></label>' +
        '<div class="sh-set-r sh-legend">' + aosGroups().map(g => '<span class="sh-lg ac' + groupNo(g.key) + '"><i></i>' + esc(AOS_NAMES[g.key] || g.eyebrow) + '</span>').join('') + '</div></div>';
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
    return (V.all = ts.flatMap(extract).map(it => Object.assign(it, { _n: norm([it.title, it.eq, it.qs, it.md, it.ans, it.from].filter(Boolean).join(' ')) })));
  }
  function givenBadge(g) { return g === 'yes' ? '<span class="sh-given" title="This is on the VCAA formula sheet you get in the exam">On VCAA sheet</span>' : g === 'part' ? '<span class="sh-given part" title="Some of this is on the VCAA formula sheet">Partly on VCAA sheet</span>' : ''; }
  function itemHTML(it, added) {
    const c = it.tid ? (topicGroup(it.tid) ? groupNo(topicGroup(it.tid).key) : 0) : 0;
    return '<div class="sh-it sh-k-' + it.kind + ' ac' + c + '" data-ref="' + esc(it.ref) + '">' +
      '<div class="sh-it-h"><span class="sh-chip">' + KIND[it.kind] + '</span>' + (it.title ? '<b>' + mdInline(it.title) + '</b>' : '') + givenBadge(it.given) +
      '<button class="btn sh-add' + (added ? ' on' : '') + '" type="button" data-add="' + esc(it.ref) + '" aria-pressed="' + !!added + '">' + (added ? '✓ Added' : '+ Add') + '</button></div>' +
      '<div class="sh-it-b">' + bodyHTML(it, {}) + '</div>' + (V.q ? '<div class="sh-it-from">' + esc(it.from) + '</div>' : '') + '</div>';
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
      h = '<p class="sh-hint">Add your own blocks (they go after the block you have selected, or at the end), then tap one on the sheet to write in it. Text supports **bold**, *italic*, “- ” bullets and maths like \\( v = f\\lambda \\).</p><div class="sh-custom">' +
        [['aos', 'Banner', 'A coloured bar that starts a big section'], ['head', 'Heading', 'A topic-style heading'], ['note', 'Text', 'Anything you want to remember'], ['formula', 'Formula', 'Your own formula with notes'],
          ['point', 'Bullet list', 'Quick list of facts'], ['brk', 'Column break', 'Start a new column here'], ['pbrk', 'Page break', 'Start a new page here']]
          .map(([k, l, d]) => '<button class="sh-cust sh-k-' + k + '" type="button" data-custom="' + k + '"><b>+ ' + l + '</b><span>' + d + '</span></button>').join('') + '</div>';
    } else if (V.src.startsWith('pack:')) {
      const g = V.subj.groups.find(x => 'pack:' + x.key === V.src), ts = studyOf(g);
      const count = k => { const per = ts.map(t => topicPack(t, PACKS[k], have).length); return k === 'full' || k === 'points' ? per.filter(Boolean).length : per.reduce((a, x) => a + x, 0); };
      const packs = [
        ['full', 'Topic packs', 'For every topic: its key points, formulas, key ideas and trick alerts, under a topic heading.', count('full')],
        ['points', 'Key points', 'One block of key points per topic.', count('points')],
        ['formula', 'All formulas', 'Every formula box from these topics.', count('formula')]
      ];
      if (GIVEN[V.sid]) packs.push(['notgiven', 'Formulas NOT on the VCAA sheet', 'The derived results you have to remember yourself (banked tracks, loops, orbits…).', count('notgiven')]);
      packs.push(['trap', 'All trick alerts', 'The mistakes examiners see every year.', count('trap')],
        ['key', 'All key ideas', 'The big ideas boxed on each topic page.', count('key')]);
      h = '<p class="sh-hint sh-aos-hint ac' + groupNo(g.key) + '"><i></i><b>' + esc(g.eyebrow) + '</b>: ' + esc(g.title) + ' (' + ts.length + ' topics). Packs skip anything already on your sheet.</p><div class="sh-packs">' +
        packs.map(([k, l, d, c]) => '<button class="sh-pack ac' + groupNo(g.key) + '" type="button" data-pack="' + k + '"' + (c ? '' : ' disabled') + '><b>' + l + '</b><span>' + d + '</span><em>' + (c ? (k === 'full' || k === 'points' ? c + ' topic' + (c > 1 ? 's' : '') : '+' + c + ' block' + (c > 1 ? 's' : '')) : 'All on your sheet') + '</em></button>').join('') + '</div>';
    } else {
      const items = itemsOf(V.src).filter(keep);
      items.forEach(it => { V.byRef[it.ref] = it; });
      const t = V.src.startsWith('t:') ? A.topic(V.src.slice(2)) : null;
      if (t && !t.special) h += '<div class="sh-topic-acts"><button class="btn" type="button" data-pack-topic="' + t.id + '">+ Topic pack</button><span class="sh-hint">key points, formulas, key ideas and traps</span><a class="sh-open" href="#' + t.id + '">Open topic ↗</a></div>';
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
    $$('.sh-it-b svg', lib).forEach(s => s.removeAttribute('width'));
  }

  /* ------------------------------------------------------------ adding blocks: into their topic's section, in course order */
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
  const PART_KEYS = ['title', 'md', 'eq', 'qs', 'ans', 'html', 'w', 'given'];
  function blockFrom(it) {
    const b = { id: uid(), v: 2, kind: it.kind, ref: it.ref, tid: it.tid, from: it.from };
    PART_KEYS.forEach(k => { if (it[k] != null && it[k] !== '') b[k] = it[k]; });
    if (b.title == null) b.title = '';
    if (b.md == null) b.md = '';
    return b;
  }
  const headBlock = t => ({ id: uid(), v: 2, kind: 'head', ref: t.id + '|head', tid: t.id, auto: true, title: (t.short || t.title).replace(/<[^>]+>/g, ''), md: '', from: t.short || t.title });
  const aosBlock = g => ({ id: uid(), v: 2, kind: 'aos', ref: 'aos|' + g.key, auto: true, title: AOS_NAMES[g.key] || g.eyebrow, sub: g.eyebrow, md: '' });
  // make sure topic t has a section (banner + heading, created in course order); return the index at the end of it
  function sectionEnd(bl, t) {
    let hi = bl.findIndex(b => b.ref === t.id + '|head');
    if (hi < 0) {
      const g = t.groupObj && t.groupObj.quiz ? t.groupObj : null;
      let lo = 0, hiEnd = bl.length;
      if (g) {
        let ai = bl.findIndex(b => b.ref === 'aos|' + g.key);
        if (ai < 0) {
          const ab = aosBlock(g), o = orderOf(ab);
          let at = bl.findIndex(b => { const x = orderOf(b); return x != null && x > o; });
          if (at < 0) at = bl.length;
          bl.splice(at, 0, ab); ai = at;
        }
        lo = ai + 1; hiEnd = lo; while (hiEnd < bl.length && bl[hiEnd].kind !== 'aos') hiEnd++;
      }
      const ci = courseIdx(t.id);
      let at = hiEnd;
      for (let j = lo; j < hiEnd; j++) { const x = orderOf(bl[j]); if (x != null && x > ci) { at = j; break; } }
      bl.splice(at, 0, headBlock(t)); hi = at;
    }
    let e = hi + 1; while (e < bl.length && levelOf(bl[e]) > 2) e++;
    return e;
  }
  function place(blocks) {
    if (!blocks.length) return;
    snap();
    const s = cur(), set = settings(s), bl = s.blocks.slice();
    let at = V.sel ? bl.findIndex(b => b.id === V.sel) + 1 : bl.length;
    if (at <= 0) at = bl.length;
    const groups = [];
    blocks.forEach(b => { const tid = set.auto ? tidOf(b) : null, t = tid && A.topic(tid); const k = t ? t.id : ''; let g = groups.find(x => x.k === k); if (!g) groups.push(g = { k, t, list: [] }); g.list.push(b); });
    groups.forEach(g => {
      if (!g.t) { bl.splice(at, 0, ...g.list); at += g.list.length; return; }
      const e = sectionEnd(bl, g.t);
      bl.splice(e, 0, ...g.list);
    });
    s.blocks = bl; V.flash = blocks.map(b => b.id);
    changed();
    const where = groups.length === 1 && groups[0].t ? ' to ' + (groups[0].t.short || groups[0].t.title).replace(/<[^>]+>/g, '') : '';
    A.toast((blocks.length === 1 ? 'Added' : blocks.length + ' blocks added') + where);
  }
  const PACKS = { full: ['point', 'formula', 'key', 'trap'], points: ['point'], formula: ['formula'], notgiven: ['formula', 'notgiven'], trap: ['trap'], key: ['key'] };
  function pointsBlock(t, pts) {
    return { id: uid(), v: 2, kind: 'point', ref: t.id + '|points', tid: t.id, title: 'Key points', md: pts.map(p => '- ' + p.md.replace(/\s*\n+\s*/g, ' ')).join('\n'), from: t.short || t.title };
  }
  // the blocks a pack would add for one topic (anything already on the sheet is skipped)
  function topicPack(t, kinds, have) {
    have = have || onSheet();
    const its = extract(t).filter(it => kinds.includes(it.kind) && !have.get(it.ref) && (kinds.includes('notgiven') ? it.given !== 'yes' : true));
    const pts = have.get(t.id + '|points') ? [] : its.filter(it => it.kind === 'point');
    return (pts.length ? [pointsBlock(t, pts)] : []).concat(its.filter(it => it.kind !== 'point').map(blockFrom));
  }
  function addPack(k) {
    const g = V.subj.groups.find(x => 'pack:' + x.key === V.src); if (!g) return;
    const have = onSheet(), out = [], auto = settings(cur()).auto;
    studyOf(g).forEach(t => {
      const bl = topicPack(t, PACKS[k], have);
      if (bl.length && !auto && (k === 'full' || k === 'points') && !have.get(t.id + '|head')) bl.unshift(headBlock(t));
      out.push(...bl);
    });
    place(out);
  }
  function addCustom(k) {
    const b = { id: uid(), v: 2, kind: k, title: '', md: '' };
    if (k === 'aos') { b.title = 'Section'; b.sub = ''; }
    if (k === 'head') b.title = 'Heading';
    if (k === 'note') { b.title = 'Note'; b.md = 'Write anything here.'; }
    if (k === 'formula') { b.title = 'My formula'; b.eq = '\\[ F_{\\text{net}} = ma \\]'; b.md = 'What each symbol means, and when it applies.'; }
    if (k === 'point') { b.title = 'Remember'; b.md = '- First point\n- Second point'; }
    place([b]);
    if (!isBreak(b)) select(b.id, true);
  }
  // auto-made headings and banners go once nothing is left under them
  function pruneEmpty(bl) {
    let changedAny = true;
    while (changedAny) {
      changedAny = false;
      for (let i = bl.length - 1; i >= 0; i--) {
        const b = bl[i]; if (!b.auto) continue;
        const L = levelOf(b), nx = bl[i + 1];
        if (!nx || levelOf(nx) <= L) { bl.splice(i, 1); changedAny = true; }
      }
    }
    return bl;
  }
  function removeRef(ref) {
    snap();
    const s = cur(); s.blocks = pruneEmpty(s.blocks.filter(b => b.ref !== ref));
    changed();
  }
  // re-file every block under its topic, in course order (custom blocks travel with the block before them)
  function tidyIntoTopics() {
    const s = cur();
    snap();
    if (!settings(s).auto) s.set = Object.assign({}, settings(s), { auto: true });
    const groups = new Map(), top = [];
    let last = null;
    s.blocks.forEach(b => {
      if (b.auto) return;
      const tid = tidOf(b) && A.topic(tidOf(b)) ? tidOf(b) : null;
      const key = tid || last;
      if (tid) last = tid;
      if (!key) { top.push(b); return; }
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(b);
    });
    const bl = top.slice();
    Array.from(groups.keys()).sort((a, b) => courseIdx(a) - courseIdx(b)).forEach(tid => {
      const e = sectionEnd(bl, A.topic(tid));
      bl.splice(e, 0, ...groups.get(tid).filter(b => !(b.kind === 'head' && b.ref === tid + '|head')));
    });
    s.blocks = bl;
    changed({ settings: true });
    A.toast('Sorted into topics, in course order');
  }

  /* ------------------------------------------------------------ sections and moving */
  // a banner or heading carries its section: itself plus everything below it until the next one at its level or above
  function sectionIds(blocks, id) {
    const i = blocks.findIndex(b => b.id === id); if (i < 0) return [];
    const L = levelOf(blocks[i]); if (L > 2) return [id];
    const out = [id];
    for (let j = i + 1; j < blocks.length && levelOf(blocks[j]) > L; j++) out.push(blocks[j].id);
    return out;
  }
  // indexes (in a list without the moving blocks) where a level-L section may land
  function sectionStarts(rest, L) { const out = [0]; rest.forEach((b, i) => { if (levelOf(b) <= L && i) out.push(i); }); out.push(rest.length); return Array.from(new Set(out)); }
  // put `ids` (in their current order) at index `at` of the list without them
  function moveSet(ids, at) {
    const s = cur(), set = new Set(ids);
    const moving = s.blocks.filter(b => set.has(b.id)), rest = s.blocks.filter(b => !set.has(b.id));
    at = Math.max(0, Math.min(rest.length, at));
    const next = rest.slice(0, at).concat(moving, rest.slice(at));
    if (next.every((b, i) => b === s.blocks[i])) return false;
    snap(); s.blocks = next; V.flash = ids;
    changed({ lib: false });
    return true;
  }
  function move(id, d) {
    const s = cur(), ids = sectionIds(s.blocks, id); if (!ids.length) return;
    const start = s.blocks.findIndex(b => b.id === ids[0]), L = levelOf(s.blocks[start]);
    if (L <= 2) {
      const rest = s.blocks.filter(b => !ids.includes(b.id)), B = sectionStarts(rest, L);
      const to = d < 0 ? B.filter(x => x < start).pop() : B.find(x => x > start);
      if (to != null) moveSet(ids, to);
    } else if (start + d >= 0 && start + d < s.blocks.length) moveSet(ids, start + d);
  }
  function blockLabel(b) {
    return (b.title || b.eq || b.qs || b.md || '').replace(MATH, m => m.replace(/^\\[([]\s*|\s*\\[)\]]$/g, '')).replace(/[*#]/g, '').replace(/\s+/g, ' ').trim().slice(0, 70) || KIND[b.kind];
  }
  function drop(id) {
    snap();
    const s = cur(); s.blocks = pruneEmpty(s.blocks.filter(b => b.id !== id));
    if (V.sel === id) V.sel = null;
    changed();
    select(null);
  }

  /* ------------------------------------------------------------ block editor */
  function select(id, focus) {
    V.sel = id;
    $$('.sb.sel', V.slot).forEach(x => x.classList.remove('sel'));
    $$('.sh-o.sel', V.slot).forEach(x => x.classList.remove('sel'));
    const ed = $('.sh-edit', V.slot), panes = $$('.sh-tabs, .sh-pane', V.slot);
    const b = id && cur().blocks.find(x => x.id === id);
    if (!b) { ed.hidden = true; ed.innerHTML = ''; panes.forEach(p => { p.hidden = p.classList.contains('sh-pane') && p.dataset.pane !== V.tab; }); $$('.sh-tabs', V.slot).forEach(p => { p.hidden = false; }); return; }
    $$('[data-id="' + id + '"]', V.slot).forEach(x => x.classList.add('sel'));
    panes.forEach(p => { p.hidden = true; });
    ed.hidden = false; V.editSnap = false;
    ed.innerHTML = editorHTML(b);
    const view = $('.sh-side', V.slot);
    if (focus) { const f = $('.sh-e-f[data-f="md"], .sh-e-f[data-f="title"]', ed); if (f) { f.focus(); if (f.tagName === 'TEXTAREA') f.setSelectionRange(f.value.length, f.value.length); } }
    if (window.innerWidth <= 960) view.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  function editorHTML(b) {
    const s = settings(cur()), hide = b.hide || {}, orig = b.ref && !b.ref.startsWith('aos|') && findItem(b.ref);
    const field = (f, label, rows) => '<label class="sh-f"><span>' + label + '</span>' + (rows ? '<textarea class="sh-e-f" data-f="' + f + '" rows="' + rows + '" spellcheck="true">' + esc(b[f] || '') + '</textarea>' : '<input class="sh-e-f" data-f="' + f + '" value="' + esc(b[f] || '') + '">') + '</label>';
    let h = '<div class="sh-edit-h"><span class="sh-chip sh-k-' + b.kind + '">' + KIND[b.kind] + '</span>' + (b.from ? '<span class="sh-hint">' + esc(b.from) + '</span>' : '') + givenBadge(b.given) + '<button class="btn primary" type="button" data-act="done">Done</button></div>';
    if (isBreak(b)) h += '<p class="sh-hint">' + (b.kind === 'brk' ? 'Everything after this starts in the next column.' : 'Everything after this starts on the next page.') + '</p>';
    else if (b.kind === 'aos' || b.kind === 'head') {
      h += field('title', b.kind === 'aos' ? 'Banner text' : 'Heading') + (b.kind === 'aos' ? field('sub', 'Small label (e.g. Unit 3 · AoS 1)') : '');
      const cols = colours(cur().blocks)[cur().blocks.indexOf(b)];
      h += '<div class="sh-f"><span>Colour' + (b.ac == null ? ' (automatic: ' + AOS_COLOURS[cols] + ')' : '') + '</span><span class="sh-swatches"><button type="button" data-ac="" aria-pressed="' + (b.ac == null) + '" class="sh-sw-auto">Auto</button>' +
        AOS_COLOURS.map((n, i) => '<button type="button" class="sh-sw ac' + i + '" data-ac="' + i + '" aria-pressed="' + (b.ac === i) + '" aria-label="' + n + '" title="' + n + '"><i></i></button>').join('') + '</span></div>' +
        '<p class="sh-hint">The colour carries down to every block in this section.</p>';
    } else {
      const parts = partsOf(b);
      h += '<div class="sh-f"><span>Show</span><span class="sh-chips">' +
        '<button type="button" class="sh-tog" data-tm aria-pressed="' + (titleMode(b, s) !== 'off') + '">Title</button>' +
        parts.map(([k, l]) => '<button type="button" class="sh-tog" data-part="' + k + '" aria-pressed="' + !hide[k] + '">' + l + '</button>').join('') + '</span></div>';
      if (b.title) h += '<div class="sh-f"><span>Title style</span>' + '<span class="sh-seg">' + [['', 'Sheet default'], ['off', 'Hidden'], ['run', 'Run-in'], ['line', 'Own line']].map(([v, l]) => '<button type="button" data-tmv="' + v + '" aria-pressed="' + ((b.tm || '') === v) + '">' + l + '</button>').join('') + '</span></div>';
      h += field('title', 'Title');
      if (b.kind === 'formula') h += field('eq', 'Formula', 3) + field('md', 'Explanation', 5);
      else if (b.kind === 'we') h += field('qs', 'Question', 4) + field('md', 'Working', 6) + field('ans', 'Answer', 3);
      else if (b.kind === 'fig') h += field('md', 'Caption', 3);
      else if (b.kind === 'tbl') h += field('md', 'Notes under the table', 3);
      else h += field('md', 'Text', 8);
      h += '<p class="sh-hint">**bold** · *italic* · “- ” starts a bullet · \\( v = f\\lambda \\) inline maths · \\[ \\dots \\] maths on its own line · blank line = new paragraph. Every line costs space.</p>';
      if (b.kind === 'fig') h += '<label class="sh-f sh-range ctl"><span>Diagram width</span><input type="range" class="sh-e-w" min="25" max="100" step="5" value="' + (b.w || 100) + '" style="--p:' + (((b.w || 100) - 25) / 75 * 100) + '%"><output>' + (b.w || 100) + '%</output></label>';
      h += '<div class="sh-f"><span>Text size</span><span class="sh-seg">' + [[0.8, 'Smaller'], [1, 'Normal'], [1.2, 'Bigger']].map(([v, l]) => '<button type="button" data-fs="' + v + '" aria-pressed="' + ((b.fs || 1) === v) + '">' + l + '</button>').join('') + '</span></div>';
    }
    h += '<div class="sh-edit-acts sim-btns"><button class="btn" type="button" data-act="up">↑ Earlier</button><button class="btn" type="button" data-act="down">↓ Later</button><button class="btn" type="button" data-act="copy">Duplicate</button>' +
      (orig ? '<button class="btn ghost" type="button" data-act="reset">Reset to original</button>' : '') + '<button class="btn ghost sh-del" type="button" data-act="drop">Delete</button></div>';
    return h + moveToHTML(b);
  }
  function moveToHTML(b) {
    const L = levelOf(b), heads = cur().blocks.filter(x => levelOf(x) <= 2 && x.id !== b.id && (L > 2 || levelOf(x) <= L));
    const verb = L <= 2 ? 'Before “' : 'Under “';
    return '<label class="sh-f"><span>' + (L <= 2 ? 'Move this whole section' : 'Move to') + '</span><select class="sh-e-move"><option value="">Choose where…</option><option value="top">Top of the sheet</option>' +
      heads.map(h => '<option value="h:' + h.id + '">' + verb + esc(blockLabel(h)) + '”</option>').join('') + '<option value="end">Bottom of the sheet</option></select></label>';
  }
  function moveToPick(v) {
    const s = cur(), ids = sectionIds(s.blocks, V.sel); if (!ids.length || !v) return;
    const rest = s.blocks.filter(b => !ids.includes(b.id)), L = levelOf(s.blocks.find(b => b.id === V.sel));
    let at = v === 'top' ? 0 : rest.length;
    if (v.startsWith('h:')) {
      const hi = rest.findIndex(b => b.id === v.slice(2)); if (hi < 0) return;
      if (L <= 2) at = hi;
      else { const HL = levelOf(rest[hi]); at = hi + 1; while (at < rest.length && levelOf(rest[at]) > HL && !(HL === 1 && levelOf(rest[at]) === 2)) at++; }
    }
    if (moveSet(ids, at)) A.toast(ids.length > 1 ? 'Section moved' : 'Moved');
    select(V.sel);
  }
  function findItem(ref) {
    const tid = ref.split('|')[0], t = A.topic(tid);
    if (!t) return null;
    if (ref.endsWith('|points')) { const pts = extract(t).filter(i => i.kind === 'point'); return pts.length ? pointsBlock(t, pts) : null; }
    if (ref.endsWith('|head')) return null;
    return extract(t).find(i => i.ref === ref) || savedNotes(V.sid).find(i => i.ref === ref) || null;
  }
  let typeT;
  function editField(fn, now) {
    const b = cur().blocks.find(x => x.id === V.sel); if (!b) return;
    if (!V.editSnap) { snap(); V.editSnap = true; }
    fn(b);
    cur().upd = Date.now(); save();
    clearTimeout(typeT);
    if (now) layout(); else typeT = setTimeout(() => layout(), 220);
  }

  /* ------------------------------------------------------------ rendering a block */
  function titleMode(b, set) {
    if (b.kind === 'head' || b.kind === 'aos') return 'line';
    if (!b.title) return 'off';
    const m = b.tm || set.titles || 'off';
    return !b.tm && m === 'off' && b.kind === 'def' ? 'run' : m;   // a definition is nothing without its term
  }
  // a block's parts as HTML (no title, no pill); `hide` says which parts to leave out
  function bodyHTML(b, hide) {
    const parts = [];
    const add = (k, html) => { if (!hide[k] && html) parts.push(html); };
    if (b.kind === 'formula') {
      add('eq', b.eq ? '<div class="sb-eq">' + mdHtml(b.eq) + '</div>' : '');
      add('md', b.md ? '<div class="sb-b sb-x">' + mdHtml(b.md) + '</div>' : '');
    } else if (b.kind === 'we') {
      add('qs', b.qs ? '<div class="sb-b sb-q">' + mdHtml(b.qs) + '</div>' : '');
      add('md', b.md ? '<div class="sb-b">' + mdHtml(b.md) + '</div>' : '');
      add('ans', b.ans ? '<div class="sb-b sb-a">' + mdHtml(b.ans) + '</div>' : '');
    } else if (b.kind === 'fig') {
      add('html', '<div class="sb-figbox" style="width:' + (b.w || 100) + '%">' + (b.html || '').replace(/url\(#ah-/g, 'url(#sh-ah-') + '</div>');
      add('md', b.md ? '<div class="sb-cap">' + mdHtml(b.md) + '</div>' : '');
    } else if (b.kind === 'tbl') {
      add('html', '<div class="sb-tblbox">' + (b.html || '') + '</div>');
      add('md', b.md ? '<div class="sb-b">' + mdHtml(b.md) + '</div>' : '');
    } else add('md', b.md ? '<div class="sb-b">' + mdHtml(b.md) + '</div>' : '');
    return parts.join('');
  }
  // put the pill / run-in title at the start of the first line of text
  function withLead(html, lead) {
    if (!lead) return html;
    if (html.startsWith('<div class="sb-eq">')) return '<span class="sb-lead sb-fl">' + lead + '</span>' + html;   // beside a formula
    const m = html.match(/^(<div class="sb-[^"]*"[^>]*>)(<p>|<(?:ul|ol)><li>)/);
    if (m) return m[1] + m[2] + lead + html.slice(m[0].length);
    return '<span class="sb-lead">' + lead + '</span>' + html;
  }
  function blockHTML(b, set, c) {
    const cls = 'sb sb-' + b.kind + ' ac' + c, style = b.fs && b.fs !== 1 ? ' style="font-size:' + b.fs + 'em"' : '';
    const open = '<div class="' + cls + '" data-id="' + b.id + '"' + style + '>';
    if (isBreak(b)) return open + '<span class="sb-brk-l">' + KIND[b.kind] + '</span></div>';
    if (b.kind === 'aos') return open + (b.sub ? '<span class="sb-aos-k">' + mdInline(b.sub) + '</span>' : '') + '<span class="sb-aos-t">' + mdInline(b.title || '') + '</span></div>';
    if (b.kind === 'head') return open + '<div class="sb-t">' + mdInline(b.title || '') + '</div></div>';
    const tm = titleMode(b, set), hide = b.hide || {};
    let body = bodyHTML(b, hide);
    const pill = PILL[b.kind] ? '<span class="sb-pill">' + PILL[b.kind] + '</span>' : '';
    const run = tm === 'run' ? '<b class="sb-rt">' + mdInline(b.title) + '</b> ' : '';
    if (tm === 'line') body = '<div class="sb-t">' + pill + mdInline(b.title) + '</div>' + body;
    else body = withLead(body, pill + run);
    if (!body) body = '<div class="sb-b sb-empty-b">' + (b.title ? mdInline(b.title) : 'Empty block') + '</div>';
    return open + body + (b.given ? '<span class="sb-given' + (b.given === 'part' ? ' part' : '') + '" title="' + (b.given === 'part' ? 'Partly on' : 'On') + ' the VCAA formula sheet">VCAA</span>' : '') + '</div>';
  }

  /* ------------------------------------------------------------ layout: pack blocks into columns, page by page */
  function geom(set) {
    const P = PAPER[set.paper] || PAPER['x-a4'];
    const [pw, ph] = set.orient === 'l' ? [P.h, P.w] : [P.w, P.h];
    const m = +set.margin, W = pw - 2 * m, H = ph - 2 * m, cols = +set.cols;
    return { P, pw, ph, m, W, H, cols, cw: (W - (cols - 1) * GAP) / cols, allowed: P.pages };
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
    const sh = cur(), set = settings(sh), G = geom(set), cs = colours(sh.blocks);
    const meas = $('.sh-meas', V.slot), col = $('.sh-col', meas);
    meas.className = 'sh-paper sh-light sh-meas th-' + set.theme;
    meas.style.fontSize = set.font + 'pt';
    col.style.width = G.cw + 'mm';
    col.innerHTML = '';
    const colPx = G.cw * MM, Hpx = G.H * MM, ctx = G.cw.toFixed(2) + '|' + set.font + '|' + set.theme;
    const nodes = sh.blocks.map((b, i) => {
      const raw = blockHTML(b, set, cs[i]), key = ctx + '|' + raw, hit = V.cache.get(key);
      const tmp = document.createElement('div'); tmp.innerHTML = hit || raw;
      const node = tmp.firstElementChild; col.appendChild(node);
      if (!hit) {
        if (typeof window.renderMathInElement === 'function') {
          try { window.renderMathInElement(node, { delimiters: [{ left: '\\[', right: '\\]', display: true }, { left: '\\(', right: '\\)', display: false }], throwOnError: false }); } catch (e) { /* leave raw */ }
        }
        $$('svg', node).forEach(s => { s.removeAttribute('width'); s.removeAttribute('height'); });
        fit(node, colPx);
        if (V.cache.size > 800) V.cache.clear();
        V.cache.set(key, node.outerHTML);
      }
      return node;
    });
    // greedy packing, in order: fill a column top to bottom, then the next column, then the next page
    const pages = [], loc = {};
    const newPage = () => { const p = { cols: Array.from({ length: G.cols }, () => ({ nodes: [], used: 0 })) }; pages.push(p); return p; };
    let p = newPage(), c = 0, y = 0;
    const nextCol = () => { c++; y = 0; if (c >= G.cols) { p = newPage(); c = 0; } };
    const mbOf = n => parseFloat(getComputedStyle(n).marginBottom) || 0;
    nodes.forEach((node, i) => {
      const b = sh.blocks[i];
      if (b.kind === 'brk') { if (y > 0) nextCol(); p.cols[c].nodes.push(node); loc[b.id] = [pages.length, c + 1]; return; }
      if (b.kind === 'pbrk') { if (y > 0 || c > 0) { p = newPage(); c = 0; y = 0; } p.cols[c].nodes.push(node); loc[b.id] = [pages.length, c + 1]; return; }
      const h = node.offsetHeight, mb = mbOf(node);
      // banners and headings never sit alone at the bottom of a column: they move with the start of what follows
      let need = h;
      if (levelOf(b) <= 2) {
        let j = i + 1;
        while (j < nodes.length && levelOf(sh.blocks[j]) <= 2 && !isBreak(sh.blocks[j])) { need += mb + nodes[j].offsetHeight; j++; }
        if (j < nodes.length && !isBreak(sh.blocks[j])) need += mb + Math.min(nodes[j].offsetHeight, Hpx * 0.25);
        need = Math.min(need, Hpx);
      }
      if (y > 0 && y + need > Hpx + 0.5) nextCol();
      node.classList.toggle('too-tall', h > Hpx + 0.5);
      p.cols[c].nodes.push(node); p.cols[c].used = Math.min(Hpx, y + h);
      loc[b.id] = [pages.length, c + 1];
      y += h + mb;
    });
    V.loc = loc; V.cs = cs;
    // keep at least the allowed number of pages visible, so you can see the space you have
    while (pages.length < G.allowed) newPage();
    const box = $('.sh-pages', V.slot);
    box.innerHTML = '';
    const names = G.P.names, fills = [];
    pages.forEach((pg, pi) => {
      const used = pg.cols.reduce((a, x) => a + x.used, 0), pct = Math.round(100 * used / (G.cols * Hpx));
      const over = pi >= G.allowed;
      fills.push({ pct, over, name: names[pi] || 'Page ' + (pi + 1) });
      const wrap = document.createElement('div'); wrap.className = 'sh-pg' + (over ? ' over' : '');
      wrap.innerHTML = '<div class="sh-pg-lab"><b>' + esc(over ? 'Page ' + (pi + 1) + ': over your limit' : names[pi] || 'Page ' + (pi + 1)) + '</b><span>' + pct + '% full</span></div>' +
        '<div class="sh-pg-box"><div class="sh-paper sh-light th-' + set.theme + '" style="width:' + G.pw + 'mm;height:' + G.ph + 'mm;font-size:' + set.font + 'pt">' +
        '<div class="sh-cols" style="left:' + G.m + 'mm;top:' + G.m + 'mm;width:' + G.W + 'mm;height:' + G.H + 'mm;gap:' + GAP + 'mm"></div></div></div>';
      const colsEl = $('.sh-cols', wrap);
      pg.cols.forEach(cl => { const ce = document.createElement('div'); ce.className = 'sh-col'; ce.style.width = G.cw + 'mm'; ce.style.height = G.H + 'mm'; cl.nodes.forEach(n => ce.appendChild(n)); colsEl.appendChild(ce); });
      box.appendChild(wrap);
    });
    if (!sh.blocks.length) {
      const first = $('.sh-cols', box);
      if (first) first.insertAdjacentHTML('afterbegin', '<div class="sh-empty"><b>Your sheet is empty</b><span>Pick blocks on the left: start with a ⚡ quick pack, a topic, or search. Each block drops into its topic’s section, and the meter shows how much space you have left.</span></div>');
    }
    if (V.sel) $$('[data-id="' + V.sel + '"]', V.slot).forEach(x => x.classList.add('sel'));
    V.geom = G; V.pagesN = pages.length;
    scale();
    drawMeter(fills, G);
    drawOutline();
    if (V.flash) { V.flash.forEach(id => $$('[data-id="' + id + '"]', V.slot).forEach(x => { x.classList.remove('sh-flash'); void x.offsetWidth; x.classList.add('sh-flash'); })); V.flash = null; }
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
    const n = cur().blocks.filter(b => levelOf(b) > 2 && !isBreak(b)).length;
    let msg;
    if (over.length) msg = '<span class="sh-warn">Doesn\'t fit: ' + over.length + ' extra page' + (over.length > 1 ? 's' : '') + ' beyond ' + esc(G.P.label.replace(/^Exam: /, '')) + '. Cut words, hide parts, drop blocks, shrink the text, or add a column.</span>';
    else if (!n) msg = '<span class="sh-hint">' + esc(G.P.label) + ' · ' + G.cols + ' columns · ' + cur().set.font + ' pt</span>';
    else msg = '<span class="sh-ok">Fits</span><span class="sh-hint">' + n + ' block' + (n > 1 ? 's' : '') + ' on ' + esc(G.P.label.replace(/^Exam: /, '')) + '</span>';
    if (tall) msg += '<span class="sh-warn">' + tall + ' block' + (tall > 1 ? 's are' : ' is') + ' taller than a column and get cut off (outlined in red).</span>';
    m.innerHTML = '<div class="sh-fills">' + fills.map(f => '<div class="sh-fill' + (f.over ? ' over' : '') + '" title="' + esc(f.name) + ': ' + f.pct + '% full"><span>' + esc(f.name) + '</span><i style="width:' + Math.min(100, f.pct) + '%"></i><b>' + f.pct + '%</b></div>').join('') + '</div><div class="sh-msg">' + msg + '</div>';
  }
  function drawOutline() {
    const s = cur(), ol = $('.sh-outline', V.slot), names = V.geom.P.names, cs = V.cs || colours(s.blocks);
    $('.sh-n', V.slot).textContent = s.blocks.length || '';
    const tools = $('.sh-o-bar .sim-btns', V.slot); if (tools) $$('[data-ocoll]', tools).forEach(x => { x.hidden = !s.blocks.some(b => levelOf(b) <= 2); });
    if (!s.blocks.length) { ol.innerHTML = '<li class="sh-hint">Nothing on your sheet yet.</li>'; return; }
    let aos = null, head = null;
    ol.innerHTML = s.blocks.map((b, i) => {
      const L = levelOf(b);
      if (L === 1) { aos = b.id; head = null; } else if (L === 2) head = b.id;
      const parents = L === 1 ? [] : L === 2 ? [aos].filter(Boolean) : [aos, head].filter(Boolean);
      const hidden = parents.some(pid => V.coll.has(pid)), depth = parents.length, lc = V.loc[b.id];
      const n = L <= 2 ? sectionIds(s.blocks, b.id).length - 1 : 0, shut = L <= 2 && V.coll.has(b.id);
      const where = lc ? (names[lc[0] - 1] || 'Page ' + lc[0]) + ', column ' + lc[1] : '';
      return '<li class="sh-o sh-k-' + b.kind + ' ac' + cs[i] + ' d' + depth + (b.id === V.sel ? ' sel' : '') + '" data-id="' + b.id + '" tabindex="0"' + (where ? ' title="' + esc(KIND[b.kind] + ' · ' + where) + '"' : '') + (hidden ? ' hidden' : '') + '>' +
        (L <= 2 ? '<button type="button" class="sh-o-tog" data-otog aria-expanded="' + !shut + '" aria-label="' + (shut ? 'Expand' : 'Collapse') + ' section">' + (shut ? '▸' : '▾') + '</button>' : '') +
        '<span class="sh-grip" title="Drag to move" aria-hidden="true">⋮⋮</span>' + (L > 2 ? '<span class="sh-chip">' + SHORT[b.kind] + '</span>' : '') +
        '<span class="sh-o-t">' + esc(blockLabel(b)) + '</span>' + (n ? '<span class="sh-o-n" title="Blocks in this section">' + n + '</span>' : '') +
        (lc ? '<span class="sh-o-loc' + (lc[0] > V.geom.allowed ? ' over' : '') + '">' + esc((names[lc[0] - 1] || 'p' + lc[0]).replace('Sheet ', 'S').replace(' · front', 'F').replace(' · back', 'B').replace(/^Front$/, 'F').replace(/^Back$/, 'B').replace(/^Page$/, 'P')) + '·' + lc[1] + '</span>' : '') +
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
      $$('.sel, .too-tall, .sh-flash, .dragging', c).forEach(x => x.classList.remove('sel', 'too-tall', 'sh-flash', 'dragging'));
      $$('.sh-empty', c).forEach(x => x.remove());
      return c.outerHTML;
    }).join('');
  }
  function pageCss() { const G = V.geom; return '@page { size: ' + G.pw + 'mm ' + G.ph + 'mm; margin: 0; }'; }
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
  function setSetting(k, v) {
    snap();
    const s = cur();
    s.set = Object.assign({}, settings(s), { [k]: v });
    delete s.set.mono;
    if (k === 'paper' && /a3/.test(v) && s.set.cols < 4 && s.set.orient === 'p') s.set.cols = 4;
    changed({ lib: false, settings: true });
  }
  function wire() {
    const root = V.slot;
    root.addEventListener('click', e => {
      const t = e.target;
      const add = t.closest('[data-add]');
      if (add) {
        const ref = add.dataset.add, have = onSheet().get(ref);
        if (have) removeRef(ref); else { const it = V.byRef[ref]; if (it) place([blockFrom(it)]); }
        return;
      }
      const all = t.closest('[data-addall]');
      if (all) {
        const k = all.dataset.addall, have = onSheet(), its = Object.values(V.byRef).filter(it => it.kind === k && !have.get(it.ref));
        if (k === 'point') { const tt = A.topic(V.src.slice(2)); if (tt) place(topicPack(tt, ['point'])); }
        else place(its.map(blockFrom));
        return;
      }
      const pk = t.closest('[data-pack]'); if (pk) { addPack(pk.dataset.pack); return; }
      const pt = t.closest('[data-pack-topic]'); if (pt) { const tt = A.topic(pt.dataset.packTopic); if (tt) { const bl = topicPack(tt, PACKS.full); if (bl.length && !settings(cur()).auto && !onSheet().get(tt.id + '|head')) bl.unshift(headBlock(tt)); place(bl); } return; }
      const cu = t.closest('[data-custom]'); if (cu) { addCustom(cu.dataset.custom); return; }
      const tab = t.closest('[data-tab]');
      if (tab) { V.tab = tab.dataset.tab; $$('[data-tab]', root).forEach(b => b.setAttribute('aria-selected', b === tab)); $$('.sh-pane', root).forEach(p => { p.hidden = p.dataset.pane !== V.tab; }); return; }
      const zm = t.closest('[data-zoom]'); if (zm) { V.zoom = zm.dataset.zoom; store.set('sheetZoom', V.zoom); scale(); return; }
      const sv = t.closest('[data-setv]'); if (sv) { const k = sv.dataset.setv; setSetting(k, k === 'margin' ? +sv.value : sv.value); return; }
      const st = t.closest('[data-step]'); if (st) { const n = Math.max(1, Math.min(6, settings(cur()).cols + +st.dataset.step)); setSetting('cols', n); return; }
      // editor toggles
      const tmb = t.closest('[data-tm]');
      if (tmb) { editField(b => { const on = titleMode(b, settings(cur())) !== 'off'; b.tm = on ? 'off' : (settings(cur()).titles !== 'off' ? '' : 'line'); if (!b.title) b.title = KIND[b.kind]; }, true); select(V.sel); return; }
      const tmv = t.closest('[data-tmv]'); if (tmv) { editField(b => { if (tmv.dataset.tmv) b.tm = tmv.dataset.tmv; else delete b.tm; }, true); select(V.sel); return; }
      const pb = t.closest('[data-part]');
      if (pb) {
        const k = pb.dataset.part;
        editField(b => { b.hide = Object.assign({}, b.hide); if (b.hide[k]) delete b.hide[k]; else b.hide[k] = true; }, true);
        pb.setAttribute('aria-pressed', pb.getAttribute('aria-pressed') !== 'true'); return;
      }
      const acb = t.closest('[data-ac]'); if (acb) { editField(b => { if (acb.dataset.ac === '') delete b.ac; else b.ac = +acb.dataset.ac; }, true); select(V.sel); return; }
      const fs = t.closest('[data-fs]');
      if (fs) { editField(b => { b.fs = +fs.dataset.fs; }, true); $$('[data-fs]', root).forEach(x => x.setAttribute('aria-pressed', x === fs)); return; }
      const tg = t.closest('[data-otog]');
      if (tg) { const id = tg.closest('[data-id]').dataset.id; if (V.coll.has(id)) V.coll.delete(id); else V.coll.add(id); drawOutline(); const r = $('.sh-o[data-id="' + id + '"]', root); if (r) r.focus(); return; }
      const oc = t.closest('[data-ocoll]');
      if (oc) { V.coll = new Set(oc.dataset.ocoll === '1' ? cur().blocks.filter(b => levelOf(b) <= 2).map(b => b.id) : []); drawOutline(); return; }
      const o = t.closest('[data-o]');
      if (o) { const id = o.closest('[data-id]').dataset.id; if (o.dataset.o === 'up') move(id, -1); else if (o.dataset.o === 'down') move(id, 1); else drop(id); return; }
      const act = t.closest('[data-act]');
      if (act) {
        const a = act.dataset.act, s = cur();
        if (a === 'new') { snap(); const n = blankSheet(V.sid, 'Sheet ' + (sheetsFor(V.sid).length + 1)); n.set = Object.assign({}, settings(s)); ST.list.push(n); ST.cur[V.sid] = n.id; select(null); changed({ bar: true, settings: true }); A.toast('New sheet'); }
        else if (a === 'dup') { snap(); const n = JSON.parse(JSON.stringify(s)); n.id = uid(); n.name = s.name + ' (copy)'; n.blocks.forEach(b => { b.id = uid(); }); ST.list.push(n); ST.cur[V.sid] = n.id; select(null); changed({ bar: true }); A.toast('Duplicated'); }
        else if (a === 'del') {
          if (!act.dataset.armed) { act.dataset.armed = '1'; act.textContent = 'Tap again to delete'; setTimeout(() => { if (act.isConnected) { delete act.dataset.armed; act.textContent = 'Delete'; } }, 3000); return; }
          snap(); ST.list = ST.list.filter(x => x.id !== s.id); const rest = sheetsFor(V.sid); ST.cur[V.sid] = rest[0].id; select(null); changed({ bar: true, settings: true });
        }
        else if (a === 'undo') undo();
        else if (a === 'tidy') tidyIntoTopics();
        else if (a === 'print') doPrint();
        else if (a === 'download') download();
        else if (a === 'done') select(null);
        else if (a === 'up' && V.sel) { move(V.sel, -1); select(V.sel); }
        else if (a === 'down' && V.sel) { move(V.sel, 1); select(V.sel); }
        else if (a === 'drop' && V.sel) drop(V.sel);
        else if (a === 'copy' && V.sel) { const b = s.blocks.find(x => x.id === V.sel); if (b) { const c = JSON.parse(JSON.stringify(b)); c.id = uid(); delete c.ref; delete c.auto; place([c]); select(c.id); } }
        else if (a === 'reset' && V.sel) {
          const b = s.blocks.find(x => x.id === V.sel), it = b && b.ref && findItem(b.ref);
          if (it) { snap(); const fresh = blockFrom(it); Object.keys(b).forEach(k => { if (!['id', 'ref', 'tid', 'from', 'kind'].includes(k)) delete b[k]; }); Object.assign(b, fresh, { id: b.id }); changed({ lib: false }); select(b.id); }
        }
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
      if (t.matches('.sh-e-move')) { moveToPick(t.value); return; }
      if (t.dataset.set) setSetting(t.dataset.set, t.type === 'checkbox' ? t.checked : (t.dataset.set === 'paper' ? t.value : +t.value));
    });
    root.addEventListener('input', e => {
      const t = e.target;
      if (t.matches('.sh-name')) { cur().name = t.value || 'Untitled sheet'; save(); const o = $('.sh-pick option:checked', root); if (o) o.textContent = cur().name; return; }
      if (t.matches('.sh-q')) { clearTimeout(V.qT); V.qT = setTimeout(() => { V.q = t.value.trim(); drawLib(); }, 160); return; }
      if (t.dataset.set === 'font') { t.nextElementSibling.textContent = t.value + ' pt'; t.style.setProperty('--p', (t.value - 5) / 6 * 100 + '%'); return; }
      if (t.matches('.sh-e-f')) { const f = t.dataset.f; editField(b => { b[f] = t.value; }); }
      else if (t.matches('.sh-e-w')) { t.nextElementSibling.textContent = t.value + '%'; t.style.setProperty('--p', (t.value - 25) / 75 * 100 + '%'); editField(b => { b.w = +t.value; }); }
    });
    root.addEventListener('keydown', e => {
      const row = e.target.closest && e.target.closest('.sh-o[data-id]');
      if (row && e.target === row) {
        const id = row.dataset.id, rows = $$('.sh-o[data-id]', root).filter(r => !r.hidden), i = rows.indexOf(row);
        if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); move(id, e.key === 'ArrowUp' ? -1 : 1); const r = $('.sh-o[data-id="' + id + '"]', root); if (r) r.focus(); return; }
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); const r = rows[i + (e.key === 'ArrowUp' ? -1 : 1)]; if (r) r.focus(); return; }
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(id); return; }
        if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); const nx = rows[i + 1] || rows[i - 1]; drop(id); if (nx) { const r = $('.sh-o[data-id="' + nx.dataset.id + '"]', root); if (r) r.focus(); } return; }
      }
      if (e.key === 'Escape' && V.sel) { select(null); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey && !e.target.matches('input, textarea')) { e.preventDefault(); undo(); }
    });
    wireDrag(root);
    if ('ResizeObserver' in window) { V.ro = new ResizeObserver(() => scale()); V.ro.observe($('.sh-view', root)); }
    else window.addEventListener('resize', scale);
  }

  /* ------------------------------------------------------------ drag to reorder (mouse, touch and pen) */
  // Mouse: press and move. Touch: grab the ⋮⋮ handle, or press and hold a block for a moment (so scrolling still works).
  // A floating card follows the pointer, a blue line shows exactly where it will land, and the page (or the list)
  // scrolls when you hold near the edge. Banners and headings carry their whole section and land between sections.
  function wireDrag(root) {
    const SRC = '.sh-pages .sb[data-id], .sh-o[data-id]';
    const line = document.createElement('div'); line.className = 'sh-dropline';
    let d = null, suppress = false;
    root.addEventListener('pointerdown', e => {
      if (d || (e.pointerType === 'mouse' && e.button !== 0)) return;
      const src = e.target.closest(SRC);
      if (!src || e.target.closest('button, input, textarea, select, a')) return;
      const grip = !!e.target.closest('.sh-grip');
      d = { id: src.dataset.id, pid: e.pointerId, x0: e.clientX, y0: e.clientY, cx: e.clientX, cy: e.clientY, touch: e.pointerType !== 'mouse', started: false };
      if (d.touch) { if (grip) begin(); else d.timer = setTimeout(() => { if (d && !d.started) begin(); }, 380); }
    });
    root.addEventListener('contextmenu', e => { if (d && e.target.closest(SRC)) e.preventDefault(); });
    root.addEventListener('click', e => { if (suppress) { e.stopPropagation(); e.preventDefault(); } }, true);
    function begin() {
      clearTimeout(d.timer);
      const s = cur(), b = s.blocks.find(x => x.id === d.id);
      if (!b) { d = null; return; }
      d.started = true; d.ids = sectionIds(s.blocks, d.id); d.set = new Set(d.ids); d.level = levelOf(b);
      d.ghost = document.createElement('div'); d.ghost.className = 'sh-ghost sh-k-' + b.kind + ' ac' + ((V.cs || [])[s.blocks.indexOf(b)] || 0);
      d.ghost.innerHTML = '<span class="sh-chip">' + KIND[b.kind] + '</span><b>' + esc(blockLabel(b)) + '</b>' + (d.ids.length > 1 ? '<em>+ ' + (d.ids.length - 1) + ' block' + (d.ids.length > 2 ? 's' : '') + ' in this section</em>' : '');
      document.body.append(d.ghost, line); line.hidden = true;
      d.ids.forEach(id => $$('[data-id="' + id + '"]', root).forEach(x => x.classList.add('dragging')));
      document.documentElement.classList.add('sh-dragging');
      if (d.touch && navigator.vibrate) { try { navigator.vibrate(10); } catch (err) { /* not allowed */ } }
      placeGhost(); tick();
    }
    function placeGhost() { d.ghost.style.transform = 'translate(' + (d.cx + 14) + 'px, ' + (d.cy + 12) + 'px)'; }
    // edge scrolling: slow near the edge zone's inner border, faster right at the edge
    const speed = (dist, zone) => Math.ceil(Math.pow(Math.min(1, dist / zone), 2) * 18);
    function tick() {
      if (!d || !d.started) return;
      const H = window.innerHeight, top = 70, bottom = window.innerWidth <= 720 ? 150 : 70;
      const list = $('.sh-outline', root), lr = list && list.offsetParent ? list.getBoundingClientRect() : null;
      if (lr && list.scrollHeight > list.clientHeight + 2 && d.cx >= lr.left && d.cx <= lr.right && d.cy > lr.top - 40 && d.cy < lr.bottom + 40 && (d.cy < lr.top + 44 || d.cy > lr.bottom - 44)) {
        list.scrollTop += d.cy < lr.top + 44 ? -speed(lr.top + 44 - d.cy, 84) : speed(d.cy - lr.bottom + 44, 84);
      } else if (d.cy < top) window.scrollBy(0, -speed(top - d.cy, top));
      else if (d.cy > H - bottom) window.scrollBy(0, speed(d.cy - (H - bottom), bottom));
      target();
      d.raf = requestAnimationFrame(tick);
    }
    const rect = el => el.getBoundingClientRect();
    function target() {
      const s = cur(), rest = s.blocks.filter(b => !d.set.has(b.id)), idx = id => rest.findIndex(b => b.id === id);
      const el = document.elementFromPoint(d.cx, d.cy), list = el && el.closest('.sh-outline'), pg = el && el.closest('.sh-pg');
      let at = null, anchor = null;
      if (list && root.contains(list)) {
        const rows = $$('.sh-o[data-id]', list).filter(r => !r.hidden && !d.set.has(r.dataset.id));
        let best = null;
        rows.forEach(r => { const rc = rect(r), m = rc.top + rc.height / 2, dist = Math.abs(d.cy - m); if (!best || dist < best.dist) best = { r, dist, after: d.cy > m }; });
        if (best) {
          const id = best.r.dataset.id;
          at = idx(id);
          if (best.after) { if (V.coll.has(id)) { const sec = sectionIds(rest, id); at = idx(sec[sec.length - 1]); } at++; }
          anchor = { el: best.r, side: best.after ? 'bottom' : 'top' };
        } else at = rest.length;
      } else if (pg && root.contains(pg)) {
        const cols = $$('.sh-col', pg);
        if (cols.length) {
          let col = cols.find(c => { const r = rect(c); return d.cx >= r.left && d.cx <= r.right; });
          if (!col) col = cols.map(c => { const r = rect(c); return { c, dist: Math.min(Math.abs(d.cx - r.left), Math.abs(d.cx - r.right)) }; }).sort((a, b) => a.dist - b.dist)[0].c;
          const kids = $$(':scope > .sb[data-id]', col).filter(k => !d.set.has(k.dataset.id) && !k.classList.contains('sb-brk') && !k.classList.contains('sb-pbrk'));
          const before = kids.find(k => { const r = rect(k); return d.cy < r.top + r.height / 2; });
          if (before) { at = idx(before.dataset.id); anchor = { el: before, side: 'top' }; }
          else if (kids.length) { const last = kids[kids.length - 1]; at = idx(last.dataset.id) + 1; anchor = { el: last, side: 'bottom' }; }
          else {
            const nxt = $$('.sh-pages .sb[data-id]', root).find(k => !d.set.has(k.dataset.id) && (col.compareDocumentPosition(k) & Node.DOCUMENT_POSITION_FOLLOWING));
            at = nxt ? idx(nxt.dataset.id) : rest.length; anchor = { el: col, side: 'start' };
          }
        }
      }
      if (at != null && at < 0) at = rest.length;
      if (at != null && d.level <= 2) {   // whole sections land between sections of the same level
        const B = sectionStarts(rest, d.level), snapAt = B.reduce((a, x) => Math.abs(x - at) < Math.abs(a - at) ? x : a, B[0]);
        if (snapAt !== at) { at = snapAt; anchor = null; }
      }
      d.at = at;
      drawLine(rest, anchor, list ? 'list' : 'page');
    }
    function drawLine(rest, anchor, ctx) {
      if (d.at == null) { line.hidden = true; return; }
      if (!anchor) {   // find the block on screen that sits at that index
        const sel = ctx === 'list' ? '.sh-o[data-id="' : '.sh-pages .sb[data-id="';
        const vis = id => { const x = $(sel + id + '"]', root); return x && !x.hidden && x.offsetParent ? x : null; };
        const nx = d.at < rest.length && vis(rest[d.at].id);
        if (nx) anchor = { el: nx, side: 'top' };
        else for (let k = d.at - 1; k >= 0; k--) { const x = vis(rest[k].id); if (x) { anchor = { el: x, side: 'bottom' }; break; } }
      }
      if (!anchor) { line.hidden = true; return; }
      const r = rect(anchor.el), y = anchor.side === 'top' ? r.top - 2.5 : anchor.side === 'bottom' ? r.bottom + 1.5 : r.top + 1;
      line.hidden = false;
      line.style.left = (r.left - 3) + 'px'; line.style.width = (r.width + 6) + 'px'; line.style.top = (y - 1.5) + 'px';
    }
    function finish(commit) {
      if (!d) return;
      clearTimeout(d.timer); cancelAnimationFrame(d.raf);
      const was = d.started, ids = d.ids, at = d.at;
      if (d.ghost) d.ghost.remove();
      line.remove();
      $$('.dragging', root).forEach(x => x.classList.remove('dragging'));
      document.documentElement.classList.remove('sh-dragging');
      d = null;
      if (!was) return;
      suppress = true; setTimeout(() => { suppress = false; }, 0);
      if (commit && at != null && !moveSet(ids, at)) A.toast('Same spot: nothing moved');
    }
    V.drag = {
      move(e) {
        if (!d || e.pointerId !== d.pid) return;
        d.cx = e.clientX; d.cy = e.clientY;
        if (!d.started) {
          const far = Math.hypot(d.cx - d.x0, d.cy - d.y0);
          if (d.touch) { if (far > 9) { clearTimeout(d.timer); d = null; } return; }   // moved before the hold: that's a scroll
          if (far < 6) return;
          begin();
        }
        e.preventDefault(); placeGhost();
      },
      up(e, ok) { if (d && e.pointerId === d.pid) finish(ok); },
      active: () => !!(d && d.started),
      esc() { if (d && d.started) finish(false); }
    };
  }
  window.addEventListener('pointermove', e => { if (V && V.drag) V.drag.move(e); }, { passive: false });
  window.addEventListener('pointerup', e => { if (V && V.drag) V.drag.up(e, true); });
  window.addEventListener('pointercancel', e => { if (V && V.drag) V.drag.up(e, false); });
  document.addEventListener('touchmove', e => { if (V && V.drag && V.drag.active()) e.preventDefault(); }, { passive: false });
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && V && V.drag) V.drag.esc(); });

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
