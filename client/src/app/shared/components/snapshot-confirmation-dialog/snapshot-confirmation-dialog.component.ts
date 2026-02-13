import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { DeploymentApiRequest } from '../../model/deployment-request';
import { ApiService } from '../../services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { EMPTY } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { SnapshotLimitDialogComponent } from '../snapshot-deletion-dialog/snapshot-deletion-dialog.component';

@Component({
  selector: 'app-snapshot-confirmation-dialog',
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './snapshot-confirmation-dialog.component.html',
  styleUrls: ['./snapshot-confirmation-dialog.component.scss'],
})
export class SnapshotConfirmationDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: { instanceElement: any },
    public apiService: ApiService,
    private _snackBar: MatSnackBar,
    private dialog: MatDialog,
  ) {}

  onConfirm() {
    let apiPayload: DeploymentApiRequest = {
      id: this.data.instanceElement.deploymentId,
      instanceId: this.data.instanceElement.ec2InstanceId,
      hostname: this.data.instanceElement.hostname,
      region: this.data.instanceElement.availabilityZone,
      ami: this.data.instanceElement.ami,
      serverSize: this.data.instanceElement.serverSize,
      lifecycle: this.data.instanceElement.lifecycle,
      timeToExpire: this.data.instanceElement.timeToExpire,
      userData:
        this.data.instanceElement.userData?.filter((u: string) => u !== '') ??
        [],
    };

    this.apiService
      .checkAmiLimit(this.data.instanceElement.ec2InstanceId)
      .pipe(
        switchMap((response) => {
          if (response.ami_limit_hit) {
            // Open dialog and wait for confirmation
            const dialogRef = this.dialog.open(SnapshotLimitDialogComponent, {
              data: {
                ami_id: response.oldest_image_id,
                ami_name: response.oldest_image_name,
                ami_date: response.oldest_image_date,
              },
            });

            return dialogRef.afterClosed().pipe(
              switchMap((confirmed) => {
                if (!confirmed) {
                  return EMPTY;
                }
                const deletePayload = {
                  instance_id: this.data.instanceElement.deploymentId,
                  image_id: response.oldest_image_id,
                };
                return this.apiService
                  .deleteInstanceAmi(deletePayload)
                  .pipe(
                    switchMap(() =>
                      this.apiService.captureInstanceAmi(apiPayload),
                    ),
                  );
              }),
            );
          }

          return this.apiService.captureInstanceAmi(apiPayload);
        }),
      )
      .subscribe(() => this.successSnackBar());
  }

  successSnackBar() {
    const message =
      'Snapshot created. Please wait a few minutes and refresh the page ';
    this._snackBar.open(message, 'Close', {
      duration: 30000,
    });
  }
}
