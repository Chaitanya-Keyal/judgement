// Packs a finished game into a short, reversible code for share links.
//
// Only what can't be derived is stored: player names, the first dealer, when it was played,
// and each round's called/made numbers (bit-packed). Suits, dealers and scores are rebuilt
// from the rules on decode.
//
// Layout (then base64url):
//   byte 0      format version
//   byte 1      number of players
//   byte 2      index of the first dealer
//   bytes 3-6   finished time, minutes since the Unix epoch (0 = unknown)
//   per player  name length (1 byte) + UTF-8 name
//   bit stream  for each round, highest first, for each player: called, made
//               (each uses just enough bits for that round's hand count)
//   last byte   checksum of everything before it, so damaged links are rejected

import {
  createRounds,
  currentRound,
  playerRound,
  playersOf,
  round,
  setRound,
  totalRounds,
  type Rounds,
} from './game';

const VERSION = 1;
const RESERVED_NAMES = ['suit', 'suit_icon', 'dealer', '__proto__'];

export interface SharedGame {
  rounds: Rounds;
  finishedAt: string | null;
}

/** FNV-1a folded to one byte: enough to catch truncated or mistyped links. */
function checksum(bytes: ArrayLike<number>, length: number): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < length; i++) hash = Math.imul(hash ^ bytes[i], 0x01000193);
  return (hash ^ (hash >>> 8) ^ (hash >>> 16) ^ (hash >>> 24)) & 0xff;
}

/** Bits needed to store any value from 0 to `max`. */
const bitsFor = (max: number) => 32 - Math.clz32(max);

function toBase64Url(bytes: number[]): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}

function fromBase64Url(code: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(code)) throw new Error('Invalid characters');
  const binary = atob(code.replaceAll('-', '+').replaceAll('_', '/'));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/** Stable JSON, so two games can be compared regardless of key order. */
function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`)
    .join(',')}}`;
}

/**
 * Returns the share code for a finished game, or null if the game can't be represented
 * exactly (unfinished, or a log that doesn't follow the standard rules).
 */
export function encodeGame(rounds: Rounds, finishedAt?: string | null): string | null {
  try {
    if (currentRound(rounds) !== 0) return null;
    const players = playersOf(rounds);
    const total = totalRounds(rounds);
    const firstDealer = players.indexOf(round(rounds, total).dealer);
    const minutes = finishedAt ? Math.floor(Date.parse(finishedAt) / 60000) : 0;
    if (firstDealer < 0 || players.length > 255 || !Number.isFinite(minutes)) return null;

    const bytes = [VERSION, players.length, firstDealer];
    for (const shift of [24, 16, 8, 0]) bytes.push((minutes >>> shift) & 0xff);

    const utf8 = new TextEncoder();
    for (const p of players) {
      const name = utf8.encode(p);
      if (name.length === 0 || name.length > 255) return null;
      bytes.push(name.length, ...name);
    }

    let acc = 0;
    let accBits = 0;
    const write = (value: number, bits: number) => {
      for (let i = bits - 1; i >= 0; i--) {
        acc = (acc << 1) | ((value >> i) & 1);
        if (++accBits === 8) {
          bytes.push(acc);
          acc = 0;
          accBits = 0;
        }
      }
    };
    for (let n = total; n >= 1; n--) {
      for (const p of players) {
        const pr = playerRound(rounds, n, p);
        write(pr.judgement, bitsFor(n));
        write(pr.hands, bitsFor(n));
      }
    }
    if (accBits) bytes.push(acc << (8 - accBits));
    bytes.push(checksum(bytes, bytes.length));

    // Only hand out a link that reproduces this exact game.
    const code = toBase64Url(bytes);
    return canonical(decodeGame(code).rounds) === canonical(rounds) ? code : null;
  } catch {
    return null;
  }
}

/** Rebuilds a game from a share code. Throws if the code is malformed. */
export function decodeGame(code: string): SharedGame {
  const all = fromBase64Url(code);
  if (all.length < 2 || checksum(all, all.length - 1) !== all[all.length - 1]) {
    throw new Error('Checksum mismatch');
  }
  const bytes = all.subarray(0, -1);
  let pos = 0;
  const byte = () => {
    if (pos >= bytes.length) throw new Error('Truncated');
    return bytes[pos++];
  };

  if (byte() !== VERSION) throw new Error('Unknown version');
  const count = byte();
  const firstDealer = byte();
  if (count < 2 || count > 52 || firstDealer >= count) throw new Error('Invalid players');
  const minutes = ((byte() << 24) | (byte() << 16) | (byte() << 8) | byte()) >>> 0;

  const utf8 = new TextDecoder('utf-8', { fatal: true });
  const players: string[] = [];
  for (let i = 0; i < count; i++) {
    const length = byte();
    if (length === 0 || pos + length > bytes.length) throw new Error('Invalid name');
    const name = utf8.decode(bytes.subarray(pos, pos + length));
    pos += length;
    if (players.includes(name) || RESERVED_NAMES.includes(name)) throw new Error('Invalid name');
    players.push(name);
  }

  let bitPos = pos * 8;
  const read = (bits: number) => {
    let value = 0;
    for (let i = 0; i < bits; i++, bitPos++) {
      if (bitPos >= bytes.length * 8) throw new Error('Truncated');
      value = (value << 1) | ((bytes[bitPos >> 3] >> (7 - (bitPos & 7))) & 1);
    }
    return value;
  };

  let rounds = createRounds(players, players[firstDealer]);
  for (let n = totalRounds(rounds); n >= 1; n--) {
    const judgements: Record<string, number> = {};
    const hands: Record<string, number> = {};
    for (const p of players) {
      judgements[p] = read(bitsFor(n));
      hands[p] = read(bitsFor(n));
      if (judgements[p] > n || hands[p] > n) throw new Error('Invalid round');
    }
    rounds = setRound(rounds, n, judgements, hands);
  }

  return { rounds, finishedAt: minutes ? new Date(minutes * 60000).toISOString() : null };
}
