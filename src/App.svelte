<script lang="ts">
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import Check from '@lucide/svelte/icons/check';
  import FolderOpen from '@lucide/svelte/icons/folder-open';
  import Layers from '@lucide/svelte/icons/layers';
  import LogOut from '@lucide/svelte/icons/log-out';
  import Play from '@lucide/svelte/icons/play';
  import Plus from '@lucide/svelte/icons/plus';
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
  import Target from '@lucide/svelte/icons/target';
  import Users from '@lucide/svelte/icons/users';
  import Dialog from './lib/Dialog.svelte';
  import ScoreBoard from './lib/ScoreBoard.svelte';
  import SuitIcon from './lib/SuitIcon.svelte';
  import { showMessage } from './lib/dialog.svelte';
  import {
    clearCurrent,
    completeRound,
    createRounds,
    currentRound,
    downloadLog,
    loadCurrent,
    newLogName,
    parseLog,
    playersOf,
    resetRounds,
    round,
    saveCurrent,
    titleCase,
    totalRounds,
    turnOrder,
    type SavedGame,
    type Suit,
  } from './lib/game';

  type Screen = 'home' | 'players' | 'dealer' | 'game';

  const SUITS: Suit[] = ['Spades', 'Hearts', 'Clubs', 'Diamonds'];

  let screen = $state<Screen>('home');
  let names = $state<string[]>(Array(10).fill(''));
  let players = $state<string[]>([]);
  let firstDealer = $state('');
  let game = $state<SavedGame | null>(null);
  let saved = $state<SavedGame | null>(loadCurrent());

  let phase = $state<'judgement' | 'hands'>('judgement');
  let judgementInputs = $state<Record<string, string>>({});
  let handsInputs = $state<Record<string, string>>({});

  let fileInput = $state<HTMLInputElement>();

  const curr = $derived(game ? currentRound(game.rounds) : 0);
  const total = $derived(game ? totalRounds(game.rounds) : 0);
  const info = $derived(game && curr ? round(game.rounds, curr) : null);
  const order = $derived(game && info ? turnOrder(playersOf(game.rounds), info.dealer) : []);
  const inProgress = $derived(saved && currentRound(saved.rounds) > 0 ? saved : null);

  const sum = (r: Record<string, string>) => order.reduce((s, p) => s + Number(r[p] || 0), 0);
  const calledSum = $derived(sum(judgementInputs));
  const madeSum = $derived(sum(handsInputs));

  function persist(g: SavedGame) {
    game = g;
    saved = g;
    saveCurrent(g);
  }

  function enterGame() {
    phase = 'judgement';
    judgementInputs = {};
    handsInputs = {};
    screen = 'game';
  }

  function goHome() {
    clearCurrent();
    saved = null;
    game = null;
    screen = 'home';
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

  async function newGame() {
    if (!(await confirmDiscard())) return;
    names = Array(10).fill('');
    firstDealer = '';
    screen = 'players';
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
      persist({ fileName: file.name, rounds: parseLog(await file.text()) });
      enterGame();
    } catch {
      showMessage('Invalid File', 'That file is not a valid Judgement game log.', 'error');
    }
  }

  function resume() {
    if (!inProgress) return;
    game = inProgress;
    enterGame();
  }

  // ---- Setup ----

  function chooseFirstDealer(e: SubmitEvent) {
    e.preventDefault();
    const unique: string[] = [];
    for (const n of names) {
      const name = titleCase(n);
      if (name && !unique.includes(name)) unique.push(name);
    }
    if (unique.length < 2) {
      showMessage('Are you stupid?', 'At least 2 players needed.', 'error');
      return;
    }
    players = unique;
    if (!players.includes(firstDealer)) firstDealer = '';
    screen = 'dealer';
  }

  function setupRounds(e: SubmitEvent) {
    e.preventDefault();
    persist({ fileName: newLogName(), rounds: createRounds(players, firstDealer) });
    enterGame();
  }

  // ---- Play ----

  /** Like the desktop app's key validator: only digits from 0 to the round's hand count. */
  function digitsOnly(store: Record<string, string>, key: string) {
    return (e: Event) => {
      const el = e.currentTarget as HTMLInputElement;
      const v = el.value;
      if (v === '' || (/^\d+$/.test(v) && Number(v) <= curr)) store[key] = v;
      else el.value = store[key] ?? '';
    };
  }

  function submitJudgement(e: SubmitEvent) {
    e.preventDefault();
    if (order.some((p) => !judgementInputs[p])) {
      showMessage('Invalid Judgement', 'Enter a valid judgement for all players', 'error');
      return;
    }
    if (calledSum === curr) {
      showMessage(
        'Invalid Judgement',
        'Total Judgement cannot be equal to the number of hands! Someone has to lose!',
        'error',
      );
      return;
    }
    phase = 'hands';
  }

  function submitHands(e: SubmitEvent) {
    e.preventDefault();
    if (!game) return;
    for (const p of order) if (!handsInputs[p]) handsInputs[p] = '0';
    if (madeSum !== curr) {
      showMessage('Invalid Hands', 'Total Hands should be equal to the number of hands!', 'error');
      return;
    }
    const toNums = (r: Record<string, string>) =>
      Object.fromEntries(order.map((p) => [p, Number(r[p])]));
    persist({
      ...game,
      rounds: completeRound(game.rounds, curr, toNums(judgementInputs), toNums(handsInputs)),
    });
    enterGame();
    if (currentRound(game.rounds) === 0) {
      showMessage('Game Over', 'All rounds completed. Game Over!', 'info', 3000);
    }
  }

  // ---- End ----

  async function offerSave() {
    if (game && (await showMessage('Save Game Log', 'Do you want to save this game log?', 'yesno'))) {
      downloadLog(game);
    }
  }

  async function restart() {
    if (!game) return;
    await offerSave();
    const samePlayers = await showMessage(
      'Restart Game',
      'Do you want to restart the game with the same players?',
      'yesno',
    );
    if (samePlayers) {
      persist({ fileName: newLogName(), rounds: resetRounds(game.rounds) });
      enterGame();
    } else {
      goHome();
    }
  }

  async function exit() {
    await offerSave();
    goHome();
  }

  function focusFirst(node: HTMLElement) {
    node.querySelector('input')?.focus();
  }
