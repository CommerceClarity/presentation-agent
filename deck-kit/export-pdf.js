#!/usr/bin/env node
/*
 * Export any deck to a clean PDF: one slide per page, full-bleed
 * 1280x720 (16:9), real fonts and brand gradient. Drives the Chrome already on
 * the machine, so the only dependency is puppeteer-core.
 *
 * Setup (once):  npm install
 * Run:           node export-pdf.js [input.html] [output.pdf]
 * Default:       node export-pdf.js  ->  index.html -> deck.pdf
 *
 * IMAGE-BASED, WYSIWYG. We do NOT let Chrome re-flow the deck through @media
 * print (that reflow shifted or clipped gradients, titles, full-area SVGs
 * and .fill blocks vs. what you see on screen -- the export "sminchia").
 * Instead we screenshot each slide at exactly 1280x720 as rendered on screen,
 * then lay one flat image per page into the PDF. What you see is what you get:
 * a raster page can never re-flow, so nothing moves between screen and PDF.
 *
 * How: viewport 1280x720 @2x for crisp text, neutralise the on-screen scale
 * transform, hide the injected chrome (nav / gear / drawbar), activate each
 * slide in turn and screenshot it, then build a bare HTML of full-bleed <img>
 * pages (@page 1280x720, margin 0) and print THAT to PDF.
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const input = path.resolve(process.argv[2] || 'index.html');
const output = path.resolve(process.argv[3] || 'deck.pdf');

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

if (!fs.existsSync(input)) { console.error('Input not found:', input); process.exit(1); }
if (!executablePath) { console.error('No Chrome/Chromium found. Set CHROME_PATH=/path/to/chrome and retry.'); process.exit(1); }

const W = 1280, H = 720;

(async () => {
  const browser = await puppeteer.launch({ executablePath, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 2 });   // @2x -> crisp text in the raster
  await page.goto('file://' + input, { waitUntil: 'networkidle0' });
  await page.evaluate(async () => { if (document.fonts && document.fonts.ready) { await document.fonts.ready; } });

  // Neutralise the on-screen fit scale and the injected viewer chrome so each
  // slide paints at its natural 1280x720, edge-to-edge, with nothing overlaid.
  const count = await page.evaluate(() => {
    const deck = document.getElementById('deck') || document.querySelector('.slide')?.parentElement;
    if (deck) deck.style.transform = 'none';
    document.querySelectorAll('.deck-nav, .fab, .drawbar, .send-btn').forEach(e => { e.style.display = 'none'; });
    return document.querySelectorAll('.slide').length;
  });
  if (!count) { console.error('No .slide elements found in', input); await browser.close(); process.exit(1); }

  // Screenshot each slide as rendered on screen (activate it, wait a beat for
  // the opacity transition, capture the 1280x720 box at 0,0).
  const shots = [];
  for (let n = 0; n < count; n++) {
    await page.evaluate((idx) => {
      const slides = [...document.querySelectorAll('.slide')];
      slides.forEach((s, k) => {
        s.classList.toggle('active', k === idx);
        s.style.transition = 'none';
      });
      window.scrollTo(0, 0);
    }, n);
    await new Promise(r => setTimeout(r, 60));
    const buf = await page.screenshot({ clip: { x: 0, y: 0, width: W, height: H }, type: 'png' });
    shots.push('data:image/png;base64,' + buf.toString('base64'));
  }

  // Build a bare page of full-bleed images, one slide per PDF page, then print.
  const imgs = shots.map(src => `<img src="${src}">`).join('');
  const doc = `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: ${W}px ${H}px; margin: 0; }
    * { margin: 0; padding: 0; }
    html, body { background: #fff; }
    img { display: block; width: ${W}px; height: ${H}px; page-break-after: always; }
    img:last-child { page-break-after: auto; }
  </style></head><body>${imgs}</body></html>`;

  const pdfPage = await browser.newPage();
  await pdfPage.setContent(doc, { waitUntil: 'load', timeout: 0 });
  await pdfPage.evaluate(async () => { await Promise.all([...document.images].map(img => img.complete ? 0 : img.decode().catch(() => 0))); });
  await pdfPage.pdf({ path: output, printBackground: true, preferCSSPageSize: true,
                      margin: { top: '0', right: '0', bottom: '0', left: '0' } });
  await browser.close();
  console.log('Saved', output, '(' + count + ' slides, image-based)');
})().catch(err => { console.error(err); process.exit(1); });
