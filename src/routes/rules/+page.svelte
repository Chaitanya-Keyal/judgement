<script lang="ts">
  import Ban from '@lucide/svelte/icons/ban';
  import Calculator from '@lucide/svelte/icons/calculator';
  import Layers from '@lucide/svelte/icons/layers';
  import Play from '@lucide/svelte/icons/play';
  import Repeat from '@lucide/svelte/icons/repeat';
  import Smartphone from '@lucide/svelte/icons/smartphone';
  import Target from '@lucide/svelte/icons/target';
  import Users from '@lucide/svelte/icons/users';
  import { resolve } from '$app/paths';
  import { scoreFor, type Suit } from '#lib/game.ts';
  import SuitIcon from '#lib/SuitIcon.svelte';

  const SUITS: Suit[] = ['Spades', 'Hearts', 'Clubs', 'Diamonds'];

  const examples = [
    { called: 0, made: 0 },
    { called: 1, made: 1 },
    { called: 3, made: 3 },
    { called: 5, made: 5 },
    { called: 2, made: 4 },
    { called: 3, made: 1 },
    { called: 0, made: 2 },
  ];

  const roundsFor = [3, 4, 5, 6, 7, 8, 10].map((n) => ({ players: n, rounds: Math.floor(52 / n) }));
</script>

<svelte:head>
  <title>How to Play Judgement | Rules and Scoring</title>
  <meta
    name="description"
    content="Rules of Judgement, the card game where you call your hands: dealing, calling your hands, the dealer's restriction, trumps, and how scoring works."
  />
</svelte:head>

