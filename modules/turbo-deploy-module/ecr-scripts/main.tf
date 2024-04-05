terraform {
  backend "s3" {
    bucket         = "terraform-lambda-deploy-state"
    key            = "terraform-backend/terraform.tfstate"
    region         = "ap-southeast-3"
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
  region = "ap-southeast-3"
}

variable "aws_region" {
  description = "The AWS region to deploy resources into"
  type = string
  default = "ap-southeast-3"
}
