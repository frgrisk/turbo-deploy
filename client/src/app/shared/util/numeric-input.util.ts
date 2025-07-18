import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Numeric validator that ensures the value is a positive integer
 */
export function numericValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const value = control.value;
  if (!value) return null;

  if (isNaN(value) || !Number.isInteger(Number(value)) || Number(value) <= 0) {
    return { numeric: true };
  }
  return null;
}

/**
 * Handles keypress events to allow only numeric input
 * @param event - The keyboard event
 */
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

  // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+Z
  if (event.ctrlKey && ['a', 'c', 'v', 'x', 'z'].includes(key.toLowerCase())) {
    return;
  }

  // Allow navigation keys
  if (allowedKeys.includes(key)) {
    return;
  }

  // Only allow numeric characters
  if (!/^[0-9]$/.test(key)) {
    event.preventDefault();
  }
}

/**
 * Handles paste events to allow only numeric content
 * @param event - The clipboard event
 */
export function onNumericPaste(event: ClipboardEvent): void {
  const clipboardData = event.clipboardData;
  const pastedText = clipboardData?.getData('text');

  if (pastedText && !/^\d+$/.test(pastedText)) {
    event.preventDefault();
  }
}
