import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { DeploymentDashboardComponent } from './deployment-dashboard.component';
import { ApiService } from '../shared/services/api.service';
import { DeploymentsService } from '../shared/services/deployments.service';
import { EC2Status } from '../shared/enum/ec2-status.enum';

describe('DeploymentDashboardComponent', () => {
  let component: DeploymentDashboardComponent;
  let fixture: ComponentFixture<DeploymentDashboardComponent>;
  let mockApiService: jasmine.SpyObj<ApiService>;

  beforeEach(async () => {
    const apiServiceSpy = jasmine.createSpyObj(
      'ApiService',
      ['getDeployments', 'deleteDeployment', 'startInstance', 'stopInstance'],
      { tableLoading: jasmine.createSpy().and.returnValue(false) },
    );

    await TestBed.configureTestingModule({
      imports: [DeploymentDashboardComponent, NoopAnimationsModule],
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
          useValue: jasmine.createSpyObj('DeploymentsService', [
            'setCurrentEditingDeployment',
          ]),
        },
        {
          provide: MatDialog,
          useValue: jasmine.createSpyObj('MatDialog', ['open']),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DeploymentDashboardComponent);
    component = fixture.componentInstance;
    mockApiService = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;

    // Default mock setup
    mockApiService.getDeployments.and.returnValue(of([]));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load deployments on init', () => {
    fixture.detectChanges();
    expect(mockApiService.getDeployments).toHaveBeenCalled();
  });

  it('should return correct background colors for status', () => {
    expect(component.getBackgroundColor(EC2Status.PENDING)).toBe('yellow');
    expect(component.getBackgroundColor(EC2Status.RUNNING)).toBe('#10b981');
    expect(component.getBackgroundColor(EC2Status.STOPPED)).toBe('#f04d2dff');
  });

  it('should return correct icons for status', () => {
    expect(component.getMatIcon(EC2Status.RUNNING)).toBe('check_circle');
    expect(component.getMatIcon(EC2Status.STOPPED)).toBe('report');
  });

  it('should refresh data when refresh is called', () => {
    component.refresh();
    expect(mockApiService.getDeployments).toHaveBeenCalled();
  });
});
