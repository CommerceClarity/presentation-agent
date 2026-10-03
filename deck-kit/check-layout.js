#!/usr/bin/env node
/*
 * check-layout.js: the layout gate every deck passes BEFORE the
 * HTML is handed over and BEFORE any PDF is exported.
 *
 * Run:  node check-layout.js [input.html]      (default: index.html)
 *       node check-layout.js index.html --json
 *
 * Exit 0 = clean. Exit 1 = findings; fix them and run again. Never hand over a
 * deck, and never export a PDF, on a non-zero exit.
 *
 * It renders the deck in the same headless Chrome the PDF export uses, at the same
 * 1280x720, with the real fonts, then measures every slide for the four failures
 * that actually ship on decks:
 *
 *   1. OVERLAP     two boxes, or two words, sitting on top of each other.
 *   2. OUT OF FRAME  anything crossing the 1280x720 slide edge (clipped in the PDF).
 *   3. CLIPPED     a text box whose content is cut by its own overflow / ellipsis /
 *                  line-clamp.
 *   4. SHORT MEASURE  a wrapped text block whose longest line stops short of its
 *                  container, so the copy reads as truncated mid-line.
 *   5. DRIFT       a row of sibling boxes whose internal slots do not line up
 *                  (heading wraps in one card, body copy of that card sits lower
 *                  than its neighbours'). Fix: `.aligned .slots-N` on the row.
 *
 * Opt-outs, for the rare deliberate case, on the element itself:
 *   data-measure="free"   this block may rag short (a deliberate narrow line)
 *   data-overlap="ok"     this element is meant to sit over another (a badge)
 *   data-align="free"     this row is not a row of like boxes
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const args = process.argv.slice(2).filter(a => a !== '--json');
const asJson = process.argv.includes('--json');
const input = path.resolve(args[0] || 'index.html');

const chromeCandidates = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);
const executablePath = chromeCandidates.find(p => { try { return fs.existsSync(p); } catch (e) { return false; } });

if (!fs.existsSync(input)) { console.error('Input not found:', input); process.exit(2); }
if (!executablePath) { console.error('No Chrome/Chromium found. Set CHROME_PATH=/path/to/chrome and retry.'); process.exit(2); }

const W = 1280, H = 720;

/* Everything below runs INSIDE the page, on the one active slide. */
function auditSlide(opts) {
  const { W, H, MEASURE_MIN, EDGE_TOL, DRIFT_TOL, OVERLAP_TOL } = opts;
  const slide = document.querySelector('.slide.active') || document.querySelector('.slide');
  const out = [];
  const add = (kind, el, msg, extra) => out.push(Object.assign({ kind, where: pathOf(el), msg }, extra || {}));

  function pathOf(el) {
    if (!el || el === slide) return '.slide';
    const bits = [];
    let n = el, hops = 0;
    while (n && n !== slide && hops++ < 4) {
      let b = n.tagName ? n.tagName.toLowerCase() : 'node';
      const cls = (n.getAttribute && n.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
      if (cls.length) b += '.' + cls.join('.');
      bits.unshift(b);
      n = n.parentElement;
    }
    return bits.join(' > ');
  }
  const txt = el => (el.textContent || '').replace(/\s+/g, ' ').trim();
  const snip = el => { const t = txt(el); return t.length > 58 ? t.slice(0, 55) + '...' : t; };
  const area = r => Math.max(0, r.width) * Math.max(0, r.height);
  const isVisible = (el, cs, r) => {
    if (!r || r.width < 0.5 || r.height < 0.5) return false;
    if (cs.visibility === 'hidden' || cs.display === 'none') return false;
    if (parseFloat(cs.opacity) < 0.05) return false;
    return true;
  };
  /* Decor is allowed to bleed and to sit under content: gradients, washes, blobs,
     rules, dots, the drawn connectors of a diagram. */
  const DECOR = '.gr, .blob, .dgm, .dot, .mark, .frame, .screen, hr, .gantt-bg, .gantt-bg *';
  const isDecor = el => el.matches && el.matches(DECOR);

  const all = [...slide.querySelectorAll('*')];
  const meta = new Map();
  for (const el of all) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    meta.set(el, { cs, r, vis: isVisible(el, cs, r) });
  }

  /* ---- 2. OUT OF FRAME ------------------------------------------------ */
  const frame = slide.getBoundingClientRect();
  for (const el of all) {
    const m = meta.get(el);
    if (!m.vis || isDecor(el)) continue;
    if (el.closest('svg') && el.tagName.toLowerCase() !== 'text') continue;
    const r = m.r;
    const over = {
      left: frame.left - r.left, top: frame.top - r.top,
      right: r.right - frame.right, bottom: r.bottom - frame.bottom,
    };
    const worst = Object.entries(over).filter(([, v]) => v > EDGE_TOL).sort((a, b) => b[1] - a[1])[0];
    if (worst) add('OUT OF FRAME', el, `crosses the ${worst[0]} slide edge by ${Math.round(worst[1])}px` + (txt(el) ? `: "${snip(el)}"` : ''));
  }

  /* ---- 3. CLIPPED TEXT ------------------------------------------------ */
  for (const el of all) {
    const m = meta.get(el);
    if (!m.vis || !txt(el)) continue;
    const { cs } = m;
    if (cs.textOverflow === 'ellipsis') add('CLIPPED', el, `text-overflow: ellipsis truncates "${snip(el)}"`);
    if (cs.webkitLineClamp && cs.webkitLineClamp !== 'none') add('CLIPPED', el, `-webkit-line-clamp: ${cs.webkitLineClamp} truncates "${snip(el)}"`);
    const clips = /hidden|clip|auto|scroll/.test(cs.overflowX + cs.overflowY);
    if (!clips) continue;
    if (el.scrollHeight > el.clientHeight + 1) add('CLIPPED', el, `content is ${el.scrollHeight - el.clientHeight}px taller than its box and is cut: "${snip(el)}"`);
    if (el.scrollWidth > el.clientWidth + 1) add('CLIPPED', el, `content is ${el.scrollWidth - el.clientWidth}px wider than its box and is cut: "${snip(el)}"`);
  }

  /* ---- 4. SHORT MEASURE (the "truncated subtitle" failure) ------------
     Natural ragging is NOT a finding: a line ends early because the next word did
     not fit, and no rule can change that. The finding is a line that ended early
     WHILE THE NEXT WORD STILL FITTED, which only happens when something caps the
     block (a max-width, a stray width, an inline break). That is the truncated
     look on the subtitle, and it is measurable exactly. */
  const lineCount = el => {
    const rng = document.createRange();
    rng.selectNodeContents(el);
    const rects = [...rng.getClientRects()].filter(r => r.width > 1 && r.height > 1);
    const tops = [];
    for (const r of rects) if (!tops.some(t => Math.abs(t - r.top) < Math.max(2, r.height * 0.5))) tops.push(r.top);
    return tops.length;
  };
  const words = el => {
    const list = [];
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const t = n.textContent;
      const re = /\S+/g;
      let m;
      while ((m = re.exec(t))) list.push({ node: n, from: m.index, to: m.index + m[0].length, w: m[0] });
    }
    return list;
  };
  for (const el of all) {
    const m = meta.get(el);
    if (!m.vis) continue;
    if (el.dataset && el.dataset.measure === 'free') continue;
    if (el.closest('[data-measure="free"]')) continue;
    if (el.closest('svg') || el.querySelector('br')) continue;
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (!own || !txt(el)) continue;
    if (!/^(block|flow-root|list-item|table-cell)$/.test(m.cs.display)) continue;
    if (m.cs.textAlign === 'center' || m.cs.textAlign === 'right') continue;   /* centred copy rags both sides by design */
    /* text-wrap: balance breaks every line early ON PURPOSE (even display lines):
       exempt it. `pretty` only pulls a word down to kill the last-line orphan, so
       exempt just the penultimate line there. */
    const tw = m.cs.textWrap || m.cs.textWrapStyle || '';
    if (/balance/.test(tw)) continue;
    const prettyLine = /pretty/.test(tw);
    const inner = el.clientWidth - parseFloat(m.cs.paddingLeft || 0) - parseFloat(m.cs.paddingRight || 0);
    if (inner < 40) continue;

    /* 4a. THE CAPPED BLOCK, the failure Lorenzo reported. A cap on the block
       itself (max-width: 80ch and friends) shrinks the BOX, so every line still
       fills that box and the word-fit test below sees nothing wrong. Measured
       against the container it is obvious: the copy wraps to several lines while
       a third of the content row stays empty to its right, so it reads as text
       truncated mid-line. Compare with what was AVAILABLE, never with the box. */
    const host = el.parentElement;
    if (host && lineCount(el) >= 2) {
      const hcs = getComputedStyle(host);
      let avail = host.clientWidth - parseFloat(hcs.paddingLeft || 0) - parseFloat(hcs.paddingRight || 0)
                  - parseFloat(m.cs.marginLeft || 0) - parseFloat(m.cs.marginRight || 0);
      /* in a flex/grid ROW the siblings take their share of that width, so what was
         available to this block is what is left after them (otherwise every text
         column beside an icon or a figure reads as capped). */
      if (/flex|grid/.test(hcs.display) && hcs.flexDirection !== 'column') {
        const sibs = [...host.children].filter(c => c !== el && meta.get(c) && meta.get(c).vis);
        const gap = parseFloat(hcs.columnGap || hcs.gap || 0) || 0;
        avail -= sibs.reduce((t, c) => t + meta.get(c).r.width, 0) + gap * sibs.length;
      }
      if (avail > 60 && el.getBoundingClientRect().width < avail * 0.95) {
        const cap = [m.cs.maxWidth !== 'none' ? `max-width: ${m.cs.maxWidth}` : null,
                     m.cs.width !== 'auto' ? `width: ${m.cs.width}` : null].filter(Boolean).join(', ');
        add('SHORT MEASURE', el, `wraps over ${lineCount(el)} lines inside a box only ${Math.round(el.getBoundingClientRect().width)}px wide where ${Math.round(avail)}px were available${cap ? ` (${cap})` : ''}, so every line stops short of the slide and the copy reads truncated: "${snip(el)}"`,
            { fix: cap ? 'drop the width cap on the text: the container is the measure' : 'let the block fill its container (width:auto / align-items:stretch), or narrow the CONTAINER instead of the text' });
        continue;
      }
    }

    const ws = words(el);
    if (ws.length < 3) continue;
    const rng = document.createRange();
    const boxed = [];
    for (const w of ws) {
      rng.setStart(w.node, w.from); rng.setEnd(w.node, w.to);
      const r = rng.getBoundingClientRect();
      if (r.width < 0.5 && r.height < 0.5) continue;
      boxed.push({ w: w.w, r });
    }
    if (boxed.length < 3) continue;
    /* group words into lines by their vertical band */
    const lines = [];
    for (const b of boxed) {
      const line = lines.find(l => Math.abs(l.top - b.r.top) < Math.max(2, b.r.height * 0.5));
      if (line) { line.left = Math.min(line.left, b.r.left); line.right = Math.max(line.right, b.r.right); line.words.push(b); }
      else lines.push({ top: b.r.top, left: b.r.left, right: b.r.right, words: [b] });
    }
    if (lines.length < 2) continue;
    const spaceW = Math.max(3, (m.cs.fontSize ? parseFloat(m.cs.fontSize) : 16) * 0.26);
    let worst = null;
    for (let i = 0; i < lines.length - 1; i++) {
      const next = lines[i + 1].words[0];
      if (!next) continue;
      if (prettyLine && i === lines.length - 2) continue;   /* orphan avoidance, not a cap */
      const free = (m.r.left + parseFloat(m.cs.paddingLeft || 0) + inner) - lines[i].right;
      const needed = next.r.width + spaceW;
      const slack = free - needed;
      if (slack > 2 && (!worst || slack > worst.slack)) worst = { slack, line: i + 1, free, next: next.w };
    }
    if (worst) {
      const cap = m.cs.maxWidth !== 'none' ? ` (max-width: ${m.cs.maxWidth})` : '';
      add('SHORT MEASURE', el, `line ${worst.line} stops ${Math.round(worst.free)}px short of the container${cap} with room to spare ("${worst.next}" would have fitted), so the text reads truncated mid-line: "${snip(el)}"`,
          { fix: cap ? 'drop the max-width cap: the container is the measure' : 'remove the width constraint on the text, or narrow the CONTAINER instead' });
    }
  }

  /* ---- 1. OVERLAP ----------------------------------------------------- */
  const boxes = all.filter(el => {
    const m = meta.get(el);
    if (!m.vis || isDecor(el)) return false;
    if (el.closest('[data-overlap="ok"]')) return false;
    if (m.cs.pointerEvents === 'none') return false;
    if (el.closest('svg')) return el.tagName.toLowerCase() === 'text';   /* inside a diagram: words only */
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    return own || el.matches('img, .card, .panel, .chip, .node, .stat, .kpi, .pill, .screen, .product');
  });
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (a.contains(b) || b.contains(a)) continue;
      const ra = meta.get(a).r, rb = meta.get(b).r;
      const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      const h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (w <= OVERLAP_TOL || h <= OVERLAP_TOL) continue;
      const share = (w * h) / Math.max(1, Math.min(area(ra), area(rb)));
      const bothSvgText = a.closest('svg') && b.closest('svg');
      if (!bothSvgText && share < 0.02) continue;
      add('OVERLAP', a, `overlaps ${pathOf(b)} by ${Math.round(w)}x${Math.round(h)}px (${Math.round(share * 100)}% of the smaller box): "${snip(a)}" over "${snip(b)}"`);
    }
  }

  /* ---- 5. DRIFT across a row of like boxes ---------------------------- */
  const sig = el => el.tagName.toLowerCase() + '.' + ((el.getAttribute('class') || '').trim().split(/\s+/)[0] || '');
  for (const row of all) {
    if (row.closest('[data-align="free"]')) continue;
    if (row.closest('svg')) continue;
    const kids = [...row.children].filter(k => meta.get(k) && meta.get(k).vis && !isDecor(k));
    if (kids.length < 2) continue;
    const s0 = sig(kids[0]);
    if (!kids.every(k => sig(k) === s0)) continue;
    const rs = kids.map(k => meta.get(k).r);
    /* side by side only: they must share most of their vertical extent */
    const sideBySide = rs.every(r => {
      const ov = Math.min(r.bottom, rs[0].bottom) - Math.max(r.top, rs[0].top);
      return ov > 0.6 * Math.min(r.height, rs[0].height);
    }) && rs.some(r => Math.abs(r.left - rs[0].left) > 4);
    if (!sideBySide) continue;
    const topSpread = Math.max(...rs.map(r => r.top)) - Math.min(...rs.map(r => r.top));
    if (topSpread > DRIFT_TOL) add('DRIFT', row, `the ${kids.length} boxes in this row start at ${Math.round(topSpread)}px different heights`, { fix: 'align-items: stretch on the row (or .aligned)' });
    const counts = kids.map(k => k.children.length);
    if (!counts.every(c => c === counts[0]) || counts[0] === 0) {
      if (counts.some(c => c !== counts[0])) add('DRIFT', row, `the boxes in this row carry different slot counts (${counts.join('/')}), so nothing inside can line up`, { fix: 'give every box the same slots in the same order, then .aligned .slots-N' });
      continue;
    }
    for (let k = 0; k < counts[0]; k++) {
      const slots = kids.map(kid => kid.children[k]).filter(e => meta.get(e) && meta.get(e).vis);
      if (slots.length !== kids.length) continue;
      if (slots.some(e => isDecor(e))) continue;
      const tops = slots.map(e => meta.get(e).r.top);
      const spread = Math.max(...tops) - Math.min(...tops);
      if (spread > DRIFT_TOL) {
        add('DRIFT', row, `slot ${k + 1} (${sig(slots[0])}) sits at ${Math.round(spread)}px different heights across the ${kids.length} boxes, so the words do not line up`,
            { fix: `add .aligned .slots-${counts[0]} to this row` });
        break;   /* one finding per row is enough to act on */
      }
    }
    const aligns = kids.map(k => getComputedStyle(k).textAlign);
    if (new Set(aligns).size > 1) add('DRIFT', row, `mixed text-align across the row (${[...new Set(aligns)].join(' / ')})`, { fix: 'one alignment for the whole row' });
  }

  return out;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await page.goto('file://' + input, { waitUntil: 'networkidle0' });
  await page.evaluate(async () => { if (document.fonts && document.fonts.ready) await document.fonts.ready; });

  const count = await page.evaluate(() => {
    const deck = document.getElementById('deck') || document.querySelector('.slide')?.parentElement;
    if (deck) deck.style.transform = 'none';   /* measure at true 1280x720, not at the on-screen fit scale */
    document.querySelectorAll('.deck-nav, .fab, .drawbar, .send-btn').forEach(e => { e.style.display = 'none'; });
    return document.querySelectorAll('.slide').length;
  });
  if (!count) { console.error('No .slide elements found in', input); await browser.close(); process.exit(2); }

  const opts = { W, H, MEASURE_MIN: 0.88, EDGE_TOL: 1.5, DRIFT_TOL: 1.5, OVERLAP_TOL: 2 };
  const findings = [];
  for (let n = 0; n < count; n++) {
    await page.evaluate((idx) => {
      [...document.querySelectorAll('.slide')].forEach((s, k) => { s.classList.toggle('active', k === idx); s.style.transition = 'none'; });
      window.scrollTo(0, 0);
    }, n);
    await new Promise(r => setTimeout(r, 40));
    const res = await page.evaluate(auditSlide, opts);
    res.forEach(f => findings.push(Object.assign({ slide: n + 1 }, f)));
  }
  await browser.close();

  if (asJson) { console.log(JSON.stringify({ input, slides: count, findings }, null, 2)); process.exit(findings.length ? 1 : 0); }

  if (!findings.length) { console.log(`Layout check clean: ${count} slides, no overlap, nothing out of frame, no clipped or short-measure text, no drift.`); process.exit(0); }
  const byKind = findings.reduce((a, f) => (a[f.kind] = (a[f.kind] || 0) + 1, a), {});
  console.log(`Layout check FAILED on ${path.basename(input)}: ${findings.length} finding(s) over ${count} slides.`);
  console.log(Object.entries(byKind).map(([k, v]) => `  ${k}: ${v}`).join('\n'));
  let cur = null;
  for (const f of findings) {
    if (f.slide !== cur) { cur = f.slide; console.log(`\nSLIDE ${cur}`); }
    console.log(`  [${f.kind}] ${f.where}\n      ${f.msg}` + (f.fix ? `\n      fix: ${f.fix}` : ''));
  }
  console.log('\nFix these on the HTML, then re-run. Do not hand over the deck or export a PDF until this passes.');
  process.exit(1);
})().catch(err => { console.error(err); process.exit(2); });
