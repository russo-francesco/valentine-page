"use strict";

const CONFIG = {
  texts: {
    name: "Nirali", // <-- cambia qui

    titleTemplate: "{name}, will you be my Valentine?",
    subtitle: "Choose wisely.",
    hint: "“No” seems a bit shy 😈"
  },

  yesGrowth: {
    step: 0.05,
    max: 2.2
  },

  avoid: {
    influenceRadius: 170,
    dangerRadius: 90,
    edgePadding: 14,
    minDistanceFromPointer: 150,
    minGapFromYes: 14,
    teleportCooldownMs: 180,
    teleportTries: 26,
    maxVelocity: 10,
    friction: 0.86
  },

  audio: {
    enabled: false,
    volume: 0.55
  }
};

const el = {
  title: document.getElementById("title"),
  subtitle: document.getElementById("subtitle"),
  hint: document.getElementById("hint"),
  stage: document.getElementById("stage"),
  yesBtn: document.getElementById("yesBtn"),
  noBtn: document.getElementById("noBtn"),
  result: document.getElementById("result"),
  resetBtn: document.getElementById("resetBtn"),
  bgm: document.getElementById("bgm")
};

const state = {
  running: true,
  hintShown: false,
  lastPointer: { x: 0, y: 0, active: false },
  yesScale: 1,
  no: {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    lastTeleportAt: 0
  }
};

init();

function init() {
  applyTexts();
  initPositions();
  bindEvents();
  requestAnimationFrame(loop);
}

/* =========================
   TEXTS (nome dinamico)
   ========================= */
function applyTexts() {
  const name = CONFIG.texts.name?.trim();

  if (name && name.length > 0) {
    el.title.textContent = CONFIG.texts.titleTemplate.replace("{name}", name);
  } else {
    el.title.textContent = "Will you be my Valentine?";
  }

  el.subtitle.textContent = CONFIG.texts.subtitle;
  el.hint.textContent = CONFIG.texts.hint;
  el.hint.hidden = true;

  updateYesScale();
}

/* =========================
   EVENTS
   ========================= */
function bindEvents() {
  el.stage.addEventListener("pointermove", onPointerMove, { passive: true });

  el.stage.addEventListener("pointerleave", () => {
    state.lastPointer.active = false;
  });

  el.stage.addEventListener("touchstart", onTouchStart, { passive: true });

  el.noBtn.addEventListener("pointerdown", onNoPointerDown);
  el.yesBtn.addEventListener("click", onYesClick);
  el.resetBtn.addEventListener("click", resetApp);

  window.addEventListener("resize", () => {
    const clamped = clampNoInsideStage(state.no.x, state.no.y);
    setNoCenter(clamped.x, clamped.y);
  });
}

/* =========================
   INIT POSITIONS
   ========================= */
function initPositions() {
  const noBox = getButtonBoxLocal(el.noBtn);
  const cx = noBox.x + noBox.w / 2;
  const cy = noBox.y + noBox.h / 2;
  const clamped = clampNoInsideStage(cx, cy);

  state.no.x = clamped.x;
  state.no.y = clamped.y;
  state.no.vx = 0;
  state.no.vy = 0;

  renderNoPosition();
  resetYesScale();
}

/* =========================
   LOOP
   ========================= */
function loop() {
  if (state.running) stepAvoidancePhysics();
  requestAnimationFrame(loop);
}

/* =========================
   INTERACTIONS
   ========================= */
function onPointerMove(e) {
  if (!state.running) return;

  const p = pointerToStageLocal(e);
  state.lastPointer = { ...p, active: true };

  const d = distance(p.x, p.y, state.no.x, state.no.y);

  if (d < CONFIG.avoid.dangerRadius) {
    teleportNoAwayFromPointer(p.x, p.y, false);
    handleNoEscape();
  }
}

function onTouchStart(e) {
  if (!state.running) return;

  const t = e.touches && e.touches[0];
  if (!t) return;

  const r = getStageRect();
  const x = t.clientX - r.left;
  const y = t.clientY - r.top;

  const d = distance(x, y, state.no.x, state.no.y);

  if (d < CONFIG.avoid.influenceRadius) {
    teleportNoAwayFromPointer(x, y, true);
    handleNoEscape();
  }
}

function onNoPointerDown(e) {
  if (!state.running) return;

  e.preventDefault();
  e.stopPropagation();

  const p = pointerToStageLocal(e);
  state.lastPointer = { ...p, active: true };

  teleportNoAwayFromPointer(p.x, p.y, true);
  handleNoEscape();
}

function onYesClick() {
  if (!state.running) return;

  state.running = false;
  el.stage.classList.add("is-hidden");
  el.result.hidden = false;
  el.resetBtn.hidden = false;
}

/* =========================
   RESET
   ========================= */
function resetApp() {
  state.running = true;
  state.hintShown = false;
  state.lastPointer.active = false;

  state.no.vx = 0;
  state.no.vy = 0;
  state.no.lastTeleportAt = 0;

  el.stage.classList.remove("is-hidden");
  el.result.hidden = true;
  el.resetBtn.hidden = true;
  el.hint.hidden = true;

  resetYesScale();
  initPositions();
}

