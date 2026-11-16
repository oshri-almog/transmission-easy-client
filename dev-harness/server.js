// Local test harness: serves the built extension and a fake Transmission RPC
// endpoint with tagged torrents, so the popup UI can be checked in a normal
// browser tab without a real Transmission server.
//
//   node dev-harness/server.js [port]      then open http://localhost:<port>/
//
// No dependencies; only for development.

const http = require('http');
const fs = require('fs');
const path = require('path');

const port = Number(process.argv[2]) || 4719;
const extDir = path.join(__dirname, '..', 'dist', 'chrome', 'src');
const harnessDir = __dirname;

const now = Math.trunc(Date.now() / 1000);
const mk = (id, name, extra) => Object.assign({
  id, name,
  totalSize: 1024 * 1024 * 1024 * (1 + id % 4),
  percentDone: 1, downloadedEver: 1024 * 1024 * 700, uploadedEver: 1024 * 1024 * 300 * id,
  rateUpload: 0, rateDownload: 0, eta: -1,
  peersSendingToUs: 0, peersGettingFromUs: 0, queuePosition: id,
  addedDate: now - id * 86400, doneDate: now - id * 3600, downloadDir: '/downloads',
  recheckProgress: 0, status: 0, error: 0, errorString: '',
  trackerStats: [{seederCount: 10 * id, leecherCount: id}],
  magnetLink: 'magnet:?xt=urn:btih:' + String(id).padStart(40, '0'),
  labels: [],
}, extra);

const torrents = [
  mk(1, 'ubuntu-24.04.1-desktop-amd64.iso', {labels: ['linux', 'iso'], status: 6, rateUpload: 120000, peersGettingFromUs: 3}),
  mk(2, 'debian-12.7.0-amd64-netinst.iso', {labels: ['linux'], status: 4, percentDone: 0.42, rateDownload: 2300000, eta: 380, peersSendingToUs: 12}),
  mk(3, 'Big.Buck.Bunny.1080p.mkv', {labels: ['movies', 'open-source'], status: 0}),
  mk(4, 'Sintel.2010.4K.mkv', {labels: ['movies'], status: 6}),
  mk(5, 'archlinux-2024.11.01-x86_64.iso', {labels: [], status: 3, percentDone: 0.05}),
  mk(6, 'Some podcast season 3', {labels: ['audio', 'to-sort'], status: 4, percentDone: 0.88, rateDownload: 640000, eta: 60}),
];

const session = {
  'download-dir': '/downloads',
  'speed-limit-down': 100, 'speed-limit-down-enabled': false,
  'speed-limit-up': 100, 'speed-limit-up-enabled': false,
  'alt-speed-down': 50, 'alt-speed-up': 50, 'alt-speed-enabled': false,
  'rpc-version': 17, 'version': '4.0.6 (mock)',
};

function pick(t, fields) {
  const r = {};
  (fields || Object.keys(t)).forEach((f) => { if (f in t) r[f] = t[f]; });
  return r;
}

function rpc(body) {
  const a = body.arguments || {};
  const select = (ids) => {
    if (!ids || ids === 'recently-active') return torrents;
    const list = Array.isArray(ids) ? ids : [ids];
    return torrents.filter(t => list.includes(t.id));
  };
  switch (body.method) {
    case 'session-get':
      return {result: 'success', arguments: session};
    case 'session-set':
      Object.assign(session, a);
      return {result: 'success', arguments: {}};
    case 'free-space':
      return {result: 'success', arguments: {path: a.path, 'size-bytes': 512 * 1024 ** 3}};
    case 'torrent-get': {
      const list = select(a.ids).map(t => pick(t, a.fields));
      const args = {torrents: list};
      if (a.ids === 'recently-active') args.removed = [];
      return {result: 'success', arguments: args};
    }
    case 'torrent-set': {
      select(a.ids).forEach((t) => {
        if (Array.isArray(a.labels)) t.labels = a.labels.slice(0);
      });
      return {result: 'success', arguments: {}};
    }
    case 'torrent-start': case 'torrent-start-now':
      select(a.ids).forEach(t => { t.status = t.percentDone === 1 ? 6 : 4; });
      return {result: 'success', arguments: {}};
    case 'torrent-stop':
      select(a.ids).forEach(t => { t.status = 0; });
      return {result: 'success', arguments: {}};
    default:
      return {result: 'success', arguments: {}};
  }
}

const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.gif': 'image/gif',
};

function serveFile(res, file) {
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream'});
    res.end(data);
  });
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/transmission/rpc' && req.method === 'POST') {
    let raw = '';
    req.on('data', c => raw += c);
    req.on('end', () => {
      if (req.headers['x-transmission-session-id'] !== 'mock-session') {
        res.writeHead(409, {'X-Transmission-Session-Id': 'mock-session'});
        res.end();
        return;
      }
      const out = rpc(JSON.parse(raw || '{}'));
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify(out));
    });
    return;
  }
  if (url.pathname.startsWith('/ext/')) {
    const file = path.normalize(path.join(extDir, decodeURIComponent(url.pathname.slice(5))));
    if (!file.startsWith(extDir)) { res.writeHead(403); res.end(); return; }
    return serveFile(res, file);
  }
  const name = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
  const file = path.normalize(path.join(harnessDir, name));
  if (!file.startsWith(harnessDir)) { res.writeHead(403); res.end(); return; }
  serveFile(res, file);
}).listen(port, '127.0.0.1', () => {
  console.log(`harness on http://localhost:${port}/`);
});
