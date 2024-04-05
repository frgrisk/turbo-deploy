terraform {
  backend "s3" {
    bucket         = "terraform-lambda-deploy-state-tzl-test-us"
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

variable "aws_region" {
  description = "The AWS region to deploy resources into"
  type = string
  default = "us-east-1"
}
