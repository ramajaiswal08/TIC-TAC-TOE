// STATE
let gameMode = 'cpu';
let difficulty = 'medium';
let playerSym = 'X';
let cpuSym = 'O';
let board = Array(9).fill('');
let current = 'X';
let gameActive = false;
let timerSec = 10;
let timerID = null;
let startTime = 0;
let scores = { X: 0, O: 0, draw: 0 };
const CIRC = 131.9; // 2πr, r=21

const WINS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

const GIFS = {
  win: 'win.gif',
  draw: 'draw.gif',
  cpu: 'draw.gif',
  p1: 'win.gif',
  p2: 'win.gif'
};
// SETUP
function setMode(m) {
  gameMode = m;
  document.getElementById('btnCPU').classList.toggle('active', m === 'cpu');
  document.getElementById('btnFriend').classList.toggle('active', m === 'friend');
  document.getElementById('diffCard').style.display = m === 'cpu' ? 'block' : 'none';
}

function setDiff(d) {
  difficulty = d;
  ['Easy', 'Medium', 'Hard'].forEach(x => {
    document.getElementById('d' + x).classList.toggle('active', x.toLowerCase() === d);
  });
  updateRecord();
}

function setSymbol(s) {
  playerSym = s;
  cpuSym = s === 'X' ? 'O' : 'X';
  document.getElementById('symX').className = 'sym-btn' + (s === 'X' ? ' sel-x' : '');
  document.getElementById('symO').className = 'sym-btn' + (s === 'O' ? ' sel-o' : '');
}

// START / ROUND
function startGame() {
  scores = { X: 0, O: 0, draw: 0 };
  updateScoreUI();
  document.getElementById('p1name').textContent = 'Player';
  document.getElementById('p2name').textContent = gameMode === 'cpu' ? 'CPU' : 'P2';
  showScreen('gameScreen');
  updateRecord();
  updateLeaderboard();
  buildBoard();
  newRound();
}

function newRound() {
  board = Array(9).fill('');
  current = 'X';
  gameActive = true;
  startTime = Date.now();
  renderBoard();
  clearWinLine();
  updateTurnUI();
  startTimer();
  if (gameMode === 'cpu' && cpuSym === 'X') {
    gameActive = false;
    setTimeout(() => { gameActive = true; doCpuMove(); }, 500);
  }
}

function restartRound() { stopTimer(); newRound(); }

// BOARD
function buildBoard() {
  const b = document.getElementById('board');
  b.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const c = document.createElement('div');
    c.className = 'cell';
    c.setAttribute('tabindex', '0');
    c.setAttribute('aria-label', 'Cell ' + (i + 1));
    c.dataset.i = i;
    c.addEventListener('click', () => handleCellClick(i));
    c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') handleCellClick(i); });
    b.appendChild(c);
  }
}

function renderBoard() {
  document.querySelectorAll('.cell').forEach((cell, i) => {
    if (board[i] === '') {
      cell.innerHTML = '';
      cell.className = 'cell';
    } else if (!cell.classList.contains('taken')) {
      cell.classList.add('taken');
      cell.innerHTML = board[i] === 'X' ? makeSvgX() : makeSvgO();
    }
  });
}

function makeSvgX() {
  return `<svg viewBox="0 0 50 50">
    <line class="x-line" x1="12" y1="12" x2="38" y2="38"/>
    <line class="x-line" x1="38" y1="12" x2="12" y2="38" style="animation-delay:.08s"/>
  </svg>`;
}
function makeSvgO() {
  return `<svg viewBox="0 0 50 50">
    <circle class="o-circle" cx="25" cy="25" r="16"/>
  </svg>`;
}

// MOVES
function handleCellClick(i) {
  if (!gameActive) return;
  if (board[i] !== '') return;
  if (gameMode === 'cpu' && current !== playerSym) return;
  makeMove(i);
}

function makeMove(i) {
  board[i] = current;
  renderBoard();
  playSound('place');

  const winner = getWinner();
  if (winner) { endGame(winner); return; }
  if (board.every(v => v !== '')) { endGame('draw'); return; }

  current = current === 'X' ? 'O' : 'X';
  updateTurnUI();
  resetTimer();

  if (gameMode === 'cpu' && current === cpuSym) {
    gameActive = false;
    setTimeout(() => { gameActive = true; doCpuMove(); }, 400 + Math.random() * 300);
  }
}

