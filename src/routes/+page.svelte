<script lang="ts">
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import Ban from '@lucide/svelte/icons/ban';
  import BookOpen from '@lucide/svelte/icons/book-open';
  import ChartColumn from '@lucide/svelte/icons/chart-column';
  import ChartLine from '@lucide/svelte/icons/chart-line';
  import Check from '@lucide/svelte/icons/check';
  import Download from '@lucide/svelte/icons/download';
  import FolderOpen from '@lucide/svelte/icons/folder-open';
  import House from '@lucide/svelte/icons/house';
  import Layers from '@lucide/svelte/icons/layers';
  import Play from '@lucide/svelte/icons/play';
  import Plus from '@lucide/svelte/icons/plus';
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
  import Table from '@lucide/svelte/icons/table';
  import Target from '@lucide/svelte/icons/target';
  import Trophy from '@lucide/svelte/icons/trophy';
  import Users from '@lucide/svelte/icons/users';
  import EditRound from '#lib/EditRound.svelte';
  import ScoreBoard from '#lib/ScoreBoard.svelte';
  import ScoreChart from '#lib/ScoreChart.svelte';
  import Scoresheet from '#lib/Scoresheet.svelte';
  import SuitIcon from '#lib/SuitIcon.svelte';
  import { showMessage } from '#lib/dialog.svelte.ts';
  import { digitsOnly } from '#lib/digits.ts';
  import {
    createRounds,
    currentRound,
    downloadLog,
    handsError,
    judgementError,
    loadCurrent,
    loadHistory,
    newId,
    newLogName,
    parseLog,
    playersOf,
    recordFinished,
    resetRounds,
    round,
    saveCurrent,
    setRound,
    titleCase,
    totalRounds,
    turnOrder,
    winners,
    type SavedGame,
    type Suit,
  } from '#lib/game.ts';
  import { ui } from '#lib/ui.svelte.ts';
  import { keepAwake } from '#lib/wakeLock.ts';
  import { resolve } from '$app/paths';

  const SUITS: Suit[] = ['Spades', 'Hearts', 'Clubs', 'Diamonds'];

  let game = $state<SavedGame | null>(null);
  let saved = $state<SavedGame | null>(loadCurrent());
  let history = $state(loadHistory());

  let phase = $state<'judgement' | 'hands'>('judgement');
  let judgementInputs = $state<Record<string, string>>({});
  let handsInputs = $state<Record<string, string>>({});
  let editing = $state<number | null>(null);
  let lowerTab = $state<'sheet' | 'chart'>('sheet');

  let fileInput = $state<HTMLInputElement>();

  // Coming back from another page mid-game: pick up exactly where we left off.
  if (ui.screen === 'game') {
    const current = loadCurrent();
    if (current) {
      game = current;
      enterGame(true);
    } else {
      ui.screen = 'home';
    }
  }

  const curr = $derived(game ? currentRound(game.rounds) : 0);
  const total = $derived(game ? totalRounds(game.rounds) : 0);
  const info = $derived(game && curr ? round(game.rounds, curr) : null);
  const order = $derived(game && info ? turnOrder(playersOf(game.rounds), info.dealer) : []);
  const inProgress = $derived(saved && currentRound(saved.rounds) > 0 ? saved : null);

  const sum = (r: Record<string, string>, ps = order) =>
    ps.reduce((s, p) => s + Number(r[p] || 0), 0);
  const calledSum = $derived(sum(judgementInputs));
  const madeSum = $derived(sum(handsInputs));

  /** The one call the dealer (last to bid) can't make, once everyone else has called. */
  const forbidden = $derived.by(() => {
    const others = order.slice(0, -1);
    if (!others.length || others.some((p) => !judgementInputs[p])) return null;
    const n = curr - sum(judgementInputs, others);
    return n >= 0 ? n : null;
  });

  // Save bids as they're typed, so a refresh mid-round loses nothing.
  $effect(() => {
    if (ui.screen !== 'game' || !game || !curr) return;
    saveCurrent({
      ...$state.snapshot(game),
      draft: {
        round: curr,
        phase,
        judgements: $state.snapshot(judgementInputs),
        hands: $state.snapshot(handsInputs),
      },
    });
  });

  $effect(() => {
    if (ui.screen === 'game' && curr) return keepAwake();
  });

  function persist(g: SavedGame) {
    game = g;
    saved = g;
    saveCurrent(g);
  }

  function enterGame(restoreDraft = false) {
    const draft = game?.draft;
    if (restoreDraft && draft && game && draft.round === currentRound(game.rounds)) {
      phase = draft.phase;
      judgementInputs = draft.judgements;
      handsInputs = draft.hands;
    } else {
      phase = 'judgement';
      judgementInputs = {};
      handsInputs = {};
    }
    lowerTab = 'sheet';
    ui.screen = 'game';
  }

  async function confirmDiscard() {
    if (!inProgress) return true;
    return showMessage(
      'Game in Progress',
      'You have an unfinished game. Starting another will discard it. Continue?',
      'yesno',
    );
  }

  // ---- Home ----

  async function newGame(prefill: string[] = []) {
    if (!(await confirmDiscard())) return;
    ui.names = Array.from({ length: 10 }, (_, i) => prefill[i] ?? '');
    ui.firstDealer = '';
    ui.screen = 'players';
  }

  async function chooseSavedGame() {
    if (!(await confirmDiscard())) return;
    fileInput?.click();
  }

  async function loadSavedGame(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const g = { id: file.name, fileName: file.name, rounds: parseLog(await file.text()) };
      persist(g);
      // Finished logs count towards stats; the file name keeps re-loads from double counting.
      if (currentRound(g.rounds) === 0) history = recordFinished(g);
      enterGame();
    } catch {
      showMessage('Invalid File', 'That file is not a valid Judgement game log.', 'error');
    }
  }

  function resume() {
    if (!inProgress) return;
    game = inProgress;
    enterGame(true);
  }

  // ---- Setup ----

  function chooseFirstDealer(e: SubmitEvent) {
    e.preventDefault();
    const unique: string[] = [];
    for (const n of ui.names) {
      const name = titleCase(n);
      if (name && !unique.includes(name)) unique.push(name);
    }
    if (unique.length < 2) {
      showMessage('Are you stupid?', 'At least 2 players needed.', 'error');
      return;
    }
    ui.players = unique;
    if (!unique.includes(ui.firstDealer)) ui.firstDealer = '';
    ui.screen = 'dealer';
  }

  function setupRounds(e: SubmitEvent) {
    e.preventDefault();
    persist({
      id: newId(),
      fileName: newLogName(),
      rounds: createRounds(ui.players, ui.firstDealer),
    });
    enterGame();
  }

  // ---- Play ----

  function submitJudgement(e: SubmitEvent) {
    e.preventDefault();
    if (order.some((p) => !judgementInputs[p])) {
      showMessage('Invalid Judgement', 'Enter a valid judgement for all players', 'error');
      return;
    }
    const error = judgementError(
      curr,
      order.map((p) => Number(judgementInputs[p])),
    );
    if (error) {
      showMessage('Invalid Judgement', error, 'error');
      return;
    }
    phase = 'hands';
  }

  function submitHands(e: SubmitEvent) {
    e.preventDefault();
    if (!game) return;
    for (const p of order) if (!handsInputs[p]) handsInputs[p] = '0';
    const error = handsError(
      curr,
      order.map((p) => Number(handsInputs[p])),
    );
    if (error) {
      showMessage('Invalid Hands', error, 'error');
      return;
    }
    const toNums = (r: Record<string, string>) =>
      Object.fromEntries(order.map((p) => [p, Number(r[p])]));
    persist({
      ...game,
      rounds: setRound(game.rounds, curr, toNums(judgementInputs), toNums(handsInputs)),
    });
    enterGame();
    if (currentRound(game.rounds) === 0) {
      history = recordFinished(game);
      showMessage('Game Over', 'All rounds completed. Game Over!', 'info', 3000);
    }
  }

  function saveEdit(judgements: Record<string, number>, hands: Record<string, number>) {
    if (!game || editing === null) return;
    persist({ ...game, rounds: setRound(game.rounds, editing, judgements, hands) });
    if (currentRound(game.rounds) === 0) history = recordFinished(game);
    editing = null;
  }

  // ---- End ----

  function playAgain() {
    if (!game) return;
    persist({ id: newId(), fileName: newLogName(), rounds: resetRounds(game.rounds) });
    enterGame();
  }

  function focusFirst(node: HTMLElement) {
    node.querySelector('input')?.focus();
  }
