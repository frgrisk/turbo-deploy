import { FormControl } from '@angular/forms';
import {
  numericValidator,
  onNumericKeyPress,
  onNumericPaste,
} from './numeric-input.util';

describe('Numeric Input Utilities', () => {
  describe('numericValidator', () => {
    it('should return null for empty values', () => {
      const control = new FormControl('');
      expect(numericValidator(control)).toBeNull();

      const controlNull = new FormControl(null);
      expect(numericValidator(controlNull)).toBeNull();

      const controlUndefined = new FormControl(undefined);
      expect(numericValidator(controlUndefined)).toBeNull();
    });

    it('should return null for valid positive integers', () => {
      const control1 = new FormControl('1');
      expect(numericValidator(control1)).toBeNull();

      const control24 = new FormControl('24');
      expect(numericValidator(control24)).toBeNull();

      const control100 = new FormControl('100');
      expect(numericValidator(control100)).toBeNull();

      const controlNum = new FormControl(42);
      expect(numericValidator(controlNum)).toBeNull();
    });

    it('should return error for zero and negative values', () => {
      const control0 = new FormControl('0');
      expect(numericValidator(control0)).toEqual({ numeric: true });

      const controlNeg = new FormControl('-1');
      expect(numericValidator(controlNeg)).toEqual({ numeric: true });

      const controlNeg10 = new FormControl('-10');
      expect(numericValidator(controlNeg10)).toEqual({ numeric: true });

      const controlZeroNum = new FormControl(0);
      expect(numericValidator(controlZeroNum)).toEqual({ numeric: true });

      const controlNegNum = new FormControl(-5);
      expect(numericValidator(controlNegNum)).toEqual({ numeric: true });
    });

    it('should return error for non-numeric values', () => {
      const controlAbc = new FormControl('abc');
      expect(numericValidator(controlAbc)).toEqual({ numeric: true });

      const controlDecimal = new FormControl('12.5');
      expect(numericValidator(controlDecimal)).toEqual({ numeric: true });

      const controlFloat = new FormControl('1.0');
      expect(numericValidator(controlFloat)).toEqual({ numeric: true });

      const controlFloatNum = new FormControl(12.5);
      expect(numericValidator(controlFloatNum)).toEqual({ numeric: true });

      const controlSpecial = new FormControl('12a');
      expect(numericValidator(controlSpecial)).toEqual({ numeric: true });
    });
  });

  describe('onNumericKeyPress', () => {
    let preventDefaultSpy: jasmine.Spy;

    beforeEach(() => {
      preventDefaultSpy = jasmine.createSpy('preventDefault');
    });

    const createKeyboardEvent = (
      key: string,
      ctrlKey: boolean = false,
    ): KeyboardEvent => {
      return {
        key,
        ctrlKey,
        preventDefault: preventDefaultSpy,
      } as unknown as KeyboardEvent;
    };

    it('should allow numeric keys', () => {
      const numericKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

      numericKeys.forEach((key) => {
        const mockEvent = createKeyboardEvent(key);
        onNumericKeyPress(mockEvent);
        expect(preventDefaultSpy).not.toHaveBeenCalled();
        preventDefaultSpy.calls.reset();
      });
    });

    it('should allow navigation keys', () => {
      const navigationKeys = [
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

      navigationKeys.forEach((key) => {
        const mockEvent = createKeyboardEvent(key);
        onNumericKeyPress(mockEvent);
        expect(preventDefaultSpy).not.toHaveBeenCalled();
        preventDefaultSpy.calls.reset();
      });
    });

    it('should allow Ctrl+shortcuts', () => {
      const shortcuts = ['a', 'c', 'v', 'x', 'z', 'A', 'C', 'V', 'X', 'Z'];

      shortcuts.forEach((key) => {
        const mockEvent = createKeyboardEvent(key, true);
        onNumericKeyPress(mockEvent);
        expect(preventDefaultSpy).not.toHaveBeenCalled();
        preventDefaultSpy.calls.reset();
      });
    });

    it('should prevent non-numeric characters', () => {
      const invalidKeys = ['a', 'b', 'c', '@', '#', '.', '-', '+', 'e', 'E'];

      invalidKeys.forEach((key) => {
        const mockEvent = createKeyboardEvent(key);
        onNumericKeyPress(mockEvent);
        expect(preventDefaultSpy).toHaveBeenCalled();
        preventDefaultSpy.calls.reset();
      });
    });
  });

  describe('onNumericPaste', () => {
    let preventDefaultSpy: jasmine.Spy;

    beforeEach(() => {
      preventDefaultSpy = jasmine.createSpy('preventDefault');
    });

    const createClipboardEvent = (
      pastedText: string | null,
      hasClipboardData: boolean = true,
    ): ClipboardEvent => {
      if (!hasClipboardData) {
        return {
          clipboardData: null,
          preventDefault: preventDefaultSpy,
        } as unknown as ClipboardEvent;
      }

      const mockClipboardData = {
        getData: jasmine.createSpy('getData').and.returnValue(pastedText),
      } as any as DataTransfer;

      return {
        clipboardData: mockClipboardData,
        preventDefault: preventDefaultSpy,
      } as unknown as ClipboardEvent;
    };

    it('should allow numeric paste', () => {
      const validPastes = ['12345', '0', '999', '1'];

      validPastes.forEach((text) => {
        const mockEvent = createClipboardEvent(text);
        onNumericPaste(mockEvent);
        expect(preventDefaultSpy).not.toHaveBeenCalled();
        preventDefaultSpy.calls.reset();
      });
    });

    it('should prevent non-numeric paste', () => {
      const invalidPastes = [
        'abc123',
        '12a34',
        'hello',
        '123.45',
        '12-34',
        '+123',
      ];

      invalidPastes.forEach((text) => {
        const mockEvent = createClipboardEvent(text);
        onNumericPaste(mockEvent);
        expect(preventDefaultSpy).toHaveBeenCalled();
        preventDefaultSpy.calls.reset();
      });
    });

    it('should handle empty clipboard data', () => {
      const mockEvent = createClipboardEvent('');
      onNumericPaste(mockEvent);
      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    it('should handle null clipboard data', () => {
      const mockEvent = createClipboardEvent(null, false);
      onNumericPaste(mockEvent);
      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });
  });
});
