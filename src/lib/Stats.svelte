<script lang="ts">
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import Download from '@lucide/svelte/icons/download';
  import Flame from '@lucide/svelte/icons/flame';
  import Layers from '@lucide/svelte/icons/layers';
  import Share2 from '@lucide/svelte/icons/share-2';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import TrendingDown from '@lucide/svelte/icons/trending-down';
  import Trophy from '@lucide/svelte/icons/trophy';
  import {
    downloadLog,
    listNames,
    newLogName,
    playersOf,
    winners,
    type FinishedGame,
  } from './game';
  import { computeStats } from './stats';

  let {
    history,
    onclear,
    ondelete,
    onshare,
    viewHref,
  }: {
    history: FinishedGame[];
    onclear: () => void;
    ondelete: (g: FinishedGame) => void;
    onshare: (g: FinishedGame) => void;
    /** Link to a game's full end screen. */
    viewHref: (g: FinishedGame) => string;
  } = $props();

  const stats = $derived(computeStats(history));
  const recent = $derived([...history].reverse());

  const date = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const bias = (v: number) =>
    Math.abs(v) < 0.05 ? 'Spot on' : `${v > 0 ? 'Over' : 'Under'} by ${Math.abs(v).toFixed(1)}`;

  function download(g: FinishedGame) {
    downloadLog({ fileName: newLogName(new Date(g.finishedAt)), rounds: g.rounds });
  }
</script>

