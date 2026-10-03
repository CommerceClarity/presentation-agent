/* ==========================================================================
   deck.js: navigation and review, the same for every presentation. Do not edit it.

   Include it once, after the slides:
     <link rel="stylesheet" href="kit/tokens.default.css">
     <link rel="stylesheet" href="brand/tokens.css">
     <link rel="stylesheet" href="kit/deck.css">
     <div id="viewport"><div class="deck" id="deck"> ...<section class="slide">... </div></div>
     <script src="kit/deck.js"></script>

   It injects all the chrome (no markup needed in the deck) and provides:
   - Present: one slide at a time. Page nav sits bottom-right.
   - Review: scroll all slides, a comment box under each, freehand draw on each
     (colour swatches), and "Copy feedback and export": copies a ready prompt for
     the coding agent and saves an image of each slide you drew on.
   - Fullscreen toggle. A discreet gear button expands these options.
   - UI language: from <html lang>. Italian for "it", English for everything else.
     Add a language by adding an entry to UI below.
   Export to PDF with export-pdf.js (one slide per page, 16:9).
   ========================================================================== */
(function () {
  const slides = [...document.querySelectorAll('.slide')];
  if (!slides.length) return;
  const html = document.documentElement, body = document.body;
  const deck = document.getElementById('deck') || slides[0].parentElement;
  const el = (tag, cls, inner) => { const e = document.createElement(tag); if (cls) e.className = cls; if (inner != null) e.innerHTML = inner; return e; };

  const GEAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
  const COLORS = ['#1b43a3', '#c2306a', '#0a8585', '#ef8a5f'];

  /* ---------- UI strings, picked from <html lang> ---------- */
  const UI = {
    en: { prev: 'Back', next: 'Next', options: 'View options', present: 'Present', review: 'Review', full: 'Full screen',
          draw: 'Draw', clear: 'Clear', send: 'Copy feedback and export', note: 'What to change on this slide (leave empty if it is fine)',
          seeDrawing: '(see the drawing)', noNotes: '- (no notes)', exporting: 'Exporting…', copied: 'Copied', imageSaved: ', image saved',
          prompt: (title, list) => 'Edit this presentation (' + title + '). My feedback:\n' + list + '\n\nIn the attached image deck-feedback.png you will find every slide I touched, labelled SLIDE N, with my drawing on top. Apply these changes and leave the brand and everything else as it is.' },
    it: { prev: 'Indietro', next: 'Avanti', options: 'Opzioni di visualizzazione', present: 'Presenta', review: 'Revisione', full: 'Schermo intero',
          draw: 'Disegna', clear: 'Cancella', send: 'Copia feedback ed esporta', note: 'Cosa cambiare in questa slide (lascia vuoto se va bene)',
          seeDrawing: '(vedi il disegno)', noNotes: '- (nessuna nota)', exporting: 'Esporto…', copied: 'Copiato', imageSaved: ', immagine salvata',
          prompt: (title, list) => 'Modifica questa presentazione (' + title + '). Il mio feedback:\n' + list + '\n\nNell\'immagine allegata deck-feedback.png trovi ogni slide che ho toccato, con l\'etichetta SLIDE N e il mio disegno sopra. Applica queste modifiche e lascia invariati il brand e il resto.' }
  };
  const T = UI[(document.documentElement.lang || 'en').slice(0, 2).toLowerCase()] || UI.en;

  /* ---------- inject chrome ---------- */
  const nav = el('div', 'deck-nav', '<button data-prev aria-label="' + T.prev + '">‹</button><span class="count">1 / 1</span><button data-next aria-label="' + T.next + '">›</button>');
  const fab = el('div', 'fab');
  const gearBtn = el('button', 'fab-btn', GEAR); gearBtn.setAttribute('aria-label', T.options);
  const menu = el('div', 'fab-menu', '<button data-mode="present" class="on">' + T.present + '</button><button data-mode="review">' + T.review + '</button><button data-full>' + T.full + '</button>');
  fab.append(gearBtn, menu);
  const drawbar = el('div', 'drawbar', '<span>✎ ' + T.draw + '</span>' + COLORS.map((c, i) => '<span class="dswatch' + (i === 0 ? ' on' : '') + '" data-c="' + c + '" style="background:' + c + '"></span>').join('') + '<button data-clear>' + T.clear + '</button>');
  const send = el('button', 'send-btn', T.send); send.hidden = true;
  body.append(nav, fab, drawbar, send);
  const count = nav.querySelector('.count');

  /* ---------- present-mode navigation + fit ---------- */
  let i = 0;
  function show(n) {
    i = Math.max(0, Math.min(slides.length - 1, n));
    slides.forEach((s, k) => s.classList.toggle('active', k === i));
    count.textContent = (i + 1) + ' / ' + slides.length;
    try { history.replaceState(null, '', '#' + (i + 1)); } catch (e) {}
  }
  function fit() { deck.style.transform = 'scale(' + (Math.min(innerWidth / 1280, innerHeight / 720) * 0.94) + ')'; }
  nav.querySelector('[data-next]').onclick = () => show(i + 1);
  nav.querySelector('[data-prev]').onclick = () => show(i - 1);
  addEventListener('keydown', e => {
    if (mode !== 'present') return;
    if (['ArrowRight', ' ', 'PageDown', 'ArrowDown'].includes(e.key)) { show(i + 1); e.preventDefault(); }
    if (['ArrowLeft', 'PageUp', 'ArrowUp'].includes(e.key)) { show(i - 1); e.preventDefault(); }
    if (e.key === 'Home') show(0); if (e.key === 'End') show(slides.length - 1);
  });

  /* ---------- review mode (scroll + comments + draw) ---------- */
  const notes = {};
  let mode = 'present', built = false, color = COLORS[0];
  function fitScroll() { html.style.setProperty('--rz', Math.min(1, (innerWidth - 64) / 1280)); }
  function slideLabel(s, n) {
    const t = s.querySelector('.head .ttl, .statement, .slide.cover h1, .slide.closing h2, .hero-stat .n');
    const txt = t ? t.textContent.trim().replace(/\s+/g, ' ').slice(0, 46) : '';
    return 'Slide ' + (n + 1) + (txt ? ' (' + txt + ')' : '');
  }
  function attachDraw(canvas) {
    const ctx = canvas.getContext('2d');
    let drawing = false, last = null;
    const pos = e => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) }; };
    canvas.addEventListener('pointerdown', e => { drawing = true; last = pos(e); canvas.setPointerCapture(e.pointerId); canvas.dataset.drawn = '1'; });
    canvas.addEventListener('pointermove', e => { if (!drawing) return; const p = pos(e); ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p; });
    canvas.addEventListener('pointerup', () => { drawing = false; });
    canvas.addEventListener('pointercancel', () => { drawing = false; });
  }
  function buildOverlays() {
    if (built) return; built = true;
    slides.forEach((s, n) => {
      const c = el('canvas', 'draw-layer'); c.width = 1280; c.height = 720; c.dataset.slide = n;
      s.appendChild(c); attachDraw(c);
      const note = el('div', 'review-note');
      const lab = el('label'); lab.textContent = slideLabel(s, n);
      const ta = el('textarea'); ta.placeholder = T.note;
      ta.oninput = () => { notes[n] = ta.value; ta.classList.toggle('filled', !!ta.value.trim()); };
      note.append(lab, ta); s.after(note);
    });
  }
  function setMode(m) {
    mode = m; const review = m === 'review';
    body.classList.toggle('review', review);
    html.style.overflow = review ? 'auto' : 'hidden'; html.style.height = review ? 'auto' : '100%';
    body.style.overflow = review ? 'auto' : 'hidden'; body.style.height = review ? 'auto' : '100%';
    menu.querySelector('[data-mode="present"]').classList.toggle('on', !review);
    menu.querySelector('[data-mode="review"]').classList.toggle('on', review);
    send.hidden = !review;
    if (review) { buildOverlays(); fitScroll(); slides.forEach(s => s.classList.add('active')); scrollTo(0, 0); }
    else { fit(); show(i); }
    fab.classList.remove('open');
  }

  /* ---------- chrome wiring ---------- */
  gearBtn.onclick = () => fab.classList.toggle('open');
  menu.querySelector('[data-mode="present"]').onclick = () => setMode('present');
  menu.querySelector('[data-mode="review"]').onclick = () => setMode('review');
  menu.querySelector('[data-full]').onclick = () => {
    fab.classList.remove('open');
    if (!document.fullscreenElement) { if (html.requestFullscreen) html.requestFullscreen().catch(() => {}); }
    else if (document.exitFullscreen) document.exitFullscreen();
  };
  drawbar.querySelectorAll('.dswatch').forEach(sw => sw.onclick = () => { color = sw.dataset.c; drawbar.querySelectorAll('.dswatch').forEach(o => o.classList.toggle('on', o === sw)); });
  drawbar.querySelector('[data-clear]').onclick = () => document.querySelectorAll('.draw-layer').forEach(c => { c.getContext('2d').clearRect(0, 0, c.width, c.height); delete c.dataset.drawn; });

  /* ---------- feedback export ---------- */
  function fallbackCopy(text) { const ta = el('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} body.removeChild(ta); }
  function copyText(text) { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text)); fallbackCopy(text); return Promise.resolve(); }
  function dl(name, url) { const a = el('a'); a.href = url; a.download = name; a.click(); }
  let h2cLoading = null;
  function loadH2C() {
    if (window.html2canvas) return Promise.resolve(window.html2canvas);
    if (h2cLoading) return h2cLoading;
    h2cLoading = new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'; sc.onload = () => res(window.html2canvas); sc.onerror = rej; document.head.appendChild(sc); });
    return h2cLoading;
  }
  send.onclick = async () => {
    const targets = slides.map((s, n) => { const c = s.querySelector('.draw-layer'); return { s, n, note: (notes[n] || '').trim(), drawn: c && c.dataset.drawn === '1' }; }).filter(t => t.note || t.drawn);
    const lines = targets.map(t => '- ' + slideLabel(t.s, t.n) + ': ' + (t.note || T.seeDrawing));
    const prompt = T.prompt(document.title || location.pathname, lines.length ? lines.join('\n') : T.noNotes);
    await copyText(prompt);
    const drawn = targets.filter(t => t.drawn);
    if (drawn.length) {
      send.textContent = T.exporting;
      const onHttp = location.protocol !== 'file:';
      let h2c = null; if (onHttp) { try { h2c = await loadH2C(); } catch (e) {} }
      const prev = html.style.getPropertyValue('--rz'); html.style.setProperty('--rz', '1');
      const PW = 1040, PH = 585, LAB = 58, GAP = 26, PAD = 26;   // one tall sheet, one labelled panel per drawn slide
      const out = el('canvas'); out.width = PW + PAD * 2; out.height = PAD + drawn.length * (LAB + PH + GAP);
      const x = out.getContext('2d');
      x.fillStyle = '#e7e6e3'; x.fillRect(0, 0, out.width, out.height);
      for (let j = 0; j < drawn.length; j++) {
        const t = drawn[j], y = PAD + j * (LAB + PH + GAP), py = y + LAB;
        x.fillStyle = '#0a0a0b'; x.font = '600 24px ui-monospace, Menlo, Consolas, monospace'; x.textBaseline = 'alphabetic';
        x.fillText(('SLIDE ' + (t.n + 1) + (t.note ? '  -  ' + t.note.replace(/\s+/g, ' ') : '')).slice(0, 74), PAD, y + 40);
        if (h2c) { try { const shot = await h2c(t.s, { width: 1280, height: 720, scale: 1, backgroundColor: '#f2f1f0', logging: false, ignoreElements: e2 => e2.classList && e2.classList.contains('draw-layer') }); x.drawImage(shot, PAD, py, PW, PH); } catch (e) { x.fillStyle = '#f2f1f0'; x.fillRect(PAD, py, PW, PH); } }
        else { x.fillStyle = '#f2f1f0'; x.fillRect(PAD, py, PW, PH); }
        x.drawImage(t.s.querySelector('.draw-layer'), PAD, py, PW, PH);
        x.strokeStyle = '#d6d6dc'; x.lineWidth = 1; x.strokeRect(PAD + 0.5, py + 0.5, PW - 1, PH - 1);
      }
      html.style.setProperty('--rz', prev || '0.58');
      let url; try { url = out.toDataURL('image/png'); } catch (e) { url = null; }
      if (url) dl('deck-feedback.png', url);
    }
    send.textContent = T.copied + (drawn.length ? T.imageSaved : '');
    setTimeout(() => { send.textContent = T.send; }, 2800);
  };

  /* ---------- image lightbox (click a screenshot → centred fullscreen) ----------
     Any <img> inside a .screen (or marked [data-zoom]) lifts out of the slide with
     a FLIP morph, lands centred over a blurred scrim, and closes on click / Esc.
     Off in review mode - the draw canvas owns those clicks there. */
  const lbStyle = el('style');
  lbStyle.textContent =
    '.screen img,img[data-zoom]{cursor:zoom-in;}' +
    'body.review .screen img,body.review img[data-zoom]{cursor:inherit;}' +
    '.lightbox{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;' +
    'background:rgba(12,14,20,0);backdrop-filter:blur(0);-webkit-backdrop-filter:blur(0);' +
    'transition:background .4s ease,backdrop-filter .4s ease,-webkit-backdrop-filter .4s ease;cursor:zoom-out;}' +
    '.lightbox.open{background:rgba(12,14,20,.84);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);}' +
    '.lightbox img{max-width:90vw;max-height:90vh;object-fit:contain;border-radius:12px;' +
    'box-shadow:0 40px 120px rgba(0,0,0,.55);transform-origin:center center;' +
    'transition:transform .44s cubic-bezier(.22,1,.36,1);will-change:transform;}';
  document.head.appendChild(lbStyle);

  let box = null;
  function invertTo(srcImg, last) {
    const r = srcImg.getBoundingClientRect();
    const dx = r.left + r.width / 2 - (last.left + last.width / 2);
    const dy = r.top + r.height / 2 - (last.top + last.height / 2);
    return 'translate(' + dx + 'px,' + dy + 'px) scale(' + (r.width / last.width) + ',' + (r.height / last.height) + ')';
  }
  function openLightbox(srcImg) {
    if (box) return;
    box = el('div', 'lightbox');
    const img = el('img'); img.src = srcImg.currentSrc || srcImg.src; img.alt = srcImg.alt || '';
    box.appendChild(img); body.appendChild(box);
    const last = img.getBoundingClientRect();            // where it wants to land (centred)
    img.style.transform = invertTo(srcImg, last);        // pin it back onto the source
    requestAnimationFrame(() => { box.classList.add('open'); img.style.transform = 'none'; });
    const close = () => {
      if (!box) return;
      const b = box; box = null;
      const im = b.querySelector('img');
      im.style.transform = invertTo(srcImg, last);       // morph back to the source spot
      b.classList.remove('open');
      const gone = () => b.remove();
      im.addEventListener('transitionend', gone, { once: true });
      setTimeout(gone, 520);
    };
    box.addEventListener('click', close);
    box._close = close;
  }
  body.addEventListener('click', e => {
    if (mode === 'review') return;
    const img = e.target.closest && e.target.closest('.screen img, img[data-zoom]');
    if (img && !box) { e.preventDefault(); e.stopPropagation(); openLightbox(img); }
  }, true);
  addEventListener('keydown', e => { if (e.key === 'Escape' && box && box._close) box._close(); });

  /* ---------- boot ---------- */
  addEventListener('resize', () => { if (mode === 'review') fitScroll(); else fit(); });
  document.addEventListener('fullscreenchange', () => { mode === 'review' ? fitScroll() : fit(); });
  const h = parseInt(location.hash.slice(1));
  show(h >= 1 && h <= slides.length ? h - 1 : 0);
  fit();
})();
