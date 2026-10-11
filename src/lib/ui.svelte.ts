// UI state that should survive moving between routes (e.g. peeking at the rules mid-game).

export type Screen = 'home' | 'players' | 'dealer' | 'game';

export const ui = $state({
  screen: 'home' as Screen,
  names: Array<string>(10).fill(''),
  players: [] as string[],
  firstDealer: '',
});
