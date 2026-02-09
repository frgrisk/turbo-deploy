// snapshot-limit-dialog.component.ts
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { MatDialogModule } from '@angular/material/dialog';

export interface SnapshotLimitData {
  ami_id: string | number;
  ami_name: string;
  ami_date: string;
}

@Component({
  selector: 'app-snapshot-limit-dialog',
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule
  ],
  templateUrl: './snapshot-deletion-dialog.component.html',
  styleUrls: ['./snapshot-deletion-dialog.component.scss'],
})
export class SnapshotLimitDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<SnapshotLimitDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SnapshotLimitData,
    public apiService: ApiService,
    private _snackBar: MatSnackBar
  ) {}

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
