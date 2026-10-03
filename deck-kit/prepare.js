#!/usr/bin/env node
/*
 * prepare.js: creates the folder of a presentation in Downloads, with
 * everything needed to open it on any computer.
 *
 * Usage (from the repo root):
 *   node deck-kit/prepare.js <folder-name>
 * Example:
 *   node deck-kit/prepare.js rossi_progress-update_2026-03-12
 *
 * Creates ~/Downloads/<folder-name>/ with:
 *   kit/     deck.css, deck.js, tokens.default.css (copied from deck-kit/)
 *   brand/   all of company/brand/ (tokens.css, logo, fonts)
 *   index.html  copied from deck-kit/template.html, only if it does not exist yet
 *
 * If the folder already exists, it refreshes kit/ and brand/ and leaves
 * index.html alone, so a presentation in progress is never lost.
 * At the end it prints the full path of the folder.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const name = process.argv[2];
if (!name || /[\\/]/.test(name)) {
  console.error('Usage: node deck-kit/prepare.js <folder-name>  (just the name, no path)');
  process.exit(2);
}

const repo = path.resolve(__dirname, '..');
const kitSrc = path.join(repo, 'deck-kit');
const brandSrc = path.join(repo, 'company', 'brand');
const dest = path.join(os.homedir(), 'Downloads', name);

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name), d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else if (!entry.name.endsWith('.md')) fs.copyFileSync(s, d);   // brand.md stays in the repo
  }
}

fs.mkdirSync(path.join(dest, 'kit'), { recursive: true });
for (const f of ['deck.css', 'deck.js', 'tokens.default.css']) {
  fs.copyFileSync(path.join(kitSrc, f), path.join(dest, 'kit', f));
}

if (fs.existsSync(brandSrc)) {
  copyDir(brandSrc, path.join(dest, 'brand'));
} else {
  fs.mkdirSync(path.join(dest, 'brand'), { recursive: true });
  console.warn('Warning: company/brand/ does not exist yet. The slides will use the default colors and fonts.');
}

const index = path.join(dest, 'index.html');
if (!fs.existsSync(index)) {
  fs.copyFileSync(path.join(kitSrc, 'template.html'), index);
}

console.log(dest);
