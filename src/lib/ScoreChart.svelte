<script lang="ts">
  import { cumulativeScores, playedRounds, playersOf, type Rounds } from './game';

  let { rounds }: { rounds: Rounds } = $props();

  // Validated categorical palette (dark mode); colour follows the player, not their rank.
  const PALETTE = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];
  const OVERFLOW = '#7d8796';

  const players = $derived(playersOf(rounds));
  const played = $derived(playedRounds(rounds));
  const series = $derived(cumulativeScores(rounds));
  const colour = (i: number) => PALETTE[i] ?? OVERFLOW;

  let width = $state(600);
  const height = 260;
  const pad = { top: 16, right: 16, bottom: 30, left: 40 };
  const direct = $derived(players.length <= 4);
  const right = $derived(pad.right + (direct ? 80 : 0));

  // x positions: index 0 is the start (everyone on 0), then one per played round.
  const xs = $derived(played.length + 1);
  const x = (i: number) => pad.left + (i * (width - pad.left - right)) / Math.max(xs - 1, 1);

  function niceTicks(min: number, max: number, count = 5) {
    const span = max - min || 10;
    const raw = span / count;
    const mag = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
    const ticks = [];
    for (let v = Math.floor(min / step) * step; v <= Math.ceil(max / step) * step + 1e-9; v += step) {
      ticks.push(Math.round(v));
    }
    return ticks;
  }

  const values = $derived(Object.values(series).flat());
  const ticks = $derived(niceTicks(Math.min(0, ...values), Math.max(0, ...values)));
  const yMin = $derived(ticks[0]);
  const yMax = $derived(ticks[ticks.length - 1]);
  const y = (v: number) =>
    pad.top + ((yMax - v) * (height - pad.top - pad.bottom)) / (yMax - yMin || 1);

  const path = (p: string) =>
    [0, ...series[p]].map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');

  // End labels, nudged apart so they never overlap.
  const labels = $derived.by(() => {
    if (!direct) return [];
    const items = players
      .map((p, i) => ({ p, i, y: y(series[p].at(-1) ?? 0) }))
      .sort((a, b) => a.y - b.y);
    for (let k = 1; k < items.length; k++) {
      items[k].y = Math.max(items[k].y, items[k - 1].y + 15);
    }
    return items;
  });

  let hover = $state<number | null>(null);

  function onmove(e: PointerEvent) {
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * width;
    const i = Math.round(((px - pad.left) / (width - pad.left - right)) * (xs - 1));
    hover = Math.max(1, Math.min(xs - 1, i));
  }

  const tooltip = $derived.by(() => {
    if (hover === null) return null;
    const h = hover;
    return {
      round: played[h - 1],
      left: x(h),
      rows: players
        .map((p, i) => ({ p, i, v: series[p][h - 1] }))
        .sort((a, b) => b.v - a.v),
    };
  });
</script>