function getWinner() {
  for (const [a, b, c] of WINS) {
    if (board[a] && board[a] === board[b] && board[b] === board[c]) {
      return { sym: board[a], combo: [a, b, c] };
    }
  }
  return null;
}

// ══════════════════════════════════
// END GAME
// ══════════════════════════════════
function endGame(result) {
  gameActive = false;
  stopTimer();

  if (result === 'draw') {
    scores.draw++;
    updateScoreUI();
    shakeBoard();
    playSound('draw');
    setTimeout(() => showModal('🤝', 'Draw!', 'Nobody wins this round', 'draw', false, ''), 200);
    return;
  }

  const sym = result.sym;
  highlightWinners(result.combo, sym);
  drawWinLine(result.combo);
  scores[sym]++;
  updateScoreUI();
  playSound('win');
  startConfetti();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const isRecord = saveRecord(elapsed);
  if (isRecord) { playSound('record'); updateRecord(); }
  updateLeaderboard(elapsed);

  let who, gifKey, titleClass;
  if (gameMode === 'friend') {
    who = sym === 'X' ? 'Player 1 Wins!' : 'Player 2 Wins!';
    gifKey = sym === 'X' ? 'p1' : 'p2';
    titleClass = sym === 'X' ? 'win-x' : 'win-o';
  } else {
    const playerWon = sym === playerSym;
    who = playerWon ? 'You Win! 🎉' : 'CPU Wins!';
    gifKey = playerWon ? 'win' : 'cpu';
    titleClass = sym === 'X' ? 'win-x' : 'win-o';
  }

  setTimeout(() => showModal('🏆', who, `Finished in ${elapsed}s`, gifKey, isRecord, `🏅 New record: ${elapsed}s`, titleClass), 500);
}

function highlightWinners(combo, sym) {
  const cls = sym === 'X' ? 'winner-x' : 'winner-o';
  combo.forEach(i => document.querySelectorAll('.cell')[i].classList.add(cls));
}

function drawWinLine(combo) {
  const svg = document.getElementById('winLineSvg');
  svg.innerHTML = '';
  const cells = document.querySelectorAll('.cell');
  const boardEl = document.getElementById('board');
  const br = boardEl.getBoundingClientRect();
  const W = br.width, H = br.height;
  const vc = i => {
    const r = cells[i].getBoundingClientRect();
    return {
      x: (r.left - br.left + r.width / 2) / W * 420,
      y: (r.top - br.top + r.height / 2) / H * 420
    };
  };
  const s = vc(combo[0]), e = vc(combo[2]);
  const sym = board[combo[0]];
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', s.x); line.setAttribute('y1', s.y);
  line.setAttribute('x2', e.x); line.setAttribute('y2', e.y);
  line.setAttribute('class', 'wl ' + (sym === 'X' ? 'wl-x' : 'wl-o'));
  svg.appendChild(line);
}

function clearWinLine() { document.getElementById('winLineSvg').innerHTML = ''; }

// ══════════════════════════════════
// CPU AI
// ══════════════════════════════════
function doCpuMove() {
  const empty = board.map((v, i) => v === '' ? i : -1).filter(i => i >= 0);
  if (!empty.length) return;
  let idx;
  if (difficulty === 'easy') {
    idx = empty[Math.floor(Math.random() * empty.length)];
  } else if (difficulty === 'medium') {
    idx = Math.random() < 0.5 ? getBestMove() : empty[Math.floor(Math.random() * empty.length)];
  } else {
    idx = getBestMove();
  }
  makeMove(idx);
}

function getBestMove() {
  let bestScore = -Infinity, bestIdx = -1;
  for (let i = 0; i < 9; i++) {
    if (board[i] !== '') continue;
    board[i] = cpuSym;
    const score = minimax(board, false, 0);
    board[i] = '';
    if (score > bestScore) { bestScore = score; bestIdx = i; }
  }
  return bestIdx;
}

function minimax(b, isCpuTurn, depth) {
  for (const [a, c, d] of WINS) {
    if (b[a] && b[a] === b[c] && b[c] === b[d]) return b[a] === cpuSym ? 10 - depth : depth - 10;
  }
  if (b.every(v => v !== '')) return 0;
  if (isCpuTurn) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (b[i] !== '') continue;
      b[i] = cpuSym; best = Math.max(best, minimax(b, false, depth + 1)); b[i] = '';
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (b[i] !== '') continue;
      b[i] = playerSym; best = Math.min(best, minimax(b, true, depth + 1)); b[i] = '';
    }
    return best;
  }
}

