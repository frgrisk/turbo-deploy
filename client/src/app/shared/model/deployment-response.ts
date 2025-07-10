export class DeploymentApiResponse {
  deploymentId!: string;
  instanceId!: string;
  hostname!: string;
  snapshotId!: string;
  ami!: string;
  serverSize!: string;
  availabilityZone!: string;
  lifecycle!: string;
  status!: string;
  timeToExpire!: string;
  userData!: string[];
}
