/* Minimal, dependency-free slide engine with fragments, overview, notes,
   presenter window sync, timers and copy buttons. */
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

  let idx = 0;
  let sessionStart = null;

  /* ---------- scaling ---------- */
  function fit() {
    const s = Math.min(window.innerWidth / 1600, window.innerHeight / 900);
    deck.style.transform = `scale(${s})`;
  }
  window.addEventListener('resize', fit); fit();

  /* ---------- fragments ---------- */
  const frags = s => [...s.querySelectorAll('.f')];
  function fragState(s) { return frags(s).filter(f => f.classList.contains('in')).length; }
  function setFrags(s, n) { frags(s).forEach((f, i) => f.classList.toggle('in', i < n)); }

  /* ---------- navigation ---------- */
  function go(n, fragMode = 'none') {
    n = Math.max(0, Math.min(slides.length - 1, n));
    const prev = slides[idx];
    idx = n;
    slides.forEach((s, i) => {
      s.classList.toggle('active', i === idx);
      s.classList.toggle('past', i < idx);
    });
    const s = slides[idx];
    if (fragMode === 'all') setFrags(s, frags(s).length);
    else if (fragMode === 'none') setFrags(s, 0);
    if (prev !== s) runTyping(s);
    update();
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
      if (s.dataset.module !== lastMod) {
        lastMod = s.dataset.module;
        const m = document.createElement('div'); m.className = 'mod'; m.textContent = lastMod; g.appendChild(m);
      }
      const b = document.createElement('button');
      b.dataset.i = i;
      b.innerHTML = `<small>${i + 1}${s.classList.contains('try') ? ' · TRY IT' : ''}</small>${titleOf(s)}`;
      b.onclick = () => { go(i); toggle(overview, false); };
      g.appendChild(b);
    });
  }
  function toggle(el, force) { el.classList.toggle('open', force); }

  /* ---------- typing terminals ---------- */
  function runTyping(s) {
    s.querySelectorAll('[data-type]').forEach(pre => {
      if (!pre.dataset.src) pre.dataset.src = pre.innerHTML;
      const html = pre.dataset.src;
      clearTimeout(pre._t);
      // tokenise into tags and characters so syntax spans survive
      const parts = html.match(/<[^>]+>|&[a-z]+;|[\s\S]/g) || [];
      let i = 0, out = '';
      pre.classList.add('cursor');
      const speed = +pre.dataset.type || 14;
      const step = () => {
        let chunk = 0;
        while (i < parts.length && chunk < 2) {
          out += parts[i];
          if (!parts[i].startsWith('<')) chunk++;
          i++;
        }
        pre.innerHTML = out;
        if (i < parts.length) pre._t = setTimeout(step, parts[i - 1] === '\n' ? speed * 18 : speed);
        else pre.classList.remove('cursor');
      };
      pre.innerHTML = '';
      pre._t = setTimeout(step, 450);
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
        const txt = c.textContent.trim();
        navigator.clipboard?.writeText(txt).then(() => toast('Copied to clipboard'), () => toast('Copy failed'));
      };
      el.appendChild(b);
    });
  }
  function toast(msg) {
    const t = document.querySelector('.toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 1400);
  }

  /* ---------- timers ---------- */
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
  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  setInterval(() => {
    if (!sessionStart) { clock.textContent = '00:00'; return; }
    const m = Math.floor((Date.now() - sessionStart) / 60000);
    clock.textContent = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')} elapsed`;
  }, 5000);

  /* ---------- theme ---------- */
  function setTheme(t) {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('ct-theme', t); } catch (_) {}
  }
  try { const t = localStorage.getItem('ct-theme'); if (t) document.documentElement.dataset.theme = t; } catch (_) {}

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

  document.querySelectorAll('[data-goto]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault(); e.stopPropagation();
    const target = slides.findIndex(s => s.id === a.dataset.goto);
    if (target >= 0) go(target);
  }));
  document.getElementById('btn-overview').onclick = () => toggle(overview);
  document.getElementById('btn-notes').onclick = () => toggle(notesPanel);
  document.getElementById('btn-help').onclick = () => toggle(help);
  document.getElementById('btn-presenter').onclick = () => openPresenter();

  /* ---------- presenter window ---------- */
  function openPresenter() { window.open('presenter.html', 'claude-talk-presenter', 'width=1100,height=760'); }
  if (chan) chan.onmessage = ({ data }) => {
    if (data.type === 'cmd') ({ next, prev })[data.cmd]?.();
    if (data.type === 'goto') go(data.idx);
    if (data.type === 'hello') update();
  };

  /* ---------- boot ---------- */
  buildOverview(); addCopy(); addTimers();
  const m = location.hash.match(/#\/(\d+)/);
  go(m ? +m[1] - 1 : 0);
})();
