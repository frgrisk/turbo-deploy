import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';

import { EditDeploymentComponent } from './edit-deployment.component';
import { ApiService } from '../shared/services/api.service';
import { DeploymentsService } from '../shared/services/deployments.service';

describe('EditDeploymentComponent', () => {
  let component: EditDeploymentComponent;
  let fixture: ComponentFixture<EditDeploymentComponent>;
  let mockApiService: jasmine.SpyObj<ApiService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockSnackBar: jasmine.SpyObj<MatSnackBar>;
  let mockDeploymentsService: jasmine.SpyObj<DeploymentsService>;

  beforeEach(async () => {
    const apiServiceSpy = jasmine.createSpyObj(
      'ApiService',
      ['getAWSData', 'editDeployment', 'getDeployment'],
      {
        formEditLoading: jasmine.createSpy().and.returnValue(false),
      },
    );
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    const deploymentsServiceSpy = jasmine.createSpyObj(
      'DeploymentsService',
      [],
      {
        currentEdit$: of('test-id'),
      },
    );

    await TestBed.configureTestingModule({
      imports: [EditDeploymentComponent, ReactiveFormsModule],
      providers: [
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: DeploymentsService, useValue: deploymentsServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EditDeploymentComponent);
    component = fixture.componentInstance;
    mockApiService = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    mockSnackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
    mockDeploymentsService = TestBed.inject(
      DeploymentsService,
    ) as jasmine.SpyObj<DeploymentsService>;

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

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    expect(component.editDeploymentForm).toBeDefined();
    expect(component.editDeploymentForm.get('hostname')?.value).toBe('');
    expect(component.editDeploymentForm.get('lifecycle')?.value).toBe('spot');
    expect(component.editDeploymentForm.get('ttlValue')?.value).toBe('');
  });

  it('should validate hostname pattern', () => {
    const hostnameControl = component.editDeploymentForm.get('hostname');

    hostnameControl?.setValue('valid-hostname_123');
    expect(hostnameControl?.valid).toBeTruthy();

    hostnameControl?.setValue('invalid@hostname');
    expect(hostnameControl?.valid).toBeFalsy();
    expect(hostnameControl?.hasError('pattern')).toBeTruthy();
  });

  it('should validate TTL value with custom numeric validator', () => {
    const ttlControl = component.editDeploymentForm.get('ttlValue');

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
    const ttlValueControl = component.editDeploymentForm.get('ttlValue');
    const ttlUnitControl = component.editDeploymentForm.get('ttlUnit');

    ttlValueControl?.setValue('5');
    expect(ttlUnitControl?.value).toBe('hours');
  });

  it('should auto-set TTL value when TTL unit is selected', () => {
    const ttlValueControl = component.editDeploymentForm.get('ttlValue');
    const ttlUnitControl = component.editDeploymentForm.get('ttlUnit');

    ttlUnitControl?.setValue('days');
    expect(ttlValueControl?.value).toBe(1);
  });

  it('should reset expiry form fields', () => {
    const ttlValueControl = component.editDeploymentForm.get('ttlValue');
    const ttlUnitControl = component.editDeploymentForm.get('ttlUnit');

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

  it('should load existing deployment data into form', () => {
    // This test verifies that the form is populated with existing deployment data
    // The mock data is set up in beforeEach
    expect(component.editDeploymentForm.get('hostname')?.value).toBe(
      'test-server',
    );
    expect(component.editDeploymentForm.get('region')?.value).toBe('us-east-2');
    expect(component.editDeploymentForm.get('ami')?.value).toBe('ami-123');
    expect(component.editDeploymentForm.get('serverSize')?.value).toBe(
      't3.medium',
    );
    expect(component.editDeploymentForm.get('lifecycle')?.value).toBe('spot');
  });

  it('should display current expiry date', () => {
    expect(component.currentExpiry).toBeDefined();
    expect(component.currentExpiry).not.toBe('');
  });

  it('should submit form with valid data', () => {
    mockApiService.editDeployment.and.returnValue(of({}));

    component.editDeploymentForm.patchValue({
      id: 'test-id',
      hostname: 'updated-server',
      region: 'us-east-2',
      ami: 'ami-123',
      serverSize: 't3.large',
      lifecycle: 'on-demand',
      ttlValue: '10',
      ttlUnit: 'hours',
    });

    component.submitForm();

    expect(mockApiService.editDeployment).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
    expect(mockSnackBar.open).toHaveBeenCalled();
  });

  it('should submit form without TTL when TTL fields are empty', () => {
    mockApiService.editDeployment.and.returnValue(of({}));

    component.editDeploymentForm.patchValue({
      id: 'test-id',
      hostname: 'updated-server',
      region: 'us-east-2',
      ami: 'ami-123',
      serverSize: 't3.large',
      lifecycle: 'on-demand',
      ttlValue: '',
      ttlUnit: '',
    });

    component.submitForm();

    const expectedPayload = jasmine.objectContaining({
      id: 'test-id',
      hostname: 'updated-server',
      region: 'us-east-2',
      ami: 'ami-123',
      serverSize: 't3.large',
      lifecycle: 'on-demand',
    });

    expect(mockApiService.editDeployment).toHaveBeenCalledWith(expectedPayload);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
  });
});
