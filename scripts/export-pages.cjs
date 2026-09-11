// Export only reader-facing files. Source and tooling remain in the repository.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const output = path.join(root, '_site');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'build-manifest.json'), 'utf8'));

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

function copy(relative) {
  const source = path.resolve(root, relative);
  assert.ok(source.startsWith(root + path.sep), `Invalid export path: ${relative}`);
  fs.cpSync(source, path.join(output, relative), { recursive: true });
}

for (const name of ['assets', 'data', 'notebooks', 'style.css', 'book.css', 'app.js',
  'app.js.LEGAL.txt', 'site.js', 'search-index.js', 'THIRD_PARTY_NOTICES.md']) copy(name);
fs.mkdirSync(path.join(output, 'vendor'), { recursive: true });
for (const name of fs.readdirSync(path.join(root, 'vendor'))) {
  if (/LICENSE/i.test(name)) copy('vendor/' + name);
}
for (const page of manifest.pages) {
  copy(page.href);
  copy(page.file + '.md');
}
const home = manifest.pages[0];
if (home.file !== 'index') copy(home.file + '.html');
fs.writeFileSync(path.join(output, '.nojekyll'), '');

// Catch missing downloads, images, fonts and styles before publishing, including
// links resolved beneath a GitHub Pages project path rather than the host root.
let checked = 0;
function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}
const origin = 'https://example.invalid/quantitative-finance-notes/';
for (const file of walk(output).filter(file => /\.(html|css)$/.test(file))) {
  const relative = path.relative(output, file).split(path.sep).join('/');
  const text = fs.readFileSync(file, 'utf8');
  const refs = file.endsWith('.html')
    ? [...text.matchAll(/(?:href|src)=["']([^"']+)["']/g)].map(match => match[1])
    : [...text.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g)].map(match => match[1]);
  for (const ref of refs) {
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(ref)) continue;
    const url = new URL(ref.replaceAll('&amp;', '&'), new URL(relative, origin));
    assert.ok(url.href.startsWith(origin), `${relative}: link escapes the project path: ${ref}`);
    let target = decodeURIComponent(url.pathname.slice(new URL(origin).pathname.length));
    if (!target || target.endsWith('/')) target += 'index.html';
    assert.ok(fs.existsSync(path.join(output, target)), `${relative}: missing ${ref}`);
    checked++;
  }
}
for (const name of ['.git', '.env', 'node_modules', 'src', 'qa', 'revisions', 'production.md']) {
  assert.ok(!fs.existsSync(path.join(output, name)), `Unexpected deployment file: ${name}`);
}
console.log(`Exported ${walk(output).length} files to _site; ${checked} local links and assets verified.`);
