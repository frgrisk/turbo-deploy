terraform {
  backend "s3" {
    bucket         = "tb-terraform-lambda-tf-state-v2"
    key            = "terraform-backend/terraform.tfstate"
    region         = "ap-southeast-3"
    dynamodb_table = "tb-terraform-lambda-tf-locks"
    encrypt        = true
  }
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
}

provider "aws" {
  region = "ap-southeast-3"
}

variable "aws_region" {
  description = "The AWS region to deploy resources into"
  type = string
  default = "ap-southeast-3"
}

variable "security_group_id" {
  description = "id of security group associated with ec2 deployment"
  type        = string
  default = "sg-072a9cb42acf71c16"
}

variable "public_subnet_id" {
  description = "ids of public subnet associated with ec2 deployment"
  type        = string
  default = "subnet-00576b0c22321844d"
}

