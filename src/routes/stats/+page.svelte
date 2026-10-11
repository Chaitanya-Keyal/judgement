<script lang="ts">
  import { choose } from '#lib/dialog.svelte.ts';
  import { clearHistory, loadHistory } from '#lib/game.ts';
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
</script>

<svelte:head>
  <title>Stats | Judgement</title>
</svelte:head>

<Stats {history} onclear={confirmClear} />
