<script lang="ts">
  import CircleAlert from '@lucide/svelte/icons/circle-alert';
  import CircleQuestionMark from '@lucide/svelte/icons/circle-question-mark';
  import Info from '@lucide/svelte/icons/info';
  import { dialog, closeDialog } from './dialog.svelte';

  const icons = { info: Info, error: CircleAlert, yesno: CircleQuestionMark };

  let primary = $state<HTMLButtonElement>();

  $effect(() => {
    if (dialog.current) primary?.focus();
  });

  function onkeydown(e: KeyboardEvent) {
    if (!dialog.current) return;
    if (e.key === 'Escape') closeDialog(false);
  }
</script>

<svelte:window {onkeydown} />

{#if dialog.current}
  {@const d = dialog.current}
  {@const Icon = icons[d.type]}
  <div class="backdrop" role="presentation" onclick={() => closeDialog(false)}>
    <div
      class="box {d.type}"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <div class="head">
        <span class="icon"><Icon size={20} /></span>
        <h2 id="dialog-title">{d.title}</h2>
      </div>
      <p>{d.message}</p>
      <div class="actions">
        {#if d.type === 'yesno'}
          <button class="ghost" onclick={() => closeDialog(false)}>No</button>
          <button class="primary" bind:this={primary} onclick={() => closeDialog(true)}>Yes</button>
        {:else}
          <button class="primary" bind:this={primary} onclick={() => closeDialog(true)}>OK</button>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgb(0 0 0 / 0.55);
    backdrop-filter: blur(3px);
    display: grid;
    place-items: center;
    z-index: 10;
    animation: fade 120ms ease-out;
  }

  .box {
    width: min(420px, calc(100vw - 2rem));
    background: #161c26;
    border: 1px solid var(--border);
    border-top: 3px solid var(--accent);
    border-radius: var(--radius);
    padding: 1.5rem;
    box-shadow: 0 20px 50px rgb(0 0 0 / 0.5);
    animation: pop 140ms ease-out;
  }

  .box.error {
    border-top-color: var(--danger);
  }

  .head {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
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

  .error .icon {
    background: rgb(255 93 108 / 0.14);
    color: var(--danger);
  }

  h2 {
    margin: 0;
    font-size: 1.3rem;
  }

  p {
    margin: 0;
    color: var(--muted);
    line-height: 1.5;
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
