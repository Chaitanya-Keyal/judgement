// Promise-based modal dialogs: info, error, yes/no, or custom buttons.

export type DialogType = 'info' | 'error' | 'yesno';

export interface DialogButton {
  label: string;
  value: string;
  variant?: 'primary' | 'ghost' | 'danger';
}

interface DialogState {
  title: string;
  message: string;
  /** Extra text shown in a selectable box, e.g. a link to copy. */
  detail?: string;
  tone: 'info' | 'error' | 'question';
  buttons: DialogButton[];
  resolve: (value: string | null) => void;
}

export const dialog = $state<{ current: DialogState | null }>({ current: null });

let timer: ReturnType<typeof setTimeout> | undefined;

/** Shows a dialog with custom buttons; resolves to the chosen value, or null if dismissed. */
export function choose(
  title: string,
  message: string,
  buttons: DialogButton[],
  tone: DialogState['tone'] = 'question',
  timeout = 0,
  detail?: string,
): Promise<string | null> {
  dialog.current?.resolve(null);
  return new Promise((resolve) => {
    dialog.current = { title, message, detail, tone, buttons, resolve };
    clearTimeout(timer);
    if (timeout) timer = setTimeout(() => closeDialog(null), timeout);
  });
}

export async function showMessage(
  title: string,
  message: string,
  type: DialogType = 'info',
  timeout = 0,
): Promise<boolean> {
  if (type === 'yesno') {
    const answer = await choose(title, message, [
      { label: 'No', value: 'no', variant: 'ghost' },
      { label: 'Yes', value: 'yes', variant: 'primary' },
    ]);
    return answer === 'yes';
  }
  await choose(title, message, [{ label: 'OK', value: 'ok', variant: 'primary' }], type, timeout);
  return true;
}

export function closeDialog(value: string | null) {
  clearTimeout(timer);
  const d = dialog.current;
  dialog.current = null;
  d?.resolve(value);
}