/* =========================
   BEHAVIOR
   ========================= */
function handleNoEscape() {
  revealHintOnce();
  growYes();
  pulseYes();
}

function revealHintOnce() {
  if (state.hintShown) return;
  state.hintShown = true;
  el.hint.hidden = false;
}

function growYes() {
  state.yesScale = clamp(
    state.yesScale + CONFIG.yesGrowth.step,
    1,
    CONFIG.yesGrowth.max
  );
  updateYesScale();
}

function resetYesScale() {
  state.yesScale = 1;
  updateYesScale();
}

function updateYesScale() {
  document.documentElement.style.setProperty("--yes-scale", state.yesScale);
}

function pulseYes() {
  el.yesBtn.classList.remove("pulse");
  void el.yesBtn.offsetWidth;
  el.yesBtn.classList.add("pulse");
}

/* =========================
   PHYSICS
   ========================= */
function stepAvoidancePhysics() {
  if (!state.lastPointer.active) {
    state.no.vx *= CONFIG.avoid.friction;
    state.no.vy *= CONFIG.avoid.friction;
    integrateNoMotion();
    return;
  }

  const p = state.lastPointer;
  const d = distance(p.x, p.y, state.no.x, state.no.y);

  const influence = clamp(
    (CONFIG.avoid.influenceRadius - d) / CONFIG.avoid.influenceRadius,
    0,
    1
  );

  if (influence <= 0) {
    state.no.vx *= CONFIG.avoid.friction;
    state.no.vy *= CONFIG.avoid.friction;
    integrateNoMotion();
    return;
  }

  const dx = state.no.x - p.x;
  const dy = state.no.y - p.y;
  const len = Math.max(0.0001, Math.hypot(dx, dy));

  const ux = dx / len;
  const uy = dy / len;

  const force = influence * influence * CONFIG.avoid.maxVelocity;

  state.no.vx += ux * force;
  state.no.vy += uy * force;

  state.no.vx = clamp(state.no.vx, -CONFIG.avoid.maxVelocity, CONFIG.avoid.maxVelocity);
  state.no.vy = clamp(state.no.vy, -CONFIG.avoid.maxVelocity, CONFIG.avoid.maxVelocity);

  state.no.vx *= CONFIG.avoid.friction;
  state.no.vy *= CONFIG.avoid.friction;

  integrateNoMotion();
}

function integrateNoMotion() {
  const nx = state.no.x + state.no.vx;
  const ny = state.no.y + state.no.vy;

  const c = clampNoInsideStage(nx, ny);

  if (c.x !== nx) state.no.vx *= -0.35;
  if (c.y !== ny) state.no.vy *= -0.35;

  state.no.x = c.x;
  state.no.y = c.y;

  renderNoPosition();
}

/* =========================
   TELEPORT
   ========================= */
function teleportNoAwayFromPointer(px, py, force) {
  const now = Date.now();

  if (!force && now - state.no.lastTeleportAt < CONFIG.avoid.teleportCooldownMs) return;

  const stage = getStageRect();
  const size = getNoSize();
  const pad = CONFIG.avoid.edgePadding;

  const minX = pad + size.w / 2;
  const maxX = stage.width - pad - size.w / 2;
  const minY = pad + size.h / 2;
  const maxY = stage.height - pad - size.h / 2;

  let best = null;
  let bestScore = -Infinity;

  for (let i = 0; i < CONFIG.avoid.teleportTries; i++) {
    const x = randomBetween(minX, maxX);
    const y = randomBetween(minY, maxY);

    const d = distance(x, y, px, py);
    if (d < CONFIG.avoid.minDistanceFromPointer) continue;

    if (d > bestScore) {
      bestScore = d;
      best = { x, y };
    }
  }

  if (!best) best = { x: minX, y: minY };

  state.no.lastTeleportAt = now;
  state.no.vx = 0;
  state.no.vy = 0;

  setNoCenter(best.x, best.y);
}

/* =========================
   UTILS
   ========================= */
function renderNoPosition() {
  el.noBtn.style.left = state.no.x + "px";
  el.noBtn.style.top = state.no.y + "px";
}

function setNoCenter(x, y) {
  state.no.x = x;
  state.no.y = y;
  renderNoPosition();
}

function clampNoInsideStage(x, y) {
  const r = getStageRect();
  const s = getNoSize();
  const p = CONFIG.avoid.edgePadding;

  return {
    x: clamp(x, p + s.w / 2, r.width - p - s.w / 2),
    y: clamp(y, p + s.h / 2, r.height - p - s.h / 2)
  };
}

function pointerToStageLocal(e) {
  const r = getStageRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function getStageRect() {
  return el.stage.getBoundingClientRect();
}

function getButtonBoxLocal(btn) {
  const r = getStageRect();
  const b = btn.getBoundingClientRect();
  return { x: b.left - r.left, y: b.top - r.top, w: b.width, h: b.height };
}

function getNoSize() {
  const r = el.noBtn.getBoundingClientRect();
  return { w: r.width, h: r.height };
}

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}
