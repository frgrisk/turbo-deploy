import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class DeploymentsService {
  currentDeploymentEditSubject = new BehaviorSubject<string | null>(null);
  currentEdit$ = this.currentDeploymentEditSubject.asObservable();

  constructor(private apiService: ApiService) {}

  setCurrentEditingDeployment(deploymentID: string) {
    this.currentDeploymentEditSubject.next(deploymentID);
  }
}
