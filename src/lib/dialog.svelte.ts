// Promise-based replacement for the desktop app's tkinter message boxes.

export type DialogType = 'info' | 'error' | 'yesno';

interface DialogState {
  title: string;
  message: string;
  type: DialogType;
  resolve: (answer: boolean) => void;
}

export const dialog = $state<{ current: DialogState | null }>({ current: null });

let timer: ReturnType<typeof setTimeout> | undefined;

export function showMessage(
  title: string,
  message: string,
  type: DialogType = 'info',
  timeout = 0,
): Promise<boolean> {
  return new Promise((resolve) => {
    dialog.current = { title, message, type, resolve };
    clearTimeout(timer);
    if (timeout) timer = setTimeout(() => closeDialog(false), timeout);
  });
}

export function closeDialog(answer: boolean) {
  clearTimeout(timer);
  const d = dialog.current;
  dialog.current = null;
  d?.resolve(answer);
}
