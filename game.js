const setupEl = document.getElementById("setup");
const gameSectionEl = document.getElementById("gameSection");
const faceInputEl = document.getElementById("faceInput");
const previewCanvas = document.getElementById("preview");
const previewCtx = previewCanvas.getContext("2d");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const overlayEl = document.getElementById("overlay");
const overlayTitleEl = document.getElementById("overlayTitle");
const overlayTextEl = document.getElementById("overlayText");

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const storageKey = "face-flappy-best";
let bestScore = Number(localStorage.getItem(storageKey) || 0);
bestEl.textContent = String(bestScore);

const state = {
  running: false,
  gameOver: false,
  inCountdown: false,
  countdownMs: 3000,
  countdownEndAt: 0,
  score: 0,
  faceImage: null,
  faceTexture: null,
  bird: {
    x: 92,
    y: canvas.height * 0.45,
    radius: 24,
    velocity: 0,
    gravity: 0.45,
    jump: -8.4,
    rotation: 0,
  },
  pipes: [],
  pipeGap: 170,
  pipeWidth: 68,
  pipeSpeed: 2.6,
  pipeIntervalMs: 1500,
  lastPipeSpawn: 0,
  lastFrame: 0,
};

function drawPreviewPlaceholder() {
  previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  previewCtx.fillStyle = "#d8e8f1";
  previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
  previewCtx.fillStyle = "#6a7f90";
  previewCtx.font = "bold 15px Trebuchet MS";
  previewCtx.textAlign = "center";
  previewCtx.fillText("No image yet", previewCanvas.width / 2, previewCanvas.height / 2 + 5);
}

drawPreviewPlaceholder();

function makeFaceTexture(image) {
  const size = 96;
  const offscreen = document.createElement("canvas");
  offscreen.width = size;
  offscreen.height = size;
  const offCtx = offscreen.getContext("2d");

  const scale = Math.max(size / image.width, size / image.height);
  const drawW = image.width * scale;
  const drawH = image.height * scale;
  const dx = (size - drawW) / 2;
  const dy = (size - drawH) / 2;

  offCtx.save();
  offCtx.beginPath();
  offCtx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  offCtx.clip();
  offCtx.drawImage(image, dx, dy, drawW, drawH);
  offCtx.restore();

  offCtx.lineWidth = 4;
  offCtx.strokeStyle = "#fff";
  offCtx.beginPath();
  offCtx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  offCtx.stroke();

  return offscreen;
}

faceInputEl.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      state.faceImage = image;
      state.faceTexture = makeFaceTexture(image);

      previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      previewCtx.drawImage(state.faceTexture, 0, 0, previewCanvas.width, previewCanvas.height);

      startBtn.disabled = false;
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
});

function resetRound() {
  state.running = false;
  state.gameOver = false;
  state.inCountdown = true;
  state.countdownEndAt = 0;
  state.score = 0;
  state.bird.y = canvas.height * 0.45;
  state.bird.velocity = 0;
  state.bird.rotation = 0;
  state.pipes = [];
  state.lastPipeSpawn = 0;
  state.lastFrame = 0;

  scoreEl.textContent = "0";
  overlayEl.classList.add("hidden");
}

function beginGame() {
  if (!state.faceTexture) return;
  setupEl.classList.add("hidden");
  gameSectionEl.classList.remove("hidden");

  resetRound();
  requestAnimationFrame(tick);
}

startBtn.addEventListener("click", beginGame);

function flap() {
  if (!state.running) return;
  state.bird.velocity = state.bird.jump;
}

function tryRestart() {
  if (!state.gameOver) return;
  resetRound();
  requestAnimationFrame(tick);
}

window.addEventListener("keydown", (event) => {
  if (event.code !== "Space") return;
  event.preventDefault();

  if (state.gameOver) {
    tryRestart();
    return;
  }

  flap();
});

canvas.addEventListener("pointerdown", () => {
  if (state.gameOver) {
    tryRestart();
    return;
  }

  flap();
});

restartBtn.addEventListener("click", () => {
  tryRestart();
});

function spawnPipe() {
  const margin = 70;
  const topHeight = margin + Math.random() * (canvas.height - state.pipeGap - margin * 2);

  state.pipes.push({
    x: canvas.width + state.pipeWidth,
    top: topHeight,
    passed: false,
  });
}

