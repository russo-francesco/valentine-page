"use strict";

texts: {
  name: "Sara",              // nome ragazza
  titleTemplate: "{name}, will you be my Valentine?",
  subtitle: "Choose wisely.",
  hint: "“No” seems a bit shy 😈"
},

  yesGrowth: {
    step: 0.05,   // crescita YES
    max: 2.2      // dimensione max YES
  },

  avoid: {
    influenceRadius: 170,      // raggio di attivazione spostamento NO
    dangerRadius: 90,          // distanza teleport NO
    edgePadding: 14,
    minDistanceFromPointer: 150,
    minGapFromYes: 14,
    teleportCooldownMs: 180,
    teleportTries: 26,
    maxVelocity: 10,           // velocità NO
    friction: 0.86             // più damping = movimento meno aggressivo
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

function applyTexts() {
  const name = CONFIG.texts.name?.trim();

  if (name && name.length > 0) {
    el.title.textContent = CONFIG.texts.titleTemplate.replace("{name}", name);
  } else {
    el.title.textContent = "Will you be my Valentine?";
  }

  el.subtitle.textContent = CONFIG.texts.subtitle;
  el.hint.textContent = CONFIG.texts.hint;
  el.hint.hidden = true; // nascosta all'inizio

  updateYesScale();
}

function bindEvents() {
  el.stage.addEventListener("pointermove", onPointerMove, { passive: true });

  el.stage.addEventListener("pointerleave", () => {
    state.lastPointer.active = false;
  }, { passive: true });

  el.stage.addEventListener("touchstart", onTouchStart, { passive: true });

  el.noBtn.addEventListener("pointerdown", onNoPointerDown);
  el.yesBtn.addEventListener("click", onYesClick);
  el.resetBtn.addEventListener("click", resetApp);

  window.addEventListener("resize", () => {
    const clamped = clampNoInsideStage(state.no.x, state.no.y);
    setNoCenter(clamped.x, clamped.y);
  });
}

function initPositions() {
  const noBox = getButtonBoxLocal(el.noBtn);
  const centerX = noBox.x + noBox.w / 2;
  const centerY = noBox.y + noBox.h / 2;
  const clamped = clampNoInsideStage(centerX, centerY);

  state.no.x = clamped.x;
  state.no.y = clamped.y;
  state.no.vx = 0;
  state.no.vy = 0;

  renderNoPosition();
  resetYesScale();
}

function loop() {
  if (state.running) {
    stepAvoidancePhysics();
  }
  requestAnimationFrame(loop);
}

function onPointerMove(event) {
  if (!state.running) return;

  const p = pointerToStageLocal(event);
  state.lastPointer = { ...p, active: true };

  const d = distance(p.x, p.y, state.no.x, state.no.y);

  if (d < CONFIG.avoid.dangerRadius) {
    teleportNoAwayFromPointer(p.x, p.y, false);
    handleNoEscape();
  }
}

function onTouchStart(event) {
  if (!state.running) return;

  const touch = event.touches && event.touches[0];
  if (!touch) return;

  const stageRect = getStageRect();
  const x = touch.clientX - stageRect.left;
  const y = touch.clientY - stageRect.top;

  const d = distance(x, y, state.no.x, state.no.y);

  if (d < CONFIG.avoid.influenceRadius) {
    teleportNoAwayFromPointer(x, y, true);
    handleNoEscape();
  }
}

function onNoPointerDown(event) {
  if (!state.running) return;

  event.preventDefault();
  event.stopPropagation();

  const p = pointerToStageLocal(event);
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

  if (CONFIG.audio.enabled && el.bgm) {
    try {
      el.bgm.volume = CONFIG.audio.volume;
      el.bgm.play().catch(() => {});
    } catch (_) {}
  }
}

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

  if (el.bgm) {
    try {
      el.bgm.pause();
      el.bgm.currentTime = 0;
    } catch (_) {}
  }
}

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
  document.documentElement.style.setProperty("--yes-scale", String(state.yesScale));
}

function pulseYes() {
  el.yesBtn.classList.remove("pulse");
  void el.yesBtn.offsetWidth;
  el.yesBtn.classList.add("pulse");
}

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

  state.no.vx = clamp(
    state.no.vx,
    -CONFIG.avoid.maxVelocity,
    CONFIG.avoid.maxVelocity
  );
  state.no.vy = clamp(
    state.no.vy,
    -CONFIG.avoid.maxVelocity,
    CONFIG.avoid.maxVelocity
  );

  state.no.vx *= CONFIG.avoid.friction;
  state.no.vy *= CONFIG.avoid.friction;

  integrateNoMotion();
}

