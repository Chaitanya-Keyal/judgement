// Game data uses the exact same shape as the desktop app's JSON logs,
// so logs saved from either version can be loaded by the other.

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

export interface SavedGame {
  fileName: string;
  rounds: Rounds;
}

const SUITS: Suit[] = ['Spades', 'Hearts', 'Clubs', 'Diamonds'];
const SUIT_ICONS = ['♠', '♥', '♣', '♦'];
const META_KEYS = ['suit', 'suit_icon', 'dealer'];
const STORAGE_KEY = 'judgement:current';

// JSON round-trip rather than structuredClone: callers may pass Svelte state proxies.
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

export function titleCase(name: string): string {
  return name
    .trim()
    .replace(/\p{L}+/gu, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
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

export function completeRound(
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
    next.scores[p] += pr.score;
  }
  next.completed_rounds = n;
  return next;
}

export function standings(rounds: Rounds): [string, number][] {
  return Object.entries(rounds.scores).sort((a, b) => b[1] - a[1]);
}

export function newLogName(): string {
  const d = new Date();
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