function update(dtMs, nowMs) {
  if (!state.running) return;

  const dt = dtMs / 16.67;

  if (nowMs - state.lastPipeSpawn > state.pipeIntervalMs) {
    spawnPipe();
    state.lastPipeSpawn = nowMs;
  }

  state.bird.velocity += state.bird.gravity * dt;
  state.bird.y += state.bird.velocity * dt;
  state.bird.rotation = Math.min(Math.max(state.bird.velocity / 10, -0.8), 1.1);

  for (const pipe of state.pipes) {
    pipe.x -= state.pipeSpeed * dt;

    if (!pipe.passed && pipe.x + state.pipeWidth < state.bird.x) {
      pipe.passed = true;
      state.score += 1;
      scoreEl.textContent = String(state.score);
    }
  }

  state.pipes = state.pipes.filter((pipe) => pipe.x + state.pipeWidth > -10);

  const birdTop = state.bird.y - state.bird.radius;
  const birdBottom = state.bird.y + state.bird.radius;

  if (birdTop < 0 || birdBottom > canvas.height) {
    endGame();
    return;
  }

  for (const pipe of state.pipes) {
    const birdLeft = state.bird.x - state.bird.radius;
    const birdRight = state.bird.x + state.bird.radius;
    const inPipeX = birdRight > pipe.x && birdLeft < pipe.x + state.pipeWidth;

    if (!inPipeX) continue;

    const hitsTop = birdTop < pipe.top;
    const hitsBottom = birdBottom > pipe.top + state.pipeGap;

    if (hitsTop || hitsBottom) {
      endGame();
      return;
    }
  }
}

function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, "#83d8ff");
  grad.addColorStop(1, "#d6f7ff");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#f4e8ac";
  ctx.fillRect(0, canvas.height - 80, canvas.width, 80);

  ctx.fillStyle = "#67b545";
  ctx.fillRect(0, canvas.height - 88, canvas.width, 8);
}

function drawPipes() {
  for (const pipe of state.pipes) {
    ctx.fillStyle = "#2aa14a";

    ctx.fillRect(pipe.x, 0, state.pipeWidth, pipe.top);
    ctx.fillRect(pipe.x, pipe.top + state.pipeGap, state.pipeWidth, canvas.height - pipe.top - state.pipeGap);

    ctx.fillStyle = "#22863d";
    ctx.fillRect(pipe.x - 4, pipe.top - 10, state.pipeWidth + 8, 10);
    ctx.fillRect(pipe.x - 4, pipe.top + state.pipeGap, state.pipeWidth + 8, 10);
  }
}

function drawBird() {
  if (!state.faceTexture) return;

  const size = state.bird.radius * 2;

  ctx.save();
  ctx.translate(state.bird.x, state.bird.y);
  ctx.rotate(state.bird.rotation);
  ctx.drawImage(state.faceTexture, -size / 2, -size / 2, size, size);

  ctx.fillStyle = "#ff9900";
  ctx.beginPath();
  ctx.moveTo(size * 0.35, 0);
  ctx.lineTo(size * 0.72, -7);
  ctx.lineTo(size * 0.72, 7);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawCountdown(nowMs) {
  if (!state.inCountdown) return;

  if (!state.countdownEndAt) {
    state.countdownEndAt = nowMs + state.countdownMs;
  }

  const remainingMs = Math.max(0, state.countdownEndAt - nowMs);
  const shown = Math.max(1, Math.ceil(remainingMs / 1000));

  ctx.save();
  ctx.fillStyle = "#10203388";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = "bold 92px Trebuchet MS";
  ctx.fillText(String(shown), canvas.width / 2, canvas.height / 2 + 30);
  ctx.font = "bold 24px Trebuchet MS";
  ctx.fillText("Get Ready", canvas.width / 2, canvas.height / 2 + 78);
  ctx.restore();

  if (remainingMs === 0) {
    state.inCountdown = false;
    state.running = true;
    state.lastFrame = nowMs;
    state.lastPipeSpawn = nowMs;
  }
}

function render(nowMs) {
  drawBackground();
  drawPipes();
  drawBird();
  drawCountdown(nowMs);
}

function endGame() {
  state.running = false;
  state.gameOver = true;
  state.inCountdown = false;

  if (state.score > bestScore) {
    bestScore = state.score;
    localStorage.setItem(storageKey, String(bestScore));
    bestEl.textContent = String(bestScore);
  }

  overlayTitleEl.textContent = "Game Over";
  overlayTextEl.textContent = `Final score: ${state.score}`;
  overlayEl.classList.remove("hidden");
}

function tick(timestamp) {
  if (!state.running && !state.inCountdown) return;

  if (state.running) {
    if (!state.lastFrame) state.lastFrame = timestamp;
    const dtMs = Math.min(32, timestamp - state.lastFrame);
    state.lastFrame = timestamp;
    update(dtMs, timestamp);
  }

  render(timestamp);

  if (state.running || state.inCountdown) {
    requestAnimationFrame(tick);
  }
}
