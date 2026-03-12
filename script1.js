const WINS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];
const GIFS = {
  win: 'win.gif', draw: 'draw.gif',
  cpu: 'draw.gif', p1: 'win.gif', p2: 'win.gif',
};
const CIRC = 131.9; // 2πr, r=21

//  SoundManager
class SoundManager {
  #muted = false;
  #sounds = {
    place:  new Audio('ting.mp3'),
    tick:   new Audio('ting.mp3'),
    record: new Audio('ting.mp3'),
    win:    new Audio('gameover.mp3'),
    draw:   new Audio('gameover.mp3'),
  };

  play(type) {
    if (this.#muted) return;
    const snd = this.#sounds[type];
    if (!snd) return;
    snd.currentTime = 0;
    snd.play().catch(() => {});
  }

  toggleMute() {
    this.#muted = !this.#muted;
    document.getElementById('muteBtn').textContent = this.#muted ? '🔇' : '🔊';
  }
}


//  Confetti
class Confetti {
  #canvas;
  #ctx;
  #particles = [];
  #raf = null;
  #colors = ['#d4411e', '#2563a8', '#2a7a4b', '#c07a1a', '#1a1916', '#8b5cf6'];

  constructor(canvasId) {
    this.#canvas = document.getElementById(canvasId);
    this.#ctx    = this.#canvas.getContext('2d');
  }

  start() {
    this.#canvas.width  = window.innerWidth;
    this.#canvas.height = window.innerHeight;
    this.#particles = Array.from({ length: 60 }, () => ({
      x:     Math.random() * this.#canvas.width,
      y:     -20,
      vx:    (Math.random() - 0.5) * 4,
      vy:    2 + Math.random() * 3.5,
      size:  5 + Math.random() * 7,
      col:   this.#colors[Math.floor(Math.random() * this.#colors.length)],
      angle: Math.random() * 360,
      spin:  (Math.random() - 0.5) * 6,
      alpha: 1,
    }));
    cancelAnimationFrame(this.#raf);
    this.#loop();
  }

  stop() {
    cancelAnimationFrame(this.#raf);
    this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
  }

  #loop() {
    const { width, height } = this.#canvas;
    this.#ctx.clearRect(0, 0, width, height);
    for (const p of this.#particles) {
      p.x += p.vx; p.y += p.vy; p.angle += p.spin; p.alpha -= 0.007;
      this.#ctx.save();
      this.#ctx.globalAlpha = Math.max(0, p.alpha);
      this.#ctx.translate(p.x, p.y);
      this.#ctx.rotate((p.angle * Math.PI) / 180);
      this.#ctx.fillStyle = p.col;
      this.#ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      this.#ctx.restore();
    }
    this.#particles = this.#particles.filter(p => p.alpha > 0 && p.y < height + 30);
    if (this.#particles.length) {
      this.#raf = requestAnimationFrame(() => this.#loop());
    } else {
      this.#ctx.clearRect(0, 0, width, height);
    }
  }
}

//  Timer
class Timer {
  #seconds = 10;
  #intervalId = null;
  #onTimeout;
  #sound;

  constructor({ onTimeout, sound }) {
    this.#onTimeout = onTimeout;
    this.#sound     = sound;
  }

