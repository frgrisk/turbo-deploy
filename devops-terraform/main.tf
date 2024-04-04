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
  region = "us-east-1"
}

module "my_turbo_module" {
  source = "../modules/turbo-deploy-module"
}
