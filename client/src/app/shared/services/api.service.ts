import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, catchError, delay, finalize, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ErrorDialogComponent } from '../components/error-dialog/error-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  formAWSDataLoading = signal<boolean>(true);
  formEditDataLoading = signal<boolean>(true);
  tableLoading = signal<boolean>(true);

  formEditLoading = computed(() => {
    return this.formAWSDataLoading() || this.formEditDataLoading();
  });

  constructor(private http: HttpClient,  private dialog: MatDialog) { }


  private handleError(error: any): Observable<never> {
    const errorMessage = error.error.error || 'An unknown error occurred';
    const errorStatus = error.status || 'Unknown status';

    this.dialog.open(ErrorDialogComponent, {
      data: { status: errorStatus, message: errorMessage },
      width: '500px',
    });

    return throwError(error);
  }


  getAWSData(): Observable<any> {
    this.formAWSDataLoading.set(true);
    return this.http.get(`${environment.apiBaseUrl}/awsdata`).pipe(
      catchError(this.handleError.bind(this)),
      finalize(() => this.formAWSDataLoading.set(false))
    );
  }

  createDeployment(payload: any): Observable<any> {
    return this.http.post(`${environment.apiBaseUrl}/instance-request`, payload).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  editDeployment(payload: any): Observable<any> {
    return this.http.put(`${environment.apiBaseUrl}/instance-request/${payload.id}`, payload).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  deleteDeployment(payloadID: string): Observable<any> {
    return this.http.delete(`${environment.apiBaseUrl}/instance-request/${payloadID}`).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  getDeployments(tableLoading:boolean = true): Observable<any> {
    if (tableLoading) {
    this.tableLoading.set(true);
    }
    return this.http.get(`${environment.apiBaseUrl}/deployments`).pipe(
      catchError(this.handleError.bind(this)),
      finalize(() => this.tableLoading.set(false))
    );
  }

  getDeployment(payloadID: string): Observable<any> {
    this.formEditDataLoading.set(true);
    return this.http.get(`${environment.apiBaseUrl}/instance-request/${payloadID}`).pipe(
      catchError(this.handleError.bind(this)),
      finalize(() => this.formEditDataLoading.set(false))
    );
  }

  startInstance(payloadID: string): Observable<any> {
    return this.http.post(`${environment.apiBaseUrl}/start-instance/${payloadID}`, null).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  stopInstance(payloadID: string): Observable<any> {
    return this.http.post(`${environment.apiBaseUrl}/stop-instance/${payloadID}`, null).pipe(
      catchError(this.handleError.bind(this))
    );
  }
  
}