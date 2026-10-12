// Post-build step for hosting under a sub-path (GitHub Pages project sites).
// The site is written with root-absolute links ("/atlas/", "/data/x.json"); Astro's `base`
// only prefixes its own bundles, so this rewrites the remaining ones in dist/ and then checks
// that every internal link in the built HTML points at a file that exists.
// Usage: node scripts/prefix-base.mjs /repo-name
import fs from 'node:fs';
import path from 'node:path';

const base = (process.argv[2] || '').replace(/\/+$/, '');
const dist = path.resolve('dist');
if (!base || base === '/') { console.log('prefix-base: no base, nothing to do'); process.exit(0); }

const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const tops = fs.readdirSync(dist).filter(n => n !== '_astro' && n !== 'index.html');
const names = tops.map(esc).join('|');
// delimiter, then "/<top-level entry>" followed by "/", a closing delimiter, "?" or "#"
const DELIM = '(["\'`(=]|&quot;|&#34;|\\s)';
const reTop = new RegExp(`${DELIM}/(${names})(?=[/"'\`)?#\\s]|&quot;|&#34;|$)`, 'g');
const reRoot = /((?:href|action)=["'])\/(?=["'#?])/g;
// Absolute URLs built from `site` alone (og:image and friends) also miss the base.
const origin = (process.env.SITE_URL || '').replace(/\/+$/, '');
const reOrigin = new RegExp(`${esc(origin)}/(${names})(?=[/"'?#\\s])`, 'g');

const files = walk(dist).filter(f => /\.(html|js|mjs|css|xml|webmanifest|txt)$/.test(f));
let changed = 0;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  let out = src.replace(reTop, (_, d, n) => `${d}${base}/${n}`);
  if (f.endsWith('.html')) out = out.replace(reRoot, (_, p) => `${p}${base}/`);
  if (origin) out = out.replace(reOrigin, (_, n) => `${origin}${base}/${n}`);
  if (out !== src) { fs.writeFileSync(f, out); changed++; }
}

// Verify: every root-absolute reference in the HTML must sit under base and resolve to a file.
const problems = new Set();
let checked = 0;
for (const f of files.filter(f => f.endsWith('.html'))) {
  const html = fs.readFileSync(f, 'utf8');
  for (const m of html.matchAll(/(?:href|src|action|poster)=["'](\/[^"'#?]*)/g)) {
    const url = decodeURIComponent(m[1]);
    if (url.startsWith('//')) continue;
    checked++;
    if (url !== base && !url.startsWith(base + '/')) { problems.add(`${path.relative(dist, f)}: outside base → ${url}`); continue; }
    const rel = url.slice(base.length) || '/';
    const target = path.join(dist, rel);
    const ok = fs.existsSync(target) && (fs.statSync(target).isFile() || fs.existsSync(path.join(target, 'index.html')));
    if (!ok) problems.add(`broken → ${url}`);
  }
}
console.log(`prefix-base: ${changed} files rewritten, ${checked} links checked, ${problems.size} problems`);
if (problems.size) { [...problems].slice(0, 40).forEach(p => console.log('  ' + p)); process.exit(1); }
