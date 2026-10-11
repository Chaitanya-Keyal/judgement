<script lang="ts">
  import { choose } from '#lib/dialog.svelte.ts';
  import {
    clearHistory,
    loadHistory,
    playersOf,
    removeFromHistory,
    type FinishedGame,
  } from '#lib/game.ts';
  import Stats from '#lib/Stats.svelte';

  let history = $state(loadHistory());

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
    const date = new Date(g.finishedAt).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const answer = await choose(
      'Delete Game',
      `Delete the game from ${date} (${playersOf(g.rounds).join(', ')})? It will no longer count towards your stats.`,
      [
        { label: 'Cancel', value: 'cancel', variant: 'ghost' },
        { label: 'Delete game', value: 'delete', variant: 'danger' },
      ],
      'error',
    );
    if (answer === 'delete') history = removeFromHistory(g.id);
  }
</script>

<svelte:head>
  <title>Stats | Judgement</title>
</svelte:head>

<Stats {history} onclear={confirmClear} ondelete={confirmDelete} />