  start() {
    this.#seconds = 10;
    this.#render();
    clearInterval(this.#intervalId);
    this.#intervalId = setInterval(() => {
      this.#seconds--;
      this.#render();
      if (this.#seconds <= 3 && this.#seconds > 0) this.#sound.play('tick');
      if (this.#seconds <= 0) { clearInterval(this.#intervalId); this.#onTimeout(); }
    }, 1000);
  }

  reset() { this.start(); }
  stop()  { clearInterval(this.#intervalId); }

  #render() {
    const offset = CIRC * (1 - this.#seconds / 10);
    const col    = this.#seconds <= 3 ? '#d4411e'
                 : this.#seconds <= 5 ? '#c07a1a'
                 : '#2a7a4b';
    const ring = document.getElementById('timerRing');
    ring.setAttribute('stroke-dashoffset', offset);
    ring.setAttribute('stroke', col);
    const num = document.getElementById('timerNum');
    num.style.color = col;
    num.textContent = this.#seconds;
  }
}

//  Leaderboard
class Leaderboard {
  #key;
  #max;
  #medals = ['🥇', '🥈', '🥉', '', ''];

  constructor(key = 'ttt_leaderboard_v2', max = 5) {
    this.#key = key;
    this.#max = max;
  }

  #load() {
    try { return JSON.parse(localStorage.getItem(this.#key)) || []; }
    catch { return []; }
  }
  #save(arr) { localStorage.setItem(this.#key, JSON.stringify(arr)); }

  add(seconds, difficulty) {
    const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    const entry   = { time: parseFloat(seconds), diff: difficulty, date: dateStr };
    const arr     = this.#load();
    arr.push(entry);
    arr.sort((a, b) => a.time - b.time);
    const trimmed = arr.slice(0, this.#max);
    this.#save(trimmed);
    return trimmed.some(e => e.time === entry.time && e.diff === difficulty && e.date === dateStr);
  }

  getBestTime() {
    const arr = this.#load();
    return arr.length ? arr[0].time : null;
  }

  saveRecord(seconds, difficulty) {
    const prev = this.getBestTime() ?? Infinity;
    this.add(seconds, difficulty);
    return parseFloat(seconds) < prev;
  }

  clear() { localStorage.removeItem(this.#key); }

  render(newEntryTime) {
    const arr       = this.#load();
    const container = document.getElementById('lbList');
    if (!arr.length) {
      container.innerHTML = '<div class="lb-empty">No wins yet — play to set a record!</div>';
      return;
    }
    container.innerHTML = arr.map((e, i) => {
      const rankClass = i < 3 ? ` rank-${i + 1}` : '';
      const isNew     = newEntryTime && e.time === parseFloat(newEntryTime) ? ' new-entry' : '';
      const medal     = this.#medals[i] || '';
      return `<div class="lb-row${rankClass}${isNew}" style="animation-delay:${i * 0.06}s">
        <span class="lb-medal">${medal}</span>
        ${!medal ? `<span class="lb-rank">${i + 1}</span>` : ''}
        <span class="lb-time">${e.time}s</span>
        <span class="lb-diff ${e.diff}">${e.diff}</span>
        <span class="lb-date">${e.date}</span>
      </div>`;
    }).join('');
  }

  renderBestTime() {
    const best = this.getBestTime();
    document.getElementById('recordDisplay').textContent = best ? `${best}s` : '--';
  }
}
//  AI
class AI {
  #cpuSym     = 'O';
  #playerSym  = 'X';
  #difficulty = 'medium';

  configure({ cpuSym, playerSym, difficulty }) {
    this.#cpuSym     = cpuSym;
    this.#playerSym  = playerSym;
    this.#difficulty = difficulty;
  }

  pickMove(board) {
    const empty = board.map((v, i) => v === '' ? i : -1).filter(i => i >= 0);
    if (!empty.length) return -1;
    switch (this.#difficulty) {
      case 'easy':   return empty[Math.floor(Math.random() * empty.length)];
      case 'medium': return Math.random() < 0.5
        ? this.#bestMove(board)
        : empty[Math.floor(Math.random() * empty.length)];
      default:       return this.#bestMove(board);
    }
  }

  #bestMove(board) {
    let bestScore = -Infinity, bestIdx = -1;
    for (let i = 0; i < 9; i++) {
      if (board[i] !== '') continue;
      board[i] = this.#cpuSym;
      const score = this.#minimax(board, false, 0);
      board[i] = '';
      if (score > bestScore) { bestScore = score; bestIdx = i; }
    }
    return bestIdx;
  }

  #minimax(board, isCpuTurn, depth) {
    for (const [a, b, c] of WINS) {
      if (board[a] && board[a] === board[b] && board[b] === board[c])
        return board[a] === this.#cpuSym ? 10 - depth : depth - 10;
    }
    if (board.every(v => v !== '')) return 0;
    if (isCpuTurn) {
      let best = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (board[i] !== '') continue;
        board[i] = this.#cpuSym;
        best = Math.max(best, this.#minimax(board, false, depth + 1));
        board[i] = '';
      }
      return best;
    } else {
      let best = Infinity;
      for (let i = 0; i < 9; i++) {
        if (board[i] !== '') continue;
        board[i] = this.#playerSym;
        best = Math.min(best, this.#minimax(board, true, depth + 1));
        board[i] = '';
      }
      return best;
    }
  }
}

//  Board
class Board {
  #el;
  #svg;
  #onCellClick;

  constructor(boardId, svgId, onCellClick) {
    this.#el          = document.getElementById(boardId);
    this.#svg         = document.getElementById(svgId);
    this.#onCellClick = onCellClick;
  }

  build() {
    this.#el.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.setAttribute('tabindex', '0');
      cell.setAttribute('aria-label', `Cell ${i + 1}`);
      cell.dataset.i = i;
      cell.addEventListener('click',   ()  => this.#onCellClick(i));
      cell.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') this.#onCellClick(i);
      });
      this.#el.appendChild(cell);
    }
  }

  render(boardState) {
    this.#cells().forEach((cell, i) => {
      if (boardState[i] === '') {
        cell.innerHTML = '';
        cell.className = 'cell';
      } else if (!cell.classList.contains('taken')) {
        cell.classList.add('taken');
        cell.innerHTML = boardState[i] === 'X' ? this.#svgX() : this.#svgO();
      }
    });
  }

  highlightWinners(combo, sym) {
    const cls = sym === 'X' ? 'winner-x' : 'winner-o';
    combo.forEach(i => this.#cells()[i].classList.add(cls));
  }

  drawWinLine(combo, boardState) {
    this.#svg.innerHTML = '';
    const cells = this.#cells();
    const br    = this.#el.getBoundingClientRect();
    const center = i => {
      const r = cells[i].getBoundingClientRect();
      return {
        x: ((r.left - br.left + r.width  / 2) / br.width)  * 420,
        y: ((r.top  - br.top  + r.height / 2) / br.height) * 420,
      };
    };
    const s   = center(combo[0]);
    const e   = center(combo[2]);
    const sym = boardState[combo[0]];
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', s.x); line.setAttribute('y1', s.y);
    line.setAttribute('x2', e.x); line.setAttribute('y2', e.y);
    line.setAttribute('class', `wl ${sym === 'X' ? 'wl-x' : 'wl-o'}`);
    this.#svg.appendChild(line);
  }

  clearWinLine() { this.#svg.innerHTML = ''; }

  shake() {
    this.#el.classList.add('shake');
    setTimeout(() => this.#el.classList.remove('shake'), 600);
  }

  #cells() { return [...this.#el.querySelectorAll('.cell')]; }

  #svgX() {
    return `<svg viewBox="0 0 50 50">
      <line class="x-line" x1="12" y1="12" x2="38" y2="38"/>
      <line class="x-line" x1="38" y1="12" x2="12" y2="38" style="animation-delay:.08s"/>
    </svg>`;
  }
  #svgO() {
    return `<svg viewBox="0 0 50 50">
      <circle class="o-circle" cx="25" cy="25" r="16"/>
    </svg>`;
  }
}

//  ScoreBoard
class ScoreBoard {
  #scores = { X: 0, O: 0, draw: 0 };

  reset()        { this.#scores = { X: 0, O: 0, draw: 0 }; this.#render(); }
  increment(key) { this.#scores[key]++; this.#render(); }

  #render() {
    document.getElementById('scoreX').textContent    = this.#scores.X;
    document.getElementById('scoreO').textContent    = this.#scores.O;
    document.getElementById('scoreDraw').textContent = this.#scores.draw;
  }
}

//  Modal
class Modal {
  #el;
  #onClose;

  constructor(modalId, onClose) {
    this.#el      = document.getElementById(modalId);
    this.#onClose = onClose;
  }

  show({ emoji = '', title = '', subtitle = '', gifKey, isRecord, recordText = '', titleClass = '' } = {}) {
    const gif = document.getElementById('modalGif');
    if (gifKey && GIFS[gifKey]) { gif.src = GIFS[gifKey]; gif.style.display = 'block'; }
    else                        { gif.style.display = 'none'; }

    document.getElementById('modalEmoji').textContent = emoji;

    const t = document.getElementById('modalTitle');
    t.textContent = title;
    t.className   = `modal-title ${titleClass}`;

    document.getElementById('modalSub').textContent = subtitle;

    const r = document.getElementById('modalRecord');
    r.textContent = recordText;
    r.classList.toggle('show', !!isRecord);

    this.#el.classList.add('show');
  }

  hide() { this.#el.classList.remove('show'); this.#onClose(); }
}



//  Game 
class Game {
  #sound       = new SoundManager();
  #confetti    = new Confetti('confetti');
  #leaderboard = new Leaderboard();
  #scoreBoard  = new ScoreBoard();
  #ai          = new AI();
  #board       = new Board('board', 'winLineSvg', i => this.#handleCellClick(i));
  #timer       = new Timer({ onTimeout: () => this.#onTimeout(), sound: this.#sound });
  #modal       = new Modal('modal', () => this.#confetti.stop());

  #gameMode   = 'cpu';
  #difficulty = 'medium';
  #playerSym  = 'X';
  #cpuSym     = 'O';
  #boardState = Array(9).fill('');
  #current    = 'X';
  #gameActive = false;
  #startTime  = 0;

  //  Setup 
  setMode(m) {
    this.#gameMode = m;
    document.getElementById('btnCPU').classList.toggle('active', m === 'cpu');
    document.getElementById('btnFriend').classList.toggle('active', m === 'friend');
    document.getElementById('diffCard').style.display = m === 'cpu' ? 'block' : 'none';
  }

  setDifficulty(d) {
    this.#difficulty = d;
    ['Easy', 'Medium', 'Hard'].forEach(x => {
      document.getElementById(`d${x}`).classList.toggle('active', x.toLowerCase() === d);
    });
    this.#leaderboard.renderBestTime();
  }

  setSymbol(s) {
    this.#playerSym = s;
    this.#cpuSym    = s === 'X' ? 'O' : 'X';
    document.getElementById('symX').className = `sym-btn${s === 'X' ? ' sel-x' : ''}`;
    document.getElementById('symO').className = `sym-btn${s === 'O' ? ' sel-o' : ''}`;
  }

  // Screen navigation 
  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  goToMenu() {
    this.#timer.stop();
    this.#modal.hide();
    this.showScreen('startScreen');
    this.#leaderboard.renderBestTime();
  }

  // Start 
  startGame() {
    this.#scoreBoard.reset();
    document.getElementById('p1name').textContent = 'Player';
    document.getElementById('p2name').textContent = this.#gameMode === 'cpu' ? 'CPU' : 'P2';
    this.showScreen('gameScreen');
    this.#leaderboard.renderBestTime();
    this.#leaderboard.render();
    this.#board.build();
    this.#newRound();
  }

  restartRound() { this.#timer.stop(); this.#newRound(); }

  #newRound() {
    this.#boardState = Array(9).fill('');
    this.#current    = 'X';
    this.#gameActive = true;
    this.#startTime  = Date.now();

    this.#board.render(this.#boardState);
    this.#board.clearWinLine();
    this.#updateTurnUI();
    this.#timer.start();

    this.#ai.configure({
      cpuSym: this.#cpuSym, playerSym: this.#playerSym, difficulty: this.#difficulty,
    });

    if (this.#gameMode === 'cpu' && this.#cpuSym === 'X') {
      this.#gameActive = false;
      setTimeout(() => { this.#gameActive = true; this.#doCpuMove(); }, 500);
    }
  }

  //Moves
  #handleCellClick(i) {
    if (!this.#gameActive)                                              return;
    if (this.#boardState[i] !== '')                                     return;
    if (this.#gameMode === 'cpu' && this.#current !== this.#playerSym) return;
    this.#makeMove(i);
  }

  #makeMove(i) {
    this.#boardState[i] = this.#current;
    this.#board.render(this.#boardState);
    this.#sound.play('place');

    const winner = this.#getWinner();
    if (winner)                                { this.#endGame(winner); return; }
    if (this.#boardState.every(v => v !== '')) { this.#endGame('draw'); return; }

    this.#current = this.#current === 'X' ? 'O' : 'X';
    this.#updateTurnUI();
    this.#timer.reset();

    if (this.#gameMode === 'cpu' && this.#current === this.#cpuSym) {
      this.#gameActive = false;
      setTimeout(() => { this.#gameActive = true; this.#doCpuMove(); }, 400 + Math.random() * 300);
    }
  }

  #doCpuMove() {
    const idx = this.#ai.pickMove(this.#boardState);
    if (idx >= 0) this.#makeMove(idx);
  }

  #getWinner() {
    for (const [a, b, c] of WINS) {
      if (this.#boardState[a] &&
          this.#boardState[a] === this.#boardState[b] &&
          this.#boardState[b] === this.#boardState[c]) {
        return { sym: this.#boardState[a], combo: [a, b, c] };
      }
    }
    return null;
  }

  // End game 
  #endGame(result) {
    this.#gameActive = false;
    this.#timer.stop();

    if (result === 'draw') {
      this.#scoreBoard.increment('draw');
      this.#board.shake();
      this.#sound.play('draw');
      setTimeout(() => this.#modal.show({
        emoji: '🤝', title: 'Draw!', subtitle: 'Nobody wins this round', gifKey: 'draw',
      }), 200);
      return;
    }

    const { sym, combo } = result;
    this.#board.highlightWinners(combo, sym);
    this.#board.drawWinLine(combo, this.#boardState);
    this.#scoreBoard.increment(sym);
    this.#sound.play('win');
    this.#confetti.start();

    const elapsed  = ((Date.now() - this.#startTime) / 1000).toFixed(1);
    const isRecord = this.#leaderboard.saveRecord(elapsed, this.#difficulty);
    if (isRecord) { this.#sound.play('record'); this.#leaderboard.renderBestTime(); }
    this.#leaderboard.render(elapsed);

    let who, gifKey, titleClass;
    if (this.#gameMode === 'friend') {
      who        = sym === 'X' ? 'Player 1 Wins!' : 'Player 2 Wins!';
      gifKey     = sym === 'X' ? 'p1' : 'p2';
      titleClass = sym === 'X' ? 'win-x' : 'win-o';
    } else {
      const playerWon = sym === this.#playerSym;
      who        = playerWon ? 'You Win! 🎉' : 'CPU Wins!';
      gifKey     = playerWon ? 'win' : 'cpu';
      titleClass = sym === 'X' ? 'win-x' : 'win-o';
    }

    setTimeout(() => this.#modal.show({
      emoji: '🏆', title: who, subtitle: `Finished in ${elapsed}s`,
      gifKey, isRecord, recordText: `🏅 New record: ${elapsed}s`, titleClass,
    }), 500);
  }

  // Timeout 
  #onTimeout() {
    if (!this.#gameActive) return;
    const empty = this.#boardState.map((v, i) => v === '' ? i : -1).filter(i => i >= 0);
    if (!empty.length) return;
    this.#showTimeoutFlash();
    this.#makeMove(empty[Math.floor(Math.random() * empty.length)]);
  }

  #showTimeoutFlash() {
    const f = document.getElementById('timeoutFlash');
    f.classList.add('show');
    setTimeout(() => f.classList.remove('show'), 950);
  }

  //  Turn UI 
  #updateTurnUI() {
    const badge = document.getElementById('turnBadge');
    const sym   = document.getElementById('turnSym');
    const text  = document.getElementById('turnText');

    badge.className = `turn-badge ${this.#current === 'X' ? 'x-turn' : 'o-turn'}`;
    sym.className   = `turn-sym ${this.#current === 'X' ? 'x' : 'o'}`;
    sym.textContent = this.#current === 'X' ? '✕' : '○';

    text.textContent = this.#gameMode === 'friend'
      ? `${this.#current === 'X' ? 'Player 1' : 'Player 2'}'s turn`
      : this.#current === this.#playerSym ? 'Your turn' : 'CPU is thinking…';

    document.getElementById('scoreBoxX').classList.toggle('active-x', this.#current === 'X');
    document.getElementById('scoreBoxO').classList.toggle('active-o', this.#current === 'O');
  }

  // Public surface 
  closeModal()       { this.#modal.hide(); }
  toggleMute()       { this.#sound.toggleMute(); }
  clearLeaderboard() {
    this.#leaderboard.clear();
    this.#leaderboard.render();
    this.#leaderboard.renderBestTime();
  }
}

//  Bootstrap — one global instance, wired to HTML onclicks

const game = new Game();

window.setMode          = m  => game.setMode(m);
window.setDiff          = d  => game.setDifficulty(d);
window.setSymbol        = s  => game.setSymbol(s);
window.startGame        = () => game.startGame();
window.restartRound     = () => game.restartRound();
window.goToMenu         = () => game.goToMenu();
window.closeModal       = () => game.closeModal();
window.toggleMute       = () => game.toggleMute();
window.clearLeaderboard = () => game.clearLeaderboard();

// Boot defaults (matches your HTML's initial active states)
game.setMode('cpu');
game.setDifficulty('medium');