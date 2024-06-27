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
  region = "ap-southeast-1"
}

module "my_turbo_module" {
  providers = {
    aws = aws
  }

  source            = "../../terraform-aws-turbo-deploy"
  s3_tf_bucket_name = "turbo-deploy-tzlfrglast"
}
