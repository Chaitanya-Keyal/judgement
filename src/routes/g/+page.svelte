<script lang="ts">
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import CircleAlert from '@lucide/svelte/icons/circle-alert';
  import Download from '@lucide/svelte/icons/download';
  import ListPlus from '@lucide/svelte/icons/list-plus';
  import Play from '@lucide/svelte/icons/play';
  import Share2 from '@lucide/svelte/icons/share-2';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { choose } from '#lib/dialog.svelte.ts';
  import {
    downloadLog,
    loadHistory,
    newId,
    newLogName,
    recordFinished,
    removeFromHistory,
  } from '#lib/game.ts';
  import GameSummary from '#lib/GameSummary.svelte';
  import { decodeGame, encodeGame } from '#lib/share.ts';
  import { shareGame } from '#lib/shareLink.ts';

  let history = $state(loadHistory());

  // The whole game travels in the URL fragment, which never reaches the server.
  // This page is both what a recipient sees and how you view your own past games.
  const shared = $derived.by(() => {
    try {
      return decodeGame(page.url.hash.slice(1));
    } catch {
      return null;
    }
  });

  /** This game's entry in your own stats, if it is there. */
  const mine = $derived.by(() => {
    if (!shared) return undefined;
    const key = encodeGame(shared.rounds);
    return history.find((g) => encodeGame(g.rounds) === key);
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

  const fileName = () => newLogName(shared?.finishedAt ? new Date(shared.finishedAt) : new Date());

  function addToStats() {
    if (!shared || mine) return;
    history = recordFinished(
      { id: newId(), fileName: fileName(), rounds: shared.rounds },
      shared.finishedAt,
    );
  }

  async function confirmDelete() {
    if (!mine) return;
    const answer = await choose(
      'Delete Game',
      'Delete this game from your stats? Links to it that you already shared keep working.',
      [
        { label: 'Cancel', value: 'cancel', variant: 'ghost' },
        { label: 'Delete game', value: 'delete', variant: 'danger' },
      ],
      'error',
    );
    if (answer !== 'delete') return;
    removeFromHistory(mine.id);
    await goto(resolve('/stats'));
  }
</script>

<svelte:head>
  <title>{playedOn ? `Game on ${playedOn}` : 'Shared game'} | Judgement</title>
  <meta name="robots" content="noindex" />
</svelte:head>

{#if shared}
  {@const game = shared}
  {#if mine}
    <a class="back" href={resolve('/stats')}><ArrowLeft size={16} /> All stats</a>
  {:else}
    <p class="label">Shared game</p>
  {/if}
  <GameSummary rounds={game.rounds} subtitle={playedOn ? `Played on ${playedOn}` : undefined}>
    {#snippet actions()}
      {#if mine}
        <button class="primary big" onclick={() => shareGame(game.rounds, game.finishedAt)}>
          <Share2 size={18} /> Share
        </button>
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
      {#if mine}
        <button class="ghost big delete" onclick={confirmDelete}>
          <Trash2 size={18} /> Delete Game
        </button>
      {:else}
        <button class="ghost big" onclick={() => goto(resolve('/'))}>
          <Play size={18} /> Play Your Own
        </button>
      {/if}
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
