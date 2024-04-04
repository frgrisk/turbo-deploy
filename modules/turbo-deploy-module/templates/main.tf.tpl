terraform {
  backend "s3" {
    bucket         = "${bucket_name}"
    key            = "terraform-backend/terraform.tfstate"
    region         = "${region}"
    dynamodb_table = "${dynamodb_table}"
    encrypt        = true
  }
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
}

provider "aws" {
  region = "${region}"
}
