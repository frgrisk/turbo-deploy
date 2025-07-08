import { Component } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Lifecycle, TimeUnit, AmiAttr } from '../shared/enum/dropdown.enum';
import { DeploymentApiRequest } from '../shared/model/deployment-request';
import { ApiService } from '../shared/services/api.service';
import { Subject, filter, switchMap, takeUntil, tap } from 'rxjs';
import { DeploymentsService } from '../shared/services/deployments.service';
import { convertDateTime, convertToHours } from '../shared/util/time.util';

@Component({
  selector: 'app-edit-deployment',
  templateUrl: './edit-deployment.component.html',
  styleUrl: './edit-deployment.component.scss',
})
export class EditDeploymentComponent {
  private ngUnsubscribe = new Subject<void>();

  editDeploymentForm!: FormGroup;
  serverSizes: string[] = [];
  amis: AmiAttr[] = [];
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
      hostname: new FormControl('', [Validators.required]),
      region: new FormControl('', [Validators.required]),
      ami: new FormControl('', [Validators.required]),
      serverSize: new FormControl('', [Validators.required]),
      lifecycle: new FormControl(Lifecycle.ON_DEMAND, [Validators.required]),
      ttlValue: new FormControl('', [Validators.min(1)]),
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
}
