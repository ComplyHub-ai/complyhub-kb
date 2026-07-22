// Agent Office client — Canvas office scene + dashboard, driven by SSE from server.js.
// No framework, no build step.
//
// Multi-instance support (added 16 Jul 2026): state is keyed by agent_id (an "instance"), not role,
// so two concurrent dispatches of the same role — e.g. two Scouts, one per PR, from two separate
// Claude Code conversations both writing to the shared log — render as two distinct characters/cards
// instead of one overwriting the other. When a role has zero active instances, one idle "wandering"
// representative is shown instead, same as before.

const ROLES = ['scout', 'hound', 'compass', 'tinker', 'sentinel', 'checker'];

// Per-role identity: full outfit design, drawn as a small detailed pixel-art character.
// "maker" is Claude Code itself — always present, never dispatched via the log — drawn as a
// permanent fixture at the workbench.
//
// Fields: color (status-ring/legacy accent), label, prop (drawn glyph as fallback/reason-line icon),
// shirt/shirtAccent (jacket + collar/trim), pants, shoes, skin, hair/hairAccent, hairStyle
// (short|slick|ponytail|cap), accessory (glasses|none), heldProp (drawn in-hand shape id),
// backAccessory (backpack|shield|none).
const IDENTITY = {
  scout: {
    color: '#23C0DD', prop: '🎒', label: 'Scout',
    shirt: '#1f8fae', shirtAccent: '#23C0DD', pants: '#8a7c5c', shoes: '#4a3a24',
    skin: '#f2d3a8', hair: '#6b4423', hairStyle: 'short',
    accessory: 'none', heldProp: 'none', backAccessory: 'backpack',
  },
  hound: {
    color: '#7130A0', prop: '🔍', label: 'Hound',
    shirt: '#5a2680', shirtAccent: '#7130A0', pants: '#2b2233', shoes: '#1a1a1a',
    skin: '#e8b98a', hair: '#1a1a1a', hairStyle: 'slick',
    accessory: 'none', heldProp: 'magnifier', backAccessory: 'none',
  },
  compass: {
    color: '#A6F1FF', prop: '🧭', label: 'Compass',
    shirt: '#eef8ff', shirtAccent: '#A6F1FF', pants: '#8a7c5c', shoes: '#4a3a24',
    skin: '#f2d3a8', hair: '#8a5a2e', hairStyle: 'short',
    accessory: 'glasses', heldProp: 'compass', backAccessory: 'none',
  },
  maker: {
    color: '#F9CB0C', prop: '🔧', label: 'Maker (you)',
    shirt: '#c99a1f', shirtAccent: '#F9CB0C', pants: '#3a3a3a', shoes: '#2a2a2a',
    skin: '#e8b98a', hair: '#2a2a2a', hairStyle: 'cap',
    accessory: 'none', heldProp: 'wrench', backAccessory: 'none',
  },
  tinker: {
    color: '#44235F', prop: '⚙️', label: 'Tinker',
    shirt: '#382050', shirtAccent: '#44235F', pants: '#22252b', shoes: '#1a1a1a',
    skin: '#f2d3a8', hair: '#4a4a4a', hairStyle: 'cap',
    accessory: 'none', heldProp: 'gear', backAccessory: 'none',
  },
  sentinel: {
    color: '#ED1878', prop: '🛡️', label: 'Sentinel',
    shirt: '#a3134f', shirtAccent: '#ED1878', pants: '#2b2233', shoes: '#1a1a1a',
    skin: '#e8b98a', hair: '#1a1a1a', hairStyle: 'short',
    accessory: 'none', heldProp: 'none', backAccessory: 'shield',
  },
  checker: {
    color: '#9B7FB8', prop: '📋', label: 'Checker',
    shirt: '#f2eefa', shirtAccent: '#9B7FB8', pants: '#5a4a70', shoes: '#33283f',
    skin: '#f2d3a8', hair: '#3a2a1a', hairStyle: 'ponytail',
    accessory: 'glasses', heldProp: 'clipboard', backAccessory: 'none',
  },
};

