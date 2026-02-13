// snapshot-limit-dialog.component.ts
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';

export interface EditConfirmationData {
  fields: string[];
}

@Component({
  selector: 'app-edit-deployment-confirmation-dialog',
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatChipsModule,
    MatDividerModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
  ],
  templateUrl: './edit-deployment-confirmation-dialog.component.html',
  styleUrls: ['./edit-deployment-confirmation-dialog.component.scss'],
})
export class EditConfirmationDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<EditConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EditConfirmationData,
  ) {}

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
