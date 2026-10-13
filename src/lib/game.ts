// The saved game doubles as the downloadable JSON log. Keep its shape stable so that
// previously downloaded logs always load.

export type Suit = 'Spades' | 'Hearts' | 'Clubs' | 'Diamonds';

export interface PlayerRound {
  judgement: number;
  hands: number;
  score: number;
}

export interface RoundInfo {
  suit: Suit;
  suit_icon: string;
  dealer: string;
  [player: string]: PlayerRound | string;
}

export interface Rounds {
  scores: Record<string, number>;
  completed_rounds: number;
  [round: string]: RoundInfo | Record<string, number> | number;
}

/** Bids typed into the current round but not yet submitted. */
export interface Draft {
  round: number;
  phase: 'judgement' | 'hands';
  judgements: Record<string, string>;
  hands: Record<string, string>;
}

export interface SavedGame {
  id?: string;
  fileName: string;
  rounds: Rounds;
  draft?: Draft;
}

export interface FinishedGame {
  id: string;
  finishedAt: string;
  rounds: Rounds;
}

const SUITS: Suit[] = ['Spades', 'Hearts', 'Clubs', 'Diamonds'];
// Stored in each round of the log format; the UI renders suits with icons instead.
const SUIT_ICONS = ['♠', '♥', '♣', '♦'];
const META_KEYS = ['suit', 'suit_icon', 'dealer'];
const STORAGE_KEY = 'judgement:current';
const HISTORY_KEY = 'judgement:history';

// JSON round-trip rather than structuredClone: callers may pass Svelte state proxies.
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

export function titleCase(name: string): string {
  return name.trim().replace(/\p{L}+/gu, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

export function round(rounds: Rounds, n: number): RoundInfo {
  return rounds[String(n)] as RoundInfo;
}

export function playerRound(rounds: Rounds, n: number, player: string): PlayerRound {
  return round(rounds, n)[player] as PlayerRound;
}

export function noOfRounds(players: string[]): number {
  return Math.floor(52 / players.length);
}

export function createRounds(players: string[], firstDealer: string): Rounds {
  const total = noOfRounds(players);
  const rounds = {
    scores: Object.fromEntries(players.map((p) => [p, 0])),
  } as Rounds;

  for (let i = total; i > 0; i--) {
    const offset = total - i;
    const info: RoundInfo = {
      suit: SUITS[offset % 4],
      suit_icon: SUIT_ICONS[offset % 4],
      dealer: players[(players.indexOf(firstDealer) + offset) % players.length],
    };
    for (const p of players) info[p] = { judgement: 0, hands: 0, score: 0 };
    rounds[String(i)] = info;
  }

  rounds.completed_rounds = total + 1;
  return rounds;
}

export function resetRounds(rounds: Rounds): Rounds {
  const players = playersOf(rounds);
  const total = totalRounds(rounds);
  const fresh = clone(rounds);
  fresh.scores = Object.fromEntries(players.map((p) => [p, 0]));
  for (let i = total; i > 0; i--) {
    for (const p of players) round(fresh, i)[p] = { judgement: 0, hands: 0, score: 0 };
  }
  fresh.completed_rounds = total + 1;
  return fresh;
}

export function playersOf(rounds: Rounds): string[] {
  return Object.keys(round(rounds, 1)).filter((k) => !META_KEYS.includes(k));
}

export function totalRounds(rounds: Rounds): number {
  return Object.keys(rounds).length - 2;
}

export function currentRound(rounds: Rounds): number {
  return rounds.completed_rounds - 1;
}

/** Bidding order for a round: starts left of the dealer, dealer goes last. */
export function turnOrder(players: string[], dealer: string): string[] {
  const d = players.indexOf(dealer);
  return [...players.slice(d + 1), ...players.slice(0, d + 1)];
}

export function scoreFor(judgement: number, hands: number): number {
  if (judgement !== hands) return -10 * Math.abs(judgement - hands);
  if (hands === 0) return 10;
  if (hands === 1) return 15;
  return 10 * hands;
}

/** Rounds already played, in play order (highest first). */
export function playedRounds(rounds: Rounds): number[] {
  const out: number[] = [];
  for (let i = totalRounds(rounds); i >= rounds.completed_rounds; i--) out.push(i);
  return out;
}

function recomputeScores(rounds: Rounds) {
  for (const p of playersOf(rounds)) rounds.scores[p] = 0;
  for (const n of playedRounds(rounds)) {
    for (const p of playersOf(rounds)) rounds.scores[p] += playerRound(rounds, n, p).score;
  }
}

/** Records the result of round `n`, as a new round or a correction of a played one. */
export function setRound(
  rounds: Rounds,
  n: number,
  judgements: Record<string, number>,
  hands: Record<string, number>,
): Rounds {
  const next = clone(rounds);
  for (const p of playersOf(next)) {
    const pr = playerRound(next, n, p);
    pr.judgement = judgements[p];
    pr.hands = hands[p];
    pr.score = scoreFor(pr.judgement, pr.hands);
  }
  next.completed_rounds = Math.min(next.completed_rounds, n);
  recomputeScores(next);
  return next;
}

export function judgementError(n: number, values: number[]): string | null {
  if (values.reduce((a, b) => a + b, 0) === n) {
    return 'Total Judgement cannot be equal to the number of hands! Someone has to lose!';
  }
  return null;
}

export function handsError(n: number, values: number[]): string | null {
  if (values.reduce((a, b) => a + b, 0) !== n) {
    return 'Total Hands should be equal to the number of hands!';
  }
  return null;
}

/** Running total for each player after every played round, in play order. */
export function cumulativeScores(rounds: Rounds): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const p of playersOf(rounds)) {
    let total = 0;
    out[p] = playedRounds(rounds).map((n) => (total += playerRound(rounds, n, p).score));
  }
  return out;
}