const IDLE_LINES = {
  scout: ["Nothing to map right now.", "Keeping an eye on the codebase.", "Recon's quiet today.", "Just stretching my legs."],
  hound: ["No trails to sniff.", "Waiting for a bug to chase.", "Sharpening the nose.", "Patrolling for suspicious code."],
  compass: ["No decisions to weigh.", "Contemplating tradeoffs.", "Ready to plan when needed.", "Staring at the map."],
  maker: ["Always on duty.", "Holding the commit/push gates.", "Watching the branch.", "Never leaves the workbench."],
  tinker: ["Wrench in hand, nothing to fix.", "Gauntlet's ready when you are.", "Idle tools, quiet gears.", "Polishing the toolkit."],
  sentinel: ["Standing watch.", "No verdicts to render.", "Guarding the merge gate.", "Pacing near the gate."],
  checker: ["Fresh eyes, nothing to check yet.", "Clipboard's empty.", "Waiting to verify something.", "Double-checking the coffee machine."],
};

// Each role has a "desk" (where it works when active) and a "patrol" box (where it wanders when idle).
// Desk y-values must clear the wall band (WALL_H, see drawRoom) with room for a standing character's
// head, or the sprite visually clips into the wall. Extra desk offsets are used when a role has more
// than one concurrent active instance (see deskOffsetFor).
const LAYOUT = {
  scout:    { desk: { x: 90,  y: 150 }, patrol: { x: 40,  y: 100, w: 140, h: 90 } },
  hound:    { desk: { x: 300, y: 150 }, patrol: { x: 250, y: 100, w: 140, h: 90 } },
  compass:  { desk: { x: 510, y: 150 }, patrol: { x: 460, y: 100, w: 140, h: 90 } },
  maker:    { desk: { x: 720, y: 150 }, patrol: { x: 690, y: 120, w: 60,  h: 60 } },
  tinker:   { desk: { x: 90,  y: 330 }, patrol: { x: 40,  y: 280, w: 140, h: 90 } },
  sentinel: { desk: { x: 300, y: 330 }, patrol: { x: 250, y: 280, w: 140, h: 90 } },
  checker:  { desk: { x: 510, y: 330 }, patrol: { x: 460, y: 280, w: 140, h: 90 } },
};

// Offsets for the 2nd, 3rd, 4th... concurrent instance of the same role, relative to its base desk.
const DESK_OFFSETS = [
  { x: 0, y: 0 }, { x: 44, y: 0 }, { x: -44, y: 0 }, { x: 0, y: 46 }, { x: 44, y: 46 }, { x: -44, y: 46 },
];
function deskOffsetFor(role, index) {
  const base = LAYOUT[role].desk;
  const off = DESK_OFFSETS[index % DESK_OFFSETS.length];
  return { x: base.x + off.x, y: base.y + off.y };
}

const CANVAS_W = 820, CANVAS_H = 440;
const canvas = document.getElementById('office');
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;
const ctx = canvas.getContext('2d');

// --- Instance state (from server, keyed by agent_id) ---
const instances = {}; // agent_id -> {agent_id, role, status, model, task, reason, result, updated_ts}
const COMPLETED_GRACE_MS = 8000;   // how long a "completed" instance stays visible before disappearing
const STALE_AFTER_MS = 2 * 60 * 1000; // blocked/error instances auto-clear after this
const RUNNING_STALE_AFTER_MS = 10 * 60 * 1000; // self-heal for a forgotten Claude-mode completion call

function applyInstanceUpdate(inst) {
  if (!inst || !ROLES.includes(inst.role) || !inst.agent_id) return;
  instances[inst.agent_id] = inst;
}

function pruneStaleInstances() {
  const now = Date.now();
  for (const [id, inst] of Object.entries(instances)) {
    const age = now - (inst.updated_ts || 0);
    if (inst.status === 'completed' && age > COMPLETED_GRACE_MS) delete instances[id];
    else if ((inst.status === 'blocked' || inst.status === 'error') && age > STALE_AFTER_MS) delete instances[id];
    else if (inst.status === 'running' && age > RUNNING_STALE_AFTER_MS) delete instances[id];
  }
}

// Active (still worth showing as its own character/card) instances for a role, oldest first so
// desk-offset assignment stays stable frame to frame instead of jittering.
function activeInstancesForRole(role) {
  return Object.values(instances)
    .filter((i) => i.role === role)
    .sort((a, b) => (a.updated_ts || 0) - (b.updated_ts || 0));
}

