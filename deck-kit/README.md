# deck-kit

The slide engine. The presentation type skills decide **what** to say. This file says **how** the HTML is built.

| File | What it does |
|---|---|
| `tokens.default.css` | Default colors and fonts. `company/brand/tokens.css` overrides them. |
| `deck.css` | The slide style. It holds no colors or fonts: it uses the variables. |
| `deck.js` | Navigation, Review mode, drawing on slides, feedback export. Its buttons follow `<html lang>`. |
| `template.html` | The template every presentation starts from. |
| `prepare.js` | Creates the presentation folder in `~/Downloads/`, with kit and brand inside. |
| `check-layout.js` | The layout check. Run it before showing the presentation. |
| `export-pdf.js` | The PDF export, one slide per page. Only at the end, on request. |

## First time

The check and the export drive Chrome through `puppeteer-core`. Install it once:

```bash
cd deck-kit && npm install
```

## How it is built

1. Create the presentation folder, from the repo root:
   ```bash
   node deck-kit/prepare.js <client>_<type>_<YYYY-MM-DD>
   ```
   It creates `~/Downloads/<folder>/` with `index.html` (from the template), `kit/` (style and navigation) and `brand/` (a copy of `company/brand/`). The folder opens and can be sent as it is, on any computer. It prints the full path: use it in all the commands that follow.
2. Set `<html lang>` to the user's language code (`it`, `en`, `es`...). The review buttons appear in that language: Italian for `it`, English otherwise.
3. Write only the `<section class="slide ...">` blocks, with all text in the user's language. The controls (navigation, gear, Review) are added by `deck.js`.
4. The logo is in `brand/`, next to `index.html`. Read `company/brand/brand.md` to know which file to use on color (cover, closing) and which on the light background. In the HTML, paths are always `kit/...` and `brand/...`, never into the repo.
5. Run the check:
   ```bash
   node deck-kit/check-layout.js ~/Downloads/<folder>/index.html
   ```
   Exit code 0: clean. Exit code 1: it lists slide and problem. Fix the HTML and run it again.
6. The PDF only if asked, and only after a clean check:
   ```bash
   node deck-kit/export-pdf.js ~/Downloads/<folder>/index.html ~/Downloads/<folder>/<name>.pdf
   ```

## Slide types

| Class | When |
|---|---|
| `.slide.cover` | Cover. Logo, client, title, date. `--hero` background. |
| `.slide.page` | Every inner slide. Label at the top left, title, content, footer with client and page number. |
| `.slide.closing` | Closing. Logo and one sentence. `--hero` background. |

## Content blocks

A slide has **one** main block. If it needs two, it is two slides.

| Class | For |
|---|---|
| `.cols-2` / `.cols-3` / `.cols-4` with `.card` | Two, three or four points side by side. Add `.aligned .slots-N`. A number at the bottom of the card: `<div class="n"><div class="v">4</div><div class="u">pages on hold</div></div>`. |
| `.kpis` with `.kpi` | Two to four numbers, each with its explanation. |
| `.hero-stat` | One big number. |
| `.statement` | One big sentence. `<em>` colors the key word. |
| `.panel` with `.table` | A table. `td.lab` for the first column, `.num` for numbers, `.dense` if there are many rows. |
| `.rows` with `.row` | A list of activities: what (`.what` with `.t` and `.d` inside), who (`.who`), when (`.when`), status (`.pill`). |
| `.gantt-wrap` with `.gantt` | Activities on a day axis, one row per activity. `.bar.us` and `.bar.client` bars, `.ms` deadlines, a background with weekends, today and key dates. The full markup is in `skills/deck-progress-update/SKILL.md`, slide 5. |
| `.pill` / `.pill.done` / `.pill.now` / `.pill.block` | The status: to do, done, in progress, blocked. |
| `.split` | Text on the left, block on the right. |

## The rules

- **Fill the slide.** The main block sits inside `<div class="fill">`. Cards, tables and rows grow to the bottom with `.grow`: a table in `.panel.grow` stretches by itself. The Gantt is the exception: `.gantt-wrap` goes straight into `.content` and fills it by itself. Use `.fill.center` only for a block that scales itself (a sentence, a big number). A slide with an empty band above and below is wrong.
- **Full-width text.** Never `max-width` or `width` on text. If you need a narrower column, narrow the container with `.split` or `.cols-2`.
- **Aligned rows.** The cards in a row have the same elements in the same order, and the row has `.aligned .slots-N`.
- **Nothing overlaps, nothing leaves the slide.** `check-layout.js` verifies it.
- **No color or font written by hand.** Only the variables: `var(--accent)`, `var(--fg-2)`, `var(--font-display)`.
- **The footer of every inner slide** has `<Client> · <Presentation type>` on the left, in the user's language, and the two-digit page number on the right.
