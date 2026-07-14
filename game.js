// Lexigo -- a daily word-guessing game (Wordle-style). One word per day,
// same for every player, chosen deterministically from today's date.

const WORDS = [
  "ABOUT","ABOVE","ACTOR","ADAPT","ADMIT","AFTER","AGAIN","AGREE","AHEAD","ALARM",
  "ALIKE","ALIVE","ALLOW","ALONE","ALONG","ALTER","AMONG","ANGER","ANGLE","ANGRY",
  "APPLE","APPLY","ARENA","ARGUE","ARISE","ARRAY","ASIDE","ASSET","AVOID","AWAKE",
  "BADGE","BAKER","BASIC","BEACH","BEGIN","BELOW","BENCH","BIRTH","BLACK","BLAME",
  "BLANK","BLIND","BLOCK","BLOOD","BOARD","BOOST","BRAIN","BRAND","BREAD","BREAK",
  "BRIEF","BRING","BROAD","BROWN","BUILD","BUYER","CABLE","CANDY","CARGO","CATCH",
];

const EPOCH = Date.UTC(2026, 0, 1); // day-index zero
function wordIndexForToday() {
  const days = Math.floor((Date.now() - EPOCH) / 86400000);
  return ((days % WORDS.length) + WORDS.length) % WORDS.length;
}
function todayKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

// Correctly handles duplicate letters (two-pass: greens first, then yellows
// against only the remaining, unmatched letters).
function scoreGuess(guess, target) {
  const n = guess.length;
  const result = new Array(n).fill("absent");
  const targetUsed = new Array(n).fill(false);
  const guessUsed = new Array(n).fill(false);
  for (let i = 0; i < n; i++) {
    if (guess[i] === target[i]) {
      result[i] = "correct";
      targetUsed[i] = true;
      guessUsed[i] = true;
    }
  }
  for (let i = 0; i < n; i++) {
    if (guessUsed[i]) continue;
    for (let j = 0; j < n; j++) {
      if (!targetUsed[j] && guess[i] === target[j]) {
        result[i] = "present";
        targetUsed[j] = true;
        break;
      }
    }
  }
  return result;
}

const STORAGE_KEY = "lexigo.progress";
function loadProgress() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { streak: 0, lastWin: null, history: {} }; }
  catch { return { streak: 0, lastWin: null, history: {} }; }
}
function saveProgress(p) { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); }

const TARGET = WORDS[wordIndexForToday()];
let progress = loadProgress();
let guesses = [];
let current = "";
let message = "";
let gameOver = false;

const todayResult = progress.history[todayKey()];
if (todayResult) {
  guesses = todayResult.guesses;
  gameOver = true;
  message = todayResult.won ? "Solved!" : `The word was ${TARGET}`;
}

const app = document.getElementById("app");
const KEY_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

function letterState(letter) {
  let best = null;
  for (const g of guesses) {
    const scored = scoreGuess(g, TARGET);
    for (let i = 0; i < g.length; i++) {
      if (g[i] !== letter) continue;
      if (scored[i] === "correct") return "correct";
      if (scored[i] === "present" && best !== "correct") best = "present";
      if (scored[i] === "absent" && !best) best = "absent";
    }
  }
  return best;
}

function render() {
  let html = `
    <div class="eyebrow">Lexigo &middot; Daily Word</div>
    <h1>Lexigo</h1>
    <div class="sub">Guess the 5-letter word in 6 tries. A new word every day.</div>
    <div class="message">${message}</div>
    <div class="board">
  `;
  for (let r = 0; r < 6; r++) {
    html += `<div class="row">`;
    const guess = guesses[r];
    const scored = guess ? scoreGuess(guess, TARGET) : null;
    for (let c = 0; c < 5; c++) {
      let letter = "", cls = "";
      if (guess) { letter = guess[c]; cls = scored[c]; }
      else if (r === guesses.length && current[c]) { letter = current[c]; cls = "filled"; }
      html += `<div class="tile ${cls}">${letter}</div>`;
    }
    html += `</div>`;
  }
  html += `</div>`;

  if (gameOver) {
    html += `<div class="card">
      <div>${message}</div>
      <div class="streak">Current streak: ${progress.streak} day${progress.streak === 1 ? "" : "s"}</div>
      <div class="streak">Come back tomorrow for a new word.</div>
    </div>`;
  } else {
    html += `<div class="keyboard">`;
    KEY_ROWS.forEach((row, i) => {
      html += `<div class="krow">`;
      if (i === 2) html += `<button class="key wide" data-key="ENTER">Enter</button>`;
      for (const ch of row) html += `<button class="key ${letterState(ch) || ""}" data-key="${ch}">${ch}</button>`;
      if (i === 2) html += `<button class="key wide" data-key="BACK">&larr;</button>`;
      html += `</div>`;
    });
    html += `</div>`;
  }

  app.innerHTML = html;
  if (!gameOver) {
    app.querySelectorAll("[data-key]").forEach(btn => {
      btn.addEventListener("click", () => pressKey(btn.getAttribute("data-key")));
    });
  }
}

function pressKey(key) {
  if (gameOver) return;
  if (key === "BACK") { current = current.slice(0, -1); render(); return; }
  if (key === "ENTER") { submitGuess(); return; }
  if (current.length < 5 && /^[A-Z]$/.test(key)) { current += key; render(); }
}

function submitGuess() {
  if (current.length !== 5) { message = "Not enough letters"; render(); return; }
  guesses.push(current);
  const scored = scoreGuess(current, TARGET);
  const won = scored.every(s => s === "correct");
  current = "";
  if (won) {
    gameOver = true;
    message = "Solved!";
    progress.streak += 1;
  } else if (guesses.length >= 6) {
    gameOver = true;
    message = `The word was ${TARGET}`;
    progress.streak = 0;
  } else {
    message = "";
  }
  if (gameOver) {
    progress.lastWin = won ? todayKey() : progress.lastWin;
    progress.history[todayKey()] = { guesses, won };
    saveProgress(progress);
  }
  render();
}

document.addEventListener("keydown", (e) => {
  if (gameOver) return;
  if (e.key === "Enter") pressKey("ENTER");
  else if (e.key === "Backspace") pressKey("BACK");
  else if (/^[a-zA-Z]$/.test(e.key)) pressKey(e.key.toUpperCase());
});

render();

// ponytail: assert-based self-check for the scoring algorithm (the one piece
// of real logic here) -- duplicate letters are the classic Wordle-clone bug.
(function selfCheck() {
  const check = (cond, msg) => { if (!cond) console.error("Lexigo self-check FAILED:", msg); };
  check(JSON.stringify(scoreGuess("APPLE", "APPLE")) === JSON.stringify(["correct","correct","correct","correct","correct"]), "exact match");
  check(JSON.stringify(scoreGuess("XXXXX", "APPLE")) === JSON.stringify(["absent","absent","absent","absent","absent"]), "no overlap");
  // duplicate-letter case: target "ALLOW" (two L's), guess "LLAMA"
  const dup = scoreGuess("LLAMA", "ALLOW");
  check(dup[0] === "present" && dup[1] === "correct", `duplicate-letter case: ${JSON.stringify(dup)}`);
  console.log("Lexigo self-check passed.");
})();
