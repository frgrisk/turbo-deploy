import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { SnapshotConfirmationDialogComponent } from './snapshot-confirmation-dialog.component';
import { ApiService } from '../../services/api.service';

describe('SnapshotConfirmationDialogComponent', () => {
  let component: SnapshotConfirmationDialogComponent;
  let fixture: ComponentFixture<SnapshotConfirmationDialogComponent>;

  beforeEach(async () => {
    const mockInstanceElement = {
      deploymentId: 'test-deployment',
      ec2InstanceId: 'i-123456789',
      hostname: 'test-server',
      availabilityZone: 'us-east-2a',
      ami: 'ami-123456',
      serverSize: 't3.medium',
      lifecycle: 'spot',
      timeToExpire: '2024-12-31T23:59:59Z',
      userData: ['script1'],
    };

    await TestBed.configureTestingModule({
      imports: [SnapshotConfirmationDialogComponent, NoopAnimationsModule],
      providers: [
        {
          provide: MatDialogRef,
          useValue: jasmine.createSpyObj('MatDialogRef', ['close']),
        },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { instanceElement: mockInstanceElement },
        },
        {
          provide: ApiService,
          useValue: jasmine.createSpyObj('ApiService', [
            'captureInstanceSnapshopt',
          ]),
        },
        {
          provide: MatSnackBar,
          useValue: jasmine.createSpyObj('MatSnackBar', ['open']),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SnapshotConfirmationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have instance data', () => {
    expect(component.data.instanceElement).toBeDefined();
    expect(component.data.instanceElement.hostname).toBe('test-server');
  });
});
