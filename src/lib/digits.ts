/**
 * Input handler that only accepts whole numbers from 0 to `max`.
 * Invalid keystrokes are rejected by restoring the previous value.
 */
export function digitsOnly(store: Record<string, string>, key: string, max: number) {
  return (e: Event) => {
    const el = e.currentTarget as HTMLInputElement;
    const v = el.value;
    if (v === '' || (/^\d+$/.test(v) && Number(v) <= max)) store[key] = v;
    else el.value = store[key] ?? '';
  };
}
