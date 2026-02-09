// snapshot-limit-dialog.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SnapshotLimitDialogComponent, SnapshotLimitData } from './snapshot-deletion-dialog.component';
import { ApiService } from '../../services/api.service';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('SnapshotLimitDialogComponent', () => {
  let component: SnapshotLimitDialogComponent;
  let fixture: ComponentFixture<SnapshotLimitDialogComponent>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<SnapshotLimitDialogComponent>>;
  let mockApiService: jasmine.SpyObj<ApiService>;
  let mockSnackBar: jasmine.SpyObj<MatSnackBar>;
  let mockDialogData: SnapshotLimitData;

  beforeEach(async () => {
    // Create mock objects
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    mockApiService = jasmine.createSpyObj('ApiService', ['checkAmiLimit', 'deleteInstanceAmi']); // Add methods you need
    mockSnackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    
    mockDialogData = {
      ami_id: 'ami-12345678',
      ami_name: 'Test AMI',
      ami_date: '2024-02-09'
    };

    await TestBed.configureTestingModule({
      imports: [
        SnapshotLimitDialogComponent,
        NoopAnimationsModule
      ],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockDialogData },
        { provide: ApiService, useValue: mockApiService },
        { provide: MatSnackBar, useValue: mockSnackBar }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SnapshotLimitDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component initialization', () => {
    it('should inject dialog data correctly', () => {
      expect(component.data).toEqual(mockDialogData);
      expect(component.data.ami_id).toBe('ami-12345678');
      expect(component.data.ami_name).toBe('Test AMI');
      expect(component.data.ami_date).toBe('2024-02-09');
    });

    it('should inject all dependencies', () => {
      expect(component.dialogRef).toBeDefined();
      expect(component.apiService).toBeDefined();
      expect(component['_snackBar']).toBeDefined();
    });
  });

  describe('onConfirm()', () => {
    it('should close dialog with true when confirmed', () => {
      component.onConfirm();
      expect(mockDialogRef.close).toHaveBeenCalledWith(true);
      expect(mockDialogRef.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('onCancel()', () => {
    it('should close dialog with false when cancelled', () => {
      component.onCancel();
      expect(mockDialogRef.close).toHaveBeenCalledWith(false);
      expect(mockDialogRef.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('Dialog data variations', () => {
    it('should handle numeric ami_id', () => {
      const numericData: SnapshotLimitData = {
        ami_id: 12345,
        ami_name: 'Numeric AMI',
        ami_date: '2024-01-01'
      };

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [SnapshotLimitDialogComponent, NoopAnimationsModule],
        providers: [
          { provide: MatDialogRef, useValue: mockDialogRef },
          { provide: MAT_DIALOG_DATA, useValue: numericData },
          { provide: ApiService, useValue: mockApiService },
          { provide: MatSnackBar, useValue: mockSnackBar }
        ]
      });

      const newFixture = TestBed.createComponent(SnapshotLimitDialogComponent);
      const newComponent = newFixture.componentInstance;
      
      expect(newComponent.data.ami_id).toBe(12345);
      expect(typeof newComponent.data.ami_id).toBe('number');
    });

    it('should handle string ami_id', () => {
      expect(typeof component.data.ami_id).toBe('string');
      expect(component.data.ami_id).toBe('ami-12345678');
    });
  });

  describe('Template integration', () => {
    it('should render the component', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled).toBeTruthy();
    });

    it('should have dialog reference accessible', () => {
      expect(component.dialogRef).toBe(mockDialogRef);
    });
  });

  describe('Service dependencies', () => {
    it('should have access to ApiService', () => {
      expect(component.apiService).toBe(mockApiService);
    });

    it('should have access to MatSnackBar', () => {
      expect(component['_snackBar']).toBe(mockSnackBar);
    });
  });
});