<article class="rules">
  <header class="intro">
    <div class="suits">
      {#each SUITS as s (s)}
        <span class="suit {s.toLowerCase()}"><SuitIcon suit={s} size={18} /></span>
      {/each}
    </div>
    <h1>How to Play Judgement</h1>
    <p class="lede">
      A card game where the goal isn't to win the most hands. It's to win
      <em>exactly</em> as many as you said you would.
    </p>
  </header>

  <section class="card">
    <h2><span class="icon"><Users size={18} /></span>What you need</h2>
    <ul>
      <li>2 to 10 players and one standard 52-card deck, no jokers.</li>
      <li>Cards rank from Ace (high) down to 2 (low) in every suit.</li>
      <li>This app keeps score. You play with real cards.</li>
    </ul>
  </section>

  <section class="card">
    <h2><span class="icon"><Layers size={18} /></span>Rounds and dealing</h2>
    <p>
      The first round deals as many cards to each player as the deck allows: 52 divided by the
      number of players, rounded down. Each round after that deals one card fewer, down to a final
      round of one card each. The game has that many rounds in total.
    </p>
    <div class="table-wrap">
      <table class="compact">
        <thead>
          <tr>
            <th>Players</th>
            {#each roundsFor as r (r.players)}<td>{r.players}</td>{/each}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>Rounds</th>
            {#each roundsFor as r (r.players)}<td>{r.rounds}</td>{/each}
          </tr>
        </tbody>
      </table>
    </div>
    <p>
      The deal passes one seat to the left every round. A round is named after how many cards each
      player holds, so a game counts down: "Round of 8", "Round of 7", and so on.
    </p>
  </section>

  <section class="card">
    <h2><span class="icon"><Repeat size={18} /></span>Trumps</h2>
    <p>The trump suit changes every round, always in the same order:</p>
    <ol class="trump-order">
      {#each SUITS as s, i (s)}
        <li>
          <span class="suit {s.toLowerCase()}"><SuitIcon suit={s} size={16} /></span>
          <span>{s}</span>
          {#if i < SUITS.length - 1}<span class="sep" aria-hidden="true"></span>{/if}
        </li>
      {/each}
    </ol>
    <p>After Diamonds it starts again with Spades. Any trump beats any card of another suit.</p>
  </section>

  <section class="card">
    <h2><span class="icon"><Target size={18} /></span>Calling your hands</h2>
    <p>
      After the deal, every player looks at their cards and calls their <strong>judgement</strong>:
      exactly how many hands they expect to win this round. Zero is a perfectly good call.
    </p>
    <p>
      Calling starts with the player to the dealer's left and goes around the table, so the
      <strong>dealer always calls last</strong>.
    </p>
    <div class="callout">
      <span class="callout-icon"><Ban size={18} /></span>
      <div>
        <strong>The dealer's restriction</strong>
        <p>
          The total of all calls can never equal the number of cards in the round. That means at
          least one player is bound to miss. Because the dealer calls last, they're the one who may
          be blocked from a particular number. For example, in a Round of 5 where the others have
          called 1, 0 and 2, the dealer cannot call 2.
        </p>
      </div>
    </div>
  </section>

  <section class="card">
    <h2><span class="icon"><Play size={18} /></span>Playing the hands</h2>
    <ul>
      <li>
        Each hand is one card from every player. The player to the dealer's left leads the first.
      </li>
      <li>Everyone must follow the suit that was led if they can.</li>
      <li>If you can't follow suit, you may play any card, including a trump.</li>
      <li>
        The highest trump wins the hand. If no trump was played, the highest card of the led suit
        wins.
      </li>
      <li>Whoever wins a hand leads the next one, until all cards are played.</li>
    </ul>
  </section>

  <section class="card">
    <h2><span class="icon"><Calculator size={18} /></span>Scoring</h2>
    <p>Only an exact match scores points. Missing in either direction costs you.</p>
    <div class="score-rules">
      <div class="score-rule good">
        <span class="label">Made exactly 0</span>
        <span class="pts">+10</span>
      </div>
      <div class="score-rule good">
        <span class="label">Made exactly 1</span>
        <span class="pts">+15</span>
      </div>
      <div class="score-rule good">
        <span class="label">Made exactly 2 or more</span>
        <span class="pts">+10 per hand</span>
      </div>
      <div class="score-rule bad">
        <span class="label">Missed your call</span>
        <span class="pts">-10 per hand off</span>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Called</th><th>Made</th><th>Score</th></tr>
        </thead>
        <tbody>
          {#each examples as e (`${e.called}-${e.made}`)}
            {@const score = scoreFor(e.called, e.made)}
            <tr>
              <td>{e.called}</td>
              <td>{e.made}</td>
              <td class="pts-cell" class:neg={score < 0}>{score > 0 ? `+${score}` : score}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <p>The highest total after the last round wins.</p>
  </section>

  <section class="card">
    <h2><span class="icon"><Smartphone size={18} /></span>Using this app</h2>
    <ol class="steps">
      <li>Enter the players and pick who deals first.</li>
      <li>Each round, type everyone's calls. The app shows the number the dealer can't call.</li>
      <li>After the cards are played, enter the hands each player made. Blank counts as 0.</li>
      <li>
        Scores update instantly. Use the scoresheet's pencil button to fix a mistake in any past
        round.
      </li>
    </ol>
    <p>
      Your game saves in this browser as you go, so a refresh or a closed tab never loses it.
      Finished games feed the <a href={resolve('/stats')}>stats page</a>.
    </p>
    <a class="cta" href={resolve('/')}><Play size={18} fill="currentColor" /> Start a game</a>
  </section>
</article>

<style>
  .rules {
    max-width: 760px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .intro {
    text-align: center;
    padding: 1rem 0 0.5rem;
  }

  .intro .suits {
    display: flex;
    justify-content: center;
    gap: 0.4rem;
    margin-bottom: 1rem;
  }

  .intro .suit {
    width: 34px;
    height: 34px;
    border-radius: 9px;
  }

  h1 {
    margin: 0;
    font-size: clamp(2.25rem, 6vw, 3.25rem);
    line-height: 1.15;
  }

  .lede {
    color: var(--muted);
    font-size: 1.1rem;
    line-height: 1.6;
    margin: 0.75rem auto 0;
    max-width: 560px;
  }

  .lede em {
    color: var(--text);
    font-style: normal;
    font-weight: 600;
  }

  h2 {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    margin: 0 0 0.85rem;
    font-size: 1.35rem;
  }

  .icon {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 10px;
    background: var(--accent-soft);
    color: var(--accent);
    flex: none;
  }

  p,
  li {
    line-height: 1.65;
    color: #c9d1dc;
  }

  p {
    margin: 0 0 0.75rem;
  }

  p:last-child {
    margin-bottom: 0;
  }

  ul,
  ol {
    margin: 0;
    padding-left: 1.25rem;
  }

  li + li {
    margin-top: 0.35rem;
  }

  strong {
    color: var(--text);
  }

  a {
    color: var(--accent-hover);
  }

  .suit {
    display: inline-grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border-radius: 7px;
    background: #fbfaf6;
    color: #1a1d24;
    flex: none;
  }

  .suit.hearts,
  .suit.diamonds {
    color: #d8323a;
  }

  .trump-order {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    list-style: none;
    padding: 0;
    margin: 0.25rem 0 1rem;
  }

  .trump-order li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    color: var(--text);
    font-weight: 500;
  }

  .sep {
    width: 18px;
    height: 2px;
    border-radius: 2px;
    background: var(--border);
    margin: 0 0.25rem;
  }

  .callout {
    display: flex;
    gap: 0.85rem;
    padding: 1rem;
    border-radius: var(--radius-sm);
    background: rgb(255 93 108 / 0.07);
    border: 1px solid rgb(255 93 108 / 0.2);
    margin-top: 1rem;
  }

  .callout-icon {
    color: var(--danger);
    flex: none;
    margin-top: 0.15rem;
  }

  .callout p {
    margin: 0.3rem 0 0;
  }

  .score-rules {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 0.6rem;
    margin-bottom: 1rem;
  }

  .score-rule {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    padding: 0.85rem 1rem;
    border-radius: var(--radius-sm);
    background: var(--surface-2);
    border: 1px solid var(--border-soft);
  }

  .score-rule .label {
    font-size: 0.82rem;
    color: var(--muted);
  }

  .score-rule .pts {
    font-family: var(--heading);
    font-size: 1.35rem;
    font-weight: 700;
  }

  .score-rule.good .pts {
    color: var(--success);
  }

  .score-rule.bad .pts {
    color: var(--danger);
  }

  .table-wrap {
    overflow-x: auto;
    margin-bottom: 0.75rem;
  }

  table {
    border-collapse: collapse;
    min-width: 260px;
    font-variant-numeric: tabular-nums;
  }

  th,
  td {
    padding: 0.5rem 1rem;
    text-align: center;
    border-bottom: 1px solid var(--border-soft);
  }

  thead th {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
    font-weight: 600;
  }

  .compact th {
    text-align: left;
    font-size: 0.8rem;
    text-transform: none;
    letter-spacing: 0;
    color: var(--muted);
  }

  .pts-cell {
    font-weight: 700;
    color: var(--success);
  }

  .pts-cell.neg {
    color: var(--danger);
  }

  .steps li::marker {
    color: var(--accent);
    font-weight: 700;
  }

  .cta {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1rem;
    padding: 0.75rem 1.25rem;
    border-radius: var(--radius-sm);
    background: linear-gradient(180deg, var(--accent-hover), var(--accent));
    color: white;
    font-weight: 600;
    text-decoration: none;
    box-shadow: 0 8px 20px -8px rgb(47 134 255 / 0.7);
  }
</style>
