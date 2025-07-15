import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { of, Subject } from 'rxjs';

import { DeploymentDashboardComponent } from './deployment-dashboard.component';
import { ApiService } from '../shared/services/api.service';
import { DeploymentsService } from '../shared/services/deployments.service';
import { DeploymentApiResponse } from '../shared/model/deployment-response';
import { EC2Status } from '../shared/enum/ec2-status.enum';
import { SnapshotConfirmationDialogComponent } from '../shared/components/snapshot-confirmation-dialog/snapshot-confirmation-dialog.component';

describe('DeploymentDashboardComponent', () => {
  let component: DeploymentDashboardComponent;
  let fixture: ComponentFixture<DeploymentDashboardComponent>;
  let mockApiService: jasmine.SpyObj<ApiService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockSnackBar: jasmine.SpyObj<MatSnackBar>;
  let mockDeploymentsService: jasmine.SpyObj<DeploymentsService>;
  let mockDialog: jasmine.SpyObj<MatDialog>;

  const mockDeploymentData: DeploymentApiResponse[] = [
    {
      deploymentId: 'deploy-1',
      instanceId: 'i-123456789',
      hostname: 'test-server-1',
      availabilityZone: 'us-east-2a',
      ami: 'ami-123456',
      serverSize: 't3.medium',
      lifecycle: 'spot',
      timeToExpire: '2024-12-31T23:59:59Z',
      snapshotId: 'snap-123',
      userData: ['user', 'data'],
      status: EC2Status.RUNNING,
      loading: false,
    },
    {
      deploymentId: 'deploy-2',
      instanceId: 'i-987654321',
      hostname: 'test-server-2',
      availabilityZone: 'us-east-2b',
      ami: 'ami-789012',
      serverSize: 't3.large',
      lifecycle: 'on-demand',
      timeToExpire: '2024-11-30T12:00:00Z',
      snapshotId: 'snap-456',
      userData: ['user', 'data'],
      status: EC2Status.STOPPED,
      loading: false,
    },
  ];

  beforeEach(async () => {
    const apiServiceSpy = jasmine.createSpyObj(
      'ApiService',
      ['getDeployments', 'deleteDeployment', 'startInstance', 'stopInstance'],
      {
        tableLoading: jasmine.createSpy().and.returnValue(false),
      },
    );

    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    const deploymentsServiceSpy = jasmine.createSpyObj('DeploymentsService', [
      'setCurrentEditingDeployment',
    ]);
    const dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      imports: [DeploymentDashboardComponent],
      providers: [
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: DeploymentsService, useValue: deploymentsServiceSpy },
        { provide: MatDialog, useValue: dialogSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DeploymentDashboardComponent);
    component = fixture.componentInstance;
    mockApiService = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    mockSnackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
    mockDeploymentsService = TestBed.inject(
      DeploymentsService,
    ) as jasmine.SpyObj<DeploymentsService>;
    mockDialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;

    // Default mock setup
    mockApiService.getDeployments.and.returnValue(of(mockDeploymentData));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with correct column configuration', () => {
    expect(component.displayedColumns).toEqual([
      'hostname',
      'availabilityZone',
      'ami',
      'serverSize',
      'lifecycle',
      'timeToExpire',
      'snapshotId',
      'status',
      'action',
    ]);

    expect(component.columnsToDisplay).toEqual([
      { key: 'hostname', header: 'Hostname' },
      { key: 'ami', header: 'AMI' },
      { key: 'serverSize', header: 'Server Size' },
      { key: 'availabilityZone', header: 'Availability Zone' },
      { key: 'lifecycle', header: 'Life Cycle' },
      { key: 'snapshotId', header: 'Snapshot' },
      { key: 'status', header: 'Status' },
      { key: 'timeToExpire', header: 'Expiry' },
      { key: 'action', header: 'Action' },
    ]);
  });

  it('should load deployments on init', () => {
    fixture.detectChanges();

    expect(mockApiService.getDeployments).toHaveBeenCalled();
    expect(component.dataSource).toEqual(mockDeploymentData);
  });

  it('should filter out terminated instances', () => {
    const dataWithTerminated = [
      ...mockDeploymentData,
      {
        deploymentId: 'deploy-3',
        instanceId: 'i-terminated',
        hostname: 'terminated-server',
        availabilityZone: 'us-east-2a',
        ami: 'ami-123456',
        serverSize: 't3.medium',
        lifecycle: 'spot',
        timeToExpire: '2024-12-31T23:59:59Z',
        snapshotId: '',
        status: EC2Status.TERMINATED,
        loading: false,
      },
    ];

    mockApiService.getDeployments.and.returnValue(of(dataWithTerminated));
    fixture.detectChanges();

    expect(component.dataSource.length).toBe(2);
    expect(
      component.dataSource.every(
        (item) => item.status !== EC2Status.TERMINATED,
      ),
    ).toBeTruthy();
  });

  it('should refresh data when refresh() is called', () => {
    fixture.detectChanges();
    mockApiService.getDeployments.calls.reset();

    component.refresh();

    expect(component.dataSource).toEqual([]);
    expect(mockApiService.getDeployments).toHaveBeenCalled();
  });

  describe('Status styling and icons', () => {
    it('should return correct background color for different statuses', () => {
      expect(component.getBackgroundColor(EC2Status.PENDING)).toBe('yellow');
      expect(component.getBackgroundColor(EC2Status.RUNNING)).toBe('#10b981');
      expect(component.getBackgroundColor(EC2Status.STOPPING)).toBe(
        '#f04d2dff',
      );
      expect(component.getBackgroundColor(EC2Status.STOPPED)).toBe('#f04d2dff');
      expect(component.getBackgroundColor(EC2Status.SHUTTING_DOWN)).toBe(
        '#f04d2dff',
      );
    });

    it('should return correct mat icon for different statuses', () => {
      expect(component.getMatIcon(EC2Status.PENDING)).toBe('yellow');
      expect(component.getMatIcon(EC2Status.RUNNING)).toBe('check_circle');
      expect(component.getMatIcon(EC2Status.STOPPING)).toBe('report');
      expect(component.getMatIcon(EC2Status.STOPPED)).toBe('report');
      expect(component.getMatIcon(EC2Status.SHUTTING_DOWN)).toBe('report');
    });
  });

  describe('Instance actions', () => {
    it('should navigate to edit page when editInstance is called', () => {
      const instanceId = 'deploy-1';

      component.editInstance(instanceId);

      expect(
        mockDeploymentsService.setCurrentEditingDeployment,
      ).toHaveBeenCalledWith(instanceId);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/edit']);
    });

    it('should delete instance and refresh data', () => {
      const instanceId = 'deploy-1';
      mockApiService.deleteDeployment.and.returnValue(of(mockDeploymentData));
      spyOn(component, 'refresh');

      component.deleteInstance(instanceId);

      expect(mockApiService.deleteDeployment).toHaveBeenCalledWith(instanceId);
      expect(mockSnackBar.open).toHaveBeenCalledWith(
        'Deployment terminated. Please wait a few minutes and refresh the page ',
        'Close',
        { duration: 30000 },
      );
      expect(component.refresh).toHaveBeenCalled();
    });

    it('should open snapshot modal', () => {
      const instanceElement = mockDeploymentData[0];
      const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', [
        'afterClosed',
      ]);
      dialogRefSpy.afterClosed.and.returnValue(of({}));
      mockDialog.open.and.returnValue(dialogRefSpy);
      spyOn(component, 'refresh');

      component.openSnapshotModal(instanceElement);

      expect(mockDialog.open).toHaveBeenCalledWith(
        SnapshotConfirmationDialogComponent,
        {
          width: '360px',
          data: { instanceElement },
        },
      );
      expect(component.refresh).toHaveBeenCalled();
    });
  });

  describe('Instance start/stop functionality', () => {
    it('should start instance and begin polling', () => {
      const element = { ...mockDeploymentData[1], loading: false };
      mockApiService.startInstance.and.returnValue(of({}));
      spyOn(component, 'pollInstanceStatus');

      component.startInstance(element);

      expect(element.loading).toBe(true);
      expect(component.currentlyPolling).toBe(true);
      expect(mockApiService.startInstance).toHaveBeenCalledWith(
        element.instanceId,
      );
      expect(component.pollInstanceStatus).toHaveBeenCalledWith(
        element.instanceId,
        'running',
        2000,
      );
    });

    it('should stop instance and begin polling', () => {
      const element = { ...mockDeploymentData[0], loading: false };
      mockApiService.stopInstance.and.returnValue(of({}));
      spyOn(component, 'pollInstanceStatus');

      component.stopInstance(element);

      expect(element.loading).toBe(true);
      expect(component.currentlyPolling).toBe(true);
      expect(mockApiService.stopInstance).toHaveBeenCalledWith(
        element.instanceId,
      );
      expect(component.pollInstanceStatus).toHaveBeenCalledWith(
        element.instanceId,
        'stopped',
        10000,
      );
    });
  });

  describe('Polling functionality', () => {
    beforeEach(() => {
      jasmine.clock().install();
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    it('should poll instance status until target status is reached', fakeAsync(() => {
      const instanceId = 'i-123456789';
      const targetStatus = 'running';
      const pollTime = 2000;

      // First call returns pending, second call returns running
      mockApiService.getDeployments.and.returnValues(
        of([{ ...mockDeploymentData[0], status: EC2Status.PENDING }]),
        of([{ ...mockDeploymentData[0], status: EC2Status.RUNNING }]),
      );

      spyOn(component, 'stopPolling');

      component.pollInstanceStatus(instanceId, targetStatus, pollTime);

      // First poll call
      tick(0);
      expect(mockApiService.getDeployments).toHaveBeenCalledWith(false);

      // Second poll call after interval
      tick(pollTime);
      expect(component.stopPolling).toHaveBeenCalled();
    }));

    it('should stop polling after max attempts', fakeAsync(() => {
      const instanceId = 'i-123456789';
      const targetStatus = 'running';
      const pollTime = 2000;

      // Always return pending status
      mockApiService.getDeployments.and.returnValue(
        of([{ ...mockDeploymentData[0], status: EC2Status.PENDING }]),
      );

      spyOn(component, 'stopPolling');

      component.pollInstanceStatus(instanceId, targetStatus, pollTime);

      // Simulate 11 polling attempts (max is 10)
      for (let i = 0; i <= 10; i++) {
        tick(pollTime);
      }

      expect(component.stopPolling).toHaveBeenCalled();
    }));

    it('should stop polling and clear interval', () => {
      component.currentlyPolling = true;
      component['pollingInterval'] = setInterval(() => {}, 1000);

      component.stopPolling();

      expect(component.currentlyPolling).toBe(false);
      expect(component['pollingInterval']).toBeNull();
    });
  });

  describe('Utility functions', () => {
    it('should have convertDateTime function available', () => {
      expect(component.convertDateTime).toBeDefined();
      expect(typeof component.convertDateTime).toBe('function');
    });

    it('should show delete snackbar with correct message', () => {
      component.deleteSnackbar();

      expect(mockSnackBar.open).toHaveBeenCalledWith(
        'Deployment terminated. Please wait a few minutes and refresh the page ',
        'Close',
        { duration: 30000 },
      );
    });
  });

  describe('Component lifecycle', () => {
    it('should initialize deployments on ngOnInit', () => {
      spyOn(component, 'initializeDeployedInstances');

      component.ngOnInit();

      expect(component.initializeDeployedInstances).toHaveBeenCalled();
    });

    it('should clean up subscriptions on destroy', () => {
      const ngUnsubscribeSpy = spyOn(component['ngUnsubscribe'], 'next');
      const completeSpy = spyOn(component['ngUnsubscribe'], 'complete');

      component.ngOnDestroy();

      expect(ngUnsubscribeSpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle empty deployment response', () => {
      mockApiService.getDeployments.and.returnValue(of(null as any));

      component.initializeDeployedInstances();

      expect(component.dataSource).toEqual([]);
    });

    it('should handle undefined deployment response', () => {
      mockApiService.getDeployments.and.returnValue(of(undefined as any));

      component.initializeDeployedInstances();

      expect(component.dataSource).toEqual([]);
    });

    it('should handle polling error gracefully', () => {
      const instanceId = 'i-123456789';
      const targetStatus = 'running';
      const pollTime = 2000;

      mockApiService.getDeployments.and.returnValue(
        new Subject().asObservable().pipe(() => {
          throw new Error('API Error');
        }),
      );

      spyOn(component, 'stopPolling');
      spyOn(console, 'error');

      component.pollInstanceStatus(instanceId, targetStatus, pollTime);

      expect(component.stopPolling).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(
        'Error polling instance status:',
        jasmine.any(Error),
      );
    });
  });

  describe('Loading states', () => {
    it('should show loading state when tableLoading is true', () => {
      (mockApiService.tableLoading as jasmine.Spy).and.returnValue(true);
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const progressBar = compiled.querySelector('mat-progress-bar');
      expect(progressBar).toBeTruthy();
    });

    it('should hide loading state when tableLoading is false', () => {
      (mockApiService.tableLoading as jasmine.Spy).and.returnValue(false);
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const progressBar = compiled.querySelector('mat-progress-bar');
      expect(progressBar).toBeFalsy();
    });

    it('should disable action buttons when currently polling', () => {
      component.currentlyPolling = true;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const actionButtons = compiled.querySelectorAll('.action-button');
      actionButtons.forEach((button: HTMLButtonElement) => {
        expect(button.disabled).toBe(true);
      });
    });
  });

  describe('Table rendering', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should render table with correct data', () => {
      const compiled = fixture.nativeElement;
      const table = compiled.querySelector('table[mat-table]');
      expect(table).toBeTruthy();

      const rows = compiled.querySelectorAll('tr[mat-row]');
      expect(rows.length).toBe(mockDeploymentData.length);
    });

    it('should show "No deployed instances found" when dataSource is empty', () => {
      component.dataSource = [];
      (mockApiService.tableLoading as jasmine.Spy).and.returnValue(false);
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const noDataMessage = compiled.querySelector('tr[class*="mat-row"] td');
      expect(noDataMessage?.textContent?.trim()).toContain(
        'No deployed instances found.',
      );
    });

    it('should render action buttons for running instances', () => {
      const runningInstance = {
        ...mockDeploymentData[0],
        status: EC2Status.RUNNING,
        loading: false,
      };
      component.dataSource = [runningInstance];
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const stopButton = compiled.querySelector(
        'button[mat-tooltip="Stop this instance"]',
      );
      expect(stopButton).toBeTruthy();
    });

    it('should render action buttons for stopped instances', () => {
      const stoppedInstance = {
        ...mockDeploymentData[1],
        status: EC2Status.STOPPED,
        loading: false,
      };
      component.dataSource = [stoppedInstance];
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const startButton = compiled.querySelector(
        'button[mat-tooltip="Start this instance"]',
      );
      expect(startButton).toBeTruthy();
    });

    it('should show spinner for loading instances', () => {
      const loadingInstance = { ...mockDeploymentData[0], loading: true };
      component.dataSource = [loadingInstance];
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const spinner = compiled.querySelector('mat-spinner[diameter="24"]');
      expect(spinner).toBeTruthy();
    });

    it('should render edit and delete buttons for all instances', () => {
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const editButtons = compiled.querySelectorAll(
        'button mat-icon[fontIcon="edit"], button mat-icon:contains("edit")',
      );
      const deleteButtons = compiled.querySelectorAll(
        'button mat-icon[fontIcon="delete"], button mat-icon:contains("delete")',
      );

      expect(editButtons.length).toBeGreaterThan(0);
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    it('should render snapshot button for all instances', () => {
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const snapshotButtons = compiled.querySelectorAll(
        'button mat-icon[fontIcon="camera_alt"], button mat-icon:contains("camera_alt")',
      );

      expect(snapshotButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Button interactions', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should call refresh when refresh button is clicked', () => {
      spyOn(component, 'refresh');

      const compiled = fixture.nativeElement;
      const refreshButton = compiled.querySelector(
        'button[aria-label="Refresh"]',
      );
      refreshButton?.click();

      expect(component.refresh).toHaveBeenCalled();
    });

    it('should navigate to create page when New Deployment button is clicked', () => {
      const compiled = fixture.nativeElement;
      const newDeploymentButton = compiled.querySelector(
        'button[routerLink="/create"]',
      );

      expect(newDeploymentButton).toBeTruthy();
    });
  });

  describe('Status display', () => {
    it('should display status with correct icon and color', () => {
      const runningInstance = {
        ...mockDeploymentData[0],
        status: EC2Status.RUNNING,
      };
      component.dataSource = [runningInstance];
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const statusIcon = compiled.querySelector('.align-with-icon mat-icon');

      expect(statusIcon).toBeTruthy();
      expect(component.getMatIcon(EC2Status.RUNNING)).toBe('check_circle');
      expect(component.getBackgroundColor(EC2Status.RUNNING)).toBe('#10b981');
    });
  });

  describe('Time conversion', () => {
    it('should use convertDateTime utility for time display', () => {
      const testDate = '2024-12-31T23:59:59Z';
      const result = component.convertDateTime(testDate);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });
});
