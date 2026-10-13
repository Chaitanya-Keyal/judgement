<script lang="ts">
  import Pencil from '@lucide/svelte/icons/pencil';
  import { currentRound, playerRound, playersOf, round, totalRounds, type Rounds } from './game';
  import SuitIcon from './SuitIcon.svelte';

  // Without `onedit` the sheet is read-only and shows no edit buttons.
  let { rounds, onedit }: { rounds: Rounds; onedit?: (n: number) => void } = $props();

  const players = $derived(playersOf(rounds));
  const curr = $derived(currentRound(rounds));
  const all = $derived(
    Array.from({ length: totalRounds(rounds) }, (_, i) => totalRounds(rounds) - i),
  );
</script>

<div class="wrap">
  <table>
    <thead>
      <tr>
        <th class="round-col">Round</th>
        {#each players as p (p)}<th>{p}</th>{/each}
      </tr>
    </thead>
    <tbody>
      {#each all as n (n)}
        {@const info = round(rounds, n)}
        {@const played = n > curr}
        <tr class:current={n === curr} class:future={n < curr}>
          <th class="round-col" scope="row">
            <span class="round-cell">
              <span class="suit {info.suit.toLowerCase()}" title={info.suit}>
                <SuitIcon suit={info.suit} size={14} />
              </span>
              <span class="n">{n}</span>
              {#if played && onedit}
                <button
                  class="edit"
                  title="Edit round of {n}"
                  aria-label="Edit round of {n}"
                  onclick={() => onedit(n)}
                >
                  <Pencil size={13} />
                </button>
              {/if}
            </span>
          </th>
          {#each players as p (p)}
            {@const pr = playerRound(rounds, n, p)}
            <td class:dealer={info.dealer === p}>
              {#if played}
                <span class="score" class:neg={pr.score < 0} class:hit={pr.judgement === pr.hands}
                  >{pr.score}</span
                >
                <span class="bid">{pr.judgement}/{pr.hands}</span>
              {:else if info.dealer === p}
                <span class="deals">deals</span>
              {/if}
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
    <tfoot>
      <tr>
        <th class="round-col" scope="row">Total</th>
        {#each players as p (p)}
          <td><span class="score" class:neg={rounds.scores[p] < 0}>{rounds.scores[p]}</span></td>
        {/each}
      </tr>
    </tfoot>
  </table>
</div>
<p class="legend">
  Each cell shows the round score, then called / made. Shaded cells mark the dealer.
  {#if onedit}Tap the pencil to fix a round.{/if}
</p>

<style>
  .wrap {
    overflow-x: auto;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-soft);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }

  th,
  td {
    padding: 0.5rem 0.65rem;
    text-align: center;
    white-space: nowrap;
    border-bottom: 1px solid var(--border-soft);
  }

  thead th {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--muted);
    background: #121821;
    position: sticky;
    top: 0;
  }

  .round-col {
    width: 1%;
    position: sticky;
    left: 0;
    background: #121821;
    text-align: left;
    z-index: 1;
    font-weight: 600;
  }

  .round-cell {
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }

  .suit {
    display: inline-grid;
    place-items: center;
    width: 24px;
    height: 24px;
    border-radius: 6px;
    background: #fbfaf6;
    color: #1a1d24;
    flex: none;
  }

  .suit.hearts,
  .suit.diamonds {
    color: #d8323a;
  }

  .n {
    min-width: 1.4em;
    font-variant-numeric: tabular-nums;
  }

  .edit {
    padding: 0.3rem;
    border-radius: 7px;
    color: var(--muted);
    margin-left: 0.25rem;
  }

  .edit:hover {
    color: var(--text);
    background: var(--surface-3);
  }

  .score {
    display: block;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .score.neg {
    color: var(--danger);
  }

  .score.hit {
    color: var(--success);
  }

  .bid {
    display: block;
    font-size: 0.72rem;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }

  td.dealer {
    background: rgb(47 134 255 / 0.07);
  }

  .deals {
    font-size: 0.72rem;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 600;
  }

  tr.current > * {
    background: var(--accent-soft);
  }

  tr.current .round-col {
    background: #15253d;
  }

  tr.future {
    opacity: 0.45;
  }

  tfoot th,
  tfoot td {
    border-bottom: none;
    border-top: 1px solid var(--border);
    font-size: 1rem;
  }

  .legend {
    margin: 0.6rem 0 0;
    font-size: 0.78rem;
    color: var(--muted);
  }
</style>
