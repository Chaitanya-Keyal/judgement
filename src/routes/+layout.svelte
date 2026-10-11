<script lang="ts">
  import '@fontsource-variable/inter';
  import '@fontsource/zilla-slab/500.css';
  import '@fontsource/zilla-slab/700.css';
  import '../app.css';
  import BookOpen from '@lucide/svelte/icons/book-open';
  import ChartColumn from '@lucide/svelte/icons/chart-column';
  import Play from '@lucide/svelte/icons/play';
  import { asset, resolve } from '$app/paths';
  import { page } from '$app/state';
  import Dialog from '#lib/Dialog.svelte';
  import { ui } from '#lib/ui.svelte.ts';

  let { children } = $props();

  const links = [
    { href: resolve('/'), label: 'Play', icon: Play },
    { href: resolve('/rules'), label: 'Rules', icon: BookOpen },
    { href: resolve('/stats'), label: 'Stats', icon: ChartColumn },
  ];
</script>

<header>
  <a class="brand" href={resolve('/')} onclick={() => (ui.screen = 'home')}>
    <img src={asset('icon.png')} alt="" width="28" height="28" />
    <span>Judgement</span>
  </a>
  <nav>
    {#each links as l (l.href)}
      <a
        href={l.href}
        class:active={page.url.pathname === l.href}
        aria-current={page.url.pathname === l.href ? 'page' : undefined}
      >
        <l.icon size={16} />
        <span>{l.label}</span>
      </a>
    {/each}
  </nav>
</header>

<main>
  {@render children()}
</main>

<Dialog />

<style>
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem clamp(1rem, 4vw, 2.5rem);
    border-bottom: 1px solid var(--border-soft);
    background: rgb(11 15 21 / 0.6);
    backdrop-filter: blur(10px);
    position: sticky;
    top: 0;
    z-index: 5;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-family: var(--heading);
    font-weight: 700;
    font-size: 1.2rem;
    color: var(--text);
    text-decoration: none;
  }

  nav {
    display: flex;
    gap: 0.25rem;
  }

  nav a {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 0.8rem;
    border-radius: 9px;
    color: var(--muted);
    text-decoration: none;
    font-size: 0.9rem;
    font-weight: 500;
    transition:
      color 140ms,
      background 140ms;
  }

  nav a:hover {
    color: var(--text);
    background: var(--surface-2);
  }

  nav a.active {
    color: var(--text);
    background: var(--surface-3);
  }

  main {
    padding: clamp(1rem, 4vw, 2.5rem);
    max-width: 1200px;
    margin: 0 auto;
  }

  @media (max-width: 480px) {
    .brand span {
      display: none;
    }
  }
</style>
