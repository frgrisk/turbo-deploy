variable "ecr_repository_name" {
  description = "Name of the ecr repository to hold lambda image"
  type        = string
  default     = "my-tf-function"
}

variable "aws_region" {
  description = "region to provision aws suite"
  type        = string
  default     = "us-east-1"
}

variable "ecr_image_tag_mutability" {
  description = "Mutability of the ecr image tag"
  type        = string
  default     = "MUTABLE"
}

variable "ecr_scan_on_push" {
  description = "Describes the actions taken on push"
  type        = bool
  default     = true
}

// not even sure if s3 can have a default name
variable "s3_tf_bucket_name" {
  description = "name of the s3 bucket for the lambda with terraform binary"
  type        = string
  default     = "terraform-lambda-deploy-state"
}

variable "s3_force_destroy" {
  description = "option to force destroy s3"
  type        = bool
  default     = true
}

variable "dynamodb_tf_locks_name" {
  description = "name of the dynamodb for tf locks"
  type        = string
  default     = "terraform-lambda-deploy-locks"
}

variable "dynamodb_billing_mode" {
  description = "Billing mode of dynamodb table"
  type        = string
  default     = "PAY_PER_REQUEST"
}

variable "dynamodb_hash_key" {
  description = "The hash key of the DynamoDB table"
  type        = string
  default     = "LockID"
}

variable "api_gateway_name" {
  description = "Name of the api gateway"
  type        = string
  default     = "MyGolangLambdaAPI"
}

variable "database_lambda_function_name" {
  description = "Name of the lambda function stationed between API gateway and dynamoDB"
  type        = string
  default     = "MyGolangLambdaFunction"
}

variable "lambda_function_zip_path" {
  description = "Relative path to the Lambda function ZIP file"
  type        = string
  default     = "lambda_zip/lambda_function.zip"
}

variable "dynamodb_http_crud_backend_name" {
  description = "name of dynamodb database storing payload from AngularUI"
  type        = string
  default     = "http_crud_backend"
}

variable "dynamodb_http_crud_backend_hash_key" {
  description = "hash key for dynamodb database"
  type        = string
  default     = "id"
}

variable "terraform_lambda_function_name" {
  description = "Name of the terraform lambda function"
  type        = string
  default     = "MyTerraformFunction"
}
