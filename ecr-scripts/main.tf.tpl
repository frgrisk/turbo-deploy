terraform {
  backend "s3" {
    bucket         = "${S3_BUCKET_NAME}"
    key            = "terraform-backend/terraform.tfstate"
    region         = "${AWS_REGION_CUSTOM}"
    dynamodb_table = "${DYNAMODB_TABLE}"
    encrypt        = true
  }
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
}

provider "aws" {
  region = "${AWS_REGION_CUSTOM}"
}

variable "script_string" {
  description = "The user-data scripts available"
  type        = set(string)
  default     = ${USER_SCRIPTS}
}

variable "aws_region" {
  description = "The AWS region to deploy resources into"
  type        = string
  default     = "${AWS_REGION_CUSTOM}"
}

variable "security_group_id" {
  description = "ID of the security group associated with EC2 deployment"
  type        = string
  default     = "${SECURITY_GROUP_ID}"
}

variable "public_subnet_id" {
  description = "IDs of the public subnet associated with EC2 deployment"
  type        = string
  default     = "${PUBLIC_SUBNET_ID}"
}

variable "hosted_zone_id" {
  description = "ID of the hosted zone for DNS"
  type        = string
  default     = "${HOSTED_ZONE_ID}"
}

data "aws_route53_zone" "hosted_zone" {
  zone_id      = "${HOSTED_ZONE_ID}" 
  private_zone = false
}

data "aws_s3_object" "user_data_base" {
  bucket = "${S3_BUCKET_NAME}"
  key    = "user-data-base/base.sh"
}

data "aws_s3_object" "user_data_script" {
  for_each = var.script_string
  bucket   = "${S3_BUCKET_NAME}"
  key      = "user-data-scripts/${each.key}.sh"
}

data "cloudinit_config" "full_script" {
  for_each = {
    for k, v in data.external.dynamodb_data.result : k => jsondecode(v)
  }
  gzip          = false
  base64_encode = false

  part {
      filename     = "base.sh"
      content_type = "text/x-shellscript"
      content      = data.aws_s3_object.user_data_base.body
  }

  dynamic "part" {
    for_each = each.value.userData
    iterator = name
    content {
      filename     = "${name.value}.sh"
      content_type = "text/x-shellscript"
      content      = data.aws_s3_object.user_data_script[name.value].body
    }
  }
}

data "aws_key_pair" "admin_key" {
  key_name           = "${PUBLIC_KEY}"
  include_public_key = true
}

data "aws_iam_instance_profile" "instance_profile" {
  name = "${PROFILE_NAME}"
}