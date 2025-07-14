import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./deployment-dashboard/deployment-dashboard.component').then(m => m.DeploymentDashboardComponent)
  },
  {
    path: 'create',
    loadComponent: () => import('./create-deployment/create-deployment.component').then(m => m.CreateDeploymentComponent)
  },
  {
    path: 'edit',
    loadComponent: () => import('./edit-deployment/edit-deployment.component').then(m => m.EditDeploymentComponent)
  }
];
