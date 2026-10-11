import { playedRounds, playerRound, playersOf, winners, type FinishedGame } from './game';

export interface PlayerStats {
  player: string;
  games: number;
  wins: number;
  rounds: number;
  /** Share of rounds where hands made matched the call. */
  exactRate: number;
  /** Average of (called - made): positive means the player over-bids. */
  bidBias: number;
}

export interface Record_ {
  player: string;
  value: number;
  finishedAt: string;
}

export interface Stats {
  games: number;
  players: PlayerStats[];
  bestRound: Record_ | null;
  bestGame: Record_ | null;
  biggestMiss: Record_ | null;
}

export function computeStats(history: FinishedGame[]): Stats {
  const byPlayer = new Map<string, PlayerStats & { exact: number; bias: number }>();
  let bestRound: Record_ | null = null;
  let bestGame: Record_ | null = null;
  let biggestMiss: Record_ | null = null;

  for (const g of history) {
    const won = winners(g.rounds);
    for (const p of playersOf(g.rounds)) {
      const s = byPlayer.get(p) ?? {
        player: p, games: 0, wins: 0, rounds: 0, exact: 0, bias: 0, exactRate: 0, bidBias: 0,
      };
      s.games++;
      if (won.includes(p)) s.wins++;

      for (const n of playedRounds(g.rounds)) {
        const pr = playerRound(g.rounds, n, p);
        s.rounds++;
        s.bias += pr.judgement - pr.hands;
        if (pr.judgement === pr.hands) s.exact++;
        if (!bestRound || pr.score > bestRound.value) {
          bestRound = { player: p, value: pr.score, finishedAt: g.finishedAt };
        }
        if (!biggestMiss || pr.score < biggestMiss.value) {
          biggestMiss = { player: p, value: pr.score, finishedAt: g.finishedAt };
        }
      }

      const total = g.rounds.scores[p];
      if (!bestGame || total > bestGame.value) {
        bestGame = { player: p, value: total, finishedAt: g.finishedAt };
      }
      byPlayer.set(p, s);
    }
  }

  const players = [...byPlayer.values()]
    .map(({ exact, bias, ...s }) => ({
      ...s,
      exactRate: s.rounds ? exact / s.rounds : 0,
      bidBias: s.rounds ? bias / s.rounds : 0,
    }))
    .sort((a, b) => b.wins - a.wins || b.exactRate - a.exactRate);

  return { games: history.length, players, bestRound, bestGame, biggestMiss };
}
