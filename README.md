# Working with Claude — beyond the chat box

A cinematic, interactive web keynote for a 3-hour session on using Claude for research, coding
and everything in between (IISc, November 2026). Plain HTML/CSS/JS, no build step, hosted on
GitHub Pages.

| Page | What it is |
| --- | --- |
| `index.html` | **The keynote**: 71 scenes, including research decision guides and step-by-step walkthroughs |
| `handout.html` | Attendee handout: every prompt, command and snippet, with copy buttons |
| `presenter.html` | Presenter window: notes, next scene, beats, clock, time plan (press **P**) |
| `classic.html` | The earlier text-heavy slide version, kept for reference |
| `research/notes.md` | Fact sheet + sources behind the content (checked 19 Nov 2026) |

## Run it

- **Online:** GitHub Pages from `main` / root.
- **Locally:** open `index.html` directly, or run `python3 -m http.server 8000` in this folder
  (the presenter window needs a server).

## Controls (keynote)

| Key | Action |
| --- | --- |
| → / Space / click | next beat |
| ← | previous beat |
| ↓ / ↑ | next / previous scene |
| O | overview of all scenes |
| N | speaker notes |
| P | presenter window — put it on your laptop screen |
| S | start/pause the countdown on hands-on scenes (or click the ring) |
| F · H · L | fullscreen · hide HUD · lite mode for slow projector laptops |

Interactive scenes: the model picker (click a task) and permission modes (click a mode).

## How scenes work

Each `<section class="scene">` is one idea. Elements appear on beats:

```html
<div data-in="2" data-fx="slam">appears on beat 2 with a slam</div>
<div data-in="1" data-out="3">visible on beats 1–2 only</div>
```

- Effects (`data-fx`): `rise`, `zoom`, `slam`, `pop`, `drop`, `left`, `right`, `flip`.
- Walkthroughs: give step-list items `data-k="n"`; they get `.cur` on step n and `.done` after it.
- The scene also gets cumulative classes `s1`, `s2`, … so CSS can choreograph bigger moves.
- `.kin` headlines rise word by word; `.grad` gives the shimmering italic accent.
- Each module has its own color grade (set in `PALETTE` in `assets/keynote.js`); hands-on scenes turn amber.
- Speaker notes live in `<aside class="notes">` inside each scene.

Beta features change often: re-check `research/notes.md` sources the day before presenting.