function integrateNoMotion() {
  const nextX = state.no.x + state.no.vx;
  const nextY = state.no.y + state.no.vy;
  const clamped = clampNoInsideStage(nextX, nextY);

  if (clamped.x !== nextX) state.no.vx *= -0.35;
  if (clamped.y !== nextY) state.no.vy *= -0.35;

  state.no.x = clamped.x;
  state.no.y = clamped.y;

  const yesBox = getButtonBoxLocal(el.yesBtn);
  const noBox = buildNoBoxLocal(state.no.x, state.no.y);

  if (boxesOverlap(noBox, yesBox, CONFIG.avoid.minGapFromYes)) {
    const p = state.lastPointer.active
      ? state.lastPointer
      : { x: state.no.x, y: state.no.y };

    teleportNoAwayFromPointer(p.x, p.y, true);
    handleNoEscape();
    return;
  }

  renderNoPosition();
}

function teleportNoAwayFromPointer(px, py, force) {
  const now = Date.now();

  if (!force && now - state.no.lastTeleportAt < CONFIG.avoid.teleportCooldownMs) {
    return;
  }

  const stageRect = getStageRect();
  const noSize = getNoSize();
  const pad = CONFIG.avoid.edgePadding;

  const minX = pad + noSize.w / 2;
  const maxX = stageRect.width - pad - noSize.w / 2;
  const minY = pad + noSize.h / 2;
  const maxY = stageRect.height - pad - noSize.h / 2;

  const yesBox = getButtonBoxLocal(el.yesBtn);

  let bestCandidate = null;
  let bestScore = -Infinity;

  for (let i = 0; i < CONFIG.avoid.teleportTries; i++) {
    const x = randomBetween(minX, maxX);
    const y = randomBetween(minY, maxY);

    const dPointer = distance(x, y, px, py);
    if (dPointer < CONFIG.avoid.minDistanceFromPointer) continue;

    const candidateBox = buildNoBoxLocal(x, y);
    if (boxesOverlap(candidateBox, yesBox, CONFIG.avoid.minGapFromYes)) continue;

    const dCurrent = distance(x, y, state.no.x, state.no.y);
    const score = dPointer * 0.75 + dCurrent * 0.25;

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = { x, y };
    }
  }

  if (!bestCandidate) {
    bestCandidate = getFarthestCorner(
      px,
      py,
      { minX, maxX, minY, maxY },
      yesBox
    );
  }

  state.no.lastTeleportAt = now;
  state.no.vx = 0;
  state.no.vy = 0;

  setNoCenter(bestCandidate.x, bestCandidate.y);
}

function getFarthestCorner(px, py, bounds, yesBox) {
  const corners = [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.minX, y: bounds.maxY },
    { x: bounds.maxX, y: bounds.maxY }
  ];

  let best = corners[0];
  let bestDistance = -Infinity;
  let foundSafe = false;

  for (const corner of corners) {
    const d = distance(corner.x, corner.y, px, py);
    const box = buildNoBoxLocal(corner.x, corner.y);
    const overlap = boxesOverlap(box, yesBox, CONFIG.avoid.minGapFromYes);

    if (!overlap && (!foundSafe || d > bestDistance)) {
      best = corner;
      bestDistance = d;
      foundSafe = true;
    } else if (!foundSafe && d > bestDistance) {
      best = corner;
      bestDistance = d;
    }
  }

  return best;
}

function renderNoPosition() {
  el.noBtn.style.left = `${state.no.x}px`;
  el.noBtn.style.top = `${state.no.y}px`;
}

function setNoCenter(x, y) {
  state.no.x = x;
  state.no.y = y;
  renderNoPosition();
}

function clampNoInsideStage(x, y) {
  const stageRect = getStageRect();
  const noSize = getNoSize();
  const pad = CONFIG.avoid.edgePadding;

  const minX = pad + noSize.w / 2;
  const maxX = stageRect.width - pad - noSize.w / 2;
  const minY = pad + noSize.h / 2;
  const maxY = stageRect.height - pad - noSize.h / 2;

  return {
    x: clamp(x, minX, maxX),
    y: clamp(y, minY, maxY)
  };
}

function pointerToStageLocal(event) {
  const stageRect = getStageRect();
  return {
    x: event.clientX - stageRect.left,
    y: event.clientY - stageRect.top
  };
}

function getStageRect() {
  return el.stage.getBoundingClientRect();
}

function getButtonBoxLocal(button) {
  const stageRect = getStageRect();
  const rect = button.getBoundingClientRect();

  return {
    x: rect.left - stageRect.left,
    y: rect.top - stageRect.top,
    w: rect.width,
    h: rect.height
  };
}

function getNoSize() {
  const rect = el.noBtn.getBoundingClientRect();
  return { w: rect.width, h: rect.height };
}

function buildNoBoxLocal(centerX, centerY) {
  const noSize = getNoSize();
  return {
    x: centerX - noSize.w / 2,
    y: centerY - noSize.h / 2,
    w: noSize.w,
    h: noSize.h
  };
}

function boxesOverlap(a, b, gap = 0) {
  return !(
    a.x + a.w + gap < b.x ||
    a.x > b.x + b.w + gap ||
    a.y + a.h + gap < b.y ||
    a.y > b.y + b.h + gap
  );
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}
