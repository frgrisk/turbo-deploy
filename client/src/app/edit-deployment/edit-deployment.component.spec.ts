import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditDeploymentComponent } from './edit-deployment.component';

describe('EditDeploymentComponent', () => {
  let component: EditDeploymentComponent;
  let fixture: ComponentFixture<EditDeploymentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditDeploymentComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EditDeploymentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
