import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeploymentDashboardComponent } from './deployment-dashboard.component';

describe('DeploymentDashboardComponent', () => {
  let component: DeploymentDashboardComponent;
  let fixture: ComponentFixture<DeploymentDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DeploymentDashboardComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeploymentDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