// Short distinguishing label for a dashboard card / office label when multiple instances share a
// role — pulls "PR #123" out of the task text if present, else a truncated task snippet.
function instanceTag(inst) {
  const m = (inst.task || '').match(/PR\s*#?\d+/i);
  if (m) return m[0].toUpperCase().replace(/\s+/, ' ');
  return truncate(inst.task || '', 18);
}

// --- Per-slot movement/animation state. Slot key is either an agent_id (active instance) or
// `${role}:idle` (the idle wandering representative shown when a role has no active instances). ---
const chars = {};
const bubbles = {}; // slotKey -> {text, until} — only used for idle representatives

function ensureChar(slotKey, role, startAtDesk) {
  if (chars[slotKey]) return chars[slotKey];
  const start = startAtDesk || LAYOUT[role].desk;
  chars[slotKey] = {
    x: start.x, y: start.y, targetX: start.x, targetY: start.y,
    facing: 1, mode: 'idle', nextWanderAt: performance.now() + Math.random() * 3000,
  };
  return chars[slotKey];
}

function pickWanderTarget(role) {
  const p = LAYOUT[role].patrol;
  return { x: p.x + 20 + Math.random() * (p.w - 40), y: p.y + 20 + Math.random() * (p.h - 40) };
}

function maybeSpeak(slotKey, role) {
  if (bubbles[slotKey] && bubbles[slotKey].until > performance.now()) return;
  const lines = IDLE_LINES[role] || ['...'];
  const text = lines[Math.floor(Math.random() * lines.length)];
  bubbles[slotKey] = { text, until: performance.now() + 4000 };
}

setInterval(() => {
  // Idle chatter only makes sense for roles currently showing their idle representative.
  const idleRoles = ROLES.filter((r) => activeInstancesForRole(r).length === 0);
  if (!idleRoles.length) return;
  const r = idleRoles[Math.floor(Math.random() * idleRoles.length)];
  if (Math.random() < 0.5) maybeSpeak(`${r}:idle`, r);
}, 3000);

function updateMovement(slotKey, role, desk, isBusy, now, dtMs) {
  const c = ensureChar(slotKey, role, desk);

  if (isBusy) {
    c.targetX = desk.x; c.targetY = desk.y + 18; // sit at the chair, just below the desk
    const dist = Math.hypot(c.targetX - c.x, c.targetY - c.y);
    c.mode = dist > 4 ? 'walking-to-desk' : 'working';
  } else {
    if (c.mode === 'working' || c.mode === 'walking-to-desk') {
      c.mode = 'idle-wander';
      c.nextWanderAt = now + 500 + Math.random() * 1500;
    }
    if (now >= c.nextWanderAt) {
      const t = pickWanderTarget(role);
      c.targetX = t.x; c.targetY = t.y;
      c.nextWanderAt = now + 2500 + Math.random() * 3000;
    }
  }

  const speed = 0.045; // px per ms
  const dx = c.targetX - c.x, dy = c.targetY - c.y;
  const dist = Math.hypot(dx, dy);
  if (dist > 1) {
    const step = Math.min(dist, speed * dtMs);
    c.x += (dx / dist) * step;
    c.y += (dy / dist) * step;
    c.facing = dx >= 0 ? 1 : -1;
  }
  return c;
}

// Vivacity / ComplyHub brand palette.
const BRAND = {
  purple: '#7130A0',
  fuchsia: '#ED1878',
  cyan: '#23C0DD',
  lightCyan: '#A6F1FF',
  acai: '#44235F',
  lightPurple: '#DFD8E8',
  macaron: '#F9CB0C',
};

const STATUS_GLOW = { idle: '#5b6478', active: '#3fb950', running: '#3fb950', completed: '#3fb950', blocked: BRAND.macaron, error: BRAND.fuchsia };

const WOOD = {
  floorLight: '#c99a63',
  floorDark: '#b8875098',
  floorPlank: 'rgba(94,62,27,0.35)',
  wallLight: '#8a5a34',
  wallDark: '#6e4527',
  panelTrim: '#3d2716',
  deskWood: '#5e3e1b',
  deskEdge: '#3d2716',
  chairWood: '#4a2f16',
};

const WALL_H = 90;

// Compute the render "slots" for this frame: one per active instance, or one idle representative
// per role with none. Each slot: {key, role, status, task, model, x, y (desk position)}.
function computeSlots() {
  const slots = [];
  for (const role of ROLES) {
    const active = activeInstancesForRole(role);
    if (active.length === 0) {
      slots.push({ key: `${role}:idle`, role, status: 'idle', task: null, model: null, desk: LAYOUT[role].desk, isIdleRepresentative: true });
    } else {
      active.forEach((inst, i) => {
        slots.push({ key: inst.agent_id, role, status: inst.status, task: inst.task, model: inst.model, reason: inst.reason, desk: deskOffsetFor(role, i), isIdleRepresentative: false });
      });
    }
  }
  // Maker is always a fixture, never dispatched via the log.
  slots.push({ key: 'maker:fixture', role: 'maker', status: 'active', task: 'Orchestrating', model: 'claude', desk: LAYOUT.maker.desk, isIdleRepresentative: true });
  return slots;
}

function drawRoom(slots) {
  // --- wood plank floor ---
  ctx.fillStyle = WOOD.floorLight;
  ctx.fillRect(0, WALL_H, CANVAS_W, CANVAS_H - WALL_H);
  ctx.strokeStyle = WOOD.floorPlank;
  ctx.lineWidth = 1;
  const plankH = 22;
  for (let y = WALL_H; y <= CANVAS_H; y += plankH) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke();
    const offset = ((y - WALL_H) / plankH) % 2 === 0 ? 0 : 60;
    for (let x = -60 + offset; x <= CANVAS_W; x += 120) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + plankH); ctx.stroke();
    }
  }

  // --- wood-paneled wall (upper band) ---
  const wallGrad = ctx.createLinearGradient(0, 0, 0, WALL_H);
  wallGrad.addColorStop(0, WOOD.wallLight);
  wallGrad.addColorStop(1, WOOD.wallDark);
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, CANVAS_W, WALL_H);
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 2;
  for (let x = 0; x <= CANVAS_W; x += 90) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WALL_H); ctx.stroke();
  }
  ctx.fillStyle = WOOD.panelTrim;
  ctx.fillRect(0, WALL_H - 6, CANVAS_W, 6);

  // --- purple→fuchsia gradient header banner ---
  const grad = ctx.createLinearGradient(0, 0, CANVAS_W, 0);
  grad.addColorStop(0, BRAND.purple);
  grad.addColorStop(1, BRAND.fuchsia);
  ctx.fillStyle = grad;
  ctx.fillRect(CANVAS_W / 2 - 140, 8, 280, 22);
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText('COMPLYHUB — AGENT OFFICE', CANVAS_W / 2, 23);

  // --- framed brand-color art panels on the wall ---
  const artColors = [BRAND.cyan, BRAND.macaron, BRAND.lightCyan, BRAND.fuchsia];
  const artXs = [30, CANVAS_W - 150, 340];
  artXs.forEach((x, i) => {
    ctx.fillStyle = WOOD.panelTrim;
    ctx.fillRect(x, 36, 46, 34);
    ctx.fillStyle = artColors[i % artColors.length];
    ctx.fillRect(x + 4, 40, 38, 26);
  });

  // --- desks, chairs, PC monitors — one per slot, so extra instances get extra desks ---
  for (const slot of slots) {
    const d = slot.desk;
    const glow = STATUS_GLOW[slot.status] || STATUS_GLOW.idle;

    ctx.fillStyle = WOOD.chairWood;
    ctx.fillRect(d.x - 8, d.y + 26, 16, 4);
    ctx.fillRect(d.x - 8, d.y + 14, 3, 16);
    ctx.fillRect(d.x + 5, d.y + 14, 3, 16);

    ctx.fillStyle = WOOD.deskWood;
    ctx.fillRect(d.x - 28, d.y + 14, 56, 16);
    ctx.fillStyle = WOOD.deskEdge;
    ctx.fillRect(d.x - 28, d.y + 26, 56, 4);
    ctx.fillStyle = '#7a5228';
    ctx.fillRect(d.x - 28, d.y + 10, 56, 6);

    ctx.fillStyle = '#2b2f3a';
    ctx.fillRect(d.x - 3, d.y + 4, 6, 8);
    ctx.fillStyle = '#12141a';
    ctx.fillRect(d.x - 14, d.y - 8, 28, 16);
    ctx.fillStyle = glow;
    ctx.globalAlpha = slot.status === 'idle' ? 0.35 : 0.85;
    ctx.fillRect(d.x - 12, d.y - 6, 24, 12);
    ctx.globalAlpha = 1;
    if (slot.status === 'running' || slot.status === 'active') {
      ctx.save();
      ctx.shadowColor = glow;
      ctx.shadowBlur = 10;
      ctx.fillStyle = glow;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(d.x - 12, d.y - 6, 24, 12);
      ctx.restore();
    }
  }

  // --- coffee station on a purple→fuchsia gradient rug ---
  const cx = CANVAS_W / 2, cy = CANVAS_H / 2 + 10;
  const rugGrad = ctx.createLinearGradient(cx - 40, 0, cx + 40, 0);
  rugGrad.addColorStop(0, BRAND.purple);
  rugGrad.addColorStop(1, BRAND.fuchsia);
  ctx.fillStyle = rugGrad;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 14, 46, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = WOOD.deskWood;
  ctx.fillRect(cx - 16, cy - 10, 32, 22);
  ctx.fillStyle = BRAND.cyan;
  ctx.fillRect(cx - 16, cy - 14, 32, 6);
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.fillText('☕', cx, cy - 18);

  for (const px of [40, CANVAS_W - 40]) {
    ctx.fillStyle = BRAND.macaron;
    ctx.fillRect(px - 8, CANVAS_H - 34, 16, 12);
    ctx.font = '18px sans-serif';
    ctx.fillText('🌿', px, CANVAS_H - 26);
  }
}

