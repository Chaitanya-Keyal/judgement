<script lang="ts">
  import Club from '@lucide/svelte/icons/club';
  import Diamond from '@lucide/svelte/icons/diamond';
  import Heart from '@lucide/svelte/icons/heart';
  import Spade from '@lucide/svelte/icons/spade';
  import type { Suit } from './game';

  let { suit, size = 18 }: { suit: Suit; size?: number } = $props();

  const icons = { Spades: Spade, Hearts: Heart, Clubs: Club, Diamonds: Diamond };
  const Icon = $derived(icons[suit]);
</script>

<Icon {size} fill="currentColor" strokeWidth={1.5} />
