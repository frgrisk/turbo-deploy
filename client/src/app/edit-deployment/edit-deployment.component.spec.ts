import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { EditDeploymentComponent } from './edit-deployment.component';
import { ApiService } from '../shared/services/api.service';
import { DeploymentsService } from '../shared/services/deployments.service';

describe('EditDeploymentComponent', () => {
  let component: EditDeploymentComponent;
  let fixture: ComponentFixture<EditDeploymentComponent>;
  let mockApiService: jasmine.SpyObj<ApiService>;

  beforeEach(async () => {
    const apiServiceSpy = jasmine.createSpyObj(
      'ApiService',
      ['getAWSData', 'editDeployment', 'getDeployment'],
      { formEditLoading: jasmine.createSpy().and.returnValue(false) },
    );

    await TestBed.configureTestingModule({
      imports: [
        EditDeploymentComponent,
        ReactiveFormsModule,
        NoopAnimationsModule,
      ],
      providers: [
        { provide: ApiService, useValue: apiServiceSpy },
        {
          provide: Router,
          useValue: jasmine.createSpyObj('Router', ['navigate']),
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { params: {} },
            params: of({}),
            queryParams: of({}),
          },
        },
        {
          provide: MatSnackBar,
          useValue: jasmine.createSpyObj('MatSnackBar', ['open']),
        },
        {
          provide: DeploymentsService,
          useValue: { currentEdit$: of('test-id') },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EditDeploymentComponent);
    component = fixture.componentInstance;
    mockApiService = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;

    // Mock AWS data
    mockApiService.getAWSData.and.returnValue(
      of({
        serverSizes: ['t3.medium', 't3.large'],
        amis: [{ amiIds: 'ami-123', amiNames: 'Test AMI' }],
        regions: 'us-east-2',
        userData: ['script1', 'script2'],
      }),
    );

    // Mock deployment data
    mockApiService.getDeployment.and.returnValue(
      of({
        ID: 'test-id',
        Hostname: 'test-server',
        Region: 'us-east-2',
        Ami: 'ami-123',
        ServerSize: 't3.medium',
        UserData: ['script1'],
        Lifecycle: 'spot',
        TimeToExpire: '2024-12-31T23:59:59Z',
      }),
    );
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    fixture.detectChanges();
    expect(component.editDeploymentForm).toBeDefined();
    expect(component.editDeploymentForm.get('lifecycle')?.value).toBe('spot');
  });

  it('should validate hostname pattern', () => {
    fixture.detectChanges();
    const hostnameControl = component.editDeploymentForm.get('hostname');

    hostnameControl?.setValue('valid-hostname_123');
    expect(hostnameControl?.valid).toBeTruthy();

    hostnameControl?.setValue('invalid@hostname');
    expect(hostnameControl?.valid).toBeFalsy();
  });

  it('should load existing deployment data', () => {
    fixture.detectChanges();
    expect(mockApiService.getDeployment).toHaveBeenCalled();
    expect(mockApiService.getAWSData).toHaveBeenCalled();
  });
});
