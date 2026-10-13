<script lang="ts">
  import Trophy from '@lucide/svelte/icons/trophy';
  import type { Snippet } from 'svelte';
  import { listNames, winners, type Rounds } from './game';
  import ScoreBoard from './ScoreBoard.svelte';
  import ScoreChart from './ScoreChart.svelte';
  import Scoresheet from './Scoresheet.svelte';

  // The end screen of a finished game. Without `onedit` it is read-only.
  let {
    rounds,
    subtitle,
    onedit,
    actions,
  }: {
    rounds: Rounds;
    subtitle?: string;
    onedit?: (n: number) => void;
    actions?: Snippet;
  } = $props();

  const won = $derived(winners(rounds));
</script>

<section class="over">
  <div class="winner">
    <span class="trophy"><Trophy size={30} /></span>
    {#if won.length === 1}
      <h1>{won[0]} wins!</h1>
    {:else}
      <h1>It's a tie!</h1>
      <p>{listNames(won)} share the top spot.</p>
    {/if}
    {#if subtitle}<p>{subtitle}</p>{/if}
  </div>

  {#if actions}
    <div class="over-actions">{@render actions()}</div>
  {/if}

  <div class="over-grid">
    <ScoreBoard {rounds} />
    <div class="card"><ScoreChart {rounds} /></div>
  </div>

  <div class="card sheet-card">
    <h2>Scoresheet</h2>
    <Scoresheet {rounds} {onedit} />
  </div>
</section>

<style>
  .over {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .winner {
    text-align: center;
  }

  .trophy {
    display: inline-grid;
    place-items: center;
    width: 64px;
    height: 64px;
    border-radius: 20px;
    background: rgb(245 196 81 / 0.12);
    color: var(--gold);
    margin-bottom: 0.75rem;
  }

  .winner h1 {
    margin: 0;
    font-size: clamp(2.25rem, 6vw, 3.25rem);
    color: var(--gold);
  }

  .winner p {
    margin: 0.4rem 0 0;
    color: var(--muted);
  }

  .over-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.75rem;
  }

  .over-grid {
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 1.5rem;
    align-items: start;
  }

  .over-grid > .card {
    min-width: 0;
  }

  .sheet-card {
    min-width: 0;
  }

  .sheet-card h2 {
    margin: 0 0 1rem;
    font-size: 1.25rem;
  }

  @media (max-width: 960px) {
    .over-grid {
      grid-template-columns: 1fr;
    }

    .over-actions {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>
