resource "aws_instance" "my_deployed_on_demand_instances" {
  for_each = {
    for k, v in data.external.dynamodb_data.result : k => jsondecode(v)
    if jsondecode(v).lifecycle == "on-demand"
  }

  region                      = each.value.region
  ami                         = each.value.ami
  instance_type               = each.value.serverSize
  subnet_id                   = local.network_config[each.value.region].subnet_id
  vpc_security_group_ids      = local.network_config[each.value.region].security_group_ids
  key_name                    = local.network_config[each.value.region].key_name
  iam_instance_profile        = var.instance_profile
  user_data                   = templatestring(data.cloudinit_config.full_script[each.key].rendered, { hostname = each.value.hostname })
  user_data_replace_on_change = false

  tags = {
    Name         = each.value.hostname
    Hostname     = each.value.hostname
    DeploymentID = each.value.id
    TimeToExpire = each.value.timeToExpire
    DeployedBy   = "turbo-deploy"
    UserData     = join(",", each.value.userData)
  }
}

resource "aws_route53_record" "on_demand_record" {
  for_each = aws_instance.my_deployed_on_demand_instances
  type     = "A"
  zone_id  = var.hosted_zone_id
  name     = replace(each.value.tags_all.Name, "/.${data.aws_route53_zone.hosted_zone.name}/", "")
  records  = [coalesce(each.value.public_ip, each.value.private_ip)]
  ttl      = "60"
}

resource "aws_spot_instance_request" "my_deployed_spot_instances" {
  for_each = {
    for k, v in data.external.dynamodb_data.result : k => jsondecode(v)
    if jsondecode(v).lifecycle == "spot"
  }

  region                      = each.value.region
  ami                         = each.value.ami
  instance_type               = each.value.serverSize
  subnet_id                   = local.network_config[each.value.region].subnet_id
  vpc_security_group_ids      = local.network_config[each.value.region].security_group_ids
  key_name                    = local.network_config[each.value.region].key_name
  iam_instance_profile        = var.instance_profile
  user_data                   = templatestring(data.cloudinit_config.full_script[each.key].rendered, { hostname = each.value.hostname })
  user_data_replace_on_change = false

  lifecycle {
    ignore_changes = [user_data]
  }

  tags = {
    Name         = each.value.hostname
    Hostname     = each.value.hostname
    DeploymentID = each.value.id
    TimeToExpire = each.value.timeToExpire
    Region       = each.value.region
    DeployedBy   = "turbo-deploy"
    UserData     = join(",", each.value.userData)
  }
  wait_for_fulfillment = true
}

// the tags specified in the spot request only applies to the request not the instances
// so we have to create separate resource tags to apply to the instances
resource "aws_ec2_tag" "name" {
  region      = each.value.tags_all.Region
  for_each    = aws_spot_instance_request.my_deployed_spot_instances
  resource_id = aws_spot_instance_request.my_deployed_spot_instances[each.key].spot_instance_id
  key         = "Name"
  value       = each.value.tags_all.Name
}

resource "aws_ec2_tag" "hostname" {
  region      = each.value.tags_all.Region
  for_each    = aws_spot_instance_request.my_deployed_spot_instances
  resource_id = aws_spot_instance_request.my_deployed_spot_instances[each.key].spot_instance_id
  key         = "Hostname"
  value       = each.value.tags_all.Hostname
}

resource "aws_ec2_tag" "deploymentid" {
  region      = each.value.tags_all.Region
  for_each    = aws_spot_instance_request.my_deployed_spot_instances
  resource_id = aws_spot_instance_request.my_deployed_spot_instances[each.key].spot_instance_id
  key         = "DeploymentID"
  value       = each.value.tags_all.DeploymentID
}

resource "aws_ec2_tag" "timetoexpire" {
  region      = each.value.tags_all.Region
  for_each    = aws_spot_instance_request.my_deployed_spot_instances
  resource_id = aws_spot_instance_request.my_deployed_spot_instances[each.key].spot_instance_id
  key         = "TimeToExpire"
  value       = each.value.tags_all.TimeToExpire
}

resource "aws_ec2_tag" "deployedby" {
  region      = each.value.tags_all.Region
  for_each    = aws_spot_instance_request.my_deployed_spot_instances
  resource_id = aws_spot_instance_request.my_deployed_spot_instances[each.key].spot_instance_id
  key         = "DeployedBy"
  value       = each.value.tags_all.DeployedBy
}

resource "aws_ec2_tag" "userdata" {
  region      = each.value.tags_all.Region
  for_each    = aws_spot_instance_request.my_deployed_spot_instances
  resource_id = aws_spot_instance_request.my_deployed_spot_instances[each.key].spot_instance_id
  key         = "UserData"
  value       = each.value.tags_all.UserData
}

resource "aws_route53_record" "spot_record" {
  for_each = aws_spot_instance_request.my_deployed_spot_instances
  type     = "A"
  zone_id  = var.hosted_zone_id
  name     = replace(each.value.tags_all.Name, "/.${data.aws_route53_zone.hosted_zone.name}/", "")
  records  = [coalesce(each.value.public_ip, each.value.private_ip)]
  ttl      = "60"
}