import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { DeploymentApiRequest } from '../../model/deployment-request';
import { ApiService } from '../../services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Region } from '../../enum/dropdown.enum';

@Component({
  selector: 'app-snapshot-confirmation-dialog',
  standalone: true,
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
  ) {
    console.log('Received data:', this.data.instanceElement);
  }

  onConfirm() {
    let apiPayload: DeploymentApiRequest = {
      id: this.data.instanceElement.deploymentId,
      instanceId: this.data.instanceElement.ec2InstanceId,
      hostname: this.data.instanceElement.hostname,
      region: Region.AP_SOUTHEAST_3,
      ami: this.data.instanceElement.ami,
      serverSize: this.data.instanceElement.serverSize,
      lifecycle: this.data.instanceElement.lifecycle,
    };
    this.apiService
      .captureInstanceSnapshopt(apiPayload)
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
