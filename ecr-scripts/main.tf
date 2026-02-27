#This file is here to shut the errors and local development
#The real file used during instance deployment is rendered from main.tf.tpl 
terraform {
  backend "s3" {
    bucket         = "turbo-deploy"
    key            = "terraform-backend/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-lambda-deploy-locks"
    encrypt        = true
  }
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
}

locals {
  network_config = jsondecode(base64decode(""))
}

provider "aws" {
  region = "us-east-1"
}

variable "script_string" {
  description = "The user-data scripts available"
  type        = set(string)
  default     = ""
}

variable "aws_region" {
  description = "The AWS region to deploy resources into"
  type        = string
  default     = "us-east-1"
}

variable "hosted_zone_id" {
  description = "ID of the hosted zone for DNS"
  type        = string
  default     = ""
}

variable "instance_profile" {
  description = "Name of the instance profile to assign to the Turbo Deployed instances"
  type        = string
  default     = ""
}

data "aws_route53_zone" "hosted_zone" {
  zone_id      = ""
  private_zone = false
}

data "aws_s3_object" "user_data_base" {
  bucket = S3_BUCKET_NAME
  key    = "user-data-base/base.sh"
}

data "aws_s3_object" "user_data_script" {
  for_each = var.script_string
  bucket   = "turbo-deploy"
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
