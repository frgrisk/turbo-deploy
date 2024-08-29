import { Component, OnInit } from '@angular/core';
import { ApiService } from '../shared/services/api.service';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Lifecycle, TimeUnit, AmiAttr } from '../shared/enum/dropdown.enum';
import { DeploymentApiRequest } from '../shared/model/deployment-request';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { convertToHours } from '../shared/util/time.util';

@Component({
  selector: 'app-create-deployment',
  templateUrl: './create-deployment.component.html',
  styleUrls: ['./create-deployment.component.scss'],
})
export class CreateDeploymentComponent implements OnInit {
  private ngUnsubscribe = new Subject<void>();

  deploymentForm!: FormGroup;
  serverSizes: string[] = [];
  amis: AmiAttr[] = [];
  region: string = '';
  lifecycles: Lifecycle[] = [Lifecycle.ON_DEMAND, Lifecycle.SPOT];
  ttlUnits: TimeUnit[] = [TimeUnit.HOURS, TimeUnit.DAYS, TimeUnit.MONTHS];

  constructor(
    public apiService: ApiService,
    private router: Router,
    private _snackBar: MatSnackBar,
  ) {}

  ngOnInit() {
    this.initializeForm();
    this.initializeAWSData();
  }

  initializeForm() {
    this.deploymentForm = new FormGroup({
      hostname: new FormControl('', [Validators.required]),
      region: new FormControl('', [Validators.required]),
      ami: new FormControl('', [Validators.required]),
      serverSize: new FormControl('', [Validators.required]),
      lifecycle: new FormControl(Lifecycle.ON_DEMAND, [Validators.required]),
      ttlValue: new FormControl('', [Validators.min(1)]),
      ttlUnit: new FormControl(''),
    });

    this.deploymentForm.get('ttlValue')?.valueChanges.subscribe(() => {
      if (!this.deploymentForm.get('ttlUnit')?.value) {
        this.deploymentForm
          .get('ttlUnit')
          ?.patchValue(TimeUnit.HOURS, { emitEvent: false });
      }
    });

    this.deploymentForm.get('ttlUnit')?.valueChanges.subscribe(() => {
      if (!this.deploymentForm.get('ttlValue')?.value) {
        this.deploymentForm
          .get('ttlValue')
          ?.patchValue(1, { emitEvent: false });
      }
    });
  }

  initializeAWSData() {
    this.apiService.getAWSData().subscribe((data) => {
      this.serverSizes = data.serverSizes;
      this.amis = data.amis;
      this.region = data.regions;
      this.deploymentForm.get('serverSize')?.patchValue('t3.medium');
      this.deploymentForm.get('ami')?.patchValue(this.amis[0].amiIds);
      this.deploymentForm.get('region')?.patchValue(this.region);
    });
  }

  resetExpiryForm() {
    this.deploymentForm.get('ttlValue')?.patchValue('', { emitEvent: false });
    this.deploymentForm.get('ttlUnit')?.patchValue('', { emitEvent: false });
  }

  submitForm() {
    const form = this.deploymentForm.getRawValue();
    let apiPayload: DeploymentApiRequest = {
      hostname: form.hostname,
      region: form.region,
      ami: form.ami,
      serverSize: form.serverSize,
      lifecycle: form.lifecycle,
    };

    const ttlValue = this.deploymentForm.get('ttlValue')?.value;
    const ttlUnit = this.deploymentForm.get('ttlUnit')?.value;

    if (ttlValue && ttlUnit) {
      apiPayload.ttlValue = convertToHours(ttlValue, ttlUnit);
      apiPayload.ttlUnit = 'h';
    }

    this.apiService.createDeployment(apiPayload).subscribe(() => {
      this.router.navigate(['/']);
      this.successSnackBar();
    });
  }

  successSnackBar() {
    const message =
      'Deployment initiated. Please wait a few minutes and refresh the page ';
    this._snackBar.open(message, 'Close', {
      duration: 30000,
    });
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
}
