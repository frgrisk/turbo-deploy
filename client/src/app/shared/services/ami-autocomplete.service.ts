// shared/services/ami-autocomplete.service.ts
import { Injectable } from '@angular/core';
import { AbstractControl, FormGroup } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { AmiAttr } from '../enum/dropdown.enum';

@Injectable({
  providedIn: 'root',
})
export class AmiAutocompleteService {
  setup(form: FormGroup, amis: AmiAttr[]): Observable<AmiAttr[]> {
    return form.get('ami')!.valueChanges.pipe(
      startWith(form.get('ami')?.value ?? ''),
      map((value) => this.filter(value, amis)),
    );
  }

  filter(value: string, amis: AmiAttr[]): AmiAttr[] {
    const filterValue = value?.toLowerCase() ?? '';
    return amis.filter(
      (ami) =>
        ami.amiIds.toLowerCase().includes(filterValue) ||
        ami.amiNames.toLowerCase().includes(filterValue),
    );
  }

  display(amis: AmiAttr[]): (amiId: string) => string {
    return (amiId: string) => {
      const ami = amis.find((a) => a.amiIds === amiId);
      return ami ? `(${ami.amiIds}) ${ami.amiNames}` : amiId;
    };
  }

  validator(getAmis: () => AmiAttr[]) {
    return (control: AbstractControl) => {
      if (!control.value) return null;
      const isValid = getAmis().some((ami) => ami.amiIds === control.value);
      return isValid ? null : { invalidAmi: true };
    };
  }
}
