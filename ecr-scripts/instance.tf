locals {
  use_custom_subnet         = var.public_subnet_id != "" ? true : false
  use_custom_security_group = var.security_group_id != "" ? true : false
}

resource "aws_instance" "my_deployed_on_demand_instances" {
  for_each = {
    for k, v in data.external.dynamodb_data.result : k => jsondecode(v)
    if jsondecode(v).lifecycle == "on-demand"
  }

  ami                    = each.value.ami
  instance_type          = each.value.serverSize
  subnet_id              = local.use_custom_subnet ? var.public_subnet_id : null
  vpc_security_group_ids = local.use_custom_security_group ? [var.security_group_id] : null
  key_name               = data.aws_key_pair.admin_key.key_name
  iam_instance_profile   = data.aws_iam_instance_profile.instance_profile.name
  user_data              = templatestring(data.aws_s3_object.user_data.body, { hostname = each.value.hostname })
  tags = {
    Name         = each.value.hostname
    Hostname     = each.value.hostname
    DeploymentID = each.value.id
    TimeToExpire = each.value.timeToExpire
    DeployedBy   = "turbo-deploy"
  }
}

resource "aws_eip" "on_demand_ip" {
  for_each = aws_instance.my_deployed_on_demand_instances
  instance = each.value.id
  tags = {
    Name = each.value.tags_all.Name
  }
}

resource "aws_route53_record" "on_demand_record" {
  for_each = aws_eip.on_demand_ip
  type     = "A"
  zone_id  = var.hosted_zone_id
  name     = replace(each.value.tags_all.Name, "/.${data.aws_route53_zone.hosted_zone.name}/", "")
  records  = [each.value.public_ip]
  ttl      = "60"
}

resource "aws_spot_instance_request" "my_deployed_spot_instances" {
  for_each = {
    for k, v in data.external.dynamodb_data.result : k => jsondecode(v)
    if jsondecode(v).lifecycle == "spot"
  }

  ami                    = each.value.ami
  instance_type          = each.value.serverSize
  subnet_id              = local.use_custom_subnet ? var.public_subnet_id : null
  vpc_security_group_ids = local.use_custom_security_group ? [var.security_group_id] : null
  key_name               = data.aws_key_pair.admin_key.key_name
  iam_instance_profile   = data.aws_iam_instance_profile.instance_profile.name
  user_data              = templatestring(data.aws_s3_object.user_data.body, { hostname = each.value.hostname })
  tags = {
    Name         = each.value.hostname
    Hostname     = each.value.hostname
    DeploymentID = each.value.id
    TimeToExpire = each.value.timeToExpire
    DeployedBy   = "turbo-deploy"
  }
}

resource "aws_eip" "spot_ip" {
  for_each = aws_spot_instance_request.my_deployed_spot_instances
  instance = each.value.spot_instance_id
  tags = {
    Name = each.value.tags_all.Name
  }
}

resource "aws_route53_record" "spot_record" {
  for_each = aws_eip.spot_ip
  type     = "A"
  zone_id  = var.hosted_zone_id
  name     = replace(each.value.tags_all.Name, "/.${data.aws_route53_zone.hosted_zone.name}/", "")
  records  = [each.value.public_ip]
  ttl      = "60"
}