import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { CreateDeploymentComponent } from './create-deployment.component';
import { ApiService } from '../shared/services/api.service';
import { TimeUnit } from '../shared/enum/dropdown.enum';

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

  describe('TTL validation', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should accept valid positive integers for ttlValue', () => {
      const ttlValueControl = component.deploymentForm.get('ttlValue');

      ttlValueControl?.setValue('1');
      expect(ttlValueControl?.valid).toBeTruthy();

      ttlValueControl?.setValue('24');
      expect(ttlValueControl?.valid).toBeTruthy();

      ttlValueControl?.setValue('100');
      expect(ttlValueControl?.valid).toBeTruthy();
    });

    it('should reject zero and negative values for ttlValue', () => {
      const ttlValueControl = component.deploymentForm.get('ttlValue');

      ttlValueControl?.setValue('0');
      expect(ttlValueControl?.valid).toBeFalsy();
      expect(ttlValueControl?.hasError('min')).toBeTruthy();

      ttlValueControl?.setValue('-1');
      expect(ttlValueControl?.valid).toBeFalsy();
      expect(ttlValueControl?.hasError('min')).toBeTruthy();

      ttlValueControl?.setValue('-10');
      expect(ttlValueControl?.valid).toBeFalsy();
      expect(ttlValueControl?.hasError('min')).toBeTruthy();
    });

    it('should reject non-numeric values for ttlValue', () => {
      const ttlValueControl = component.deploymentForm.get('ttlValue');

      ttlValueControl?.setValue('abc');
      expect(ttlValueControl?.valid).toBeFalsy();
      expect(ttlValueControl?.hasError('numeric')).toBeTruthy();

      ttlValueControl?.setValue('12.5');
      expect(ttlValueControl?.valid).toBeFalsy();
      expect(ttlValueControl?.hasError('numeric')).toBeTruthy();

      ttlValueControl?.setValue('1.0');
      expect(ttlValueControl?.valid).toBeFalsy();
      expect(ttlValueControl?.hasError('numeric')).toBeTruthy();
    });

    it('should accept empty ttlValue', () => {
      const ttlValueControl = component.deploymentForm.get('ttlValue');

      ttlValueControl?.setValue('');
      expect(ttlValueControl?.valid).toBeTruthy();

      ttlValueControl?.setValue(null);
      expect(ttlValueControl?.valid).toBeTruthy();
    });

    it('should auto-set ttlUnit when ttlValue is entered and ttlUnit is empty', () => {
      const ttlValueControl = component.deploymentForm.get('ttlValue');
      const ttlUnitControl = component.deploymentForm.get('ttlUnit');

      ttlUnitControl?.setValue('');

      ttlValueControl?.setValue('24');

      expect(ttlUnitControl?.value).toBeTruthy();
      expect(ttlUnitControl?.value).toBe(TimeUnit.HOURS);
    });

    it('should auto-set ttlValue to 1 when ttlUnit is selected and ttlValue is empty', () => {
      const ttlValueControl = component.deploymentForm.get('ttlValue');
      const ttlUnitControl = component.deploymentForm.get('ttlUnit');

      ttlValueControl?.setValue('');

      ttlUnitControl?.setValue(TimeUnit.DAYS);

      expect(ttlValueControl?.value).toBe(1);
    });

    it('should not override existing ttlUnit when ttlValue is changed', () => {
      const ttlValueControl = component.deploymentForm.get('ttlValue');
      const ttlUnitControl = component.deploymentForm.get('ttlUnit');

      ttlUnitControl?.setValue(TimeUnit.DAYS);

      ttlValueControl?.setValue('7');

      expect(ttlUnitControl?.value).toBe(TimeUnit.DAYS);
    });

    it('should not override existing ttlValue when ttlUnit is changed', () => {
      const ttlValueControl = component.deploymentForm.get('ttlValue');
      const ttlUnitControl = component.deploymentForm.get('ttlUnit');

      ttlValueControl?.setValue('48');

      ttlUnitControl?.setValue(TimeUnit.HOURS);

      expect(ttlValueControl?.value).toBe('48');
    });
  });

  describe('resetExpiryForm', () => {
    it('should reset ttlValue and ttlUnit to empty values', () => {
      fixture.detectChanges();

      const ttlValueControl = component.deploymentForm.get('ttlValue');
      const ttlUnitControl = component.deploymentForm.get('ttlUnit');

      ttlValueControl?.setValue('24');
      ttlUnitControl?.setValue(TimeUnit.HOURS);

      component.resetExpiryForm();

      expect(ttlValueControl?.value).toBe('');
      expect(ttlUnitControl?.value).toBe('');
    });
  });
});
