import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DeploymentDashboardComponent } from './deployment-dashboard/deployment-dashboard.component';
import { CreateDeploymentComponent } from './create-deployment/create-deployment.component';
import { EditDeploymentComponent } from './edit-deployment/edit-deployment.component';

const routes: Routes = [
  { path: '', component: DeploymentDashboardComponent },
  { path: 'create', component: CreateDeploymentComponent },
  { path: 'edit', component: EditDeploymentComponent}
];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
