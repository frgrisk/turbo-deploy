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

variable "security_group_id" {
  description = "id of security group associated with ec2 deployment"
  type        = string
  default     = ""
}

variable "public_subnet_id" {
  description = "ids of public subnet associated with ec2 deployment"
  type        = string
  default     = ""
}

variable "hosted_zone_id" {
  description = "ID of the hosted zone for DNS"
  type        = string
  default     = ""
}

data "aws_route53_zone" "hosted_zone" {
  zone_id      = ""
  private_zone = false
}

data "aws_s3_object" "user_data_template" {
  bucket = "turbo-deploy"
  key    = "user-data-template/template.sh"
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
  key_name           = ""
  include_public_key = true
}

data "aws_iam_instance_profile" "instance_profile" {
  name = ""
}