// ══════════════════════════════════
// TIMER
// ══════════════════════════════════
function startTimer() {
  timerSec = 10;
  updateTimerUI();
  clearInterval(timerID);
  timerID = setInterval(() => {
    timerSec--;
    updateTimerUI();
    if (timerSec <= 3 && timerSec > 0) playSound('tick');
    if (timerSec <= 0) { clearInterval(timerID); onTimeout(); }
  }, 1000);
}
function resetTimer() { startTimer(); }
function stopTimer() { clearInterval(timerID); }

function updateTimerUI() {
  const pct = timerSec / 10;
  const offset = CIRC * (1 - pct);
  let col = '#2a7a4b';
  if (timerSec <= 5) col = '#c07a1a';
  if (timerSec <= 3) col = '#d4411e';
  const ring = document.getElementById('timerRing');
  const num = document.getElementById('timerNum');
  ring.setAttribute('stroke-dashoffset', offset);
  ring.setAttribute('stroke', col);
  num.style.color = col;
  num.textContent = timerSec;
}

function onTimeout() {
  if (!gameActive) return;
  const empty = board.map((v, i) => v === '' ? i : -1).filter(i => i >= 0);
  if (!empty.length) return;
  showTimeoutFlash();
  makeMove(empty[Math.floor(Math.random() * empty.length)]);
}

function showTimeoutFlash() {
  const f = document.getElementById('timeoutFlash');
  f.classList.add('show');
  setTimeout(() => f.classList.remove('show'), 950);
}

// ══════════════════════════════════
// TURN + SCORE UI
// ══════════════════════════════════
function updateTurnUI() {
  const badge = document.getElementById('turnBadge');
  const sym = document.getElementById('turnSym');
  const text = document.getElementById('turnText');
  badge.className = 'turn-badge ' + (current === 'X' ? 'x-turn' : 'o-turn');
  sym.className = 'turn-sym ' + (current === 'X' ? 'x' : 'o');
  sym.textContent = current === 'X' ? '✕' : '○';
  if (gameMode === 'friend') {
    text.textContent = (current === 'X' ? 'Player 1' : 'Player 2') + "'s turn";
  } else {
    text.textContent = current === playerSym ? 'Your turn' : 'CPU is thinking…';
  }
  // Highlight active score box
  document.getElementById('scoreBoxX').classList.toggle('active-x', current === 'X');
  document.getElementById('scoreBoxO').classList.toggle('active-o', current === 'O');
}

function updateScoreUI() {
  document.getElementById('scoreX').textContent = scores.X;
  document.getElementById('scoreO').textContent = scores.O;
  document.getElementById('scoreDraw').textContent = scores.draw;
}

// ══════════════════════════════════
// LEADERBOARD
// ══════════════════════════════════
const LB_KEY = 'ttt_leaderboard_v2';
const MAX_LB = 5;

function loadLB() {
  try { return JSON.parse(localStorage.getItem(LB_KEY)) || []; } catch (e) { return []; }
}
function saveLB(arr) { localStorage.setItem(LB_KEY, JSON.stringify(arr)); }

function addToLB(seconds, diff) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  const entry = { time: parseFloat(seconds), diff, date: dateStr };
  let arr = loadLB();
  arr.push(entry);
  arr.sort((a, b) => a.time - b.time);
  const trimmed = arr.slice(0, MAX_LB);
  saveLB(trimmed);
  return trimmed.some(e => e.time === entry.time && e.diff === diff && e.date === dateStr);
}

function getBestTime() { const arr = loadLB(); return arr.length ? arr[0].time : null; }

function saveRecord(s) {
  const newTime = parseFloat(s);
  const prev = getBestTime() || Infinity;
  addToLB(s, difficulty);
  updateLeaderboard();
  return newTime < prev;
}

function updateRecord() {
  const best = getBestTime();
  document.getElementById('recordDisplay').textContent = best ? best + 's' : '--';
}

