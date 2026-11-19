/* Dependency-free slide engine: fragments, per-module color grading,
   staggered entrances, word reveals, overview, notes, presenter sync,
   exercise timers, copy buttons and an ambient network canvas. */
(() => {
  const deck = document.getElementById('deck');
  const slides = [...deck.querySelectorAll('.slide')];
  const progress = document.getElementById('progress');
  const counter = document.getElementById('counter');
  const modname = document.getElementById('modname');
  const clock = document.getElementById('clock');
  const notesPanel = document.getElementById('notes-panel');
  const overview = document.getElementById('overview');
  const help = document.getElementById('help');
  const chan = 'BroadcastChannel' in window ? new BroadcastChannel('claude-talk') : null;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- color grading: one palette per module ---------- */
  const PALETTE = {
    '00': ['#ff7a59', '#ffb86b'],   // Opening — coral / amber
    '01': ['#a78bfa', '#f472b6'],   // Mental model — violet / pink
    '02': ['#2dd4bf', '#60a5fa'],   // Apps for research — teal / sky
    '☕': ['#fbbf24', '#ff7a59'],   // Break — amber
    '03': ['#60a5fa', '#a78bfa'],   // Claude Code — blue / violet
    '04': ['#4ade80', '#2dd4bf'],   // Chrome & Office — green / teal
    '05': ['#f472b6', '#a78bfa'],   // API & SDK — pink / violet
    '06': ['#fb923c', '#fb7185'],   // Integrity — orange / rose
    '07': ['#ff7a59', '#a78bfa'],   // Capstone — coral / violet
    try:  ['#fbbf24', '#fb923c'],   // every hands-on slide — amber
  };
  const modKey = m => (m || '').split(' ')[0];
  const colorsOf = s => s.classList.contains('try') ? PALETTE.try : (PALETTE[modKey(s.dataset.module)] || PALETTE['00']);
  slides.forEach(s => { const [a, b] = colorsOf(s); s.style.setProperty('--sa', a); s.style.setProperty('--sa2', b); });
  let netColor = PALETTE['00'][0];

  let idx = 0;
  let sessionStart = null;

  /* ---------- scaling ---------- */
  function fit() {
    const s = Math.min(window.innerWidth / 1600, window.innerHeight / 900);
    deck.style.transform = `scale(${s})`;
  }
  window.addEventListener('resize', fit); fit();

  /* ---------- staggered entrances ---------- */
  const GROUPS = '.cols, .stack, .flow, .timeline, .agenda, ul.clean';
  function stagger(s) {
    let i = 0;
    const mark = el => {
      if (el.matches('.notes, .timer, .f, script, h1, h2, .num')) return;
      if (el.matches(GROUPS)) { [...el.children].forEach(mark); return; }
      el.dataset.anim = ''; el.style.setProperty('--i', i++);
    };
    [...s.children].forEach(mark);
  }

  /* ---------- word-by-word headline split ---------- */
  function splitWords(el, c) {
    [...el.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(p => {
          if (!p) return;
          if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span'); w.className = 'w';
          const inner = document.createElement('span'); inner.textContent = p;
          inner.style.setProperty('--wi', c.n++);
          if (n.parentElement.closest('.accent, .hl')) inner.className = 'grad';
          w.appendChild(inner); frag.appendChild(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) {
        if (n.matches('.tag, code, kbd, br')) {
          if (n.tagName === 'BR') return;
          const w = document.createElement('span'); w.className = 'w';
          const inner = document.createElement('span'); inner.style.setProperty('--wi', c.n++);
          n.replaceWith(w); inner.appendChild(n); w.appendChild(inner);
        } else {
          if (n.matches('.accent, .hl')) n.classList.add('split');
          splitWords(n, c);
        }
      }
    });
  }

  /* ---------- fragments ---------- */
  const frags = s => [...s.querySelectorAll('.f')];
  const fragState = s => frags(s).filter(f => f.classList.contains('in')).length;
  const setFrags = (s, n) => frags(s).forEach((f, i) => f.classList.toggle('in', i < n));

  /* ---------- navigation ---------- */
  function go(n, fragMode = 'none') {
    n = Math.max(0, Math.min(slides.length - 1, n));
    const prevSlide = slides[idx];
    idx = n;
    slides.forEach((s, i) => {
      s.classList.toggle('active', i === idx);
      s.classList.toggle('past', i < idx);
    });
    const s = slides[idx];
    if (fragMode === 'all') setFrags(s, frags(s).length);
    else if (fragMode === 'none') setFrags(s, 0);
    if (prevSlide !== s || !s.dataset.seen) { runTyping(s); s.dataset.seen = '1'; }
    grade(s);
    update();
  }
  function grade(s) {
    const [a, b] = colorsOf(s);
    document.body.style.setProperty('--m', a);
    document.body.style.setProperty('--m2', b);
    netColor = a;
    const hi = s.classList.contains('title') || s.classList.contains('section') || s.id === 'brk';
    document.body.dataset.net = hi ? 'hi' : 'lo';
  }
  function next() {
    const s = slides[idx], fs = frags(s), k = fragState(s);
    if (k < fs.length) { fs[k].classList.add('in'); update(); return; }
    if (idx < slides.length - 1) go(idx + 1, 'none');
  }
  function prev() {
    const s = slides[idx], k = fragState(s);
    if (k > 0) { frags(s)[k - 1].classList.remove('in'); update(); return; }
    if (idx > 0) go(idx - 1, 'all');
  }

  function update() {
    const s = slides[idx];
    progress.style.width = `${((idx + 1) / slides.length) * 100}%`;
    counter.textContent = `${idx + 1} / ${slides.length}`;
    modname.textContent = s.dataset.module || '';
    history.replaceState(null, '', `#/${idx + 1}`);
    const notes = s.querySelector('.notes');
    notesPanel.querySelector('.body').innerHTML = notes ? notes.innerHTML : '<p class="muted">No notes for this slide.</p>';
    notesPanel.querySelector('.ttl').textContent = titleOf(s);
    overview.querySelectorAll('button').forEach(b => b.classList.toggle('cur', +b.dataset.i === idx));
    if (chan) chan.postMessage({ type: 'state', idx, frag: fragState(s), total: slides.length });
    if (!sessionStart && idx > 0) sessionStart = Date.now();
  }

  function titleOf(s) {
    const h = s.querySelector('h1, h2');
    return (h ? h.textContent : s.dataset.title || 'Slide').trim().replace(/\s+/g, ' ');
  }

  /* ---------- overview ---------- */
  function buildOverview() {
    const g = overview.querySelector('.grid');
    let lastMod = null;
    slides.forEach((s, i) => {
      const c = colorsOf(s)[0];
      if (s.dataset.module !== lastMod) {
        lastMod = s.dataset.module;
        const m = document.createElement('div'); m.className = 'mod'; m.textContent = lastMod;
        m.style.setProperty('--c', (PALETTE[modKey(lastMod)] || PALETTE['00'])[0]);
        g.appendChild(m);
      }
      const b = document.createElement('button');
      b.dataset.i = i; b.style.setProperty('--c', c);
      b.innerHTML = `<small>${i + 1}${s.classList.contains('try') ? ' · TRY IT' : ''}</small>${titleOf(s)}`;
      b.onclick = () => { go(i); toggle(overview, false); };
      g.appendChild(b);
    });
  }
  const toggle = (el, force) => el.classList.toggle('open', force);

  /* ---------- typing terminals ---------- */
  function runTyping(s) {
    s.querySelectorAll('[data-type]').forEach(pre => {
      if (!pre.dataset.src) pre.dataset.src = pre.innerHTML;
      const html = pre.dataset.src;
      clearTimeout(pre._t);
      const parts = html.match(/<[^>]+>|&[a-z]+;|[\s\S]/g) || [];
      let i = 0, out = '';
      pre.classList.add('cursor');
      const speed = +pre.dataset.type || 14;
      const step = () => {
        let chunk = 0;
        while (i < parts.length && chunk < 2) { out += parts[i]; if (!parts[i].startsWith('<')) chunk++; i++; }
        pre.innerHTML = out;
        if (i < parts.length) pre._t = setTimeout(step, parts[i - 1] === '\n' ? speed * 18 : speed);
        else pre.classList.remove('cursor');
      };
      pre.innerHTML = '';
      pre._t = setTimeout(step, 700);
    });
  }

  /* ---------- copy buttons ---------- */
  function addCopy() {
    document.querySelectorAll('.prompt, pre.copy').forEach(el => {
      const b = document.createElement('button');
      b.className = 'copy-btn'; b.textContent = 'copy';
      b.onclick = e => {
        e.stopPropagation();
        const c = el.cloneNode(true); c.querySelectorAll('.copy-btn').forEach(x => x.remove());
        navigator.clipboard?.writeText(c.textContent.trim()).then(() => toast('Copied to clipboard'), () => toast('Copy failed'));
      };
      el.appendChild(b);
    });
  }
  function toast(msg) {
    const t = document.querySelector('.toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 1400);
  }

  /* ---------- timers ---------- */
  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  function addTimers() {
    slides.filter(s => s.dataset.timer).forEach(s => {
      const mins = +s.dataset.timer;
      const w = document.createElement('div'); w.className = 'timer';
      w.innerHTML = `<button data-a="go">▶ start</button><button data-a="reset">↺</button><span class="tv">${fmt(mins * 60)}</span>`;
      s.appendChild(w);
      let left = mins * 60, h = null;
      const tv = w.querySelector('.tv');
      w.addEventListener('click', e => {
        e.stopPropagation();
        const a = e.target.dataset.a;
        if (a === 'go') {
          if (h) { clearInterval(h); h = null; e.target.textContent = '▶ start'; return; }
          e.target.textContent = '❚❚ pause';
          h = setInterval(() => {
            left--; tv.textContent = fmt(Math.max(0, left));
            if (left <= 0) { clearInterval(h); h = null; w.classList.add('done'); }
          }, 1000);
        }
        if (a === 'reset') { clearInterval(h); h = null; left = mins * 60; tv.textContent = fmt(left); w.classList.remove('done'); w.querySelector('[data-a=go]').textContent = '▶ start'; }
      });
    });
  }

  setInterval(() => {
    if (!sessionStart) { clock.textContent = '00:00'; return; }
    const m = Math.floor((Date.now() - sessionStart) / 60000);
    clock.textContent = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')} elapsed`;
  }, 5000);

  /* ---------- pointer spotlight on glass cards ---------- */
  deck.addEventListener('pointermove', e => {
    const el = e.target.closest('.card');
    if (!el) return;
    const r = el.getBoundingClientRect(), k = r.width / el.offsetWidth;
    el.style.setProperty('--mx', `${(e.clientX - r.left) / k}px`);
    el.style.setProperty('--my', `${(e.clientY - r.top) / k}px`);
  });

  /* ---------- ambient network canvas ---------- */
  function startNet() {
    const cv = document.getElementById('net');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    let W, H, dpr, nodes = [];
    const mouse = { x: -1e4, y: -1e4 };
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = innerWidth; H = innerHeight;
      cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const N = Math.min(95, Math.round(W * H / 20000));
      nodes = Array.from({ length: N }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35, r: Math.random() * 1.6 + .6 }));
    };
    resize(); addEventListener('resize', resize);
    addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
    const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(',');
    const D = 150;
    const frame = () => {
      if (document.body.classList.contains('lite') || document.hidden) { requestAnimationFrame(frame); return; }
      ctx.clearRect(0, 0, W, H);
      const rgb = hex(netColor);
      for (const p of nodes) {
        if (!reduced) { p.x += p.vx; p.y += p.vy; }
        if (p.x < -20) p.x = W + 20; if (p.x > W + 20) p.x = -20;
        if (p.y < -20) p.y = H + 20; if (p.y > H + 20) p.y = -20;
        const dm = Math.hypot(p.x - mouse.x, p.y - mouse.y);
        if (dm < 180) { p.x += (p.x - mouse.x) / dm * .6; p.y += (p.y - mouse.y) / dm * .6; }
      }
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j], d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < D) { ctx.strokeStyle = `rgba(${rgb},${(1 - d / D) * .38})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
        }
        ctx.fillStyle = `rgba(${rgb},.85)`; ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill();
      }
      if (!reduced) requestAnimationFrame(frame);
    };
    frame();
  }

  /* ---------- theme ---------- */
  function setTheme(t) {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('ct-theme', t); } catch (_) {}
  }
  try { const t = localStorage.getItem('ct-theme'); if (t) document.documentElement.dataset.theme = t; } catch (_) {}
  try { if (localStorage.getItem('ct-lite') === '1') document.body.classList.add('lite'); } catch (_) {}

  /* ---------- input ---------- */
  document.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (help.classList.contains('open') && k !== '?') { toggle(help, false); return; }
    if (overview.classList.contains('open') && k === 'Escape') { toggle(overview, false); return; }
    if (['ArrowRight', ' ', 'PageDown', 'Enter'].includes(k)) { e.preventDefault(); next(); }
    else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); prev(); }
    else if (k === 'ArrowDown') { e.preventDefault(); go(idx + 1, 'all'); }
    else if (k === 'ArrowUp') { e.preventDefault(); go(idx - 1, 'all'); }
    else if (k === 'Home') go(0);
    else if (k === 'End') go(slides.length - 1);
    else if (k === 'o' || k === 'O' || k === 'Escape') toggle(overview);
    else if (k === 'n' || k === 'N') toggle(notesPanel);
    else if (k === 'p' || k === 'P') openPresenter();
    else if (k === 'f' || k === 'F') document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    else if (k === 't' || k === 'T') setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
    else if (k === 'h' || k === 'H') document.body.classList.toggle('hide-hud');
    else if (k === 'l' || k === 'L') {
      const on = document.body.classList.toggle('lite');
      try { localStorage.setItem('ct-lite', on ? '1' : '0'); } catch (_) {}
      toast(on ? 'Lite mode on (fewer effects)' : 'Full effects on');
    }
    else if (k === '?') toggle(help);
    else if (k === 's' || k === 'S') { const b = slides[idx].querySelector('.timer [data-a=go]'); if (b) b.click(); }
  });

  let tx = null;
  document.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  document.addEventListener('touchend', e => {
    if (tx === null) return;
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 50) dx < 0 ? next() : prev();
    tx = null;
  });
  deck.addEventListener('click', e => {
    if (e.target.closest('a, button, pre, .prompt, input')) return;
    if (e.clientX > window.innerWidth * 0.25) next(); else prev();
  });

  document.querySelectorAll('[data-goto]').forEach(a => {
    const target = slides.find(s => s.id === a.dataset.goto);
    if (target) a.style.setProperty('--c', colorsOf(target)[0]);
    a.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      const t = slides.indexOf(target);
      if (t >= 0) go(t);
    });
  });
  document.getElementById('btn-overview').onclick = () => toggle(overview);
  document.getElementById('btn-notes').onclick = () => toggle(notesPanel);
  document.getElementById('btn-help').onclick = () => toggle(help);
  document.getElementById('btn-presenter').onclick = () => openPresenter();

  /* ---------- presenter window ---------- */
  function openPresenter() { window.open('presenter.html?deck=classic.html', 'claude-talk-presenter', 'width=1100,height=760'); }
  if (chan) chan.onmessage = ({ data }) => {
    if (data.type === 'cmd') ({ next, prev })[data.cmd]?.();
    if (data.type === 'goto') go(data.idx);
    if (data.type === 'hello') update();
  };

  /* ---------- boot ---------- */
  buildOverview();
  slides.forEach(s => {
    const c = { n: 0 };
    s.querySelectorAll('h1, h2').forEach(h => splitWords(h, c));
    stagger(s);
  });
  addCopy(); addTimers(); startNet();
  const m = location.hash.match(/#\/(\d+)/);
  go(m ? +m[1] - 1 : 0);
})();
