// Agent Office — localhost-only visual status board for the cursor-agent / Claude-mode crew.
// Tails complyhub-kb/agent-office/logs/agents.jsonl (written by dispatch.sh or log-agent-event.py)
// and streams state to the browser over Server-Sent Events. No external deps, no build step.
//
// Multi-instance support (added 16 Jul 2026): state is keyed by agent_id, not role, so two
// concurrent dispatches of the same role (e.g. two Scouts, one per PR, from two separate
// conversations both writing to this same log file) show up as two distinct instances rather than
// one overwriting the other. The client groups instances by role for display.

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.AGENT_OFFICE_PORT || 4173;
const LOG_FILE = path.join(__dirname, 'logs', 'agents.jsonl');
const PUBLIC_DIR = path.join(__dirname, 'public');

const ROLES = ['scout', 'hound', 'compass', 'tinker', 'sentinel', 'checker'];

// instance_id -> {agent_id, role, status, model, task, reason, result, updated_ts}
const instances = {};

let logOffset = 0;
const clients = new Set();

function broadcast(type, payload) {
  const data = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of clients) res.write(data);
}

function applyEvent(evt) {
  if (!evt || !ROLES.includes(evt.role) || !evt.agent_id) return;
  const id = evt.agent_id;
  const inst = instances[id] || { agent_id: id, role: evt.role, status: 'idle', reason: null, result: null };
  inst.role = evt.role;
  inst.model = evt.model;
  inst.task = evt.task;
  inst.updated_ts = evt.ts;
  if (evt.event === 'started') {
    inst.status = 'running';
    inst.reason = null;
  } else if (evt.event === 'completed') {
    inst.status = 'completed';
    inst.reason = null;
    inst.result = evt.result;
  } else if (evt.event === 'blocked') {
    inst.status = 'blocked';
    inst.reason = evt.reason;
  } else if (evt.event === 'error') {
    inst.status = 'error';
    inst.reason = evt.reason;
  }
  instances[id] = inst;
  broadcast('instance_update', inst);
}

function readNewLines() {
  fs.stat(LOG_FILE, (err, stats) => {
    if (err) return; // log file doesn't exist yet — nothing dispatched this session
    if (stats.size < logOffset) logOffset = 0; // file was truncated/rotated
    if (stats.size === logOffset) return; // nothing new

    const stream = fs.createReadStream(LOG_FILE, { start: logOffset, end: stats.size - 1, encoding: 'utf8' });
    let buf = '';
    stream.on('data', (chunk) => { buf += chunk; });
    stream.on('end', () => {
      logOffset = stats.size;
      const lines = buf.split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          applyEvent(JSON.parse(line));
        } catch (e) {
          // malformed line — skip, don't crash the tailer
        }
      }
    });
  });
}

// Initial full read at startup so a restarted server picks up prior state this session —
// including any instances left mid-flight by an earlier server process (e.g. this restart itself).
function initialRead() {
  if (!fs.existsSync(LOG_FILE)) return;
  const content = fs.readFileSync(LOG_FILE, 'utf8');
  logOffset = Buffer.byteLength(content, 'utf8');
  for (const line of content.split('\n').filter(Boolean)) {
    try { applyEvent(JSON.parse(line)); } catch (e) { /* skip malformed */ }
  }
}
initialRead();

fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
setInterval(readNewLines, 1000);

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  if (req.url === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': 'http://localhost:' + PORT,
    });
    res.write('event: snapshot\n');
    res.write(`data: ${JSON.stringify(Object.values(instances))}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(PUBLIC_DIR, path.normalize(filePath).replace(/^(\.\.[/\\])+/, ''));
  if (!filePath.startsWith(PUBLIC_DIR)) { res.writeHead(403); res.end('Forbidden'); return; }

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Agent Office running at http://localhost:${PORT} (localhost only)`);
});
