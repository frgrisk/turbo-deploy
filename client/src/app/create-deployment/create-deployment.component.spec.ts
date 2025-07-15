import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';

import { CreateDeploymentComponent } from './create-deployment.component';
import { ApiService } from '../shared/services/api.service';

describe('CreateDeploymentComponent', () => {
  let component: CreateDeploymentComponent;
  let fixture: ComponentFixture<CreateDeploymentComponent>;
  let mockApiService: jasmine.SpyObj<ApiService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockSnackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    const apiServiceSpy = jasmine.createSpyObj(
      'ApiService',
      ['getAWSData', 'createDeployment'],
      {
        formAWSDataLoading: jasmine.createSpy().and.returnValue(false),
      },
    );
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [CreateDeploymentComponent, ReactiveFormsModule],
      providers: [
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateDeploymentComponent);
    component = fixture.componentInstance;
    mockApiService = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    mockSnackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;

    // Mock AWS data
    mockApiService.getAWSData.and.returnValue(
      of({
        serverSizes: ['t3.medium', 't3.large'],
        amis: [{ amiIds: 'ami-123', amiNames: 'Test AMI' }],
        regions: 'us-east-2',
        userData: ['script1', 'script2'],
      }),
    );

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    expect(component.deploymentForm).toBeDefined();
    expect(component.deploymentForm.get('hostname')?.value).toBe('');
    expect(component.deploymentForm.get('lifecycle')?.value).toBe('spot');
    expect(component.deploymentForm.get('ttlValue')?.value).toBe('');
  });

  it('should validate hostname pattern', () => {
    const hostnameControl = component.deploymentForm.get('hostname');

    hostnameControl?.setValue('valid-hostname_123');
    expect(hostnameControl?.valid).toBeTruthy();

    hostnameControl?.setValue('invalid@hostname');
    expect(hostnameControl?.valid).toBeFalsy();
    expect(hostnameControl?.hasError('pattern')).toBeTruthy();
  });

  it('should validate TTL value with custom numeric validator', () => {
    const ttlControl = component.deploymentForm.get('ttlValue');

    // Valid positive integer
    ttlControl?.setValue('5');
    expect(ttlControl?.valid).toBeTruthy();

    // Invalid: zero
    ttlControl?.setValue('0');
    expect(ttlControl?.valid).toBeFalsy();
    expect(ttlControl?.hasError('min')).toBeTruthy();

    // Invalid: negative number
    ttlControl?.setValue('-1');
    expect(ttlControl?.valid).toBeFalsy();
    expect(ttlControl?.hasError('numeric')).toBeTruthy();

    // Invalid: decimal
    ttlControl?.setValue('1.5');
    expect(ttlControl?.valid).toBeFalsy();
    expect(ttlControl?.hasError('numeric')).toBeTruthy();

    // Valid: empty (optional field)
    ttlControl?.setValue('');
    expect(ttlControl?.valid).toBeTruthy();
  });

  it('should auto-set TTL unit when TTL value is entered', () => {
    const ttlValueControl = component.deploymentForm.get('ttlValue');
    const ttlUnitControl = component.deploymentForm.get('ttlUnit');

    ttlValueControl?.setValue('5');
    expect(ttlUnitControl?.value).toBe('hours');
  });

  it('should auto-set TTL value when TTL unit is selected', () => {
    const ttlValueControl = component.deploymentForm.get('ttlValue');
    const ttlUnitControl = component.deploymentForm.get('ttlUnit');

    ttlUnitControl?.setValue('days');
    expect(ttlValueControl?.value).toBe(1);
  });

  it('should reset expiry form fields', () => {
    const ttlValueControl = component.deploymentForm.get('ttlValue');
    const ttlUnitControl = component.deploymentForm.get('ttlUnit');

    ttlValueControl?.setValue('5');
    ttlUnitControl?.setValue('hours');

    component.resetExpiryForm();

    expect(ttlValueControl?.value).toBe('');
    expect(ttlUnitControl?.value).toBe('');
  });

  it('should prevent non-numeric key presses', () => {
    const event = new KeyboardEvent('keypress', { key: 'a' });
    spyOn(event, 'preventDefault');

    component.onKeyPress(event);

    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('should allow numeric key presses', () => {
    const event = new KeyboardEvent('keypress', { key: '5' });
    spyOn(event, 'preventDefault');

    component.onKeyPress(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('should allow special keys (Backspace, Enter, etc.)', () => {
    const backspaceEvent = new KeyboardEvent('keypress', { key: 'Backspace' });
    const enterEvent = new KeyboardEvent('keypress', { key: 'Enter' });

    spyOn(backspaceEvent, 'preventDefault');
    spyOn(enterEvent, 'preventDefault');

    component.onKeyPress(backspaceEvent);
    component.onKeyPress(enterEvent);

    expect(backspaceEvent.preventDefault).not.toHaveBeenCalled();
    expect(enterEvent.preventDefault).not.toHaveBeenCalled();
  });

  it('should allow Ctrl+V, Ctrl+C, etc.', () => {
    const ctrlVEvent = new KeyboardEvent('keypress', {
      key: 'v',
      ctrlKey: true,
    });
    spyOn(ctrlVEvent, 'preventDefault');

    component.onKeyPress(ctrlVEvent);

    expect(ctrlVEvent.preventDefault).not.toHaveBeenCalled();
  });

  it('should prevent pasting non-numeric content', () => {
    const clipboardData = {
      getData: jasmine.createSpy().and.returnValue('abc123'),
    };
    const event = new ClipboardEvent('paste', {
      clipboardData: clipboardData as any,
    });
    spyOn(event, 'preventDefault');

    component.onPaste(event);

    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('should allow pasting numeric content', () => {
    const clipboardData = {
      getData: jasmine.createSpy().and.returnValue('123'),
    };
    const event = new ClipboardEvent('paste', {
      clipboardData: clipboardData as any,
    });
    spyOn(event, 'preventDefault');

    component.onPaste(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('should submit form with valid data', () => {
    mockApiService.createDeployment.and.returnValue(of({}));

    component.deploymentForm.patchValue({
      hostname: 'test-server',
      region: 'us-east-2',
      ami: 'ami-123',
      serverSize: 't3.medium',
      lifecycle: 'spot',
      ttlValue: '5',
      ttlUnit: 'hours',
    });

    component.submitForm();

    expect(mockApiService.createDeployment).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
    expect(mockSnackBar.open).toHaveBeenCalled();
  });
});
