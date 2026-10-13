<script lang="ts">
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import Download from '@lucide/svelte/icons/download';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { choose } from '#lib/dialog.svelte.ts';
  import {
    clearHistory,
    downloadLog,
    loadHistory,
    newLogName,
    playersOf,
    removeFromHistory,
    type FinishedGame,
  } from '#lib/game.ts';
  import GameSummary from '#lib/GameSummary.svelte';
  import Stats from '#lib/Stats.svelte';

  let history = $state(loadHistory());

  // `/stats?game=<id>` shows that game's end screen instead of the overview.
  const viewing = $derived(history.find((g) => g.id === page.url.searchParams.get('game')));

  const viewHref = (g: FinishedGame) => `${resolve('/stats')}?game=${encodeURIComponent(g.id)}`;

  const fullDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  async function confirmClear() {
    const answer = await choose(
      'Clear History',
      'This permanently deletes every finished game and all stats from this browser.',
      [
        { label: 'Cancel', value: 'cancel', variant: 'ghost' },
        { label: 'Clear history', value: 'clear', variant: 'danger' },
      ],
      'error',
    );
    if (answer === 'clear') {
      clearHistory();
      history = [];
    }
  }

  async function confirmDelete(g: FinishedGame) {
    const answer = await choose(
      'Delete Game',
      `Delete the game from ${fullDate(g.finishedAt)} (${playersOf(g.rounds).join(', ')})? It will no longer count towards your stats.`,
      [
        { label: 'Cancel', value: 'cancel', variant: 'ghost' },
        { label: 'Delete game', value: 'delete', variant: 'danger' },
      ],
      'error',
    );
    if (answer !== 'delete') return;
    history = removeFromHistory(g.id);
    // Deleted from its own end screen: go back to the overview.
    if (page.url.searchParams.has('game')) await goto(resolve('/stats'));
  }

  function download(g: FinishedGame) {
    downloadLog({ fileName: newLogName(new Date(g.finishedAt)), rounds: g.rounds });
  }
</script>

<svelte:head>
  <title>{viewing ? `Game on ${fullDate(viewing.finishedAt)}` : 'Stats'} | Judgement</title>
</svelte:head>

{#if viewing}
  {@const g = viewing}
  <a class="back" href={resolve('/stats')}><ArrowLeft size={16} /> All stats</a>
  <GameSummary rounds={g.rounds} subtitle="Played on {fullDate(g.finishedAt)}">
    {#snippet actions()}
      <button class="ghost big" onclick={() => download(g)}>
        <Download size={18} /> Download Log
      </button>
      <button class="ghost big delete" onclick={() => confirmDelete(g)}>
        <Trash2 size={18} /> Delete Game
      </button>
    {/snippet}
  </GameSummary>
{:else}
  <Stats {history} onclear={confirmClear} ondelete={confirmDelete} {viewHref} />
{/if}

<style>
  .back {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    margin-bottom: 1rem;
    color: var(--muted);
    text-decoration: none;
    font-size: 0.9rem;
    font-weight: 500;
  }

  .back:hover {
    color: var(--text);
  }

  .delete:hover {
    color: var(--danger);
    border-color: rgb(255 93 108 / 0.4);
  }
</style>