{#if played.length === 0}
  <p class="empty">The chart fills in after the first round.</p>
{:else}
  <ul class="legend">
    {#each players as p, i (p)}
      <li>
        <span class="swatch" class:dashed={i >= PALETTE.length} style:--c={colour(i)}></span>{p}
      </li>
    {/each}
  </ul>

  <div class="chart" bind:clientWidth={width}>
    <svg
      viewBox="0 0 {width} {height}"
      {width}
      {height}
      role="img"
      aria-label="Running score for each player after every round"
      onpointermove={onmove}
      onpointerleave={() => (hover = null)}
    >
      {#each ticks as t (t)}
        <line class="grid" class:zero={t === 0} x1={pad.left} x2={width - right} y1={y(t)} y2={y(t)} />
        <text class="axis" x={pad.left - 8} y={y(t)} text-anchor="end" dominant-baseline="middle">{t}</text>
      {/each}

      {#each played as n, i (n)}
        {#if played.length <= 12 || i % Math.ceil(played.length / 12) === 0}
          <text class="axis" x={x(i + 1)} y={height - 10} text-anchor="middle">{n}</text>
        {/if}
      {/each}

      {#if tooltip}
        <line class="crosshair" x1={tooltip.left} x2={tooltip.left} y1={pad.top} y2={height - pad.bottom} />
      {/if}

      {#each players as p, i (p)}
        <path
          d={path(p)}
          fill="none"
          stroke={colour(i)}
          stroke-width="2"
          stroke-linejoin="round"
          stroke-linecap="round"
          stroke-dasharray={i >= PALETTE.length ? '5 4' : undefined}
        />
      {/each}

      {#if tooltip}
        {#each tooltip.rows as r (r.p)}
          <circle cx={tooltip.left} cy={y(r.v)} r="4.5" fill={colour(r.i)} stroke="#151b24" stroke-width="2" />
        {/each}
      {/if}

      {#each labels as l (l.p)}
        <circle cx={width - right + 8} cy={l.y} r="3" fill={colour(l.i)} />
        <text class="end-label" x={width - right + 15} y={l.y} dominant-baseline="middle">{l.p}</text>
      {/each}

      <rect x={pad.left} y={pad.top} width={Math.max(0, width - pad.left - right)} height={height - pad.top - pad.bottom} fill="transparent" />
    </svg>

    {#if tooltip}
      <div class="tooltip" style:left="{tooltip.left}px" class:flip={tooltip.left > width * 0.6}>
        <p class="tt-title">After round of {tooltip.round}</p>
        {#each tooltip.rows as r (r.p)}
          <p class="tt-row">
            <span class="swatch" style:--c={colour(r.i)}></span>
            <span class="tt-name">{r.p}</span>
            <strong>{r.v}</strong>
          </p>
        {/each}
      </div>
    {/if}
  </div>
  <p class="caption">Running total after each round, in play order.</p>
{/if}

<style>
  .empty {
    color: var(--muted);
    text-align: center;
    padding: 2rem 0;
    margin: 0;
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1rem;
    list-style: none;
    margin: 0 0 0.75rem;
    padding: 0;
    font-size: 0.85rem;
    color: var(--muted);
  }

  .legend li {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .swatch {
    width: 14px;
    height: 3px;
    border-radius: 2px;
    background: var(--c);
    flex: none;
  }

  .swatch.dashed {
    background: repeating-linear-gradient(90deg, var(--c) 0 4px, transparent 4px 7px);
  }

  .chart {
    position: relative;
    width: 100%;
  }

  svg {
    display: block;
    width: 100%;
    height: auto;
    touch-action: pan-y;
  }

  .grid {
    stroke: rgb(255 255 255 / 0.06);
  }

  .grid.zero {
    stroke: rgb(255 255 255 / 0.22);
  }

  .axis {
    fill: var(--muted);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }

  .crosshair {
    stroke: rgb(255 255 255 / 0.3);
    stroke-dasharray: 3 3;
  }

  .end-label {
    fill: var(--text);
    font-size: 12px;
  }

  .tooltip {
    position: absolute;
    top: 0;
    transform: translateX(12px);
    background: #0f141c;
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 0.55rem 0.7rem;
    font-size: 0.8rem;
    pointer-events: none;
    min-width: 150px;
    box-shadow: 0 10px 30px rgb(0 0 0 / 0.5);
    z-index: 2;
  }

  .tooltip.flip {
    transform: translateX(calc(-100% - 12px));
  }

  .tooltip p {
    margin: 0;
  }

  .tt-title {
    color: var(--muted);
    margin-bottom: 0.35rem !important;
  }

  .tt-row {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.1rem 0;
  }

  .tt-name {
    flex: 1;
  }

  .tt-row strong {
    font-variant-numeric: tabular-nums;
  }

  .caption {
    margin: 0.5rem 0 0;
    font-size: 0.78rem;
    color: var(--muted);
  }
</style>