function drawCharacter(slot, t) {
  const id = IDENTITY[slot.role];
  const c = chars[slot.key];
  if (!c) return;
  const sitting = c.mode === 'working';
  const walking = c.mode === 'walking-to-desk' || (c.mode === 'idle-wander' && Math.hypot(c.targetX - c.x, c.targetY - c.y) > 2);
  const bob = sitting ? Math.sin(t / 500) * 1 : walking ? Math.abs(Math.sin(t / 120)) * 4 : Math.sin(t / 600) * 1.5;
  const legSwing = walking ? Math.sin(t / 110) * 5 : 0;

  ctx.save();
  ctx.translate(c.x, c.y - bob);
  ctx.scale(c.facing, 1);

  if (sitting) {
    const head = { x: -8, y: -30, w: 16, h: 14 };
    drawHairBack(id, head);
    drawBackAccessory(id, sitting);

    ctx.fillStyle = id.shoes;
    ctx.fillRect(-9, 4, 7, 6);
    ctx.fillRect(2, 4, 7, 6);
    ctx.fillStyle = id.pants;
    ctx.fillRect(-9, -4, 7, 8);
    ctx.fillRect(2, -4, 7, 8);

    ctx.fillStyle = id.shirt;
    ctx.fillRect(-11, -18, 22, 16);
    ctx.fillStyle = id.shirtAccent;
    ctx.fillRect(-11, -18, 22, 4);

    ctx.fillStyle = id.skin;
    ctx.fillRect(head.x, head.y, head.w, head.h);
    drawHairFront(id, head);
    drawAccessory(id, head);
    ctx.fillStyle = '#222';
    ctx.fillRect(-4, -25, 3, 3);
    ctx.fillRect(2, -25, 3, 3);

    drawHeldProp(id, -14, -6);
  } else {
    const head = { x: -9, y: -34, w: 18, h: 16 };
    drawHairBack(id, head);
    drawBackAccessory(id, sitting);

    const lx1 = -10 + legSwing * 0.3, lx2 = 3 - legSwing * 0.3;
    ctx.fillStyle = id.pants;
    ctx.fillRect(lx1, 8, 8, 7);
    ctx.fillRect(lx2, 8, 8, 7);
    ctx.fillStyle = id.shoes;
    ctx.fillRect(lx1, 15, 8, 3);
    ctx.fillRect(lx2, 15, 8, 3);

    ctx.fillStyle = id.shirt;
    ctx.fillRect(-12, -20, 24, 28);
    ctx.fillStyle = id.shirtAccent;
    ctx.fillRect(-12, -20, 24, 6);
    ctx.fillRect(-12, -20, 4, 28);
    ctx.fillRect(8, -20, 4, 28);

    ctx.fillStyle = id.skin;
    ctx.fillRect(head.x, head.y, head.w, head.h);
    drawHairFront(id, head);
    drawAccessory(id, head);
    ctx.fillStyle = '#222';
    ctx.fillRect(-5, -28, 3, 3);
    ctx.fillRect(3, -28, 3, 3);

    drawHeldProp(id, -16, -2);
  }

  const ringColor = STATUS_GLOW[slot.status] || STATUS_GLOW.idle;
  ctx.strokeStyle = ringColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -6, 26, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();

  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(id.prop, c.x, c.y - bob - 42);
  ctx.font = '10px sans-serif';
  ctx.fillStyle = '#e6e8ee';
  const label = slot.isIdleRepresentative ? id.label : `${id.label} — ${instanceTag(slot)}`;
  ctx.fillText(label, c.x, c.y - bob + 34);

  if (c.mode === 'working') {
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#3fb950';
    ctx.fillText('⋯working⋯', c.x, c.y - bob + 46);
  }

  const b = bubbles[slot.key];
  if (b && b.until > t) {
    ctx.save();
    ctx.font = '10px sans-serif';
    const w = Math.min(150, ctx.measureText(b.text).width + 16);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.strokeStyle = '#00000033';
    const bx = c.x - w / 2, by = c.y - bob - 70;
    roundRect(ctx, bx, by, w, 24, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.textAlign = 'center';
    ctx.fillText(truncate(b.text, 30), c.x, by + 16);
    ctx.restore();
  }
}

// --- outfit rendering helpers (unchanged) ---
function drawHairBack(id, head) {
  if (id.hairStyle !== 'ponytail') return;
  ctx.fillStyle = id.hair;
  ctx.fillRect(head.x - 5, head.y + 2, 6, 12);
  ctx.fillRect(head.x - 6, head.y + 10, 5, 6);
}

function drawHairFront(id, head) {
  ctx.fillStyle = id.hair;
  if (id.hairStyle === 'cap') {
    ctx.fillRect(head.x - 1, head.y - 3, head.w + 2, 5);
    ctx.fillRect(head.x - 1, head.y, 4, 3);
  } else if (id.hairStyle === 'slick') {
    ctx.fillRect(head.x - 1, head.y - 2, head.w + 2, 4);
  } else {
    ctx.fillRect(head.x - 1, head.y - 3, head.w + 2, 5);
  }
}

function drawAccessory(id, head) {
  if (id.accessory !== 'glasses') return;
  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = 1;
  const gy = head.y + head.h * 0.55;
  ctx.strokeRect(head.x + 1, gy, 5, 4);
  ctx.strokeRect(head.x + head.w - 6, gy, 5, 4);
  ctx.beginPath();
  ctx.moveTo(head.x + 6, gy + 2);
  ctx.lineTo(head.x + head.w - 6, gy + 2);
  ctx.stroke();
}

function drawBackAccessory(id, sitting) {
  if (id.backAccessory === 'backpack' && !sitting) {
    ctx.fillStyle = '#5c3d1f';
    ctx.fillRect(-15, -16, 6, 18);
    ctx.fillStyle = '#7a5228';
    ctx.fillRect(-16, -18, 8, 6);
  } else if (id.backAccessory === 'shield') {
    ctx.fillStyle = '#8a8f9c';
    ctx.fillRect(-17, -18, 6, 16);
    ctx.fillStyle = '#5a5f6c';
    ctx.fillRect(-16, -14, 4, 8);
  }
}

function drawHeldProp(id, hx, hy) {
  ctx.save();
  ctx.translate(hx, hy);
  switch (id.heldProp) {
    case 'clipboard':
      ctx.fillStyle = '#8a6a3a';
      ctx.fillRect(0, 0, 8, 11);
      ctx.fillStyle = '#f5f0e0';
      ctx.fillRect(1, 2, 6, 8);
      ctx.fillStyle = '#8a8a8a';
      ctx.fillRect(2, 0, 4, 2);
      break;
    case 'magnifier':
      ctx.strokeStyle = '#c9a04a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(4, 3, 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(7, 6); ctx.lineTo(11, 10);
      ctx.stroke();
      break;
    case 'compass':
      ctx.fillStyle = '#c9a04a';
      ctx.beginPath();
      ctx.arc(4, 4, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2a2a2a';
      ctx.beginPath();
      ctx.arc(4, 4, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = BRAND.fuchsia;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(4, 1); ctx.lineTo(4, 7);
      ctx.stroke();
      break;
    case 'wrench':
      ctx.strokeStyle = '#8b949e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 10); ctx.lineTo(8, 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(9, 1, 2.5, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'gear':
      ctx.fillStyle = '#8b949e';
      ctx.beginPath();
      ctx.arc(4, 4, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22252b';
      ctx.beginPath();
      ctx.arc(4, 4, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    default:
      break;
  }
  ctx.restore();
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function truncate(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }

let lastT = performance.now();
function render(t) {
  const dt = t - lastT;
  lastT = t;

  pruneStaleInstances();
  const slots = computeSlots();

  // Clean up movement/bubble state for slots that no longer exist (pruned instances).
  const liveKeys = new Set(slots.map((s) => s.key));
  for (const key of Object.keys(chars)) if (!liveKeys.has(key)) delete chars[key];
  for (const key of Object.keys(bubbles)) if (!liveKeys.has(key)) delete bubbles[key];

  for (const slot of slots) {
    const isBusy = slot.status === 'running' || slot.status === 'active';
    updateMovement(slot.key, slot.role, slot.desk, isBusy, t, dt);
  }

  drawRoom(slots);
  const order = slots.slice().sort((a, b) => (chars[a.key]?.y || 0) - (chars[b.key]?.y || 0));
  for (const slot of order) drawCharacter(slot, t);

  requestAnimationFrame(render);
}
requestAnimationFrame(render);

// --- Dashboard ---
const dashboard = document.getElementById('dashboard');

function renderDashboard() {
  dashboard.innerHTML = '';
  for (const role of ROLES) {
    const active = activeInstancesForRole(role);
    if (active.length === 0) {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="card-head">
          <span class="role-name">${IDENTITY[role].prop} ${IDENTITY[role].label}</span>
          <span class="badge idle">idle</span>
        </div>
        <div class="model"></div>
        <div class="task"><em>No task given by Master Khian</em></div>
      `;
      dashboard.appendChild(card);
      continue;
    }
    for (const inst of active) {
      const card = document.createElement('div');
      card.className = 'card' + (inst.status === 'blocked' || inst.status === 'error' ? ' ' + inst.status : '');
      card.innerHTML = `
        <div class="card-head">
          <span class="role-name">${IDENTITY[role].prop} ${IDENTITY[role].label} <span class="instance-tag">${escapeHtml(instanceTag(inst))}</span></span>
          <span class="badge ${inst.status}">${inst.status}</span>
        </div>
        <div class="model">${inst.model ? 'model: ' + inst.model : ''}</div>
        <div class="task">${inst.task ? escapeHtml(inst.task) : ''}</div>
        ${inst.reason ? `<div class="reason">${escapeHtml(inst.reason)}</div>` : ''}
      `;
      dashboard.appendChild(card);
    }
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

renderDashboard();
setInterval(renderDashboard, 1000);

// --- SSE connection ---
const connStatus = document.getElementById('conn-status');
const es = new EventSource('/events');

es.onopen = () => { connStatus.textContent = 'connected'; };
es.onerror = () => { connStatus.textContent = 'disconnected — retrying…'; };

es.addEventListener('snapshot', (e) => {
  const list = JSON.parse(e.data);
  for (const inst of list) applyInstanceUpdate(inst);
  renderDashboard();
});

es.addEventListener('instance_update', (e) => {
  applyInstanceUpdate(JSON.parse(e.data));
  renderDashboard();
});
