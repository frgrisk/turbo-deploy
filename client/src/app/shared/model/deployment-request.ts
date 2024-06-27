import { Lifecycle, Region, TimeUnit } from '../enum/dropdown.enum';

export class DeploymentApiRequest {
  id?: string;
  instanceId?: string;
  ami!: number;
  serverSize!: string;
  hostname!: string;
  region!: Region;
  lifecycle!: Lifecycle;
  ttlValue?: number;
  ttlUnit?: string;
}
