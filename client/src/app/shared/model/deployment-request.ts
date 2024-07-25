import { Lifecycle, TimeUnit } from '../enum/dropdown.enum';

export class DeploymentApiRequest {
  id?: string;
  instanceId?: string;
  ami!: number;
  serverSize!: string;
  hostname!: string;
  region!: string;
  lifecycle!: Lifecycle;
  ttlValue?: number;
  ttlUnit?: string;
  timeToExpire?: number;
}