</script>

<header>
  <div class="brand">
    <img src="/icon.png" alt="" />
    <span>Judgement</span>
  </div>
  {#if screen === 'game'}
    <button class="ghost small" onclick={exit}><LogOut size={16} /> Exit</button>
  {/if}
</header>

<main>
  {#if screen === 'home'}
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
        <button class="big {inProgress ? 'ghost' : 'primary'}" onclick={newGame}>
          <Plus size={18} /> New Game
        </button>
        <button class="ghost big" onclick={chooseSavedGame}>
          <FolderOpen size={18} /> Load Saved Game
        </button>
      </div>
      <input
        bind:this={fileInput}
        type="file"
        accept=".json,application/json"
        hidden
        onchange={loadSavedGame}
      />
    </section>
  {:else if screen === 'players'}
    <form class="card setup" onsubmit={chooseFirstDealer} {@attach focusFirst}>
      <div class="setup-head">
        <span class="step">Step 1 of 2</span>
        <h2>Enter Player Names</h2>
      </div>
      <div class="names">
        {#each names as _, i (i)}
          <div class="name-field">
            <span class="idx">{i + 1}</span>
            <input
              type="text"
              placeholder="Player {i + 1}"
              maxlength="20"
              autocomplete="off"
              bind:value={names[i]}
            />
          </div>
        {/each}
      </div>
      <div class="nav">
        <button type="button" class="ghost" onclick={() => (screen = 'home')}>
          <ArrowLeft size={18} /> Back
        </button>
        <button type="submit" class="primary">Next <ArrowRight size={18} /></button>
      </div>
    </form>
  {:else if screen === 'dealer'}
    <form class="card setup" onsubmit={setupRounds}>
      <div class="setup-head">
        <span class="step">Step 2 of 2</span>
        <h2>Choose the First Dealer</h2>
      </div>
      <div class="dealers">
        {#each players as p (p)}
          <label class="choice" class:selected={firstDealer === p}>
            <input type="radio" name="dealer" value={p} bind:group={firstDealer} />
            <span class="avatar">{p[0]}</span>
            <span class="choice-name">{p}</span>
          </label>
        {/each}
      </div>
      <div class="nav">
        <button type="button" class="ghost" onclick={() => (screen = 'players')}>
          <ArrowLeft size={18} /> Back
        </button>
        <button type="submit" class="primary" disabled={!firstDealer}>
          Start <ArrowRight size={18} />
        </button>
      </div>
    </form>
  {:else if game && info}
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
                <label class="row">
                  <span class="name">
                    {p}
                    {#if p === info.dealer}<span class="badge">Dealer</span>{/if}
                  </span>
                  <input
                    type="text"
                    inputmode="numeric"
                    autocomplete="off"
                    value={judgementInputs[p] ?? ''}
                    oninput={digitsOnly(judgementInputs, p)}
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
                    <span class="called" title="Judgement"><Target size={13} /> {judgementInputs[p]}</span>
                  </span>
                  <input
                    type="text"
                    inputmode="numeric"
                    autocomplete="off"
                    placeholder="0"
                    value={handsInputs[p] ?? ''}
                    oninput={digitsOnly(handsInputs, p)}
                  />
                </label>
              {/each}
              <p class="tally" class:good={madeSum === curr}>
                Made <strong>{madeSum}</strong> of {curr}
              </p>
              <button type="submit" class="primary wide"><Check size={18} /> Submit</button>
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
    </div>
  {:else if game}
    <section class="over">
      <ScoreBoard rounds={game.rounds} big />
      <div class="over-actions">
        <button class="primary big" onclick={restart}><RotateCcw size={18} /> New Game</button>
        <button class="ghost big" onclick={exit}><LogOut size={18} /> Exit</button>
      </div>
    </section>
  {/if}
</main>

<Dialog />

<style>
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem clamp(1rem, 4vw, 2.5rem);
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
  }

  .brand img {
    width: 28px;
    height: 28px;
  }

  main {
    padding: clamp(1rem, 4vw, 2.5rem);
    max-width: 1200px;
    margin: 0 auto;
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
    line-height: 1;
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
    grid-template-areas: 'board entry trump';
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
    justify-content: space-between;
    gap: 1rem;
    padding: 0.45rem 0;
    border-bottom: 1px solid var(--border-soft);
  }

  .name {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.05rem;
    font-weight: 500;
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

  .corner.flip {
    top: auto;
    left: auto;
    bottom: 0.5rem;
    right: 0.55rem;
    transform: rotate(180deg);
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

  /* Game over */
  .over {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
    padding-top: 1rem;
  }

  .over-actions {
    display: flex;
    gap: 1rem;
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
      grid-template-areas: 'trump' 'entry' 'board';
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
  }

  @media (max-width: 560px) {
    .names {
      grid-template-columns: 1fr;
    }
  }
</style>
