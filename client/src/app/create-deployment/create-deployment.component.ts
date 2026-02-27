import { Component, OnInit } from '@angular/core';
import {
  ReactiveFormsModule,
  FormControl,
  FormGroup,
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
import { Router, RouterModule } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AsyncPipe, KeyValuePipe } from '@angular/common';
import { Observable, Subject, startWith, map } from 'rxjs';
import { ApiService } from '../shared/services/api.service';
import {
  Lifecycle,
  TimeUnit,
  AmiAttr,
  RegionData,
} from '../shared/enum/dropdown.enum';
import { DeploymentApiRequest } from '../shared/model/deployment-request';
import { convertToHours } from '../shared/util/time.util';
import {
  numericValidator,
  onNumericKeyPress,
  onNumericPaste,
} from '../shared/util/numeric-input.util';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { AmiAutocompleteService } from '../shared/services/ami-autocomplete.service';

@Component({
  selector: 'app-create-deployment',
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
    MatAutocompleteModule,
    MatProgressSpinnerModule,
    AsyncPipe,
    KeyValuePipe,
  ],
  templateUrl: './create-deployment.component.html',
  styleUrls: ['./create-deployment.component.scss'],
})
export class CreateDeploymentComponent implements OnInit {
  private ngUnsubscribe = new Subject<void>();

  deploymentForm!: FormGroup;
  serverSizes: string[] = [];
  amis: AmiAttr[] = [];
  userData: string[] = [];
  region: string = '';
  regionConfig: Record<string, RegionData> = {};
  lifecycles: Lifecycle[] = [Lifecycle.ON_DEMAND, Lifecycle.SPOT];
  ttlUnits: TimeUnit[] = [TimeUnit.HOURS, TimeUnit.DAYS, TimeUnit.MONTHS];
  filteredAmis$!: Observable<AmiAttr[]>;

  constructor(
    public apiService: ApiService,
    private router: Router,
    private _snackBar: MatSnackBar,
    private amiAutocomplete: AmiAutocompleteService,
  ) {}

  ngOnInit() {
    this.initializeForm();
    this.initializeAWSData();
  }

  initializeForm() {
    this.deploymentForm = new FormGroup({
      hostname: new FormControl('', [
        Validators.required,
        Validators.pattern('[a-zA-Z0-9-_]*'),
      ]),
      region: new FormControl('', [Validators.required]),
      ami: new FormControl('', [
        Validators.required,
        this.amiAutocomplete.validator(() => this.amis),
      ]),
      serverSize: new FormControl('', [Validators.required]),
      userData: new FormControl([]),
      lifecycle: new FormControl(Lifecycle.SPOT, [Validators.required]),
      ttlValue: new FormControl('', [Validators.min(1), numericValidator]),
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
      this.regionConfig = data.regions;
      this.userData = data.user_scripts;

      // set default region
      const defaultRegion = Object.keys(data.regions)[0];
      this.deploymentForm.get('region')?.patchValue(defaultRegion);

      let isFirstEmit = true;

      // listen to region changes
      this.deploymentForm
        .get('region')
        ?.valueChanges.pipe(startWith(defaultRegion))
        .subscribe((selectedRegion) => {
          const regionData = this.regionConfig[selectedRegion];
          this.amis = regionData.amis;
          this.serverSizes = regionData.instance_types;

          this.deploymentForm
            .get('serverSize')
            ?.patchValue(this.serverSizes[0]);

          if (isFirstEmit) {
            isFirstEmit = false;
          } else {
            this.deploymentForm.get('ami')?.setValue('', { emitEvent: false });
          }

          this.filteredAmis$ = this.amiAutocomplete.setup(
            this.deploymentForm,
            this.amis,
          );
        });
    });
  }

  displayAmi = (amiId: string) =>
    this.amiAutocomplete.display(this.amis)(amiId);

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
      userData: form.userData,
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

  onKeyPress(event: KeyboardEvent): void {
    onNumericKeyPress(event);
  }

  onPaste(event: ClipboardEvent): void {
    onNumericPaste(event);
  }
}
