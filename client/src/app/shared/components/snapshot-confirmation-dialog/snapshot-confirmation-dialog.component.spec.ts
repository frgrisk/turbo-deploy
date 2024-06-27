import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SnapshotConfirmationDialogComponent } from './snapshot-confirmation-dialog.component';

describe('SnapshotConfirmationDialogComponent', () => {
  let component: SnapshotConfirmationDialogComponent;
  let fixture: ComponentFixture<SnapshotConfirmationDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SnapshotConfirmationDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SnapshotConfirmationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
