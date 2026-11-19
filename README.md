# Working with Claude — beyond the chat box

Slides for a 3-hour interactive session on using Claude for research, coding and everything in
between (IISc, November 2026). Plain HTML/CSS/JS, no build step, hosted on GitHub Pages.

## Run it

- **Online:** GitHub Pages (Settings → Pages → Deploy from branch `main`, folder `/`).
- **Locally:** any static server from this folder, e.g. `python3 -m http.server 8000`, then open
  http://localhost:8000. Opening `index.html` directly works too, but the presenter window needs a server.

## Controls

| Key | Action |
| --- | --- |
| → / Space / click | next build step |
| ← | previous step |
| ↓ / ↑ | skip a whole slide |
| O or Esc | slide overview |
| N | speaker notes panel |
| P | presenter window (notes, next slide, clock, time plan) — put it on your laptop screen |
| S | start/pause the exercise timer on "Try it" slides |
| F | fullscreen · T theme · H hide bottom bar · ? help |

## Structure

```
index.html        all slides (<section class="slide">), notes in <aside class="notes">
presenter.html    presenter view, synced via BroadcastChannel
assets/style.css  design tokens, layouts, animations
assets/deck.js    slide engine: fragments (.f), timers (data-timer), copy buttons, overview
research/notes.md fact sheet + sources used for the content (checked 19 Nov 2026)
```

### Editing

- Add a slide: copy any `<section class="slide" data-module="…">` block.
- Step-by-step reveal: add class `f` to an element (`f zoom`, `f left` for variants).
- Exercise timer: `data-timer="10"` on the section (minutes) and class `try` for the striped style.
- Copy button: automatic on `.prompt` blocks and on `<pre class="copy">`.

Beta features change often: re-check `research/notes.md` sources the day before presenting.
