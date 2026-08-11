import { inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { MessageService } from 'primeng/api';

const TOAST_LIFE_MS = 3_000;
const ERROR_TOAST_LIFE_MS = 5_000;

export interface Toasts {
  success(titleKey: string): void;
  warn(titleKey: string): void;
  error(titleKey: string, messageKey?: string): void;
}

export function injectToast(): Toasts {
  const messages = inject(MessageService);
  const transloco = inject(TranslocoService);

  return {
    success: (titleKey) =>
      messages.add({
        severity: 'success',
        summary: transloco.translate(titleKey),
        life: TOAST_LIFE_MS,
      }),
    warn: (titleKey) =>
      messages.add({
        severity: 'warn',
        summary: transloco.translate(titleKey),
        life: TOAST_LIFE_MS,
      }),
    error: (titleKey, messageKey) =>
      messages.add({
        severity: 'error',
        summary: transloco.translate(titleKey),
        detail: messageKey === undefined ? undefined : transloco.translate(messageKey),
        life: ERROR_TOAST_LIFE_MS,
      }),
  };
}
