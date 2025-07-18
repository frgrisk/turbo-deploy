import { AbstractControl, ValidationErrors } from '@angular/forms';

export function numericValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const value = control.value;

  if (!value && value !== 0) {
    return null;
  }

  const stringValue = String(value);

  if (!/^\d+$/.test(stringValue)) {
    return { numeric: true };
  }

  const numValue = parseInt(stringValue, 10);
  if (numValue <= 0) {
    return { numeric: true };
  }

  return null;
}

export function onNumericKeyPress(event: KeyboardEvent): void {
  const key = event.key;

  const allowedKeys = [
    'Backspace',
    'Delete',
    'Tab',
    'Escape',
    'Enter',
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
  ];

  if (event.ctrlKey && ['a', 'c', 'v', 'x', 'z'].includes(key.toLowerCase())) {
    return;
  }

  if (allowedKeys.includes(key)) {
    return;
  }

  if (!/^[0-9]$/.test(key)) {
    event.preventDefault();
  }
}

export function onNumericPaste(event: ClipboardEvent): void {
  const clipboardData = event.clipboardData;
  const pastedText = clipboardData?.getData('text');

  if (pastedText && !/^\d+$/.test(pastedText)) {
    event.preventDefault();
  }
}
