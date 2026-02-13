// edit-deployment-confirmation-dialog.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
  EditConfirmationDialogComponent,
  EditConfirmationData,
} from './edit-deployment-confirmation-dialog.component';

describe('EditConfirmationDialogComponent', () => {
  let component: EditConfirmationDialogComponent;
  let fixture: ComponentFixture<EditConfirmationDialogComponent>;
  let dialogRefSpy: jasmine.SpyObj<
    MatDialogRef<EditConfirmationDialogComponent>
  >;

  const mockDialogData: EditConfirmationData = {
    fields: ['Server Size', 'Lifecycle'],
  };

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [EditConfirmationDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: mockDialogData },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EditConfirmationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the correct number of fields', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const chips = compiled.querySelectorAll('mat-chip');
    expect(chips.length).toBe(mockDialogData.fields.length);
  });

  it('should display the correct field names', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const chips = compiled.querySelectorAll('mat-chip');
    chips.forEach((chip, index) => {
      expect(chip.textContent).toContain(mockDialogData.fields[index]);
    });
  });

  describe('onConfirm()', () => {
    it('should close the dialog with true', () => {
      component.onConfirm();
      expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
    });

    it('should close when Terminate & Continue button is clicked', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const confirmButton = compiled.querySelector(
        'button[color="warn"]',
      ) as HTMLButtonElement;
      confirmButton.click();
      expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
    });
  });

  describe('onCancel()', () => {
    it('should close the dialog with false', () => {
      component.onCancel();
      expect(dialogRefSpy.close).toHaveBeenCalledWith(false);
    });

    it('should close when Cancel button is clicked', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const cancelButton = compiled.querySelector(
        'button:not([color="warn"])',
      ) as HTMLButtonElement;
      cancelButton.click();
      expect(dialogRefSpy.close).toHaveBeenCalledWith(false);
    });
  });

  // No separate TestBed setup needed — just change the data directly
  describe('with single field', () => {
    beforeEach(() => {
      component.data = { fields: ['Server Size'] };
      fixture.detectChanges();
    });

    it('should show singular "field" in the message', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const message = compiled.querySelector('.dialog-message')?.textContent;
      expect(message).not.toContain('fields');
    });
  });
});
