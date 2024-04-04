resource "aws_instance" "my_deployed_on_demand_instances" {
  for_each = {
    for k, v in data.external.dynamodb_data.result : k => jsondecode(v)
    if jsondecode(v).lifecycle == "on-demand"
  }

  ami           = each.value.ami
  instance_type = each.value.serverSize
  tags = {
    Name         = each.value.hostname
    Hostname     = each.value.hostname
    DeploymentID = each.value.id
    TimeToExpire = each.value.timeToExpire
    DeployedBy   = "turbo-deploy"
  }
}

resource "aws_spot_instance_request" "my_deployed_spot_instances" {
  for_each = {
    for k, v in data.external.dynamodb_data.result : k => jsondecode(v)
    if jsondecode(v).lifecycle == "spot"
  }

  ami           = each.value.ami
  instance_type = each.value.serverSize
  tags = {
    Name         = each.value.hostname
    Hostname     = each.value.hostname
    DeploymentID = each.value.id
    TimeToExpire = each.value.timeToExpire
    DeployedBy   = "turbo-deploy"
  }
}
