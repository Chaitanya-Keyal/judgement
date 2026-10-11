<script lang="ts">
  import CircleAlert from '@lucide/svelte/icons/circle-alert';
  import Pencil from '@lucide/svelte/icons/pencil';
  import { digitsOnly } from './digits';
  import {
    handsError,
    judgementError,
    playerRound,
    playersOf,
    round,
    turnOrder,
    type Rounds,
  } from './game';
  import SuitIcon from './SuitIcon.svelte';

  let {
    rounds,
    n,
    onsave,
    oncancel,
  }: {
    rounds: Rounds;
    n: number;
    onsave: (judgements: Record<string, number>, hands: Record<string, number>) => void;
    oncancel: () => void;
  } = $props();

  // Read once on purpose: the dialog is recreated for each round edited.
  // svelte-ignore state_referenced_locally
  const info = round(rounds, n);
  // svelte-ignore state_referenced_locally
  const order = turnOrder(playersOf(rounds), info.dealer);

  const initial = (key: 'judgement' | 'hands') =>
    Object.fromEntries(order.map((p) => [p, String(playerRound(rounds, n, p)[key])]));
  let judgements = $state(initial('judgement'));
  let hands = $state(initial('hands'));
  let error = $state('');

  function save(e: SubmitEvent) {
    e.preventDefault();
    const j = Object.fromEntries(order.map((p) => [p, Number(judgements[p] || 0)]));
    const h = Object.fromEntries(order.map((p) => [p, Number(hands[p] || 0)]));
    error = judgementError(n, Object.values(j)) ?? handsError(n, Object.values(h)) ?? '';
    if (!error) onsave(j, h);
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') oncancel();
  }

  function focusFirst(node: HTMLElement) {
    node.querySelector('input')?.focus();
  }
</script>

<svelte:window {onkeydown} />

<div class="backdrop" role="presentation" onclick={oncancel}>
  <div
    class="box"
    role="dialog"
    aria-modal="true"
    aria-labelledby="edit-title"
    tabindex="-1"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
  >
    <form onsubmit={save} {@attach focusFirst}>
      <div class="head">
        <span class="icon"><Pencil size={18} /></span>
        <div>
          <h2 id="edit-title">Edit Round of {n}</h2>
          <p class="meta">
            <span class="suit {info.suit.toLowerCase()}"
              ><SuitIcon suit={info.suit} size={13} /></span
            >
            {info.suit}, dealt by {info.dealer}
          </p>
        </div>
      </div>

      <div class="grid">
        <span></span>
        <span class="col">Called</span>
        <span class="col">Made</span>
        {#each order as p (p)}
          <span class="name">{p}</span>
          <input
            type="text"
            inputmode="numeric"
            autocomplete="off"
            aria-label="{p} called"
            value={judgements[p]}
            oninput={digitsOnly(judgements, p, n)}
          />
          <input
            type="text"
            inputmode="numeric"
            autocomplete="off"
            aria-label="{p} made"
            value={hands[p]}
            oninput={digitsOnly(hands, p, n)}
          />
        {/each}
      </div>

      {#if error}
        <p class="error"><CircleAlert size={16} /> {error}</p>
      {/if}

      <div class="actions">
        <button type="button" class="ghost" onclick={oncancel}>Cancel</button>
        <button type="submit" class="primary">Save</button>
      </div>
    </form>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgb(0 0 0 / 0.55);
    backdrop-filter: blur(3px);
    display: grid;
    place-items: center;
    z-index: 15;
    padding: 1rem;
    overflow-y: auto;
    animation: fade 120ms ease-out;
  }

  .box {
    width: min(420px, 100%);
    background: #161c26;
    border: 1px solid var(--border);
    border-top: 3px solid var(--accent);
    border-radius: var(--radius);
    padding: 1.5rem;
    box-shadow: 0 20px 50px rgb(0 0 0 / 0.5);
    animation: pop 140ms ease-out;
  }

  .head {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1.25rem;
  }

  .icon {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: var(--accent-soft);
    color: var(--accent);
    flex: none;
  }

  h2 {
    margin: 0;
    font-size: 1.3rem;
  }

  .meta {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    margin: 0.15rem 0 0;
    font-size: 0.85rem;
    color: var(--muted);
  }

  .suit {
    display: inline-grid;
    place-items: center;
    width: 20px;
    height: 20px;
    border-radius: 5px;
    background: #fbfaf6;
    color: #1a1d24;
  }

  .suit.hearts,
  .suit.diamonds {
    color: #d8323a;
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr 4.5rem 4.5rem;
    gap: 0.5rem 0.75rem;
    align-items: center;
  }

  .col {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted);
    text-align: center;
  }

  .name {
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .grid input {
    width: 100%;
    text-align: center;
    font-weight: 600;
    padding: 0.5rem;
    font-variant-numeric: tabular-nums;
  }

  .error {
    display: flex;
    gap: 0.5rem;
    align-items: flex-start;
    margin: 1rem 0 0;
    color: var(--danger);
    font-size: 0.9rem;
    line-height: 1.4;
  }

  .error :global(svg) {
    flex: none;
    margin-top: 0.1rem;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1.5rem;
  }

  @keyframes fade {
    from {
      opacity: 0;
    }
  }

  @keyframes pop {
    from {
      transform: scale(0.96);
      opacity: 0;
    }
  }
</style>