</script>

<svelte:head>
  <title
    >{game && info ? `Round of ${curr} | Judgement` : 'Judgement | Card Game Scorekeeper'}</title
  >
</svelte:head>

{#snippet toolbar()}
  <div class="toolbar">
    <button
      class="ghost small"
      onclick={() => (ui.screen = 'home')}
      title="Back to the menu (your game stays saved)"
    >
      <House size={16} /> Menu
    </button>
    <button class="ghost small" onclick={() => game && downloadLog(game)} title="Download game log">
      <Download size={16} /> Download log
    </button>
  </div>
{/snippet}

{#if ui.screen === 'home'}
  <section class="home">
    <div class="suits">
      {#each SUITS as s (s)}
        <span class="suit {s.toLowerCase()}"><SuitIcon suit={s} size={26} /></span>
      {/each}
    </div>
    <h1>Judgement</h1>
    <p class="tagline">Call your hands. Make your hands.</p>
    <div class="stack">
      {#if inProgress}
        <button class="primary big resume" onclick={resume}>
          <span class="resume-title"><Play size={18} fill="currentColor" /> Resume Game</span>
          <span class="resume-meta">
            <span><Layers size={13} /> Round of {currentRound(inProgress.rounds)}</span>
            <span><Users size={13} /> {playersOf(inProgress.rounds).length} players</span>
          </span>
        </button>
      {/if}
      <button class="big {inProgress ? 'ghost' : 'primary'}" onclick={() => newGame()}>
        <Plus size={18} /> New Game
      </button>
      <button class="ghost big" onclick={chooseSavedGame}>
        <FolderOpen size={18} /> Load Saved Game
      </button>
    </div>
    <div class="links">
      <a href={resolve('/rules')}><BookOpen size={16} /> How to play</a>
      {#if history.length}
        <a href={resolve('/stats')}
          ><ChartColumn size={16} /> Stats from {history.length}
          {history.length === 1 ? 'game' : 'games'}</a
        >
      {/if}
    </div>
    <input
      bind:this={fileInput}
      type="file"
      accept=".json,application/json"
      hidden
      onchange={loadSavedGame}
    />
  </section>
{:else if ui.screen === 'players'}
  <form class="card setup" onsubmit={chooseFirstDealer} {@attach focusFirst}>
    <div class="setup-head">
      <span class="step">Step 1 of 2</span>
      <h2>Enter Player Names</h2>
    </div>
    <div class="names">
      {#each ui.names as _, i (i)}
        <div class="name-field">
          <span class="idx">{i + 1}</span>
          <input
            type="text"
            placeholder="Player {i + 1}"
            maxlength="20"
            autocomplete="off"
            bind:value={ui.names[i]}
          />
        </div>
      {/each}
    </div>
    <div class="nav">
      <button type="button" class="ghost" onclick={() => (ui.screen = 'home')}>
        <ArrowLeft size={18} /> Back
      </button>
      <button type="submit" class="primary">Next <ArrowRight size={18} /></button>
    </div>
  </form>
{:else if ui.screen === 'dealer'}
  <form class="card setup" onsubmit={setupRounds}>
    <div class="setup-head">
      <span class="step">Step 2 of 2</span>
      <h2>Choose the First Dealer</h2>
    </div>
    <div class="dealers">
      {#each ui.players as p (p)}
        <label class="choice" class:selected={ui.firstDealer === p}>
          <input type="radio" name="dealer" value={p} bind:group={ui.firstDealer} />
          <span class="avatar">{p[0]}</span>
          <span class="choice-name">{p}</span>
        </label>
      {/each}
    </div>
    <div class="nav">
      <button type="button" class="ghost" onclick={() => (ui.screen = 'players')}>
        <ArrowLeft size={18} /> Back
      </button>
      <button type="submit" class="primary" disabled={!ui.firstDealer}>
        Start <ArrowRight size={18} />
      </button>
    </div>
  </form>
{:else if game && info}
  {@render toolbar()}
  <div class="game">
    <div class="area-board"><ScoreBoard rounds={game.rounds} /></div>

    <section class="area-entry">
      <div class="round-head">
        <h1>Round of {curr}</h1>
        <div class="progress" aria-hidden="true">
          <span style:width="{((total - curr) / total) * 100}%"></span>
        </div>
      </div>
      {#key `${curr}-${phase}`}
        {#if phase === 'judgement'}
          <form class="card entry" onsubmit={submitJudgement} {@attach focusFirst}>
            <h2>Enter the Judgements</h2>
            {#each order as p (p)}
              {@const isDealer = p === info.dealer}
              <label class="row">
                <span class="name">
                  {p}
                  {#if isDealer}<span class="badge">Dealer</span>{/if}
                </span>
                {#if isDealer && forbidden !== null}
                  <span class="hint" class:clash={judgementInputs[p] === String(forbidden)}>
                    <Ban size={13} /> not {forbidden}
                  </span>
                {/if}
                <input
                  type="text"
                  inputmode="numeric"
                  autocomplete="off"
                  class:clash={isDealer &&
                    forbidden !== null &&
                    judgementInputs[p] === String(forbidden)}
                  value={judgementInputs[p] ?? ''}
                  oninput={digitsOnly(judgementInputs, p, curr)}
                />
              </label>
            {/each}
            <p class="tally" class:bad={calledSum === curr}>
              Called <strong>{calledSum}</strong> of {curr}
            </p>
            <button type="submit" class="primary wide"><Check size={18} /> Submit</button>
          </form>
        {:else}
          <form class="card entry" onsubmit={submitHands} {@attach focusFirst}>
            <h2>Enter the Hands Made</h2>
            {#each order as p (p)}
              <label class="row">
                <span class="name">
                  {p}
                  <span class="called" title="Judgement"
                    ><Target size={13} /> {judgementInputs[p]}</span
                  >
                </span>
                <input
                  type="text"
                  inputmode="numeric"
                  autocomplete="off"
                  placeholder="0"
                  value={handsInputs[p] ?? ''}
                  oninput={digitsOnly(handsInputs, p, curr)}
                />
              </label>
            {/each}
            <p class="tally" class:good={madeSum === curr}>
              Made <strong>{madeSum}</strong> of {curr}
            </p>
            <div class="form-actions">
              <button type="button" class="ghost" onclick={() => (phase = 'judgement')}>
                <ArrowLeft size={18} /> Calls
              </button>
              <button type="submit" class="primary grow"><Check size={18} /> Submit</button>
            </div>
          </form>
        {/if}
      {/key}
    </section>

    <aside class="area-trump card">
      <h2>Trump</h2>
      <div class="playing-card {info.suit.toLowerCase()}">
        <span class="corner"><SuitIcon suit={info.suit} size={16} /></span>
        <img src="/suits/{info.suit}.png" alt={info.suit} />
        <span class="corner flip"><SuitIcon suit={info.suit} size={16} /></span>
      </div>
      <p class="suit-name">{info.suit}</p>
      <p class="dealer">Dealer <strong>{info.dealer}</strong></p>
    </aside>

    <section class="area-lower card">
      <div class="tabs" role="tablist">
        <button
          role="tab"
          aria-selected={lowerTab === 'sheet'}
          class:active={lowerTab === 'sheet'}
          onclick={() => (lowerTab = 'sheet')}
        >
          <Table size={16} /> Scoresheet
        </button>
        <button
          role="tab"
          aria-selected={lowerTab === 'chart'}
          class:active={lowerTab === 'chart'}
          onclick={() => (lowerTab = 'chart')}
        >
          <ChartLine size={16} /> Chart
        </button>
      </div>
      {#if lowerTab === 'sheet'}
        <Scoresheet rounds={game.rounds} onedit={(n) => (editing = n)} />
      {:else}
        <ScoreChart rounds={game.rounds} />
      {/if}
    </section>
  </div>
{:else if game}
  {@const won = winners(game.rounds)}
  {@render toolbar()}
  <section class="over">
    <div class="winner">
      <span class="trophy"><Trophy size={30} /></span>
      {#if won.length === 1}
        <h1>{won[0]} wins!</h1>
      {:else}
        <h1>It's a tie!</h1>
        <p>{won.join(' and ')} share the top spot.</p>
      {/if}
    </div>

    <div class="over-actions">
      <button class="primary big" onclick={playAgain}><RotateCcw size={18} /> Play Again</button>
      <button class="ghost big" onclick={() => game && newGame(playersOf(game.rounds))}>
        <Users size={18} /> New Players
      </button>
      <button class="ghost big" onclick={() => game && downloadLog(game)}>
        <Download size={18} /> Download Log
      </button>
    </div>

    <div class="over-grid">
      <ScoreBoard rounds={game.rounds} />
      <div class="card"><ScoreChart rounds={game.rounds} /></div>
    </div>

    <div class="card sheet-card">
      <h2>Scoresheet</h2>
      <Scoresheet rounds={game.rounds} onedit={(n) => (editing = n)} />
    </div>
  </section>
{/if}

{#if game && editing !== null}
  <EditRound rounds={game.rounds} n={editing} onsave={saveEdit} oncancel={() => (editing = null)} />
{/if}

<style>
  .toolbar {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin: -0.5rem 0 1rem;
  }

  /* Home */
  .home {
    min-height: 72vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .suits {
    display: flex;
    gap: 0.6rem;
    margin-bottom: 1.25rem;
  }

  .suit {
    display: grid;
    place-items: center;
    width: 52px;
    height: 52px;
    border-radius: 14px;
    background: #fbfaf6;
    color: #1a1d24;
    box-shadow: 0 10px 24px -10px rgb(0 0 0 / 0.8);
    transform: rotate(-6deg);
  }

  .suit:nth-child(2) {
    transform: rotate(-2deg) translateY(-6px);
  }

  .suit:nth-child(3) {
    transform: rotate(2deg) translateY(-6px);
  }

  .suit:nth-child(4) {
    transform: rotate(6deg);
  }

  .suit.hearts,
  .suit.diamonds {
    color: #d8323a;
  }

  .home h1 {
    font-size: clamp(3rem, 9vw, 5rem);
    margin: 0;
    /* Room for the descender: background-clip: text clips to the line box. */
    line-height: 1.2;
    padding: 0 0.05em 0.08em;
    background: linear-gradient(180deg, #fff, #aab6c8);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  .tagline {
    color: var(--muted);
    margin: 0.75rem 0 2.5rem;
    font-size: 1.05rem;
  }

  .stack {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    width: min(340px, 100%);
  }

  .links {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem 1.5rem;
    margin-top: 1.75rem;
  }

  .links a {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    color: var(--muted);
    text-decoration: none;
    font-size: 0.9rem;
  }

  .links a:hover {
    color: var(--text);
  }

  .resume {
    flex-direction: column;
    gap: 0.35rem;
  }

  .resume-title {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .resume-meta {
    display: flex;
    gap: 1rem;
    font-size: 0.8rem;
    font-weight: 500;
    opacity: 0.85;
  }

  .resume-meta span {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
  }

  /* Setup */
  .setup {
    max-width: 580px;
    margin: 0 auto;
  }

  .setup-head {
    margin-bottom: 1.5rem;
  }

  .setup-head h2 {
    margin: 0.25rem 0 0;
    font-size: 1.75rem;
  }

  .step {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--accent);
  }

  .names {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.6rem;
  }

  .name-field {
    position: relative;
  }

  .name-field .idx {
    position: absolute;
    left: 0.85rem;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--muted);
    width: 1.2rem;
    text-align: center;
    pointer-events: none;
  }

  .name-field input {
    width: 100%;
    padding-left: 2.4rem;
  }

  .dealers {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 0.6rem;
  }

  .choice {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    padding: 0.7rem 0.9rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface-2);
    cursor: pointer;
    transition:
      border-color 140ms,
      background 140ms;
  }

  .choice:hover {
    border-color: rgb(255 255 255 / 0.2);
  }

  .choice.selected {
    border-color: var(--accent);
    background: var(--accent-soft);
  }

  .choice:has(input:focus-visible) {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .choice input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .avatar {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--surface-3);
    font-weight: 700;
    font-size: 0.9rem;
    flex: none;
    transition: background 140ms;
  }

  .selected .avatar {
    background: var(--accent);
    color: white;
  }

  .choice-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .nav {
    display: flex;
    justify-content: space-between;
    margin-top: 1.75rem;
  }

  /* Game */
  .game {
    display: grid;
    grid-template-columns: 250px 1fr 250px;
    grid-template-areas:
      'board entry trump'
      'lower lower lower';
    gap: 1.5rem;
    align-items: start;
  }

  .area-board {
    grid-area: board;
  }

  .area-entry {
    grid-area: entry;
  }

  .area-trump {
    grid-area: trump;
    text-align: center;
  }

  .area-lower {
    grid-area: lower;
    min-width: 0;
  }

  .round-head {
    max-width: 420px;
    margin: 0 auto 1.25rem;
    text-align: center;
  }

  .round-head h1 {
    margin: 0 0 0.75rem;
    font-size: clamp(2rem, 4vw, 2.75rem);
    line-height: 1.1;
  }

  .progress {
    height: 4px;
    border-radius: 999px;
    background: var(--surface-3);
    overflow: hidden;
  }

  .progress span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--accent), #7aa8ff);
    transition: width 400ms ease;
  }

  .entry {
    max-width: 420px;
    margin: 0 auto;
    animation: rise 220ms ease-out;
  }

  .entry h2 {
    margin: 0 0 1rem;
    text-align: center;
    font-size: 1.15rem;
    color: var(--muted);
    font-weight: 500;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.45rem 0;
    border-bottom: 1px solid var(--border-soft);
  }

  .name {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.05rem;
    font-weight: 500;
    margin-right: auto;
    min-width: 0;
  }

  .badge {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--accent);
    background: var(--accent-soft);
    border-radius: 999px;
    padding: 0.2rem 0.5rem;
  }

  .hint {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--muted);
    white-space: nowrap;
  }

  .hint.clash {
    color: var(--danger);
  }

  .called {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--muted);
    background: var(--surface-3);
    border-radius: 999px;
    padding: 0.15rem 0.5rem;
  }

  .row input {
    width: 4.5rem;
    text-align: center;
    font-size: 1.1rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    padding: 0.55rem;
  }

  .row input.clash {
    border-color: var(--danger);
    box-shadow: 0 0 0 3px rgb(255 93 108 / 0.15);
  }

  .tally {
    margin: 1rem 0 0;
    text-align: center;
    font-size: 0.9rem;
    color: var(--muted);
  }

  .tally strong {
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }

  .tally.bad strong {
    color: var(--danger);
  }

  .tally.good strong {
    color: var(--success);
  }

  .wide {
    width: 100%;
    margin-top: 1rem;
  }

  .form-actions {
    display: flex;
    gap: 0.6rem;
    margin-top: 1rem;
  }

  .grow {
    flex: 1;
  }

  .area-trump h2 {
    margin: 0 0 1.25rem;
    font-size: 1.15rem;
    color: var(--muted);
    font-weight: 500;
  }

  .playing-card {
    position: relative;
    width: 140px;
    aspect-ratio: 5 / 7;
    margin: 0 auto;
    background: linear-gradient(160deg, #ffffff, #f1efe8);
    border-radius: 12px;
    display: grid;
    place-items: center;
    box-shadow:
      0 18px 30px -12px rgb(0 0 0 / 0.7),
      inset 0 0 0 1px rgb(0 0 0 / 0.08);
    color: #1a1d24;
    transform: rotate(-3deg);
    transition: transform 200ms ease;
  }

  .playing-card:hover {
    transform: rotate(0deg) translateY(-3px);
  }

  .playing-card.hearts,
  .playing-card.diamonds {
    color: #d8323a;
  }

  .playing-card img {
    width: 60%;
  }

  .corner {
    position: absolute;
    top: 0.5rem;
    left: 0.55rem;
    display: flex;
  }

  /* Kept upright: an inverted spade at this size reads as a heart. */
  .corner.flip {
    top: auto;
    left: auto;
    bottom: 0.5rem;
    right: 0.55rem;
  }

  .suit-name {
    font-family: var(--heading);
    font-size: 1.5rem;
    font-weight: 700;
    margin: 1.25rem 0 0.25rem;
  }

  .dealer {
    color: var(--muted);
    margin: 0;
  }

  .dealer strong {
    color: var(--text);
    margin-left: 0.25rem;
  }

  .tabs {
    display: flex;
    gap: 0.35rem;
    margin-bottom: 1rem;
    padding: 0.25rem;
    background: rgb(0 0 0 / 0.2);
    border-radius: var(--radius-sm);
    width: fit-content;
  }

  .tabs button {
    padding: 0.45rem 0.9rem;
    font-size: 0.875rem;
    color: var(--muted);
    border-radius: 8px;
  }

  .tabs button.active {
    background: var(--surface-3);
    color: var(--text);
  }

  /* Game over */
  .over {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .winner {
    text-align: center;
  }

  .trophy {
    display: inline-grid;
    place-items: center;
    width: 64px;
    height: 64px;
    border-radius: 20px;
    background: rgb(245 196 81 / 0.12);
    color: var(--gold);
    margin-bottom: 0.75rem;
  }

  .winner h1 {
    margin: 0;
    font-size: clamp(2.25rem, 6vw, 3.25rem);
    color: var(--gold);
  }

  .winner p {
    margin: 0.4rem 0 0;
    color: var(--muted);
  }

  .over-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.75rem;
  }

  .over-grid {
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 1.5rem;
    align-items: start;
  }

  .over-grid > .card {
    min-width: 0;
  }

  .sheet-card {
    min-width: 0;
  }

  .sheet-card h2 {
    margin: 0 0 1rem;
    font-size: 1.25rem;
  }

  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
  }

  @media (max-width: 960px) {
    .game {
      grid-template-columns: 1fr;
      grid-template-areas: 'trump' 'entry' 'board' 'lower';
    }

    .area-trump {
      display: grid;
      grid-template-columns: auto 1fr;
      column-gap: 1.25rem;
      text-align: left;
      align-items: center;
    }

    .area-trump > * {
      grid-column: 2;
    }

    .area-trump h2 {
      margin: 0;
    }

    .playing-card {
      grid-column: 1;
      grid-row: 1 / 4;
      width: 72px;
    }

    .corner {
      display: none;
    }

    .suit-name {
      margin: 0;
    }

    .over-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 560px) {
    .names {
      grid-template-columns: 1fr;
    }
  }
</style>