export function winners(rounds: Rounds): string[] {
  const top = Math.max(...Object.values(rounds.scores));
  return Object.keys(rounds.scores).filter((p) => rounds.scores[p] === top);
}

const nameList = new Intl.ListFormat('en-GB', { style: 'long', type: 'conjunction' });

/** "Ann", "Ann and Ben", "Ann, Ben and Cat". */
export function listNames(names: string[]): string {
  return nameList.format(names);
}

/** Players sorted by score, with shared ranks for ties (1, 1, 3, ...). */
export function standings(rounds: Rounds): { player: string; score: number; rank: number }[] {
  const sorted = Object.entries(rounds.scores).sort((a, b) => b[1] - a[1]);
  return sorted.map(([player, score]) => ({
    player,
    score,
    rank: sorted.findIndex(([, s]) => s === score) + 1,
  }));
}

export function newId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function newLogName(d = new Date()): string {
  const p = (x: number) => String(x).padStart(2, '0');
  return (
    `judgment_game_log_${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}_` +
    `${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}.json`
  );
}

export function parseLog(text: string): Rounds {
  const data = JSON.parse(text);
  if (
    typeof data !== 'object' ||
    !data ||
    typeof data.scores !== 'object' ||
    typeof data.completed_rounds !== 'number' ||
    typeof data['1'] !== 'object'
  ) {
    throw new Error('Not a Judgement game log');
  }
  return data as Rounds;
}

export function downloadLog(game: SavedGame) {
  const blob = new Blob([JSON.stringify(game.rounds, null, 4)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = game.fileName.endsWith('.json') ? game.fileName : `${game.fileName}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function saveCurrent(game: SavedGame) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
}

export function loadCurrent(): SavedGame | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedGame) : null;
  } catch {
    return null;
  }
}

export function clearCurrent() {
  localStorage.removeItem(STORAGE_KEY);
}

export function loadHistory(): FinishedGame[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') as FinishedGame[];
  } catch {
    return [];
  }
}

export function gameId(game: SavedGame): string {
  return game.id ?? game.fileName;
}

export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

export function removeFromHistory(id: string): FinishedGame[] {
  const history = loadHistory().filter((g) => g.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  return history;
}

/**
 * Adds a finished game to the history. A game already there (e.g. after an edit) is updated
 * in place and keeps its original finish time.
 */
export function recordFinished(game: SavedGame, finishedAt?: string | null): FinishedGame[] {
  const id = gameId(game);
  const history = loadHistory();
  const index = history.findIndex((g) => g.id === id);
  const entry = {
    id,
    finishedAt: finishedAt ?? history[index]?.finishedAt ?? new Date().toISOString(),
    rounds: clone(game.rounds),
  };
  if (index === -1) history.push(entry);
  else history[index] = entry;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  return history;
}
