/* Keynote engine: scenes with numbered steps.
   - [data-in="n"]  element appears at step n (with data-fx effect)
   - [data-out="n"] element leaves at step n
   - scene gets classes s1..sN for cumulative CSS choreography
   - per-scene handlers in H[sceneId] for interactive/JS-driven scenes */
(() => {
  const deck = document.getElementById('deck');
  const scenes = [...deck.querySelectorAll('.scene')];
  const $ = (q, r = document) => r.querySelector(q);
  const $$ = (q, r = document) => [...r.querySelectorAll(q)];
  const progress = $('#progress'), stepsBar = $('#steps'), counter = $('#counter'), modname = $('#modname'), clock = $('#clock');
  const notesPanel = $('#notes-panel'), overview = $('#overview'), help = $('#help'), flashEl = $('#flash');
  const chan = 'BroadcastChannel' in window ? new BroadcastChannel('claude-talk') : null;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const H = {};

  /* ---------- color grading ---------- */
  const PALETTE = {
    '00': ['#ff7a59', '#ffb86b'], '01': ['#a78bfa', '#f472b6'], '02': ['#2dd4bf', '#60a5fa'], '☕': ['#fbbf24', '#ff7a59'],
    '03': ['#60a5fa', '#a78bfa'], '04': ['#4ade80', '#2dd4bf'], '05': ['#f472b6', '#a78bfa'], '06': ['#fb923c', '#fb7185'],
    '07': ['#ff7a59', '#a78bfa'], try: ['#fbbf24', '#fb923c'],
  };
  const modKey = m => (m || '').split(' ')[0];
  const colorsOf = s => s.classList.contains('try') ? PALETTE.try : (PALETTE[modKey(s.dataset.module)] || PALETTE['00']);
  let netColor = PALETTE['00'][0];
  scenes.forEach(s => { const [a, b] = colorsOf(s); s.style.setProperty('--sa', a); s.style.setProperty('--sa2', b); });

  /* ---------- scale ---------- */
  const fit = () => { deck.style.transform = `scale(${Math.min(innerWidth / 1600, innerHeight / 900)})`; };
  addEventListener('resize', fit); fit();

  /* ---------- steps ---------- */
  scenes.forEach(s => {
    let max = 0;
    $$('[data-in],[data-out],[data-k]', s).forEach(e => { max = Math.max(max, +(e.dataset.in || 0), +(e.dataset.out || 0), +(e.dataset.k || 0)); });
    s._steps = s.dataset.steps ? +s.dataset.steps : max;
  });

  let idx = 0, step = 0, sessionStart = null;

  function render(s, st, dir) {
    s.dataset.step = st;
    for (let k = 1; k <= Math.max(s._steps, 12); k++) s.classList.toggle('s' + k, k <= st);
    let slam = false;
    $$('[data-in]', s).forEach(e => {
      const i = +e.dataset.in, o = e.dataset.out !== undefined ? +e.dataset.out : Infinity;
      const on = st >= i && st < o, was = e.classList.contains('on');
      e.classList.toggle('on', on);
      e.classList.toggle('gone', st >= o);
      e.classList.toggle('cur', on && i === st && st > 0);
      if (on && !was) {
        if (e.dataset.fx === 'slam' && dir > 0) slam = true;
        [e, ...$$('[data-count]', e)].filter(x => x.dataset.count).forEach(countUp);
      }
    });
    $$('[data-k]', s).forEach(e => { const k = +e.dataset.k; e.classList.toggle('cur', st === k); e.classList.toggle('done', st > k); });
    H[s.id]?.render?.(s, st, dir);
    paintSteps(s, st);
  }
  function resetScene(s) {
    s.classList.add('reset');
    $$('[data-in]', s).forEach(e => e.classList.remove('on', 'gone', 'cur'));
    for (let k = 1; k <= 14; k++) s.classList.remove('s' + k);
    void s.offsetWidth;
    s.classList.remove('reset');
  }
  function flash() { flashEl.classList.remove('go'); void flashEl.offsetWidth; flashEl.classList.add('go'); }
  function countUp(e) {
    const to = +e.dataset.count, suf = e.dataset.suf || '', pre = e.dataset.pre || '', dec = +(e.dataset.dec || 0), t0 = performance.now(), dur = 1400;
    const tick = now => {
      const p = Math.min(1, (now - t0) / dur), v = to * (1 - Math.pow(1 - p, 3));
      e.textContent = pre + (dec ? v.toFixed(dec) : Math.round(v).toLocaleString()) + suf;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- navigation ---------- */
  function go(n, st = 0, dir = 1) {
    n = Math.max(0, Math.min(scenes.length - 1, n));
    const prevIdx = idx, s = scenes[n];
    const entering = prevIdx !== n || !s._seen;
    idx = n; step = Math.max(0, Math.min(st, s._steps));
    scenes.forEach((x, i) => { x.classList.toggle('active', i === idx); x.classList.toggle('past', i < idx); });
    if (entering) {
      if (prevIdx !== n) H[scenes[prevIdx].id]?.leave?.(scenes[prevIdx]);
      s._seen = true; resetScene(s); H[s.id]?.enter?.(s);
      $$('[data-type]', s).forEach(typeHTML);
      requestAnimationFrame(() => requestAnimationFrame(() => { if (idx === n) render(s, step, dir); }));
    } else render(s, step, dir);
    grade(s); update();
  }
  function next() {
    const s = scenes[idx];
    if (step < s._steps) { step++; render(s, step, 1); update(); }
    else if (idx < scenes.length - 1) go(idx + 1, 0, 1);
  }
  function prev() {
    const s = scenes[idx];
    if (step > 0) { step--; render(s, step, -1); update(); }
    else if (idx > 0) go(idx - 1, scenes[idx - 1]._steps, -1);
  }
  function grade(s) {
    const [a, b] = colorsOf(s);
    document.body.style.setProperty('--m', a); document.body.style.setProperty('--m2', b);
    netColor = a;
    document.body.dataset.net = s.dataset.net || 'lo';
  }
  const titleOf = s => (s.dataset.title || $('h1, h2, .big, .huge', s)?.textContent || 'Scene').trim().replace(/\s+/g, ' ');
  function paintSteps(s, st) {
    stepsBar.innerHTML = s._steps ? Array.from({ length: s._steps + 1 }, (_, i) => `<i class="${i <= st ? 'on' : ''}"></i>`).join('') : '';
  }
  function update() {
    const s = scenes[idx];
    progress.style.width = `${((idx + 1) / scenes.length) * 100}%`;
    counter.textContent = `${idx + 1} / ${scenes.length}`;
    modname.textContent = s.dataset.module || '';
    history.replaceState(null, '', `#/${idx + 1}`);
    const notes = $('.notes', s);
    $('.body', notesPanel).innerHTML = notes ? notes.innerHTML : '<p>No notes.</p>';
    $('.ttl', notesPanel).textContent = titleOf(s);
    $$('button', overview).forEach(b => b.classList.toggle('cur', +b.dataset.i === idx));
    chan?.postMessage({ type: 'state', idx, frag: step, total: scenes.length, steps: s._steps });
    if (!sessionStart && idx > 0) sessionStart = Date.now();
  }

  /* ---------- kinetic words ---------- */
  function splitWords(el, c) {
    [...el.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const f = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(p => {
          if (!p) return;
          if (/^\s+$/.test(p)) { f.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span'); w.className = 'w';
          const i = document.createElement('span'); i.textContent = p; i.style.setProperty('--wi', c.n++);
          if (n.parentElement.closest('.grad')) i.className = 'grad';
          w.appendChild(i); f.appendChild(w);
        });
        n.replaceWith(f);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') {
        if (n.classList.contains('grad')) { n.classList.remove('grad'); n.classList.add('was-grad'); splitInto(n, c, true); }
        else splitWords(n, c);
      }
    });
  }
  function splitInto(n, c) { // words inside a gradient span keep the gradient per word
    [...n.childNodes].forEach(t => {
      if (t.nodeType !== 3) return;
      const f = document.createDocumentFragment();
      t.textContent.split(/(\s+)/).forEach(p => {
        if (!p) return;
        if (/^\s+$/.test(p)) { f.appendChild(document.createTextNode(' ')); return; }
        const w = document.createElement('span'); w.className = 'w';
        const i = document.createElement('span'); i.textContent = p; i.className = 'grad'; i.style.setProperty('--wi', c.n++);
        w.appendChild(i); f.appendChild(w);
      });
      t.replaceWith(f);
    });
  }
  $$('.kin').forEach(el => splitWords(el, { n: 0 }));

  /* ---------- helpers ---------- */
  function typeText(el, speed = 42) {
    clearTimeout(el._t);
    const txt = el.dataset.text || '';
    el.textContent = ''; el.classList.add('typing');
    let i = 0;
    const tick = () => { el.textContent = txt.slice(0, ++i); if (i < txt.length) el._t = setTimeout(tick, speed + Math.random() * 40); };
    el._t = setTimeout(tick, 700);
  }
  const toast = msg => { const t = $('.toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 1400); };

  /* HTML-aware typing for terminals: <pre data-type="speed"> */
  function typeHTML(pre) {
    if (!pre.dataset.src) pre.dataset.src = pre.innerHTML;
    clearTimeout(pre._t);
    const parts = pre.dataset.src.match(/<[^>]+>|&[a-z#0-9]+;|[\s\S]/g) || [];
    const speed = +pre.dataset.type || 16;
    let i = 0, out = '';
    pre.innerHTML = ''; pre.classList.add('cursor');
    const step = () => {
      let n = 0;
      while (i < parts.length && n < 2) { out += parts[i]; if (!parts[i].startsWith('<')) n++; i++; }
      pre.innerHTML = out;
      if (i < parts.length) pre._t = setTimeout(step, parts[i - 1] === '\n' ? speed * 14 : speed);
      else pre.classList.remove('cursor');
    };
    pre._t = setTimeout(step, 650);
  }

  /* Wires: <svg class="wires" data-hub="x,y"> connects every .node[data-wire] in the scene */
  function buildWires() {
    $$('svg.wires').forEach(svg => {
      const s = svg.closest('.scene'), [hx, hy] = svg.dataset.hub.split(',').map(Number);
      svg.setAttribute('viewBox', '0 0 1600 900');
      $$('.node[data-wire]', s).forEach((n, i) => {
        const x = parseFloat(n.style.left), y = parseFloat(n.style.top);
        const mx = (x + hx) / 2 + (y - hy) * .12, my = (y + hy) / 2 - (x - hx) * .12;
        const d = `M ${x} ${y} Q ${mx} ${my} ${hx} ${hy}`;
        const custom = n.classList.contains('dashed') ? ' custom' : '';
        svg.insertAdjacentHTML('beforeend',
          `<path class="wire${custom}" pathLength="1" d="${d}" style="--d:${(i * .09).toFixed(2)}s"/>` +
          `<path class="pulse${custom}" pathLength="1" d="${d}" style="--d:${(-i * .37).toFixed(2)}s"/>`);
      });
    });
  }

  /* QR codes (needs qrcodejs; skipped when offline) */
  function buildQR() {
    if (!window.QRCode) return;
    $$('.qr[data-url]').forEach(el => {
      const size = +(el.dataset.size || 170);
      new window.QRCode(el, { text: el.dataset.url, width: size, height: size, colorDark: '#0b0a10', colorLight: '#ffffff', correctLevel: window.QRCode.CorrectLevel.M });
    });
  }

  /* PERMISSIONS: interactive mode slider */
  H.perms = {
    modes: [
      { d: 'Asks before every edit and every command.', u: 'unfamiliar repo · shared data · learning', r: 8, c: '#4ade80' },
      { d: 'Edits files freely. Asks before commands.', u: 'you are watching the diff live', r: 35, c: '#60a5fa' },
      { d: 'Read-only. Researches, then proposes a plan.', u: 'anything bigger than one file', r: 3, c: '#a78bfa' },
      { d: 'A safety classifier reviews every action.', u: 'most day-to-day work · the default', r: 45, c: '#fbbf24' },
      { d: 'No checks at all.', u: 'only inside a throwaway container', r: 100, c: '#fb7185' },
    ],
    init(s) { $$('.pstop', s).forEach((b, i) => b.addEventListener('click', e => { e.stopPropagation(); this.set(s, i); })); },
    render(s, st) {
      if (st >= 1) this.set(s, Math.min(st, 5) - 1);
      else { delete s.dataset.mode; $$('.pstop', s).forEach(b => b.classList.toggle('sel', false)); $('.pdesc', s).classList.add('swap'); }
    },
    set(s, i) {
      const m = this.modes[i], k = $('.knob', s), d = $('.pdesc', s);
      s.dataset.mode = i; k.style.setProperty('--pos', i); k.style.setProperty('--kc', m.c);
      $$('.pstop', s).forEach((b, j) => b.classList.toggle('sel', j === i));
      d.classList.add('swap');
      clearTimeout(this._t);
      this._t = setTimeout(() => {
        $('p', d).textContent = m.d; $('.use', d).textContent = 'use when: ' + m.u;
        $('.risk i', d).style.setProperty('--r', m.r + '%'); d.classList.toggle('swap', false);
      }, 200);
    },
  };

  /* EXCEL: generate a small sheet */
  H.xl = {
    init(s) {
      const g = $('.sheet', s), rows = [['', 'T (K)', 'κ', 'σ'], ['1', '300', '1.42', '0.03'], ['2', '320', '1.37', '0.02'], ['3', '340', '1.31', '0.04'], ['4', '360', '1.24', '0.03'], ['5', '380', '1.18', '0.05']];
      let k = 0;
      rows.forEach((r, i) => r.forEach((v, j) => {
        const c = document.createElement('div'); c.textContent = v;
        if (i === 0 || j === 0) c.className = 'hd'; else { c.className = 'v'; c.style.setProperty('--k', k++); }
        g.appendChild(c);
      }));
    },
  };

  /* =================================================================
     Scene handlers
     ================================================================= */

  /* OPEN: question → chat box → burst into an orbit of capabilities */
  H.open = {
    labels: [['Skills', '#4ade80'], ['Connectors', '#fbbf24'], ['Plugins', '#ff7a59'], ['Hooks', '#fb7185'], ['Subagents', '#a78bfa'], ['Memory', '#2dd4bf'],
      ['Projects', '#60a5fa'], ['Artifacts', '#f472b6'], ['Claude Code', '#60a5fa'], ['Workflows', '#a78bfa'], ['MCP', '#fbbf24'], ['API', '#f472b6'],
      ['Chrome', '#4ade80'], ['Excel', '#4ade80'], ['Scheduled tasks', '#2dd4bf'], ['Remote Control', '#ff7a59']],
    init(s) {
      const o = $('.orbit', s);
      this.pills = this.labels.map(([t, c]) => { const p = document.createElement('div'); p.className = 'pill'; p.textContent = t; p.style.setProperty('--c', c); p.style.opacity = 0; o.appendChild(p); return p; });
    },
    enter(s) { typeText($('.typed', s)); this.t0 = null; this.place(0); },
    leave() { this.t0 = null; },
    render(s, st) {
      if (st >= 3 && !this.t0) { this.t0 = performance.now(); this.loop(s); }
      if (st < 3) { this.t0 = null; this.place(0); }
      this.dim = st >= 4;
    },
    place(p, t = 0) {
      const N = this.pills.length;
      this.pills.forEach((el, i) => {
        const pi = Math.max(0, Math.min(1, (p * 1.35) - i * .02));
        const e = pi === 0 ? 0 : 1 + 2.2 * Math.pow(pi - 1, 3) + 1.2 * Math.pow(pi - 1, 2); // ease-out-back
        const a = (i / N) * Math.PI * 2 + t * .00011;
        const z = Math.sin(a), x = Math.cos(a) * 660 * e, y = z * 300 * e - 20 * e;
        const sc = (.7 + .38 * (z + 1) / 2) * Math.min(1, pi * 2.5);
        el.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px) scale(${sc})`;
        el.style.opacity = pi === 0 ? 0 : ((.35 + .65 * (z + 1) / 2) * (this.dim ? .75 : 1));
        el.style.zIndex = z > 0 ? 3 : 1;
      });
    },
    loop(s) {
      if (!this.t0 || !s.classList.contains('active')) return;
      const now = performance.now(), p = Math.min(1, (now - this.t0) / 1400);
      this.place(p, now);
      requestAnimationFrame(() => this.loop(s));
    },
  };

  /* MODELS: interactive task → model picker */
  H.models = {
    order: ['haiku', 'sonnet', 'opus', 'fable'],
    why: {
      haiku: 'Fast and cheap. 5,000 abstracts for well under a dollar.',
      sonnet: 'The daily driver: writing, analysis, most coding.',
      opus: 'Long agentic work across many files. 1M-token context.',
      fable: 'The hardest reasoning: proofs, research design, deep bugs.',
    },
    init(s) { $$('.task', s).forEach(b => b.addEventListener('click', e => { e.stopPropagation(); this.pick(s, b.dataset.k); })); },
    render(s, st) { if (st >= 1 && st <= 4) this.pick(s, this.order[st - 1]); if (st === 0) this.clear(s); },
    clear(s) { delete s.dataset.pick; $$('.sel', s).forEach(x => x.classList.remove('sel')); $('.why', s).textContent = ''; },
    pick(s, k) {
      if (s.dataset.pick === k) return;
      s.dataset.pick = k;
      $$('.morb, .task', s).forEach(x => x.classList.toggle('sel', x.dataset.k === k));
      const w = $('.why', s); w.classList.add('swap');
      setTimeout(() => { w.textContent = this.why[k]; w.classList.remove('swap'); }, 220);
    },
  };

  /* EFFORT: thinking dots grow with the dial */
  H.effort = {
    init(s) { const d = $('.dots', s); for (let k = 0; k < 28; k++) { const i = document.createElement('i'); i.style.setProperty('--k', k); d.appendChild(i); } },
    render(s, st) { $$('.dots i', s).forEach((i, k) => i.classList.toggle('on', k < st * 7)); },
  };

  /* QUIZ: skill / connector / plugin */
  H.quiz = {
    bins: { skill: [360, 755], connector: [800, 755], plugin: [1240, 755] },
    render(s, st) {
      const cards = $$('.qcard', s), counts = { skill: 0, connector: 0, plugin: 0 };
      cards.forEach((c, i) => {
        const r = i + 1, a = c.dataset.a;
        c.classList.toggle('show', st === 2 * r - 1 || st === 2 * r);
        c.classList.toggle('reveal', st === 2 * r);
        const binned = st > 2 * r;
        if (binned) {
          counts[a]++;
          const [bx, by] = this.bins[a];
          c.style.transform = `translate(${bx - 800}px, ${by - 410}px) scale(.12)`; c.style.opacity = 0;
        } else { c.style.transform = ''; c.style.opacity = ''; }
      });
      $$('.bin', s).forEach(b => {
        const k = b.dataset.k, n = counts[k];
        $('.cnt', b).textContent = n || '';
        const mini = $('.mini', b);
        while (mini.children.length < n) mini.appendChild(document.createElement('i'));
        while (mini.children.length > n) mini.lastChild.remove();
        const justHit = cards.some((c, i) => c.dataset.a === k && st === 2 * (i + 1) + 1);
        b.classList.toggle('hit', justHit);
      });
    },
  };

  /* FAN: progressive disclosure of skills */
  H.fan = {
    names: ['lab-figures', 'run-experiment', 'cite-check', 'slurm-submit', 'grant-budget', 'thesis-style', 'stats-review', 'notation', 'paper-critique', 'data-clean',
      'paper-litnote', 'poster', 'related-work', 'reviewer-reply', 'abstract-tagger', 'lab-onboarding', 'plot-check', 'latex-fix', 'figure-caption', 'meeting-notes', 'protocol-qa'],
    colors: ['#4ade80', '#2dd4bf', '#60a5fa', '#a78bfa', '#f472b6', '#fbbf24', '#ff7a59'],
    init(s) {
      const fan = $('.fan', s), N = this.names.length;
      this.cards = this.names.map((n, i) => {
        const c = document.createElement('div'); c.className = 'fc'; c.textContent = n;
        c.style.setProperty('--c', this.colors[i % this.colors.length]);
        c.dataset.rot = (-42 + (84 * i) / (N - 1)).toFixed(2);
        fan.appendChild(c); return c;
      });
      this.pick = this.cards[10]; this.pick.classList.add('pick');
    },
    render(s, st) {
      this.cards.forEach((c, i) => {
        const rot = +c.dataset.rot;
        if (c === this.pick && st >= 2) {
          c.style.transform = `translateY(-190px) rotate(0deg) scale(1.15)`;
          c.style.opacity = st >= 3 ? 0 : 1;
        } else {
          c.style.transform = st >= 0 ? `rotate(${rot}deg)` : '';
          c.style.opacity = st >= 3 ? .35 : 1;
        }
      });
    },
  };

  /* TRY-IT ring timers */
  function setupRings() {
    $$('.ring[data-min]').forEach(r => {
      const total = +r.dataset.min * 60; let left = total, h = null;
      const f = $('.rf', r), v = $('.rv b', r), lab = $('.rv span', r);
      const fmt = x => `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`;
      const paint = () => { v.textContent = fmt(left); f.style.strokeDashoffset = 100 * (1 - left / total); };
      r._toggle = () => {
        if (h) { clearInterval(h); h = null; lab.textContent = 'paused · click'; return; }
        if (left <= 0) { left = total; r.classList.remove('done'); }
        lab.textContent = 'running';
        h = setInterval(() => { left--; paint(); if (left <= 0) { clearInterval(h); h = null; r.classList.add('done'); lab.textContent = 'time!'; } }, 1000);
      };
      r.addEventListener('click', e => { e.stopPropagation(); r._toggle(); });
      paint();
    });
  }
  function setupCopy() {
    $$('.prompt').forEach(el => {
      const b = document.createElement('button'); b.className = 'copy-btn'; b.textContent = 'copy';
      b.onclick = e => { e.stopPropagation(); const c = el.cloneNode(true); $$('.copy-btn', c).forEach(x => x.remove());
        navigator.clipboard?.writeText(c.textContent.trim()).then(() => toast('Copied'), () => toast('Copy failed')); };
      el.appendChild(b);
    });
  }

  /* ---------- overview ---------- */
  function buildOverview() {
    const g = $('.grid', overview); let last = null;
    scenes.forEach((s, i) => {
      const c = colorsOf(s)[0];
      if (s.dataset.module !== last) { last = s.dataset.module; const m = document.createElement('div'); m.className = 'mod'; m.textContent = last; m.style.setProperty('--c', c); g.appendChild(m); }
      const b = document.createElement('button'); b.dataset.i = i; b.style.setProperty('--c', c);
      b.innerHTML = `<small>${i + 1}${s.classList.contains('try') ? ' · TRY IT' : ''}</small>${titleOf(s)}`;
      b.onclick = () => { go(i); overview.classList.remove('open'); };
      g.appendChild(b);
    });
  }

  /* ---------- network canvas ---------- */
  function startNet() {
    const cv = $('#net'), ctx = cv.getContext('2d');
    let W, H2, nodes = []; const mouse = { x: -1e4, y: -1e4 };
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H2 = innerHeight;
      cv.width = W * dpr; cv.height = H2 * dpr; cv.style.width = W + 'px'; cv.style.height = H2 + 'px'; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      nodes = Array.from({ length: Math.min(95, Math.round(W * H2 / 20000)) }, () => ({ x: Math.random() * W, y: Math.random() * H2, vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35, r: Math.random() * 1.6 + .6 }));
    };
    resize(); addEventListener('resize', resize); addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
    const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(',');
    const frame = () => {
      requestAnimationFrame(frame);
      if (document.body.classList.contains('lite') || document.hidden) return;
      ctx.clearRect(0, 0, W, H2); const rgb = hex(netColor);
      for (const p of nodes) {
        if (!reduced) { p.x += p.vx; p.y += p.vy; }
        if (p.x < -20) p.x = W + 20; if (p.x > W + 20) p.x = -20; if (p.y < -20) p.y = H2 + 20; if (p.y > H2 + 20) p.y = -20;
        const dm = Math.hypot(p.x - mouse.x, p.y - mouse.y); if (dm < 180) { p.x += (p.x - mouse.x) / dm * .6; p.y += (p.y - mouse.y) / dm * .6; }
      }
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) { const b = nodes[j], d = Math.hypot(a.x - b.x, a.y - b.y); if (d < 150) { ctx.strokeStyle = `rgba(${rgb},${(1 - d / 150) * .38})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); } }
        ctx.fillStyle = `rgba(${rgb},.85)`; ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill();
      }
    };
    frame();
  }

  /* ---------- input ---------- */
  const toggle = (el, f) => el.classList.toggle('open', f);
  document.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (help.classList.contains('open') && k !== '?') { toggle(help, false); return; }
    if (overview.classList.contains('open') && k === 'Escape') { toggle(overview, false); return; }
    if (['ArrowRight', ' ', 'PageDown', 'Enter'].includes(k)) { e.preventDefault(); next(); }
    else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); prev(); }
    else if (k === 'ArrowDown') { e.preventDefault(); go(idx + 1, 0); }
    else if (k === 'ArrowUp') { e.preventDefault(); go(idx - 1, 0, -1); }
    else if (k === 'Home') go(0); else if (k === 'End') go(scenes.length - 1);
    else if (/^[oO]$/.test(k) || k === 'Escape') toggle(overview);
    else if (/^[nN]$/.test(k)) toggle(notesPanel);
    else if (/^[pP]$/.test(k)) window.open('presenter.html?deck=' + encodeURIComponent(location.pathname.split('/').pop() || 'index.html'), 'claude-talk-presenter', 'width=1100,height=760');
    else if (/^[fF]$/.test(k)) document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    else if (/^[hH]$/.test(k)) document.body.classList.toggle('hide-hud');
    else if (/^[lL]$/.test(k)) { const on = document.body.classList.toggle('lite'); try { localStorage.setItem('kn-lite', on ? 1 : 0); } catch (_) {} toast(on ? 'Lite mode on' : 'Full effects on'); }
    else if (/^[sS]$/.test(k)) $('.ring', scenes[idx])?._toggle();
    else if (k === '?') toggle(help);
  });
  try { if (localStorage.getItem('kn-lite') === '1') document.body.classList.add('lite'); } catch (_) {}
  deck.addEventListener('click', e => {
    if (e.target.closest('a, button, .prompt, .ring, .task, input')) return;
    e.clientX > innerWidth * .25 ? next() : prev();
  });
  let tx = null;
  addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  addEventListener('touchend', e => { if (tx === null) return; const dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 50) dx < 0 ? next() : prev(); tx = null; });
  $('#btn-overview').onclick = () => toggle(overview);
  $('#btn-notes').onclick = () => toggle(notesPanel);
  $('#btn-help').onclick = () => toggle(help);
  if (chan) chan.onmessage = ({ data }) => { if (data.type === 'cmd') ({ next, prev })[data.cmd]?.(); if (data.type === 'hello') update(); };
  setInterval(() => {
    if (!sessionStart) return;
    const m = Math.floor((Date.now() - sessionStart) / 60000);
    clock.textContent = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  }, 5000);

  /* ---------- boot ---------- */
  buildWires(); buildQR();
  scenes.forEach(s => H[s.id]?.init?.(s));
  setupRings(); setupCopy(); buildOverview(); startNet();
  const m = location.hash.match(/#\/(\d+)(?:\.(\d+))?/);
  go(m ? +m[1] - 1 : 0, m && m[2] ? +m[2] : 0);
})();
