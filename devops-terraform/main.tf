terraform {
  backend "s3" {
    bucket         = "turbo-deploy-tf-state-tzl"
    key            = "aws_backend/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-state-locking-tzl"
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

module "my_turbo_module" {
  providers = {
    aws = aws
  }
  source     = "../modules/turbo-deploy-module"
  aws_region = "ap-southeast-3"
}
