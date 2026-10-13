import { resolve } from '$app/paths';
import { showMessage } from './dialog.svelte';
import type { Rounds } from './game';
import { encodeGame } from './share';

/** The link that opens this game's end screen for anyone, or null if it can't be shared. */
export function shareUrl(rounds: Rounds, finishedAt?: string | null): string | null {
  const code = encodeGame(rounds, finishedAt);
  return code ? `${location.origin}${resolve('/g')}#${code}` : null;
}

/** Opens the phone's share sheet, or copies the link on desktop. */
export async function shareGame(rounds: Rounds, finishedAt?: string | null) {
  const url = shareUrl(rounds, finishedAt);
  if (!url) {
    showMessage(
      'Cannot Share',
      'This game cannot be turned into a link. Use Download Log to send it instead.',
      'error',
    );
    return;
  }

  if (navigator.share && matchMedia('(pointer: coarse)').matches) {
    try {
      await navigator.share({ title: 'Judgement game', url });
    } catch {
      // Share sheet dismissed.
    }
    return;
  }

  try {
    await navigator.clipboard.writeText(url);
    showMessage(
      'Link Copied',
      'Anyone with the link can see this game, including player names and scores.',
      'info',
      4000,
    );
  } catch {
    // Clipboard blocked: show the link so it can be copied by hand.
    showMessage('Share Link', url);
  }
}
