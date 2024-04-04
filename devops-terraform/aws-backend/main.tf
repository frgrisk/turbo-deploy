terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

resource "aws_s3_bucket" "terraform-state" {
  bucket        = "turbo-deploy-tf-state-tzl"
  force_destroy = true
}


resource "aws_dynamodb_table" "terraform-locks" {
  name         = "terraform-state-locking-tzl"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}
