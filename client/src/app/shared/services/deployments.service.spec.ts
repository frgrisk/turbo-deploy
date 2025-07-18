import { TestBed } from '@angular/core/testing';
import { DeploymentsService } from './deployments.service';
import { ApiService } from './api.service';

describe('DeploymentsService', () => {
  let service: DeploymentsService;
  let mockApiService: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    const apiServiceSpy = jasmine.createSpyObj('ApiService', [
      'getDeployments',
    ]);

    TestBed.configureTestingModule({
      providers: [
        DeploymentsService,
        { provide: ApiService, useValue: apiServiceSpy },
      ],
    });

    service = TestBed.inject(DeploymentsService);
    mockApiService = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should set current editing deployment', () => {
    const deploymentId = 'test-deployment-id';

    service.setCurrentEditingDeployment(deploymentId);

    service.currentEdit$.subscribe((id) => {
      expect(id).toBe(deploymentId);
    });
  });

  it('should initialize with null current edit', () => {
    service.currentEdit$.subscribe((id) => {
      expect(id).toBeNull();
    });
  });
});
