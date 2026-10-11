<script lang="ts">
  import Crown from '@lucide/svelte/icons/crown';
  import Trophy from '@lucide/svelte/icons/trophy';
  import { standings, type Rounds } from './game';

  let { rounds, big = false }: { rounds: Rounds; big?: boolean } = $props();

  const rows = $derived(standings(rounds));
  // Only crown someone once scores actually differ.
  const hasLeader = $derived(rows.some((r) => r.rank !== 1));
</script>

<section class="card board" class:big>
  <h2>
    {#if big}<Trophy size={26} />{/if}
    Score Board
  </h2>
  <ol>
    {#each rows as { player, score, rank } (player)}
      <li class:leader={hasLeader && rank === 1}>
        <span class="rank">{rank}</span>
        <span class="player">
          {player}
          {#if hasLeader && rank === 1}
            <Crown size={18} />
          {/if}
        </span>
        <span class="score" class:neg={score < 0}>{score}</span>
      </li>
    {/each}
  </ol>
</section>

<style>
  .board {
    font-size: 1.2rem;
  }

  .big {
    width: min(520px, 100%);
    margin: 0 auto;
    font-size: 1.25rem;
  }

  h2 {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    margin: 0 0 1rem;
    font-size: 1.4rem;
  }

  .big h2 {
    font-size: 1.9rem;
    color: var(--gold);
    margin-bottom: 1.5rem;
  }

  ol {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  li {
    display: grid;
    grid-template-columns: 1.6em 1fr auto;
    align-items: center;
    gap: 0.6rem;
    padding: 0.8rem 0.9rem;
    border-radius: var(--radius-sm);
    background: var(--surface-2);
    border: 1px solid transparent;
    transition: background 200ms;
  }

  .big li {
    padding: 0.85rem 1rem;
  }

  .rank {
    font-size: 0.8em;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }

  .player {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .score {
    font-size: 1.15em;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .neg {
    color: var(--danger);
  }

  .leader {
    background: rgb(245 196 81 / 0.09);
    border-color: rgb(245 196 81 / 0.25);
  }

  .leader .player,
  .leader .score {
    color: var(--gold);
  }
</style>
