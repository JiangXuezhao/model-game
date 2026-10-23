const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'docs');
fs.mkdirSync(output, { recursive: true });
// Publish only self-contained static application assets, not tests or dev tools.
const assets = fs.readdirSync(root).filter(name => /\.(html|css|js|svg|png|jpg|webp|ico)$/.test(name) && fs.statSync(path.join(root, name)).isFile());
for (const name of assets) fs.copyFileSync(path.join(root, name), path.join(output, name));
fs.writeFileSync(path.join(output, '.nojekyll'), '');
for (const name of assets.filter(n => n.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(output, name), 'utf8');
  for (const [,url] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (/^(?:[a-z]+:|#|\/)/i.test(url)) continue;
    const local = url.split(/[?#]/)[0];
    if (local && !fs.existsSync(path.join(output, local))) throw new Error(`${name}: missing asset ${local}`);
  }
}
const bytes = assets.reduce((total, name) => total + fs.statSync(path.join(output, name)).size, 0);
console.log(`Static site: ${assets.length} assets, ${(bytes / 1024).toFixed(1)} KiB uncompressed → docs/`);
