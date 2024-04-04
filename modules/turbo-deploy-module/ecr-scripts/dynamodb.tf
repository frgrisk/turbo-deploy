data "external" "dynamodb_data" {
  program = ["${path.module}/venv/bin/python", "${path.module}/fetch_dynamodb_data.py"]
}

output "my_dynamodb_output" {
  value = data.external.dynamodb_data.result
}