function updateLeaderboard(newEntryTime) {
  const arr = loadLB();
  const medals = ['🥇', '🥈', '🥉', '', ''];
  const container = document.getElementById('lbList');
  if (!arr.length) {
    container.innerHTML = '<div class="lb-empty">No wins yet — play to set a record!</div>';
    return;
  }
  container.innerHTML = arr.map((e, i) => {
    const rankClass = i < 3 ? ` rank-${i + 1}` : '';
    const isNew = newEntryTime && e.time === parseFloat(newEntryTime) ? ' new-entry' : '';
    const medal = medals[i] || '';
    return `<div class="lb-row${rankClass}${isNew}" style="animation-delay:${i * 0.06}s">
      <span class="lb-medal">${medal}</span>
      ${!medal ? `<span class="lb-rank">${i + 1}</span>` : ''}
      <span class="lb-time">${e.time}s</span>
      <span class="lb-diff ${e.diff}">${e.diff}</span>
      <span class="lb-date">${e.date}</span>
    </div>`;
  }).join('');
}

function clearLeaderboard() { localStorage.removeItem(LB_KEY); updateLeaderboard(); updateRecord(); }

// ══════════════════════════════════
// MODAL
// ══════════════════════════════════
function showModal(emoji, title, sub, gifKey, isRecord, recText, titleClass) {
  const gif = document.getElementById('modalGif');
  if (gifKey && GIFS[gifKey]) { gif.src = GIFS[gifKey]; gif.style.display = 'block'; }
  else { gif.style.display = 'none'; }
  document.getElementById('modalEmoji').textContent = emoji;
  const t = document.getElementById('modalTitle');
  t.textContent = title;
  t.className = 'modal-title ' + (titleClass || '');
  document.getElementById('modalSub').textContent = sub;
  const r = document.getElementById('modalRecord');
  r.textContent = recText;
  r.classList.toggle('show', !!isRecord);
  document.getElementById('modal').classList.add('show');
}

function closeModal() { document.getElementById('modal').classList.remove('show'); stopConfetti(); }

function shakeBoard() {
  const b = document.getElementById('board');
  b.classList.add('shake');
  setTimeout(() => b.classList.remove('shake'), 600);
}

// ══════════════════════════════════
// SCREEN NAV
// ══════════════════════════════════
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
function goToMenu() { stopTimer(); closeModal(); showScreen('startScreen'); updateRecord(); }

// ══════════════════════════════════
// SOUNDS (MP3)
// ══════════════════════════════════
let muted = false;

const SOUNDS = {
  place: new Audio('ting.mp3'),
  tick: new Audio('ting.mp3'),
  record: new Audio('ting.mp3'),
  win: new Audio('gameover.mp3'),
  draw: new Audio('gameover.mp3'),
};

function playSound(type) {
  if (muted) return;
  const snd = SOUNDS[type];
  if (!snd) return;
  snd.currentTime = 0;
  snd.play().catch(() => { });
}

function toggleMute() {
  muted = !muted;
  document.getElementById('muteBtn').textContent = muted ? '🔇' : '🔊';
}

// ══════════════════════════════════
// CONFETTI
// ══════════════════════════════════
let particles = [], raf = null;
function startConfetti() {
  const cv = document.getElementById('confetti');
  cv.width = window.innerWidth; cv.height = window.innerHeight;
  const c = cv.getContext('2d');
  const cols = ['#d4411e', '#2563a8', '#2a7a4b', '#c07a1a', '#1a1916', '#8b5cf6'];
  particles = Array.from({ length: 60 }, () => ({
    x: Math.random() * cv.width, y: -20,
    vx: (Math.random() - .5) * 4, vy: 2 + Math.random() * 3.5,
    size: 5 + Math.random() * 7, col: cols[Math.floor(Math.random() * cols.length)],
    angle: Math.random() * 360, spin: (Math.random() - .5) * 6, alpha: 1
  }));
  cancelAnimationFrame(raf);
  (function loop() {
    c.clearRect(0, 0, cv.width, cv.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.angle += p.spin; p.alpha -= .007;
      c.save(); c.globalAlpha = Math.max(0, p.alpha);
      c.translate(p.x, p.y); c.rotate(p.angle * Math.PI / 180);
      c.fillStyle = p.col; c.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      c.restore();
    });
    particles = particles.filter(p => p.alpha > 0 && p.y < cv.height + 30);
    if (particles.length) raf = requestAnimationFrame(loop);
    else c.clearRect(0, 0, cv.width, cv.height);
  })();
}
function stopConfetti() {
  cancelAnimationFrame(raf);
  const cv = document.getElementById('confetti');
  cv.getContext('2d').clearRect(0, 0, cv.width, cv.height);
}

// ══════════════════════════════════
// INIT
// ══════════════════════════════════
setMode('cpu');
setDiff('medium');
updateRecord();