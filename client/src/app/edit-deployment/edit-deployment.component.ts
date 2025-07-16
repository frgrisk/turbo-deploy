import { Component } from '@angular/core';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterModule } from '@angular/router';
import { Subject, filter, switchMap, takeUntil, tap } from 'rxjs';

import { Lifecycle, TimeUnit, AmiAttr } from '../shared/enum/dropdown.enum';
import { DeploymentApiRequest } from '../shared/model/deployment-request';
import { ApiService } from '../shared/services/api.service';
import { DeploymentsService } from '../shared/services/deployments.service';
import { convertDateTime, convertToHours } from '../shared/util/time.util';

@Component({
  selector: 'app-edit-deployment',
  imports: [
    RouterModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './edit-deployment.component.html',
  styleUrl: './edit-deployment.component.scss',
})
export class EditDeploymentComponent {
  private ngUnsubscribe = new Subject<void>();

  private numericValidator(control: any) {
    const value = control.value;
    if (!value) return null;

    if (
      isNaN(value) ||
      !Number.isInteger(Number(value)) ||
      Number(value) <= 0
    ) {
      return { numeric: true };
    }
    return null;
  }

  editDeploymentForm!: FormGroup;
  serverSizes: string[] = [];
  amis: AmiAttr[] = [];
  userData: string[] = [];
  region: string = '';
  lifecycles: Lifecycle[] = [Lifecycle.ON_DEMAND, Lifecycle.SPOT];
  ttlUnits: TimeUnit[] = [TimeUnit.HOURS, TimeUnit.DAYS, TimeUnit.MONTHS];
  currentExpiry: string = '';

  constructor(
    public apiService: ApiService,
    private router: Router,
    private _snackBar: MatSnackBar,
    private deploymentService: DeploymentsService,
  ) {}

  ngOnInit() {
    this.initializeForm();
    this.initializeData();
  }

  initializeForm() {
    this.editDeploymentForm = new FormGroup({
      id: new FormControl(''),
      hostname: new FormControl('', [
        Validators.required,
        Validators.pattern('[a-zA-Z0-9-_]*'),
      ]),
      region: new FormControl('', [Validators.required]),
      ami: new FormControl('', [Validators.required]),
      serverSize: new FormControl('', [Validators.required]),
      userData: new FormControl([]),
      lifecycle: new FormControl(Lifecycle.SPOT, [Validators.required]),
      ttlValue: new FormControl('', [Validators.min(1), this.numericValidator]),
      ttlUnit: new FormControl(''),
    });

    this.editDeploymentForm.get('ttlValue')?.valueChanges.subscribe(() => {
      if (!this.editDeploymentForm.get('ttlUnit')?.value) {
        this.editDeploymentForm
          .get('ttlUnit')
          ?.patchValue(TimeUnit.HOURS, { emitEvent: false });
      }
    });

    this.editDeploymentForm.get('ttlUnit')?.valueChanges.subscribe(() => {
      if (!this.editDeploymentForm.get('ttlValue')?.value) {
        this.editDeploymentForm
          .get('ttlValue')
          ?.patchValue(1, { emitEvent: false });
      }
    });
  }

  initializeData() {
    this.apiService
      .getAWSData()
      .pipe(
        tap((data) => {
          this.serverSizes = data.serverSizes;
          this.amis = data.amis;
          this.region = data.regions;
          this.userData = data.userData;
        }),
        switchMap(() => this.deploymentService.currentEdit$),
        filter((editObject): editObject is string => !!editObject),
        switchMap((editObject) => this.apiService.getDeployment(editObject)),
        takeUntil(this.ngUnsubscribe),
      )
      .subscribe((response: any) => {
        this.editDeploymentForm.reset({}, { emitEvent: false });
        (this.editDeploymentForm.patchValue({
          id: response.ID,
          hostname: response.Hostname,
          region: response.Region,
          ami: response.Ami,
          serverSize: response.ServerSize,
          userData: response.UserData,
          lifecycle: response.Lifecycle,
        }),
          { emitEvent: false });
        this.currentExpiry = convertDateTime(response.TimeToExpire);
      });
  }

  submitForm() {
    const form = this.editDeploymentForm.getRawValue();
    let apiPayload: DeploymentApiRequest = {
      id: form.id,
      hostname: form.hostname,
      region: form.region,
      ami: form.ami,
      serverSize: form.serverSize,
      lifecycle: form.lifecycle,
      userData: form.userData,
    };

    const ttlValue = this.editDeploymentForm.get('ttlValue')?.value;
    const ttlUnit = this.editDeploymentForm.get('ttlUnit')?.value;

    if (ttlValue && ttlUnit) {
      apiPayload.ttlValue = convertToHours(ttlValue, ttlUnit);
      apiPayload.ttlUnit = 'h';
    }

    this.apiService.editDeployment(apiPayload).subscribe(() => {
      this.router.navigate(['/']);
      this.successSnackBar();
    });
  }

  resetExpiryForm() {
    this.editDeploymentForm
      .get('ttlValue')
      ?.patchValue('', { emitEvent: false });
    this.editDeploymentForm
      .get('ttlUnit')
      ?.patchValue('', { emitEvent: false });
  }

  successSnackBar() {
    const message =
      'Deployment editied and initiated. Please wait a few minutes and refresh the page ';
    this._snackBar.open(message, 'Close', {
      duration: 30000,
    });
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  onKeyPress(event: KeyboardEvent): void {
    const key = event.key;

    const allowedKeys = [
      'Backspace',
      'Delete',
      'Tab',
      'Escape',
      'Enter',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
    ];

    if (
      event.ctrlKey &&
      ['a', 'c', 'v', 'x', 'z'].includes(key.toLowerCase())
    ) {
      return;
    }

    if (allowedKeys.includes(key)) {
      return;
    }

    if (!/^[0-9]$/.test(key)) {
      event.preventDefault();
    }
  }

  onPaste(event: ClipboardEvent): void {
    const clipboardData = event.clipboardData;
    const pastedText = clipboardData?.getData('text');

    if (pastedText && !/^\d+$/.test(pastedText)) {
      event.preventDefault();
    }
  }
}
