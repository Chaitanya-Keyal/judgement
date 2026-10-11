/**
 * Keeps the screen on (where supported) until the returned cleanup runs.
 * The browser drops the lock whenever the tab is hidden, so it is re-requested on return.
 */
export function keepAwake(): () => void {
  let lock: WakeLockSentinel | null = null;
  let active = true;

  const request = async () => {
    if (!active || document.visibilityState !== 'visible' || !('wakeLock' in navigator)) return;
    try {
      lock = await navigator.wakeLock.request('screen');
    } catch {
      // Denied (battery saver, unsupported context): the game works fine without it.
    }
  };
  const onVisible = () => void request();

  request();
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    active = false;
    document.removeEventListener('visibilitychange', onVisible);
    lock?.release().catch(() => {});
  };
}