<section class="stats">
  <h1>Stats</h1>

  {#if history.length === 0}
    <p class="empty card">Finish a game and your stats will show up here.</p>
  {:else}
    <div class="tiles">
      <div class="card tile">
        <span class="tile-icon"><Layers size={18} /></span>
        <span class="label">Games played</span>
        <span class="value">{stats.games}</span>
      </div>
      {#if stats.bestRound}
        <div class="card tile">
          <span class="tile-icon"><Flame size={18} /></span>
          <span class="label">Best round</span>
          <span class="value">{stats.bestRound.value}</span>
          <span class="who">{stats.bestRound.player}, {date(stats.bestRound.finishedAt)}</span>
        </div>
      {/if}
      {#if stats.bestGame}
        <div class="card tile">
          <span class="tile-icon gold"><Trophy size={18} /></span>
          <span class="label">Highest game total</span>
          <span class="value">{stats.bestGame.value}</span>
          <span class="who">{stats.bestGame.player}, {date(stats.bestGame.finishedAt)}</span>
        </div>
      {/if}
      {#if stats.biggestMiss}
        <div class="card tile">
          <span class="tile-icon red"><TrendingDown size={18} /></span>
          <span class="label">Worst round</span>
          <span class="value">{stats.biggestMiss.value}</span>
          <span class="who">{stats.biggestMiss.player}, {date(stats.biggestMiss.finishedAt)}</span>
        </div>
      {/if}
    </div>

    <div class="card">
      <h2>Players</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="left">Player</th>
              <th>Games</th>
              <th>Wins</th>
              <th>Exact calls</th>
              <th>Calls vs made</th>
            </tr>
          </thead>
          <tbody>
            {#each stats.players as s (s.player)}
              <tr>
                <td class="left name">{s.player}</td>
                <td>{s.games}</td>
                <td>{s.wins}</td>
                <td>{pct(s.exactRate)}</td>
                <td class:over={s.bidBias >= 0.05} class:under={s.bidBias <= -0.05}
                  >{bias(s.bidBias)}</td
                >
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <!-- Phones: one card per player instead of a wide table. -->
      <ul class="player-cards">
        {#each stats.players as s (s.player)}
          <li>
            <span class="name">{s.player}</span>
            <dl>
              <div>
                <dt>Games</dt>
                <dd>{s.games}</dd>
              </div>
              <div>
                <dt>Wins</dt>
                <dd>{s.wins}</dd>
              </div>
              <div>
                <dt>Exact</dt>
                <dd>{pct(s.exactRate)}</dd>
              </div>
              <div>
                <dt>Calls vs made</dt>
                <dd class:over={s.bidBias >= 0.05} class:under={s.bidBias <= -0.05}>
                  {bias(s.bidBias)}
                </dd>
              </div>
            </dl>
          </li>
        {/each}
      </ul>
      <p class="note">
        "Calls vs made" is the average gap per round between what a player called and what they
        made.
      </p>
    </div>

    <div class="card">
      <div class="games-head">
        <h2>Past games</h2>
        <button class="ghost small" onclick={onclear}><Trash2 size={15} /> Clear history</button>
      </div>
      <ul class="games">
        {#each recent as g (g.id)}
          {@const won = winners(g.rounds)}
          <li>
            <a class="game-info" href={viewHref(g)} title="View this game">
              <span class="game-date">{date(g.finishedAt)} <ChevronRight size={15} /></span>
              <span class="game-meta">
                <Trophy size={13} />
                {listNames(won)}{won.length > 1 ? ' (tie)' : ''} with {g.rounds.scores[won[0]]}
              </span>
              <span class="game-players">{playersOf(g.rounds).join(', ')}</span>
            </a>
            <button
              class="ghost small icon-only"
              title="Share this game"
              aria-label="Share this game"
              onclick={() => onshare(g)}
            >
              <Share2 size={16} />
            </button>
            <button
              class="ghost small icon-only"
              title="Download game log"
              aria-label="Download game log"
              onclick={() => download(g)}
            >
              <Download size={16} />
            </button>
            <button
              class="ghost small icon-only delete"
              title="Delete this game"
              aria-label="Delete this game"
              onclick={() => ondelete(g)}
            >
              <Trash2 size={16} />
            </button>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</section>

<style>
  .stats {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    max-width: 860px;
    margin: 0 auto;
  }

  h1 {
    margin: 0;
    font-size: 2.25rem;
  }

  h2 {
    margin: 0 0 1rem;
    font-size: 1.25rem;
  }

  .empty {
    color: var(--muted);
    text-align: center;
  }

  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
  }

  .tile {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .tile-icon {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 10px;
    background: var(--accent-soft);
    color: var(--accent);
    margin-bottom: 0.5rem;
  }

  .tile-icon.gold {
    background: rgb(245 196 81 / 0.12);
    color: var(--gold);
  }

  .tile-icon.red {
    background: rgb(255 93 108 / 0.12);
    color: var(--danger);
  }

  .label {
    font-size: 0.8rem;
    color: var(--muted);
  }

  .value {
    font-family: var(--heading);
    font-size: 2rem;
    font-weight: 700;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
  }

  .who {
    font-size: 0.8rem;
    color: var(--muted);
  }

  .table-wrap {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.92rem;
  }

  th,
  td {
    padding: 0.6rem 0.75rem;
    text-align: center;
    white-space: nowrap;
    border-bottom: 1px solid var(--border-soft);
    font-variant-numeric: tabular-nums;
  }

  th {
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }

  .left {
    text-align: left;
  }

  .name {
    font-weight: 600;
  }

  td.over {
    color: #ffb27a;
  }

  td.under {
    color: #8cc2ff;
  }

  .note {
    margin: 0.75rem 0 0;
    font-size: 0.78rem;
    color: var(--muted);
  }

  .games-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
  }

  .games-head h2 {
    margin: 0;
  }

  .games {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .games li {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--border-soft);
  }

  .games li:last-child {
    border-bottom: none;
  }

  .game-info {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    flex: 1;
    min-width: 0;
    color: inherit;
    text-decoration: none;
    border-radius: var(--radius-sm);
    padding: 0.4rem 0.6rem;
    margin: -0.4rem -0.6rem;
    transition: background 140ms;
  }

  .game-info:hover {
    background: var(--surface-2);
  }

  .game-info:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .game-date {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .game-date :global(svg) {
    color: var(--muted);
  }

  .game-date {
    font-weight: 600;
  }

  .game-meta {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    color: var(--gold);
    font-size: 0.85rem;
  }

  .game-players {
    font-size: 0.8rem;
    color: var(--muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .delete:hover {
    color: var(--danger);
    border-color: rgb(255 93 108 / 0.4);
  }

  .icon-only {
    padding: 0.5rem;
  }

  .player-cards {
    display: none;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .player-cards li {
    padding: 0.85rem 0;
    border-bottom: 1px solid var(--border-soft);
  }

  .player-cards li:first-child {
    padding-top: 0;
  }

  .player-cards dl {
    display: grid;
    grid-template-columns: repeat(4, auto);
    justify-content: space-between;
    gap: 0.5rem;
    margin: 0.4rem 0 0;
  }

  .player-cards dt {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted);
  }

  .player-cards dd {
    margin: 0.1rem 0 0;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  dd.over {
    color: #ffb27a;
  }

  dd.under {
    color: #8cc2ff;
  }

  @media (max-width: 560px) {
    .table-wrap {
      display: none;
    }

    .player-cards {
      display: block;
    }

    .value {
      font-size: 1.6rem;
    }
  }
</style>
