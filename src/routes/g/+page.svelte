<script lang="ts">
  import Check from '@lucide/svelte/icons/check';
  import CircleAlert from '@lucide/svelte/icons/circle-alert';
  import Download from '@lucide/svelte/icons/download';
  import ListPlus from '@lucide/svelte/icons/list-plus';
  import Play from '@lucide/svelte/icons/play';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { downloadLog, loadHistory, newId, newLogName, recordFinished } from '#lib/game.ts';
  import GameSummary from '#lib/GameSummary.svelte';
  import { decodeGame, encodeGame } from '#lib/share.ts';

  let history = $state(loadHistory());

  // The whole game travels in the URL fragment, which never reaches the server.
  const shared = $derived.by(() => {
    try {
      return decodeGame(page.url.hash.slice(1));
    } catch {
      return null;
    }
  });

  const playedOn = $derived(
    shared?.finishedAt
      ? new Date(shared.finishedAt).toLocaleDateString(undefined, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : null,
  );

  const inStats = $derived.by(() => {
    if (!shared) return false;
    const key = encodeGame(shared.rounds);
    return history.some((g) => encodeGame(g.rounds) === key);
  });

  const fileName = () => newLogName(shared?.finishedAt ? new Date(shared.finishedAt) : new Date());

  function addToStats() {
    if (!shared || inStats) return;
    history = recordFinished(
      { id: newId(), fileName: fileName(), rounds: shared.rounds },
      shared.finishedAt,
    );
  }
</script>

<svelte:head>
  <title>Shared game | Judgement</title>
  <meta name="robots" content="noindex" />
</svelte:head>

{#if shared}
  {@const game = shared}
  <p class="label">Shared game</p>
  <GameSummary rounds={game.rounds} subtitle={playedOn ? `Played on ${playedOn}` : undefined}>
    {#snippet actions()}
      {#if inStats}
        <button class="ghost big" disabled><Check size={18} /> In Your Stats</button>
      {:else}
        <button class="primary big" onclick={addToStats}>
          <ListPlus size={18} /> Add to My Stats
        </button>
      {/if}
      <button
        class="ghost big"
        onclick={() => downloadLog({ fileName: fileName(), rounds: game.rounds })}
      >
        <Download size={18} /> Download Log
      </button>
      <button class="ghost big" onclick={() => goto(resolve('/'))}>
        <Play size={18} /> Play Your Own
      </button>
    {/snippet}
  </GameSummary>
{:else}
  <section class="card invalid">
    <span class="icon"><CircleAlert size={26} /></span>
    <h1>This link doesn't work</h1>
    <p>
      The shared game in this link is missing or incomplete. Ask for the link again and make sure
      the whole thing is copied.
    </p>
    <button class="primary big" onclick={() => goto(resolve('/'))}>
      <Play size={18} /> Go to Judgement
    </button>
  </section>
{/if}

<style>
  .label {
    margin: 0 0 0.5rem;
    text-align: center;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--accent);
  }

  .invalid {
    max-width: 480px;
    margin: 10vh auto 0;
    text-align: center;
  }

  .icon {
    display: inline-grid;
    place-items: center;
    width: 56px;
    height: 56px;
    border-radius: 16px;
    background: rgb(255 93 108 / 0.12);
    color: var(--danger);
  }

  h1 {
    margin: 1rem 0 0.5rem;
    font-size: 1.75rem;
  }

  .invalid p {
    margin: 0 0 1.5rem;
    color: var(--muted);
    line-height: 1.6;
  }
</style>
