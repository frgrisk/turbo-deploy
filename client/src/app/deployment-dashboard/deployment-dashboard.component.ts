import { Component } from '@angular/core';
import { ApiService } from '../shared/services/api.service';
import { DeploymentApiResponse } from '../shared/model/deployment-response';
import { EC2Status } from '../shared/enum/ec2-status.enum';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { DeploymentsService } from '../shared/services/deployments.service';
import { convertDateTime } from '../shared/util/time.util';
import { Subject, take, takeUntil } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { DeploymentApiRequest } from '../shared/model/deployment-request';
import { SnapshotConfirmationDialogComponent } from '../shared/components/snapshot-confirmation-dialog/snapshot-confirmation-dialog.component';

@Component({
  selector: 'app-deployment-dashboard',
  templateUrl: './deployment-dashboard.component.html',
  styleUrls: ['./deployment-dashboard.component.scss'],
})
export class DeploymentDashboardComponent {
  displayedColumns: string[] = [
    'hostname',
    'availabilityZone',
    'ami',
    'serverSize',
    'lifecycle',
    'timeToExpire',
    'snapshotId',
    'status',
    'action',
  ];
  dataSource: DeploymentApiResponse[] = [];
  convertDateTime = convertDateTime;
  currentlyPolling = false;
  private pollingInterval: any;

  private ngUnsubscribe = new Subject<void>();

  columnsToDisplay = [
    { key: 'hostname', header: 'Hostname' },
    { key: 'ami', header: 'AMI' },
    { key: 'serverSize', header: 'Server Size' },
    { key: 'availabilityZone', header: 'Availability Zone' },
    { key: 'lifecycle', header: 'Life Cycle' },
    { key: 'snapshotId', header: 'Snapshot' },
    { key: 'status', header: 'Status' },
    { key: 'timeToExpire', header: 'Expiry' },
    { key: 'action', header: 'Action' },
  ];
  constructor(
    public apiService: ApiService,
    private router: Router,
    private _snackBar: MatSnackBar,
    private deploymentService: DeploymentsService,
    public dialog: MatDialog
  ) {}
  ngOnInit() {
    this.initializeDeployedInstances();
  }

  refresh() {
    this.dataSource = [];
    this.initializeDeployedInstances();
  }

  getBackgroundColor(status: EC2Status): string {
    switch (status) {
      case EC2Status.PENDING:
        return 'yellow';
      case EC2Status.RUNNING:
        return '#10b981';
      case EC2Status.STOPPING:
      case EC2Status.SHUTTING_DOWN:
      case EC2Status.STOPPED:
        return '#f04d2dff';
      default:
        return 'transparent';
    }
  }

  getMatIcon(status: EC2Status) {
    switch (status) {
      case EC2Status.PENDING:
        return 'yellow';
      case EC2Status.RUNNING:
        return 'check_circle';
      case EC2Status.STOPPING:
      case EC2Status.SHUTTING_DOWN:
      case EC2Status.STOPPED:
        return 'report';
      default:
        return '';
    }
  }

  initializeDeployedInstances() {
    this.apiService
      .getDeployments()
      .pipe(take(1))
      .subscribe((response: DeploymentApiResponse[]) => {
        console.log(response);
        this.dataSource = response
          ? response.filter(
              (instance) => instance.status !== EC2Status.TERMINATED
            )
          : [];
        console.log(this.dataSource);
      });
  }

  editInstance(instanceID: string) {
    this.deploymentService.setCurrentEditingDeployment(instanceID);
    this.router.navigate(['/edit']);
  }

  deleteInstance(instanceId: string) {
    this.apiService
      .deleteDeployment(instanceId)
      .subscribe((response: DeploymentApiResponse[]) => {
        this.deleteSnackbar();
        this.refresh();
      });
  }

  openSnapshotModal(instanceElement: any) {
    const dialogRef = this.dialog.open(SnapshotConfirmationDialogComponent, {
      width: '360px',
      data: { instanceElement },
    });
    dialogRef.afterClosed().subscribe(() => this.refresh());
  }

  startInstance(element: any) {
    element.loading = true;
    this.currentlyPolling = true;

    this.apiService.startInstance(element.ec2InstanceId).subscribe(() => {
      this.pollInstanceStatus(element.ec2InstanceId, 'running', 2000);
    });
  }

  stopInstance(element: any) {
    element.loading = true;
    this.currentlyPolling = true;
    this.apiService.stopInstance(element.ec2InstanceId).subscribe(() => {
      this.pollInstanceStatus(element.ec2InstanceId, 'stopped', 10000);
    });
  }
  pollInstanceStatus(
    instanceId: string,
    targetStatus: string,
    pollTime: number
  ): void {
    let attempts = 0;
    const maxAttempts = 10;

    const pollFunction = () => {
      attempts++;
      if (attempts > maxAttempts) {
        this.stopPolling();
        return;
      }
      this.apiService
        .getDeployments(false)
        .pipe(takeUntil(this.ngUnsubscribe))
        .subscribe(
          (deployments) => {
            const instance = deployments.find(
              (d: { ec2InstanceId: string }) => d.ec2InstanceId === instanceId
            );
            if (
              !instance ||
              instance.status === targetStatus ||
              instance.status === 'error'
            ) {
              this.stopPolling();
              if (instance) {
                instance.loading = false;
                this.currentlyPolling = false;
              }
            }
            this.dataSource = deployments;
          },
          (error) => {
            this.stopPolling();
            console.error('Error polling instance status:', error);
          }
        );
    };

    pollFunction();
    this.pollingInterval = setInterval(pollFunction, pollTime);
  }

  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.currentlyPolling = false;
  }

  deleteSnackbar() {
    const message =
      'Deployment terminated. Please wait a few minutes and refresh the page ';
    this._snackBar.open(message, 'Close', {
      duration: 30000,
    });
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
}
