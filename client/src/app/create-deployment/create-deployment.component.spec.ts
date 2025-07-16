import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { CreateDeploymentComponent } from './create-deployment.component';
import { ApiService } from '../shared/services/api.service';

describe('CreateDeploymentComponent', () => {
  let component: CreateDeploymentComponent;
  let fixture: ComponentFixture<CreateDeploymentComponent>;
  let mockApiService: jasmine.SpyObj<ApiService>;

  beforeEach(async () => {
    const apiServiceSpy = jasmine.createSpyObj(
      'ApiService',
      ['getAWSData', 'createDeployment'],
      { formAWSDataLoading: jasmine.createSpy().and.returnValue(false) },
    );

    await TestBed.configureTestingModule({
      imports: [
        CreateDeploymentComponent,
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
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateDeploymentComponent);
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
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    fixture.detectChanges();
    expect(component.deploymentForm).toBeDefined();
    expect(component.deploymentForm.get('lifecycle')?.value).toBe('spot');
  });

  it('should validate hostname pattern', () => {
    fixture.detectChanges();
    const hostnameControl = component.deploymentForm.get('hostname');

    hostnameControl?.setValue('valid-hostname_123');
    expect(hostnameControl?.valid).toBeTruthy();

    hostnameControl?.setValue('invalid@hostname');
    expect(hostnameControl?.valid).toBeFalsy();
  });

  it('should load AWS data on init', () => {
    fixture.detectChanges();
    expect(mockApiService.getAWSData).toHaveBeenCalled();
  });
});
