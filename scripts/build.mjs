// esbuild 번들: src/ → www/ (웹 · Electron · Capacitor 가 모두 www/ 를 사용)
import { build, context } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const watch = process.argv.includes('--watch'), serve = process.argv.includes('--serve');
const cfg = process.env.FIREBASE_CONFIG_JSON;
if (cfg) { try { JSON.parse(cfg); } catch { console.error('FIREBASE_CONFIG_JSON 이 올바른 JSON 이 아닙니다.'); process.exit(1); } }

await rm('www', { recursive: true, force: true });
await mkdir('www/img', { recursive: true });
await cp('src/index.html', 'www/index.html');
await cp('assets/logo.png', 'www/img/logo.png');
await cp('assets/icon-1024.png', 'www/img/icon.png');

const opts = {
  entryPoints: { app: 'src/main.js' }, outdir: 'www', bundle: true, format: 'iife', target: ['chrome100', 'safari15'],
  minify: !watch, sourcemap: watch, logLevel: 'info', legalComments: 'none',
  loader: { '.woff2': 'file', '.woff': 'file' }, assetNames: 'fonts/[name]-[hash]',
  define: { __FIREBASE_CONFIG__: cfg ? cfg : 'undefined' },
};
if (watch) {
  const ctx = await context(opts); await ctx.watch();
  if (serve) {
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.map': 'application/json' };
    http.createServer(async (req, res) => {
      const p = path.join('www', decodeURIComponent(req.url.split('?')[0]).replace(/^\/+$/, '/index.html'));
      try { res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); res.end(await readFile(p)); } catch { res.writeHead(404); res.end('not found'); }
    }).listen(5173, () => console.log('http://localhost:5173'));
  }
} else { await build(opts); }
