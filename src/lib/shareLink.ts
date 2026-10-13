import { resolve } from '$app/paths';
import { choose, showMessage } from './dialog.svelte';
import type { Rounds } from './game';
import { encodeGame } from './share';

const NOTE = 'Anyone with this link can see the game, including player names and scores.';

/** Path of the page that shows this game to anyone, or null if it can't be shared. */
export function sharePath(rounds: Rounds, finishedAt?: string | null): string | null {
  const code = encodeGame(rounds, finishedAt);
  return code ? `${resolve('/g')}#${code}` : null;
}

/** The full link to send to someone, or null if the game can't be shared. */
export function shareUrl(rounds: Rounds, finishedAt?: string | null): string | null {
  const path = sharePath(rounds, finishedAt);
  return path ? `${location.origin}${path}` : null;
}

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API unavailable or blocked: fall back to the legacy command.
    const field = document.createElement('textarea');
    field.value = text;
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.append(field);
    field.select();
    try {
      return document.execCommand('copy');
    } catch {
      return false;
    } finally {
      field.remove();
    }
  }
}

/** Always ends with the link on screen, so sharing can't fail silently. */
async function showLink(url: string) {
  const copied = await copy(url);
  const answer = await choose(
    copied ? 'Link Copied' : 'Share Link',
    copied ? NOTE : `Copy the link below to share it. ${NOTE}`,
    [
      { label: 'Copy again', value: 'copy', variant: 'ghost' },
      { label: 'Done', value: 'done', variant: 'primary' },
    ],
    'info',
    0,
    url,
  );
  if (answer === 'copy') await showLink(url);
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
      return;
    } catch (e) {
      // Closing the share sheet is fine; any other failure falls through to the link dialog.
      if (e instanceof DOMException && e.name === 'AbortError') return;
    }
  }
  await showLink(url);
}
